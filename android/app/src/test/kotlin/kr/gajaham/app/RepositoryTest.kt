package kr.gajaham.app

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import kr.gajaham.app.data.LocalDatabase
import kr.gajaham.app.data.LocalMigrations
import kr.gajaham.app.data.PlaceRepository
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kr.gajaham.core.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RepositoryTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()
    private lateinit var db: LocalDatabase
    private lateinit var repo: PlaceRepository
    private val clock = MutableClock(10_000)
    private val url = "https://www.instagram.com/p/TEST?igsh=a"

    @Before fun setup() {
        context.deleteDatabase("repository-test.db")
        db = open(); repo = PlaceRepository(db, clock)
    }
    private fun open() = Room.databaseBuilder(context, LocalDatabase::class.java, "repository-test.db")
        .addMigrations(LocalMigrations.SOURCE_KEYS_1_2).allowMainThreadQueries().build()
    @After fun teardown() { db.close(); context.deleteDatabase("repository-test.db") }
    private fun confirm() {
        val id = repo.snapshot().first().id
        repo.save(id, "가상 카페", "서울 가상로 1", "꼭 먹을 메뉴", "커피", Category.CAFE)
    }

    private fun reopenVersionOneWithLegacyPortKey(): Place {
        db.close(); context.deleteDatabase("repository-test.db")
        val original = Places.pending("https://instagram.com:8443/p/LEGACY?variant=1#part", clock.time)
            .copy(name = "기존 카페", address = "서울 가상로 1", memo = "사용자 메모", visited = true)
        SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath("repository-test.db"), null).use { old ->
            old.execSQL("CREATE TABLE places (id TEXT NOT NULL, canonicalSource TEXT, payload TEXT NOT NULL, createdAt INTEGER NOT NULL, trashedAt INTEGER, PRIMARY KEY(id))")
            old.execSQL("CREATE UNIQUE INDEX index_places_canonicalSource ON places(canonicalSource)")
            old.execSQL("CREATE TABLE room_master_table (id INTEGER PRIMARY KEY, identity_hash TEXT)")
            old.execSQL("INSERT INTO room_master_table VALUES (42, '0d53ed534da2da43cc3d0a5c0176099a')")
            old.execSQL("INSERT INTO places VALUES (?, ?, ?, ?, NULL)", arrayOf<Any?>(original.id,
                "https://www.instagram.com/p/LEGACY", Json.encodeToString(original), original.createdAt))
            old.version = 1
        }
        db = open(); repo = PlaceRepository(db, clock)
        return original
    }

    @Test fun versionOnePortKeyMigratesBeforeCaptureWithoutChangingUserData() {
        val original = reopenVersionOneWithLegacyPortKey()
        assertEquals(1, repo.capture("https://instagram.com/p/LEGACY").added)
        assertEquals(original, repo.snapshot().first { it.id == original.id })
        assertEquals(original.canonicalSource, db.places().find(original.id).canonicalSource)
        assertEquals(2, repo.snapshot().size)
        assertEquals(1, repo.capture(original.sourceUrl!!).existing)
        db.close(); db = open(); repo = PlaceRepository(db, clock)
        assertEquals(2, repo.snapshot().size)
    }

    @Test fun versionOnePortKeyMigratesBeforeImportWithoutUniqueConflict() {
        val original = reopenVersionOneWithLegacyPortKey()
        val incoming = Places.pending("https://instagram.com/p/LEGACY", clock.time)
        val backup = Backup("gajaham-local-backup", 1, clock.time, listOf(incoming))
        assertEquals(1, repo.import(backup).additions.size)
        assertEquals(original, repo.snapshot().first { it.id == original.id })
        assertEquals(setOf(original.canonicalSource, incoming.canonicalSource), db.places().all().map { it.canonicalSource }.toSet())
        assertEquals(2, Backups.decode(repo.export()).records.size)
    }

    @Test fun receptionSurvivesDatabaseCloseAndReopen() {
        repo.capture(url); val original = repo.snapshot().single()
        db.close(); db = open(); repo = PlaceRepository(db, clock)
        assertEquals(original, repo.snapshot().single())
    }
    @Test fun repeatedShareAndTrashReceptionPreserveUserEdits() {
        repo.capture(url); confirm(); val original = repo.snapshot().single()
        assertEquals(1, repo.capture("https://instagram.com/p/TEST/?igsh=b").existing)
        assertEquals(original, repo.snapshot().single())
        repo.trash(original.id)
        assertEquals(1, repo.capture(url).restored)
        val restored = repo.snapshot().single()
        assertEquals(original.memo, restored.memo); assertNull(restored.trashedAt); assertEquals(original.id, restored.id)
    }
    @Test fun expiredTrashIsRemovedBeforeRecapture() {
        repo.capture(url); val id = repo.snapshot().single().id; repo.trash(id)
        clock.time += TRASH_RETENTION_MS
        assertEquals(1, repo.capture(url).added)
        assertNotEquals(id, repo.snapshot().single().id)
    }
    @Test fun invalidInputDoesNotPartiallySaveBatch() {
        assertThrows(InputProblem::class.java) { repo.capture("https://example.com/valid https://user:secret@example.com") }
        assertTrue(repo.snapshot().isEmpty())
    }
    @Test fun concurrentReceptionCreatesOnlyOneRecord() {
        val executor = Executors.newFixedThreadPool(4)
        try {
            executor.invokeAll((1..12).map { Callable { repo.capture(url) } }).forEach { it.get() }
            assertEquals(1, repo.snapshot().size)
        } finally { executor.shutdownNow() }
    }
    @Test fun visitEditTrashRestoreAndPermanentDeleteArePersisted() {
        repo.capture(url); confirm(); val id = repo.snapshot().single().id
        repo.toggleVisited(id)
        repo.save(id, "수정 이름", "다른 주소", "내 메모", "커피", Category.FOOD)
        assertTrue(repo.snapshot().single().visited)
        assertThrows(InputProblem::class.java) { repo.deletePermanently(id) }
        repo.trash(id); repo.restore(id); assertNull(repo.snapshot().single().trashedAt)
        repo.trash(id); repo.deletePermanently(id); assertTrue(repo.snapshot().isEmpty())
    }
    @Test fun importRechecksDuplicatesAfterPreview() {
        val incoming = Places.pending(url, clock.time)
        val backup = Backup("gajaham-local-backup", 1, clock.time, listOf(incoming))
        assertEquals(1, repo.preview(backup).additions.size)
        repo.capture(url)
        assertEquals(1, repo.import(backup).duplicates)
        assertEquals(1, repo.snapshot().size)
    }
    @Test fun expiredExistingTrashDoesNotSuppressAnActiveBackup() {
        repo.capture(url); confirm()
        val backup = Backups.decode(repo.export())
        repo.trash(repo.snapshot().single().id)
        clock.time += TRASH_RETENTION_MS
        assertEquals(1, repo.preview(backup).additions.size)
        assertEquals(1, repo.import(backup).additions.size)
        assertEquals(backup.records, repo.snapshot())
    }
    @Test fun oversizedMergedBackupRollsBackAllInsertions() {
        fun batch() = Backup("gajaham-local-backup", 1, clock.time, (1..450).map {
            Place(UUID.randomUUID().toString(), name = "카페", address = "서울", memo = "x".repeat(2000), createdAt = clock.time, updatedAt = clock.time)
        })
        repo.import(Backups.decode(Backups.encode(batch().records, clock.time)))
        val before = repo.snapshot()
        assertThrows(InputProblem::class.java) { repo.import(Backups.decode(Backups.encode(batch().records, clock.time))) }
        assertEquals(before, repo.snapshot())
    }
    @Test fun invalidBackupLeavesCurrentRecordsAndExportRestoresToNewDatabase() {
        repo.capture(url); confirm(); val bytes = repo.export(); val before = repo.snapshot()
        assertThrows(InputProblem::class.java) { repo.import(Backup("wrong", 1, clock.time, emptyList())) }
        assertEquals(before, repo.snapshot())
        repo.clear(); repo.import(Backups.decode(bytes)); assertEquals(before, repo.snapshot())
    }

    private class MutableClock(var time: Long) : Clock() {
        override fun getZone(): ZoneId = ZoneId.of("UTC")
        override fun withZone(zone: ZoneId): Clock = this
        override fun instant(): Instant = Instant.ofEpochMilli(time)
    }
}
