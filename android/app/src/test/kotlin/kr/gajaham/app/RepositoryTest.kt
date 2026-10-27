package kr.gajaham.app

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import kr.gajaham.app.data.*
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
    @Before fun setup() { context.deleteDatabase("repository-test.db"); db = open(); repo = PlaceRepository(db, clock) }
    private fun open() = Room.databaseBuilder(context, LocalDatabase::class.java, "repository-test.db")
        .addMigrations(LocalMigrations.SOURCE_KEYS_1_2, LocalMigrations.LOCAL_SCOPES_2_3).allowMainThreadQueries().build()
    @After fun teardown() { db.close(); context.deleteDatabase("repository-test.db") }
    private fun confirm() { repo.save(repo.snapshot().first().id, "가상 카페", "서울 가상로 1", "내 메모", "커피", Category.CAFE) }

    private fun migrate(version: Int): Place {
        db.close(); context.deleteDatabase("repository-test.db")
        val original = Places.pending("https://instagram.com:8443/p/LEGACY?variant=1#part", clock.time)
            .copy(name = "기존 카페", address = "서울 가상로 1", memo = "사용자 메모", visited = true)
        SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath("repository-test.db"), null).use { old ->
            old.execSQL("CREATE TABLE places (id TEXT NOT NULL, canonicalSource TEXT, payload TEXT NOT NULL, createdAt INTEGER NOT NULL, trashedAt INTEGER, PRIMARY KEY(id))")
            old.execSQL("CREATE UNIQUE INDEX index_places_canonicalSource ON places(canonicalSource)")
            old.execSQL("CREATE TABLE room_master_table (id INTEGER PRIMARY KEY, identity_hash TEXT)")
            old.execSQL("INSERT INTO room_master_table VALUES (42, '0d53ed534da2da43cc3d0a5c0176099a')")
            old.execSQL("INSERT INTO places VALUES (?, ?, ?, ?, NULL)", arrayOf<Any?>(original.id,
                if (version == 1) "https://www.instagram.com/p/LEGACY" else original.canonicalSource, Json.encodeToString(original), original.createdAt))
            old.version = version
        }
        db = open(); repo = PlaceRepository(db, clock)
        return original
    }
    @Test fun versionOneMigratesSourceKeysAndGuestOwnershipWithoutChangingPayload() {
        val original = migrate(1)
        assertEquals(original, repo.snapshot().single())
        assertEquals(original.canonicalSource, db.places().find(GUEST, original.id).canonicalSource)
        assertEquals(1, repo.capture("https://instagram.com/p/LEGACY").added)
        assertTrue(repo.forOwner(accountScope("a")).snapshot().isEmpty())
    }
    @Test fun versionTwoMigratesAllRecordsToGuestAndPersistsNewScopes() {
        val original = migrate(2)
        assertEquals(original, repo.snapshot().single())
        val owner = accountScope("a")
        repo.forOwner(owner).capture(url); repo.selectOwner(owner)
        db.close(); db = open(); repo = PlaceRepository(db, clock)
        assertEquals(original, repo.snapshot().single())
        assertEquals(owner, repo.selectedOwner())
        assertEquals(1, repo.forOwner(owner).snapshot().size)
    }
    @Test fun receptionSurvivesDatabaseReopen() {
        repo.capture(url); val before = repo.snapshot()
        db.close(); db = open(); repo = PlaceRepository(db, clock)
        assertEquals(before, repo.snapshot())
    }
    @Test fun repeatedShareAndTrashReceptionPreserveUserEdits() {
        repo.capture(url); confirm(); val before = repo.snapshot().single()
        assertEquals(1, repo.capture("https://instagram.com/p/TEST/?igsh=b").existing)
        assertEquals(before, repo.snapshot().single())
        repo.trash(before.id); assertEquals(1, repo.capture(url).restored)
        assertEquals(before.memo, repo.snapshot().single().memo)
    }
    @Test fun expiredTrashRemovedBeforeRecapture() {
        repo.capture(url); val id = repo.snapshot().single().id; repo.trash(id)
        clock.time += TRASH_RETENTION_MS
        assertEquals(1, repo.capture(url).added); assertNotEquals(id, repo.snapshot().single().id)
    }
    @Test fun invalidBatchLeavesNoPartialRecord() {
        assertThrows(InputProblem::class.java) { repo.capture("https://example.com/valid https://user:secret@example.com") }
        assertTrue(repo.snapshot().isEmpty())
    }
    @Test fun concurrentReceptionCreatesOneRecord() {
        val executor = Executors.newFixedThreadPool(4)
        try { executor.invokeAll((1..12).map { Callable { repo.capture(url) } }).forEach { it.get() }; assertEquals(1, repo.snapshot().size) }
        finally { executor.shutdownNow() }
    }
    @Test fun editsTrashRestoreAndPermanentDeletePersist() {
        repo.capture(url); confirm(); val id = repo.snapshot().single().id
        repo.toggleVisited(id); assertTrue(repo.snapshot().single().visited)
        assertThrows(InputProblem::class.java) { repo.deletePermanently(id) }
        repo.trash(id); repo.restore(id); assertNull(repo.snapshot().single().trashedAt)
        repo.trash(id); repo.deletePermanently(id); assertTrue(repo.snapshot().isEmpty())
    }
    @Test fun sameLinkAllowedInEachScopeButIdsCannotCrossScopes() {
        repo.capture(url); confirm(); val id = repo.snapshot().single().id
        val account = repo.forOwner(accountScope("a"))
        assertTrue(account.snapshot().isEmpty()); assertEquals(1, account.capture(url).added)
        assertThrows(InputProblem::class.java) { account.save(id, "침범", "주소", "", "", Category.OTHER) }
        assertThrows(InputProblem::class.java) { account.trash(id) }
        assertThrows(InputProblem::class.java) { account.restore(id) }
        assertThrows(InputProblem::class.java) { account.deletePermanently(id) }
        assertEquals("가상 카페", repo.snapshot().single().name)
    }
    @Test fun clearAffectsOnlyCurrentScope() {
        repo.capture(url); val a = repo.forOwner(accountScope("a")); val b = repo.forOwner(accountScope("b"))
        a.capture(url); b.capture(url); a.clear()
        assertTrue(a.snapshot().isEmpty()); assertEquals(1, b.snapshot().size); assertEquals(1, repo.snapshot().size)
    }
    @Test fun explicitGuestMoveLeavesDuplicatesAndNeverOverwrites() {
        repo.capture("$url https://example.com/new"); confirm()
        val account = repo.forOwner(accountScope("a")); account.capture(url)
        val before = account.snapshot().single()
        assertEquals(MoveResult(1, 1), account.moveGuestRecords())
        assertEquals(before, account.snapshot().first { it.id == before.id })
        assertEquals(1, repo.snapshot().size); assertEquals(2, account.snapshot().size)
    }
    @Test fun deletionTransactionBlocksOldAndNewRepositoryWritesAcrossReopen() {
        repo.capture(url)
        val a = repo.forOwner(accountScope("a")); a.capture(url); repo.selectOwner(a.owner)
        a.beginDeletion()
        assertEquals("pending", a.deletionState()); assertEquals(GUEST, repo.selectedOwner())
        assertTrue(a.snapshot().isEmpty()); assertEquals(1, repo.snapshot().size)
        assertThrows(InputProblem::class.java) { a.capture(url) }
        db.close(); db = open(); repo = PlaceRepository(db, clock)
        assertThrows(InputProblem::class.java) { repo.forOwner(a.owner).save(null, "새 기록", "주소", "", "", Category.OTHER) }
        repo.forOwner(a.owner).finishDeletion(); assertEquals("deleted", repo.deletionState(a.owner))
    }
    @Test fun globalCapacityFailureRollsBackInsertion() {
        repeat(2) {
            val row = Place("large$it", name = "가상 장소", address = "주소", memo = "x".repeat(MAX_BACKUP_BYTES / 2), createdAt = 0, updatedAt = 0)
            db.places().insert(PlaceRecord(row.id, accountScope("b"), null, Json.encodeToString(row), 0, null))
        }
        assertThrows(InputProblem::class.java) { repo.capture(url) }
        assertTrue(repo.snapshot().isEmpty())
    }
    private class MutableClock(var time: Long) : Clock() {
        override fun getZone(): ZoneId = ZoneId.of("UTC")
        override fun withZone(zone: ZoneId): Clock = this
        override fun instant(): Instant = Instant.ofEpochMilli(time)
    }
}
