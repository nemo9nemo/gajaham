package kr.gajaham.app.data;

import androidx.room.Database;
import androidx.room.RoomDatabase;

@Database(entities = {PlaceRecord.class}, version = 2, exportSchema = true)
public abstract class LocalDatabase extends RoomDatabase {
    public abstract PlaceDao places();
}
