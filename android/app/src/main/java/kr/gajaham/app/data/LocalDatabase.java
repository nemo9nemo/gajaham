package kr.gajaham.app.data;

import androidx.room.Database;
import androidx.room.RoomDatabase;

@Database(entities = {PlaceRecord.class, LocalState.class}, version = 3, exportSchema = true)
public abstract class LocalDatabase extends RoomDatabase {
    public abstract PlaceDao places();
    public abstract LocalStateDao state();
}
