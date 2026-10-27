package kr.gajaham.app

import androidx.test.core.app.ApplicationProvider
import android.os.Looper
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.serialization.json.*
import kr.gajaham.app.auth.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.Shadows.shadowOf

/** Explicit opt-in integration task only. Uses the official SDK and official local server. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = IsolatedTestApplication::class)
class AuthEmulatorTest {
    private val base = "http://127.0.0.1:9099"
    private fun request(path: String, body: String? = null): JsonObject {
        val connection = URI(base + path).toURL().openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000; connection.readTimeout = 10_000
        try {
            if (body != null) { connection.requestMethod = "POST"; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); connection.outputStream.use { it.write(body.toByteArray()) } }
            check(connection.responseCode == 200) { "Local emulator request failed" }
            return connection.inputStream.use { Json.parseToJsonElement(it.bufferedReader().readText()).jsonObject }
        } finally { connection.disconnect() }
    }
    private fun code(type: String): String = request("/emulator/v1/projects/demo-gajaham/oobCodes")["oobCodes"]!!.jsonArray
        .map { it.jsonObject }.last { it["requestType"]!!.jsonPrimitive.content == type }["oobCode"]!!.jsonPrimitive.content

    @Test fun realSdkSignupVerifyResetReauthenticateAndDelete() {
        val pending = CoroutineScope(Dispatchers.IO).async { exerciseSdk() }
        val deadline = System.nanoTime() + 100_000_000_000L
        while (!pending.isCompleted && System.nanoTime() < deadline) {
            shadowOf(Looper.getMainLooper()).idle(); Thread.sleep(10)
        }
        runBlocking { withTimeout(1000) { pending.await() } }
    }
    private suspend fun exerciseSdk() {
        withTimeout(90_000) {
            val context = ApplicationProvider.getApplicationContext<IsolatedTestApplication>()
            val app = FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setProjectId("demo-gajaham")
                .setApplicationId("1:1234567890:android:0123456789abcdef").setApiKey("AIzaSy" + "0".repeat(33)).build(), "integration")
            val sdk = FirebaseAuth.getInstance(app)
            sdk.useEmulator("127.0.0.1", 9099)
            val gateway = FirebaseAuthGateway(sdk)
            val email = "sdk-${System.nanoTime()}@example.test"
            val password = "fictional-password"
            val changed = "changed-fictional-password"
            try {
                val user = gateway.signUp(email, password)
                assertFalse(user.verified)
                gateway.sendVerification(user.uid)
                request("/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key", buildJsonObject { put("oobCode", code("VERIFY_EMAIL")) }.toString())
                assertTrue(gateway.refresh(user.uid).verified)
                gateway.signOut(); assertNull(gateway.currentUser)
                try { gateway.signIn(email, "wrong-password"); fail("Invalid password accepted") } catch (_: AuthFailure) { }
                assertEquals(user.uid, gateway.signIn(email, password).uid)
                gateway.resetPassword(email)
                request("/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-key", buildJsonObject { put("oobCode", code("PASSWORD_RESET")); put("newPassword", changed) }.toString())
                gateway.signOut()
                assertEquals(user.uid, gateway.signIn(email, changed).uid)
                gateway.reauthenticate(user.uid, changed)
                gateway.delete(user.uid)
                assertNull(gateway.currentUser)
                try { gateway.signIn(email, changed); fail("Deleted account accepted") } catch (_: AuthFailure) { }
            } finally { gateway.signOut(); app.delete() }
        }
    }
}
