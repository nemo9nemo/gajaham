package kr.gajaham.app.auth

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import kr.gajaham.app.BuildConfig
import kr.gajaham.core.InputProblem

data class AuthUser(val uid: String, val email: String, val verified: Boolean)

interface AuthGateway {
    val available: Boolean
    val currentUser: AuthUser?
    suspend fun signIn(email: String, password: String): AuthUser
    suspend fun signUp(email: String, password: String): AuthUser
    suspend fun sendVerification(uid: String)
    suspend fun refresh(uid: String): AuthUser
    suspend fun resetPassword(email: String)
    suspend fun reauthenticate(uid: String, password: String)
    suspend fun delete(uid: String)
    fun signOut()
}

object UnavailableAuth : AuthGateway {
    override val available = false
    override val currentUser: AuthUser? = null
    private fun unavailable(): Nothing = throw InputProblem("현재 로그인 서비스를 이용할 수 없어요. 로그인 없이 개인 기록을 이용해 주세요.")
    override suspend fun signIn(email: String, password: String): AuthUser = unavailable()
    override suspend fun signUp(email: String, password: String): AuthUser = unavailable()
    override suspend fun sendVerification(uid: String): Unit = unavailable()
    override suspend fun refresh(uid: String): AuthUser = unavailable()
    override suspend fun resetPassword(email: String): Unit = unavailable()
    override suspend fun reauthenticate(uid: String, password: String): Unit = unavailable()
    override suspend fun delete(uid: String): Unit = unavailable()
    override fun signOut() = Unit
}

class FirebaseAuthGateway(private val auth: FirebaseAuth) : AuthGateway {
    override val available = true
    private fun FirebaseUser.model() = AuthUser(uid, email.orEmpty(), isEmailVerified)
    override val currentUser get() = auth.currentUser?.model()
    private fun user(uid: String): FirebaseUser = auth.currentUser?.takeIf { it.uid == uid }
        ?: throw AuthFailure("ERROR_USER_TOKEN_EXPIRED")
    override suspend fun signIn(email: String, password: String) = requireNotNull(auth.signInWithEmailAndPassword(email.trim(), password).awaitSafe().user).model()
    override suspend fun signUp(email: String, password: String) = requireNotNull(auth.createUserWithEmailAndPassword(email.trim(), password).awaitSafe().user).model()
    override suspend fun sendVerification(uid: String) { user(uid).sendEmailVerification().awaitSafe() }
    override suspend fun refresh(uid: String): AuthUser {
        user(uid).reload().awaitSafe()
        user(uid).getIdToken(true).awaitSafe()
        return user(uid).model()
    }
    override suspend fun resetPassword(email: String) {
        try { auth.sendPasswordResetEmail(email.trim()).awaitSafe() }
        catch (e: AuthFailure) { if (e.code != "ERROR_USER_NOT_FOUND") throw e }
    }
    override suspend fun reauthenticate(uid: String, password: String) {
        val user = user(uid)
        user.reauthenticate(EmailAuthProvider.getCredential(user.email ?: throw InputProblem("다시 로그인해 주세요."), password)).awaitSafe()
    }
    override suspend fun delete(uid: String) { user(uid).delete().awaitSafe() }
    override fun signOut() = auth.signOut()

    companion object {
        fun create(context: Context): AuthGateway {
            val emulator = BuildConfig.DEBUG && BuildConfig.AUTH_EMULATOR
            if (!emulator && listOf(BuildConfig.AUTH_API_KEY, BuildConfig.AUTH_APP_ID, BuildConfig.AUTH_PROJECT_ID).any { it.isBlank() }) return UnavailableAuth
            if (emulator && BuildConfig.AUTH_EMULATOR_HOST !in setOf("127.0.0.1", "10.0.2.2", "localhost")) return UnavailableAuth
            val options = FirebaseOptions.Builder()
                .setApiKey(if (emulator) "AIzaSy" + "0".repeat(33) else BuildConfig.AUTH_API_KEY)
                .setApplicationId(if (emulator) "1:1234567890:android:0123456789abcdef" else BuildConfig.AUTH_APP_ID)
                .setProjectId(if (emulator) "demo-gajaham" else BuildConfig.AUTH_PROJECT_ID).build()
            return try {
                val app = FirebaseApp.getApps(context).find { it.name == "gajaham-auth" }
                    ?: FirebaseApp.initializeApp(context, options, "gajaham-auth")
                val auth = FirebaseAuth.getInstance(app)
                if (emulator) auth.useEmulator(BuildConfig.AUTH_EMULATOR_HOST, 9099)
                FirebaseAuthGateway(auth)
            } catch (_: IllegalArgumentException) { UnavailableAuth }
        }
    }
}

class AuthFailure(val code: String) : Exception("인증 요청을 완료하지 못했어요.")

private suspend fun <T> Task<T>.awaitSafe(): T = suspendCancellableCoroutine { continuation ->
    // SDK exceptions may contain identifiers: retain only the documented error code.
    addOnCompleteListener(Executor { it.run() }) { task ->
        if (continuation.isActive) {
            if (task.isSuccessful) continuation.resume(task.result)
            else continuation.resumeWithException(AuthFailure((task.exception as? FirebaseAuthException)?.errorCode ?: "UNAVAILABLE"))
        }
    }
}

fun authMessage(error: Exception): String = when {
    error is InputProblem -> error.message ?: "입력을 확인해 주세요."
    error is AuthFailure && error.code == "ERROR_TOO_MANY_REQUESTS" -> "요청이 많아요. 잠시 후 다시 시도해 주세요."
    else -> "인증 요청을 완료하지 못했어요. 입력과 연결 상태를 확인한 뒤 다시 시도해 주세요."
}
