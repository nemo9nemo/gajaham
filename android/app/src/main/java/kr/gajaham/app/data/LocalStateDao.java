package kr.gajaham.app.data;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

@Dao
public interface LocalStateDao {
    @Query("SELECT value FROM local_state WHERE `key` = :key") String get(String key);
    @Query("SELECT COUNT(*) FROM local_state WHERE `key` LIKE 'deletion:%' AND value = 'pending'") int pendingDeletions();
    @Insert(onConflict = OnConflictStrategy.REPLACE) void put(LocalState state);
}
