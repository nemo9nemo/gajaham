package kr.gajaham.app.data

import java.time.Clock
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kr.gajaham.core.*

data class CaptureResult(val added: Int, val existing: Int, val restored: Int)

class PlaceRepository(private val db: LocalDatabase, private val clock: Clock = Clock.systemUTC()) {
    private val dao get() = db.places()
    private val json = Json { encodeDefaults = true }
    private fun Place.record() = PlaceRecord(id, canonicalSource, json.encodeToString(this), createdAt, trashedAt)
    private fun PlaceRecord.place() = json.decodeFromString<Place>(payload)
    private fun now() = clock.millis().coerceAtLeast(0)
    private fun all() = dao.all().map { it.place() }
    private fun requirePlace(id: String) = dao.find(id)?.place() ?: throw InputProblem("기록을 찾지 못했어요. 목록에서 다시 확인해 주세요.")

    fun snapshot(): List<Place> {
        dao.purge(now() - TRASH_RETENTION_MS)
        return all()
    }

    fun capture(text: String): CaptureResult {
        val links = Links.extract(text)
        var added = 0; var existing = 0; var restored = 0
        db.runInTransaction {
            dao.purge(now() - TRASH_RETENTION_MS)
            val current = all()
            val records = current.filter { it.canonicalSource != null }.associateBy { it.canonicalSource }.toMutableMap()
            val newCount = links.count { Links.canonical(it) !in records }
            if (current.size + newCount > MAX_RECORDS) throw InputProblem("기록은 최대 5,000건까지 보관할 수 있어요.")
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
            ensureExportable()
        }
        return CaptureResult(added, existing, restored)
    }

    fun save(id: String?, name: String, address: String, memo: String, menu: String, category: Category): String {
        var savedId = ""
        db.runInTransaction {
            val original = if (id == null) {
                if (dao.all().size >= MAX_RECORDS) throw InputProblem("기록은 최대 5,000건까지 보관할 수 있어요.")
                Place(UUID.randomUUID().toString(), createdAt = now(), updatedAt = now())
            } else requirePlace(id)
            if (original.trashedAt != null) throw InputProblem("휴지통에서 먼저 복원해 주세요.")
            val edited = Places.edit(original, name, address, memo, menu, category, maxOf(now(), original.updatedAt))
            if (id == null) dao.insert(edited.record()) else dao.update(edited.record())
            ensureExportable()
            savedId = edited.id
        }
        return savedId
    }

    fun toggleVisited(id: String) = db.runInTransaction {
        val place = requirePlace(id)
        if (!place.confirmed || place.trashedAt != null) throw InputProblem("확정한 장소에서 방문 상태를 바꿀 수 있어요.")
        dao.update(place.copy(visited = !place.visited, updatedAt = maxOf(now(), place.updatedAt)).record())
        ensureExportable()
    }

    fun trash(id: String) = db.runInTransaction {
        val place = requirePlace(id)
        val time = maxOf(now(), place.updatedAt)
        dao.update(place.copy(trashedAt = time, updatedAt = time).record())
        ensureExportable()
    }

    fun restore(id: String) = db.runInTransaction {
        val place = requirePlace(id)
        if (place.expired(now())) throw InputProblem("보관 기간이 지난 기록이에요.")
        dao.update(place.copy(trashedAt = null, updatedAt = maxOf(now(), place.updatedAt)).record())
        ensureExportable()
    }

    fun deletePermanently(id: String) {
        if (dao.deleteTrashed(id) != 1) throw InputProblem("휴지통의 기록만 영구 삭제할 수 있어요.")
    }

    fun clear() = db.runInTransaction { dao.clear() }
    fun export(): ByteArray = Backups.encode(snapshot(), now())
    fun preview(backup: Backup): ImportPlan = Backups.plan(all(), backup, now())
    fun import(backup: Backup): ImportPlan {
        var plan: ImportPlan? = null
        db.runInTransaction {
            dao.purge(now() - TRASH_RETENTION_MS)
            val checked = Backups.plan(all(), backup, now())
            checked.additions.forEach { dao.insert(it.record()) }
            ensureExportable()
            plan = checked
        }
        return requireNotNull(plan)
    }

    private fun ensureExportable() {
        // Leave room for header/timestamp growth so every committed dataset can be backed up.
        if (Backups.encode(all(), now()).size > MAX_BACKUP_BYTES - 1024) {
            throw InputProblem("백업 가능한 저장 용량을 넘었어요. 기록을 정리한 뒤 다시 시도해 주세요.")
        }
    }
}
