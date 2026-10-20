package kr.gajaham.app

import android.app.Application
import androidx.room.Room
import kr.gajaham.app.data.LocalDatabase
import kr.gajaham.app.data.PlaceRepository

open class GajahamApplication : Application() {
    protected open fun buildDatabase(): LocalDatabase =
        Room.databaseBuilder(this, LocalDatabase::class.java, "gajaham-local.db").build()

    val repository by lazy {
        PlaceRepository(buildDatabase())
    }
}
