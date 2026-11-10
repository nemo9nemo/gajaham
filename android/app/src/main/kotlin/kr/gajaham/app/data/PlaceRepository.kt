package kr.gajaham.app.data

import java.time.Clock
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kr.gajaham.core.*

const val GUEST = "guest"
fun accountScope(uid: String): String {
    require(uid.isNotBlank() && uid.length <= 128 && uid.none { it.isISOControl() })
    return "account:$uid"
}
data class CaptureResult(val added: Int, val existing: Int, val restored: Int)
data class MoveResult(val moved: Int, val remaining: Int)

class PlaceRepository(private val db: LocalDatabase, private val clock: Clock = Clock.systemUTC(), val owner: String = GUEST) {
    private val dao get() = db.places()
    private val json = Json { encodeDefaults = true }
    fun forOwner(scope: String) = PlaceRepository(db, clock, scope)
    private fun Place.record() = PlaceRecord(id, owner, canonicalSource, json.encodeToString(this), createdAt, trashedAt)
    private fun PlaceRecord.place() = json.decodeFromString<Place>(payload)
    private fun now() = clock.millis().coerceAtLeast(0)
    private fun all() = dao.all(owner).map { it.place() }
    private fun writable() {
        if (deletionState(owner) != null) throw InputProblem("탈퇴 처리 중인 계정이에요. 게스트로 전환하거나 탈퇴를 다시 시도해 주세요.")
        if (suspended()) throw InputProblem("다시 로그인한 뒤 이 계정 기록을 이용해 주세요.")
    }
    private fun requirePlace(id: String) = dao.find(owner, id)?.place() ?: throw InputProblem("현재 영역의 기록을 찾지 못했어요.")
    private fun put(key: String, value: String) = db.state().put(LocalState(key, value))
    fun selectedOwner(): String = db.state().get("selectedOwner") ?: GUEST
    fun selectOwner(scope: String) = db.runInTransaction { put("selectedOwner", scope) }
    fun deletionState(scope: String = owner): String? = db.state().get("deletion:$scope")
    fun hasPendingDeletion() = db.state().pendingDeletions() > 0
    private fun suspended() = db.state().get("access:$owner") == "suspended"
    fun suspendAccess() = db.runInTransaction { put("access:$owner", "suspended"); put("selectedOwner", GUEST) }
    fun activateAccount() = db.runInTransaction {
        require(owner != GUEST)
        if (deletionState() != null) throw InputProblem("탈퇴 처리를 완료해 주세요.")
        put("access:$owner", "active")
    }
    fun beginDeletion() = db.runInTransaction {
        require(owner != GUEST)
        dao.clear(owner)
        put("deletion:$owner", "pending")
        put("selectedOwner", GUEST)
    }
    fun finishDeletion() = db.runInTransaction { put("deletion:$owner", "deleted") }

    fun snapshot(): List<Place> {
        dao.purge(now() - TRASH_RETENTION_MS)
        return if (deletionState() == null && !suspended()) all() else emptyList()
    }

    fun capture(text: String): CaptureResult {
        val links = Links.extract(text)
        var added = 0; var existing = 0; var restored = 0
        db.runInTransaction {
            writable()
            dao.purge(now() - TRASH_RETENTION_MS)
            val records = all().filter { it.canonicalSource != null }.associateBy { it.canonicalSource }.toMutableMap()
            links.forEach { url ->
                val key = Links.canonical(url)
                val old = records[key]
                if (old == null) {
                    val place = Places.pending(url, now())
                    dao.insert(place.record()); records[key] = place; added++
                } else if (old.trashedAt != null) {
                    val place = old.copy(trashedAt = null, updatedAt = maxOf(now(), old.updatedAt))
                    dao.update(place.record()); records[key] = place; restored++
                } else existing++
            }
            ensureCapacity()
        }
        return CaptureResult(added, existing, restored)
    }

    fun save(id: String?, name: String, address: String, memo: String, menu: String, category: Category): String {
        var savedId = ""
        db.runInTransaction {
            writable()
            val original = if (id == null) Place(UUID.randomUUID().toString(), createdAt = now(), updatedAt = now()) else requirePlace(id)
            if (original.trashedAt != null) throw InputProblem("휴지통에서 먼저 복원해 주세요.")
            val edited = Places.edit(original, name, address, memo, menu, category, maxOf(now(), original.updatedAt))
            if (id == null) dao.insert(edited.record()) else dao.update(edited.record())
            ensureCapacity()
            savedId = edited.id
        }
        return savedId
    }

    fun toggleVisited(id: String) = db.runInTransaction {
        writable()
        val place = requirePlace(id)
        if (!place.confirmed || place.trashedAt != null) throw InputProblem("확정한 장소에서 방문 상태를 바꿀 수 있어요.")
        dao.update(place.copy(visited = !place.visited, updatedAt = maxOf(now(), place.updatedAt)).record())
        ensureCapacity()
    }
    fun trash(id: String) = db.runInTransaction {
        writable()
        val place = requirePlace(id)
        val time = maxOf(now(), place.updatedAt)
        dao.update(place.copy(trashedAt = time, updatedAt = time).record())
        ensureCapacity()
    }
    fun restore(id: String) = db.runInTransaction {
        writable()
        val place = requirePlace(id)
        if (place.expired(now())) throw InputProblem("보관 기간이 지난 기록이에요.")
        dao.update(place.copy(trashedAt = null, updatedAt = maxOf(now(), place.updatedAt)).record())
        ensureCapacity()
    }
    fun deletePermanently(id: String) = db.runInTransaction {
        writable()
        if (dao.deleteTrashed(owner, id) != 1) throw InputProblem("현재 영역의 휴지통 기록만 영구 삭제할 수 있어요.")
    }
    fun clear() = db.runInTransaction { writable(); dao.clear(owner) }

    fun moveGuestRecords(): MoveResult {
        require(owner != GUEST)
        var result = MoveResult(0, 0)
        db.runInTransaction {
            writable()
            val sources = all().mapNotNull { it.canonicalSource }.toMutableSet()
            var moved = 0
            dao.all(GUEST).forEach { row ->
                val source = row.canonicalSource
                if (source == null || sources.add(source)) {
                    row.ownerScope = owner
                    dao.update(row)
                    moved++
                }
            }
            result = MoveResult(moved, dao.all(GUEST).size)
        }
        return result
    }
    private fun ensureCapacity() {
        val rows = dao.deviceRecords()
        if (rows.size > MAX_RECORDS) throw InputProblem("이 기기의 전체 기록은 최대 5,000건까지 보관할 수 있어요.")
        if (rows.sumOf { it.payload.toByteArray(Charsets.UTF_8).size.toLong() } > MAX_BACKUP_BYTES - 1024) {
            throw InputProblem("이 기기의 저장 용량을 넘었어요. 기록을 정리한 뒤 다시 시도해 주세요.")
        }
    }
}
