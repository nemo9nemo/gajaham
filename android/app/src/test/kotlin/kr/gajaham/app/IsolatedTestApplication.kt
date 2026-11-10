package kr.gajaham.app

import androidx.room.Room
import kr.gajaham.app.data.LocalDatabase

// UI tests start with an isolated DB. File persistence is tested separately.
class IsolatedTestApplication : GajahamApplication() {
    override fun buildAuth() = kr.gajaham.app.auth.UnavailableAuth
    override fun buildDatabase(): LocalDatabase =
        Room.inMemoryDatabaseBuilder(this, LocalDatabase::class.java).build()
}
