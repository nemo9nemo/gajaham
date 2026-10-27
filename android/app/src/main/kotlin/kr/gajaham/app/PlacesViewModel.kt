package kr.gajaham.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kr.gajaham.app.auth.*
import kr.gajaham.app.data.*
import kr.gajaham.core.*

data class LocalContext(val owner: String, val generation: Int)
data class AppState(
    val records: List<Place> = emptyList(),
    val loading: Boolean = true,
    val loadFailed: Boolean = false,
    val busy: Boolean = false,
    val authBusy: Boolean = false,
    val owner: String = GUEST,
    val generation: Int = 0,
    val user: AuthUser? = null,
    val authAvailable: Boolean = false,
    val deletionPending: Boolean = false,
    val sessionRecheck: Boolean = false,
    val route: String = "home",
    val selectedId: String? = null,
    val notice: String? = null,
    val failedSharedText: String = "",
) { val context get() = LocalContext(owner, generation) }

class PlacesViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as GajahamApplication
    private val repository = app.repository
    private val auth = app.auth
    private val mutable = MutableStateFlow(AppState(authAvailable = auth.available))
    val state = mutable.asStateFlow()
    private val mutex = Mutex()
    private val authMutex = Mutex()
    private val ready = CompletableDeferred<Unit>()
    private val shareReceipts = ShareReceipts()
    val sharedIntentCommitted: Boolean get() = shareReceipts.committed
    val sharedIntentHandled: Boolean get() = shareReceipts.handled
    val sharedIntentOwner: String? get() = shareReceipts.owner

    init {
        viewModelScope.launch(Dispatchers.IO) {
            mutex.withLock {
                try {
                    val selected = repository.selectedOwner()
                    val user = auth.currentUser
                    val pending = user != null && repository.deletionState(accountScope(user.uid)) != null
                    val owner = if (user != null && selected == accountScope(user.uid) && repository.deletionState(selected) == null) selected else GUEST
                    if (owner == GUEST && user != null && repository.deletionState(accountScope(user.uid)) == null) auth.signOut()
                    repository.selectOwner(owner)
                    mutable.update { it.copy(owner = owner, user = if (owner != GUEST || pending) user else null,
                        records = repository.forOwner(owner).snapshot(), loading = false, sessionRecheck = owner != GUEST,
                        deletionPending = pending, route = if (pending) "account" else "home",
                        notice = if (!pending && repository.hasPendingDeletion()) "이전 탈퇴 요청의 계정 삭제 완료 여부를 확인하지 못했어요. 해당 계정으로 로그인할 수 있다면 탈퇴를 다시 시도해 주세요. 이 계정의 기기 내 기록은 이미 삭제됐어요." else null) }
                } catch (_: Exception) { mutable.update { it.copy(loading = false, loadFailed = true, notice = "기록을 읽지 못했어요. 다시 불러와 주세요.") } }
                finally { ready.complete(Unit) }
            }
        }
    }

    private fun dataWork(expected: LocalContext? = null, operation: (PlaceRepository, String) -> Unit) {
        if (expected != null && expected != state.value.context) { report("이용 영역이 바뀌었어요. 현재 화면에서 다시 시도해 주세요."); return }
        val boundOwner = expected?.owner ?: state.value.takeUnless { it.loading }?.owner
        viewModelScope.launch(Dispatchers.IO) {
            ready.await()
            mutex.withLock {
                val owner = boundOwner ?: state.value.owner
                mutable.update { it.copy(busy = true) }
                try { operation(repository.forOwner(owner), owner) }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (error: Exception) {
                    if (state.value.owner == owner) report(if (error is InputProblem) error.message.orEmpty() else "처리하지 못했어요. 기록을 확인한 뒤 다시 시도해 주세요.")
                } finally { mutable.update { it.copy(busy = false) } }
            }
        }
    }
    private fun refresh(repo: PlaceRepository, owner: String) {
        val rows = repo.snapshot()
        if (state.value.owner == owner) mutable.update { it.copy(records = rows, loading = false, loadFailed = false) }
    }
    private fun updateOwner(owner: String, user: AuthUser?, notice: String? = null) {
        repository.selectOwner(owner)
        mutable.update { it.copy(owner = owner, user = user, generation = it.generation + 1, records = repository.forOwner(owner).snapshot(),
            route = "home", selectedId = null, failedSharedText = "", notice = notice, deletionPending = false, sessionRecheck = false, loadFailed = false) }
    }
    fun reload() = dataWork { repo, owner -> refresh(repo, owner) }
    fun restoreShareCommitted() { shareReceipts.restoreCommitted() }
    fun restoreShareHandled(owner: String?, committed: Boolean) { shareReceipts.restoreHandled(owner, committed) }
    fun navigate(route: String, id: String? = null) { mutable.update { it.copy(route = route, selectedId = id, notice = null) } }
    fun dismissNotice() { mutable.update { it.copy(notice = null) } }
    fun report(message: String) { mutable.update { it.copy(notice = message) } }

    fun capture(text: String, shared: Boolean = false, expectedOwner: String? = null, context: LocalContext? = null) {
        val boundOwner = expectedOwner ?: state.value.takeUnless { it.loading }?.owner
        val receipt = if (shared) shareReceipts.begin(boundOwner) else null
        dataWork(context) { repo, owner ->
            if (receipt != null) shareReceipts.bind(receipt, boundOwner ?: owner)
            if (boundOwner != null && boundOwner != owner) {
                receipt?.let(shareReceipts::reject)
                report("이전 이용 영역에서 받은 공유는 저장하지 않았어요. 현재 영역에 저장하려면 다시 공유해 주세요.")
                return@dataWork
            }
            try {
                val result = repo.capture(text)
                refresh(repo, owner)
                receipt?.let(shareReceipts::complete)
                if (state.value.owner == owner) mutable.update {
                    val keepEditor = shared && it.route == "edit"
                    it.copy(route = if (keepEditor) "edit" else "inbox", selectedId = if (keepEditor) it.selectedId else null,
                        failedSharedText = "", notice = "새 접수 ${result.added}개 · 이미 저장 ${result.existing}개 · 복원 ${result.restored}개")
                }
            } catch (error: Exception) {
                if (repo.deletionState() != null) receipt?.let(shareReceipts::reject)
                if (shared && state.value.owner == owner) mutable.update { it.copy(route = if (it.route == "edit") "edit" else "add", failedSharedText = text.take(16_384)) }
                throw error
            }
        }
    }
    fun save(id: String?, name: String, address: String, memo: String, menu: String, category: Category, context: LocalContext? = null) = dataWork(context) { repo, owner ->
        val savedId = repo.save(id, name, address, memo, menu, category)
        refresh(repo, owner)
        if (state.value.owner == owner) mutable.update { it.copy(route = "detail", selectedId = savedId, notice = "장소를 저장했어요.") }
    }
    fun visited(id: String, context: LocalContext? = null) = dataWork(context) { repo, owner -> repo.toggleVisited(id); refresh(repo, owner) }
    fun trash(id: String, context: LocalContext? = null) = dataWork(context) { repo, owner ->
        val destination = if (repo.snapshot().find { it.id == id }?.confirmed == true) "home" else "inbox"
        repo.trash(id); refresh(repo, owner)
        if (state.value.owner == owner) { navigate(destination); report("휴지통으로 옮겼어요.") }
    }
    fun restore(id: String, context: LocalContext? = null) = dataWork(context) { repo, owner -> repo.restore(id); refresh(repo, owner) }
    fun deletePermanently(id: String, context: LocalContext? = null) = dataWork(context) { repo, owner -> repo.deletePermanently(id); refresh(repo, owner) }
    fun clear(context: LocalContext? = null) = dataWork(context) { repo, owner ->
        repo.clear(); refresh(repo, owner)
        if (state.value.owner == owner) { navigate("home"); report("현재 영역의 개인 기록을 모두 삭제했어요.") }
    }
    fun moveGuestRecords(context: LocalContext? = null) = dataWork(context) { repo, owner ->
        val result = repo.moveGuestRecords(); refresh(repo, owner)
        if (state.value.owner == owner) report("${result.moved}개 이동 · 중복 ${result.remaining}개는 게스트에 남겼어요. 서버에 전송하지 않았어요.")
    }

    private fun authWork(expectedUid: String? = state.value.user?.uid, operation: suspend () -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            ready.await()
            authMutex.withLock {
                if (expectedUid != state.value.user?.uid) { report("계정이 바뀌었어요. 현재 화면에서 다시 시도해 주세요."); return@withLock }
                mutable.update { it.copy(authBusy = true, notice = null) }
                try { operation() }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (e: Exception) { if (!invalidateSession(expectedUid, e)) report(authMessage(e)) }
                finally { mutable.update { it.copy(authBusy = false) } }
            }
        }
    }
    private suspend fun invalidateSession(uid: String?, error: Exception): Boolean {
        if (uid == null || state.value.user?.uid != uid || error !is AuthFailure || error.code !in
            setOf("ERROR_USER_NOT_FOUND", "ERROR_USER_DISABLED", "ERROR_USER_TOKEN_EXPIRED", "ERROR_INVALID_USER_TOKEN")) return false
        mutex.withLock {
            auth.signOut()
            try {
                repository.forOwner(accountScope(uid)).suspendAccess()
                updateOwner(GUEST, null, "계정의 로그인 상태를 확인할 수 없어요. 게스트로 전환했어요. 다시 로그인해 주세요.")
            } catch (_: Exception) {
                mutable.update { it.copy(owner = GUEST, user = null, records = emptyList(), generation = it.generation + 1,
                    route = "home", selectedId = null, failedSharedText = "", loadFailed = true, deletionPending = false,
                    notice = "로그인이 종료됐어요. 기기 기록을 다시 불러와 주세요.") }
            }
        }
        return true
    }
    fun login(email: String, password: String, create: Boolean) = authWork {
        if (email.trim().isEmpty() || password.isEmpty()) throw InputProblem("이메일과 비밀번호를 입력해 주세요.")
        if (create && password.length < 12) throw InputProblem("새 비밀번호는 12자 이상 입력해 주세요.")
        val user = if (create) auth.signUp(email, password) else auth.signIn(email, password)
        val scope = accountScope(user.uid)
        mutex.withLock {
            if (repository.deletionState(scope) != null) {
                updateOwner(GUEST, user)
                mutable.update { it.copy(deletionPending = true, route = "account") }
            } else {
                repository.forOwner(scope).activateAccount()
                updateOwner(scope, user, if (create) "가입했어요. 이메일 확인을 진행해 주세요. 개인 기록은 이 기기에만 저장돼요." else "로그인했어요. 개인 기록은 이 기기에만 저장돼요.")
            }
        }
        if (create && !state.value.deletionPending) {
            try { auth.sendVerification(user.uid); report("확인 메일을 보냈어요. 메일 확인 후 ‘이메일 확인 상태 갱신’을 눌러 주세요.") }
            catch (e: Exception) { if (!invalidateSession(user.uid, e)) report("가입은 완료됐어요. 확인 메일을 보내지 못했으니 계정 화면에서 다시 시도해 주세요.") }
        }
    }
    fun resetPassword(email: String) = authWork {
        if (email.trim().isEmpty()) throw InputProblem("이메일을 입력해 주세요.")
        auth.resetPassword(email)
        report("입력한 주소가 가입된 이메일이면 재설정 안내를 받을 수 있어요.")
    }
    fun sendVerification(expectedUid: String? = state.value.user?.uid) = authWork(expectedUid) {
        val user = state.value.user ?: throw InputProblem("로그인해 주세요.")
        auth.sendVerification(user.uid); report("확인 메일을 보냈어요.")
    }
    fun refreshUser(expectedUid: String? = state.value.user?.uid) = authWork(expectedUid) {
        val user = state.value.user ?: throw InputProblem("로그인해 주세요.")
        try {
            val updated = auth.refresh(user.uid)
            mutable.update { it.copy(user = updated, sessionRecheck = false, notice = if (updated.verified) "이메일 확인을 완료했어요." else "아직 이메일이 확인되지 않았어요.") }
        } catch (e: Exception) {
            mutable.update { it.copy(sessionRecheck = true) }; throw e
        }
    }
    fun recheckSession() {
        viewModelScope.launch {
            ready.await()
            if (state.value.user != null && !state.value.deletionPending && !state.value.authBusy) refreshUser()
        }
    }
    fun useGuest(expectedUid: String? = state.value.user?.uid) = authWork(expectedUid) {
        mutex.withLock { auth.signOut(); updateOwner(GUEST, null, "게스트로 이용해요. 계정 기록은 이 기기에 분리 보관돼요.") }
    }
    fun deleteAccount(password: String, expectedUid: String? = state.value.user?.uid) = authWork(expectedUid) {
        val user = state.value.user ?: throw InputProblem("로그인한 뒤 탈퇴해 주세요.")
        val scope = accountScope(user.uid)
        auth.reauthenticate(user.uid, password)
        mutex.withLock {
            repository.forOwner(scope).beginDeletion()
            updateOwner(GUEST, user)
            mutable.update { it.copy(deletionPending = true, route = "account") }
        }
        try { auth.delete(user.uid) }
        catch (e: Exception) {
            if (invalidateSession(user.uid, e)) return@authWork
            report("이 계정의 기기 내 기록은 삭제됐어요. 계정 탈퇴 완료는 확인하지 못했어요. 연결을 확인한 뒤 비밀번호로 다시 시도해 주세요.")
            return@authWork
        }
        auth.signOut()
        mutex.withLock {
            mutable.update { it.copy(user = null, deletionPending = false) }
            try {
                repository.forOwner(scope).finishDeletion()
                updateOwner(GUEST, null, "계정과 이 계정의 기기 내 기록을 삭제했어요.")
            } catch (_: Exception) {
                report("인증 계정 삭제는 완료됐어요. 기기 내 기록은 삭제됐지만 마지막 처리 상태를 기록하지 못했어요.")
            }
        }
    }
}
