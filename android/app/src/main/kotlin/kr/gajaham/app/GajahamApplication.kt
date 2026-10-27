package kr.gajaham.app

import android.app.Application
import androidx.room.Room
import kr.gajaham.app.data.LocalDatabase
import kr.gajaham.app.data.LocalMigrations
import kr.gajaham.app.data.PlaceRepository
import kr.gajaham.app.auth.AuthGateway
import kr.gajaham.app.auth.FirebaseAuthGateway

open class GajahamApplication : Application() {
    protected open fun buildDatabase(): LocalDatabase =
        Room.databaseBuilder(this, LocalDatabase::class.java, "gajaham-local.db")
            .addMigrations(LocalMigrations.SOURCE_KEYS_1_2, LocalMigrations.LOCAL_SCOPES_2_3).build()

    protected open fun buildAuth(): AuthGateway = FirebaseAuthGateway.create(this)
    val auth by lazy { buildAuth() }

    val repository by lazy {
        PlaceRepository(buildDatabase())
    }
}
