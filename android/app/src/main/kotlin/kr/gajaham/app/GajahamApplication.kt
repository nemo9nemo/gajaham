package kr.gajaham.app

import android.app.Application
import androidx.room.Room
import kr.gajaham.app.data.LocalDatabase
import kr.gajaham.app.data.LocalMigrations
import kr.gajaham.app.data.PlaceRepository

open class GajahamApplication : Application() {
    protected open fun buildDatabase(): LocalDatabase =
        Room.databaseBuilder(this, LocalDatabase::class.java, "gajaham-local.db")
            .addMigrations(LocalMigrations.SOURCE_KEYS_1_2).build()

    val repository by lazy {
        PlaceRepository(buildDatabase())
    }
}
