package kr.gajaham.app.data;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;
import java.util.List;

@Dao
public interface PlaceDao {
    @Query("SELECT * FROM places ORDER BY createdAt DESC, id") List<PlaceRecord> all();
    @Query("SELECT * FROM places WHERE id = :id LIMIT 1") PlaceRecord find(String id);
    @Insert void insert(PlaceRecord place);
    @Update int update(PlaceRecord place);
    @Query("DELETE FROM places WHERE id = :id AND trashedAt IS NOT NULL") int deleteTrashed(String id);
    @Query("DELETE FROM places WHERE trashedAt IS NOT NULL AND trashedAt <= :cutoff") int purge(long cutoff);
    @Query("DELETE FROM places") void clear();
}
