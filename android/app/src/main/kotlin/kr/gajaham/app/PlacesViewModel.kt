package kr.gajaham.app

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import java.io.ByteArrayOutputStream
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kr.gajaham.core.*

data class AppState(
    val records: List<Place> = emptyList(),
    val loading: Boolean = true,
    val loadFailed: Boolean = false,
    val busy: Boolean = false,
    val route: String = "home",
    val selectedId: String? = null,
    val notice: String? = null,
    val pendingImport: Backup? = null,
    val importPlan: ImportPlan? = null,
    val failedSharedText: String = "",
)

class PlacesViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = (application as GajahamApplication).repository
    private val mutable = MutableStateFlow(AppState())
    val state = mutable.asStateFlow()
    private val mutex = Mutex()
    private val shareReceipts = ShareReceipts()
    val sharedIntentCommitted: Boolean get() = shareReceipts.committed

    init { work(clearNotice = false) { refresh() } }

    private fun work(clearNotice: Boolean = true, operation: suspend () -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            mutex.withLock {
                mutable.update { it.copy(busy = true, notice = if (clearNotice) null else it.notice) }
                try { operation() }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (error: Exception) {
                    mutable.update { it.copy(loadFailed = it.loadFailed || it.loading, notice = if (error is InputProblem) error.message else "처리하지 못했어요. 현재 기록을 확인한 뒤 다시 시도해 주세요.") }
                } finally { mutable.update { it.copy(busy = false, loading = false) } }
            }
        }
    }

    private fun refresh() { val rows = repository.snapshot(); mutable.update { it.copy(records = rows, loading = false, loadFailed = false) } }
    fun reload() = work { refresh() }
    fun restoreShareCommitted() { shareReceipts.restoreCommitted() }
    fun navigate(route: String, id: String? = null) { mutable.update { it.copy(route = route, selectedId = id, notice = null) } }
    fun dismissNotice() { mutable.update { it.copy(notice = null) } }
    fun report(message: String) { mutable.update { it.copy(notice = message) } }

    fun capture(text: String, shared: Boolean = false) {
        val receipt = if (shared) shareReceipts.begin() else null
        work {
            try {
                val result = repository.capture(text)
                refresh()
                receipt?.let(shareReceipts::complete)
                mutable.update {
                    val keepEditor = shared && it.route == "edit"
                    it.copy(route = if (keepEditor) "edit" else "inbox", selectedId = if (keepEditor) it.selectedId else null,
                        failedSharedText = "", notice = "새 접수 ${result.added}개 · 이미 저장 ${result.existing}개 · 복원 ${result.restored}개")
                }
            } catch (error: Exception) {
                if (shared) mutable.update { it.copy(route = if (it.route == "edit") "edit" else "add", failedSharedText = text.take(16_384)) }
                throw error
            }
        }
    }

    fun save(id: String?, name: String, address: String, memo: String, menu: String, category: Category) = work {
        val savedId = repository.save(id, name, address, memo, menu, category)
        refresh()
        mutable.update { it.copy(route = "detail", selectedId = savedId, notice = "장소를 저장했어요.") }
    }
    fun visited(id: String) = work { repository.toggleVisited(id); refresh() }
    fun trash(id: String) = work {
        val destination = if (mutable.value.records.find { it.id == id }?.confirmed == true) "home" else "inbox"
        repository.trash(id); refresh(); navigate(destination); report("휴지통으로 옮겼어요.")
    }
    fun restore(id: String) = work { repository.restore(id); refresh(); report("기록을 복원했어요.") }
    fun deletePermanently(id: String) = work { repository.deletePermanently(id); refresh(); report("기록을 영구 삭제했어요.") }
    fun clear() = work {
        repository.clear(); refresh()
        mutable.update { it.copy(route = "home", selectedId = null, failedSharedText = "", pendingImport = null, importPlan = null, notice = "기기 안의 모든 기록을 삭제했어요.") }
    }

    fun export(uri: Uri) = work {
        val bytes = repository.export()
        val resolver = getApplication<Application>().contentResolver
        val output = resolver.openOutputStream(uri, "wt") ?: throw IOException("Output unavailable")
        output.use { it.write(bytes) }
        report("백업 파일을 저장했어요. 파일에 출처·메모·휴지통 기록이 포함돼요.")
    }

    fun previewImport(uri: Uri) = work {
        mutable.update { it.copy(pendingImport = null, importPlan = null) }
        val input = getApplication<Application>().contentResolver.openInputStream(uri) ?: throw IOException("Input unavailable")
        val bytes = input.use { stream ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val read = stream.read(buffer)
                if (read == -1) break
                if (output.size() + read > MAX_BACKUP_BYTES) throw InputProblem("2MiB 이하의 백업 파일을 선택해 주세요.")
                output.write(buffer, 0, read)
            }
            output.toByteArray()
        }
        val backup = Backups.decode(bytes)
        val plan = repository.preview(backup)
        mutable.update { it.copy(pendingImport = backup, importPlan = plan) }
    }

    fun cancelImport() { mutable.update { it.copy(pendingImport = null, importPlan = null) } }
    fun confirmImport() = work {
        val backup = mutable.value.pendingImport ?: throw InputProblem("백업 파일을 다시 선택해 주세요.")
        val result = repository.import(backup)
        refresh()
        mutable.update { it.copy(pendingImport = null, importPlan = null, route = "home", notice = "${result.additions.size}개 가져옴 · 중복 ${result.duplicates}개 · 보관 만료 ${result.expired}개 제외") }
    }
}
