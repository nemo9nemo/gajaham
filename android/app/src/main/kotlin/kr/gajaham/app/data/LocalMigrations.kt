package kr.gajaham.app.data

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.serialization.json.Json
import kr.gajaham.core.Place

object LocalMigrations {
    val LOCAL_SCOPES_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("ALTER TABLE places ADD COLUMN ownerScope TEXT NOT NULL DEFAULT 'guest'")
            db.execSQL("DROP INDEX index_places_canonicalSource")
            db.execSQL("CREATE UNIQUE INDEX index_places_ownerScope_canonicalSource ON places(ownerScope, canonicalSource)")
            db.execSQL("CREATE TABLE IF NOT EXISTS local_state (`key` TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(`key`))")
        }
    }
    val SOURCE_KEYS_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            val keys = mutableListOf<Pair<String, String?>>()
            db.query("SELECT id, payload FROM places").use { rows ->
                while (rows.moveToNext()) {
                    val place = Json.decodeFromString<Place>(rows.getString(1))
                    keys += rows.getString(0) to place.canonicalSource
                }
            }
            val sources = keys.mapNotNull { it.second }
            check(sources.distinct().size == sources.size) { "기록의 출처가 중복돼 업데이트를 완료하지 못했어요." }
            // Room runs the migration in a transaction. Keep payloads and user timestamps unchanged.
            db.execSQL("UPDATE places SET canonicalSource = NULL")
            keys.forEach { (id, key) ->
                db.execSQL("UPDATE places SET canonicalSource = ? WHERE id = ?", arrayOf(key, id))
            }
        }
    }
}
