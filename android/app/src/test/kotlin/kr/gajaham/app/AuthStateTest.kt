package kr.gajaham.app

import androidx.test.core.app.ApplicationProvider
import android.os.Looper
import androidx.lifecycle.ViewModelStore
import kotlinx.coroutines.CompletableDeferred
import kr.gajaham.app.auth.*
import kr.gajaham.app.data.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

class FakeAuth : AuthGateway {
    override val available = true
    override var currentUser: AuthUser? = null
    var failVerification = false
    var failReauth = false
    var failDelete = false
    var refreshFailureCode: String? = null
    var verificationFailureCode: String? = null
    var reauthFailureCode: String? = null
    var gate: CompletableDeferred<Unit>? = null
    var started = false
    override suspend fun signIn(email: String, password: String): AuthUser {
        started = true; gate?.await()
        if (password == "wrong") throw AuthFailure("ERROR_INVALID_CREDENTIAL")
        return AuthUser(email.substringBefore('@'), email, false).also { currentUser = it }
    }
    override suspend fun signUp(email: String, password: String) = signIn(email, password)
    override suspend fun sendVerification(uid: String) { verificationFailureCode?.let { throw AuthFailure(it) }; if (failVerification) throw AuthFailure("UNAVAILABLE") }
    override suspend fun refresh(uid: String): AuthUser {
        refreshFailureCode?.let { throw AuthFailure(it) }
        return requireNotNull(currentUser).copy(verified = true).also { currentUser = it }
    }
    override suspend fun resetPassword(email: String) = Unit
    override suspend fun reauthenticate(uid: String, password: String) { reauthFailureCode?.let { throw AuthFailure(it) }; if (failReauth || password == "wrong") throw AuthFailure("ERROR_INVALID_CREDENTIAL") }
    override suspend fun delete(uid: String) { if (failDelete) throw AuthFailure("UNAVAILABLE"); currentUser = null }
    override fun signOut() { currentUser = null }
}
class AuthTestApplication : GajahamApplication() {
    val fake = FakeAuth()
    override fun buildAuth(): AuthGateway = fake
    override fun buildDatabase() = androidx.room.Room.inMemoryDatabaseBuilder(this, LocalDatabase::class.java).allowMainThreadQueries().build()
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = AuthTestApplication::class)
class AuthStateTest {
    private val app get() = ApplicationProvider.getApplicationContext<AuthTestApplication>()
    private fun await(condition: () -> Boolean) {
        val deadline = System.nanoTime() + 20_000_000_000L
        while (!condition() && System.nanoTime() < deadline) { shadowOf(Looper.getMainLooper()).idle(); Thread.sleep(10) }
        assertTrue("Auth state did not settle", condition())
    }
    private fun withModel(test: (PlacesViewModel) -> Unit) {
        val store = ViewModelStore()
        try {
            val model = PlacesViewModel(app)
            store.put("auth-test", model)
            await { !model.state.value.loading }; test(model)
        } finally { store.clear() }
    }
    private fun login(model: PlacesViewModel, email: String) {
        model.login(email, "fictional-password", false)
        await { model.state.value.user?.email == email && !model.state.value.authBusy }
    }
    @Test fun guestAndAccountsNeverShareRecordsImplicitly() = withModel { model ->
        model.capture("https://example.com/guest"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        login(model, "a@example.test"); assertTrue(model.state.value.records.isEmpty())
        model.capture("https://example.com/a"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        model.useGuest(); await { model.state.value.owner == GUEST && !model.state.value.authBusy }
        assertEquals("https://example.com/guest", model.state.value.records.single().sourceUrl)
        login(model, "b@example.test"); assertTrue(model.state.value.records.isEmpty())
        model.useGuest(); await { !model.state.value.authBusy && model.state.value.owner == GUEST }
        login(model, "a@example.test"); assertEquals("https://example.com/a", model.state.value.records.single().sourceUrl)
    }
    @Test fun authNetworkDoesNotBlockLocalCaptureOrMoveGuestAutomatically() = withModel { model ->
        app.fake.gate = CompletableDeferred()
        model.login("a@example.test", "fictional-password", false); await { app.fake.started }
        model.capture("https://example.com/during-login", shared = true)
        await { model.sharedIntentCommitted && !model.state.value.busy }
        assertEquals(GUEST, model.state.value.owner)
        app.fake.gate!!.complete(Unit)
        await { model.state.value.owner == accountScope("a") && !model.state.value.authBusy }
        assertTrue(model.state.value.records.isEmpty())
        model.moveGuestRecords(); await { model.state.value.records.size == 1 && !model.state.value.busy }
        assertTrue(app.repository.snapshot().isEmpty())
    }
    @Test fun signupMailFailureDoesNotPretendSignupFailed() = withModel { model ->
        app.fake.failVerification = true
        model.login("a@example.test", "fictional-password", true)
        await { model.state.value.user != null && !model.state.value.authBusy }
        assertTrue(model.state.value.notice.orEmpty().contains("가입은 완료"))
        assertFalse(model.state.value.user!!.verified)
        app.fake.failVerification = false
        model.refreshUser(); await { model.state.value.user!!.verified && !model.state.value.authBusy }
    }
    @Test fun invalidLoginDoesNotSwitchOwnership() = withModel { model ->
        model.login("a@example.test", "wrong", false)
        await { model.state.value.notice != null && !model.state.value.authBusy }
        assertEquals(GUEST, model.state.value.owner); assertNull(model.state.value.user)
    }
    @Test fun failedReauthenticationPreservesAccountData() = withModel { model ->
        login(model, "a@example.test")
        model.capture("https://example.com/a"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        app.fake.failReauth = true
        model.deleteAccount("wrong"); await { model.state.value.notice != null && !model.state.value.authBusy }
        assertEquals(accountScope("a"), model.state.value.owner)
        assertEquals(1, model.state.value.records.size); assertNull(app.repository.deletionState(accountScope("a")))
    }
    @Test fun deletionNetworkFailureRetiresOnlyThatAccountAndCanRetry() = withModel { model ->
        app.repository.capture("https://example.com/guest")
        login(model, "a@example.test")
        model.capture("https://example.com/a"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        app.fake.failDelete = true
        model.deleteAccount("fictional-password"); await { model.state.value.deletionPending && !model.state.value.authBusy }
        assertEquals(GUEST, model.state.value.owner); assertEquals(1, app.repository.snapshot().size)
        assertTrue(app.repository.forOwner(accountScope("a")).snapshot().isEmpty())
        assertEquals("pending", app.repository.deletionState(accountScope("a")))
        app.fake.failDelete = false
        model.deleteAccount("fictional-password"); await { model.state.value.user == null && !model.state.value.authBusy }
        assertEquals("deleted", app.repository.deletionState(accountScope("a")))
        assertEquals(1, app.repository.snapshot().size)
    }
    @Test fun staleGuestUiCannotSaveOrClearNewAccount() = withModel { model ->
        val guestContext = model.state.value.context
        login(model, "a@example.test")
        model.capture("https://example.com/a"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        model.clear(guestContext)
        model.save(null, "이전 화면", "주소", "", "", kr.gajaham.core.Category.OTHER, guestContext)
        assertEquals(1, model.state.value.records.size)
        assertEquals(1, app.repository.forOwner(accountScope("a")).snapshot().size)
    }
    @Test fun invalidSessionLocksAccountButNetworkFailureKeepsOwnLocalData() = withModel { model ->
        login(model, "a@example.test")
        model.capture("https://example.com/a"); await { model.state.value.records.size == 1 && !model.state.value.busy }
        app.fake.refreshFailureCode = "UNAVAILABLE"
        model.refreshUser(); await { model.state.value.sessionRecheck && !model.state.value.authBusy }
        assertEquals(1, model.state.value.records.size)
        app.fake.refreshFailureCode = "ERROR_USER_DISABLED"
        model.refreshUser(); await { model.state.value.owner == GUEST && !model.state.value.authBusy }
        assertTrue(model.state.value.records.isEmpty()); assertNull(model.state.value.user)
        assertThrows(kr.gajaham.core.InputProblem::class.java) { app.repository.forOwner(accountScope("a")).capture("https://example.com/late") }
        app.fake.refreshFailureCode = null
        login(model, "a@example.test"); assertEquals(1, model.state.value.records.size)
    }
    @Test fun pendingDeletionRestoresRetryTargetAfterNewViewModel() {
        withModel { model ->
            login(model, "a@example.test"); app.fake.failDelete = true
            model.deleteAccount("fictional-password"); await { model.state.value.deletionPending && !model.state.value.authBusy }
        }
        withModel { model ->
            assertEquals("a", model.state.value.user?.uid); assertTrue(model.state.value.deletionPending)
            assertEquals("account", model.state.value.route)
            app.fake.failDelete = false
            model.deleteAccount("fictional-password"); await { model.state.value.user == null && !model.state.value.authBusy }
            assertEquals("deleted", app.repository.deletionState(accountScope("a")))
        }
    }
    @Test fun verificationAndReauthBothCloseDefinitivelyInvalidSessions() = withModel { model ->
        login(model, "a@example.test")
        app.fake.verificationFailureCode = "ERROR_USER_NOT_FOUND"
        model.sendVerification(); await { model.state.value.user == null && !model.state.value.authBusy }
        assertEquals(GUEST, model.state.value.owner)
        app.fake.verificationFailureCode = null
        login(model, "b@example.test")
        app.fake.reauthFailureCode = "ERROR_USER_DISABLED"
        model.deleteAccount("fictional-password"); await { model.state.value.user == null && !model.state.value.authBusy }
        assertEquals(GUEST, model.state.value.owner)
        assertThrows(kr.gajaham.core.InputProblem::class.java) { app.repository.forOwner(accountScope("b")).capture("https://example.com/late") }
    }
}
