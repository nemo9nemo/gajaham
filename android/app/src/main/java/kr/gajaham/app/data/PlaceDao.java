package kr.gajaham.app.data;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;
import java.util.List;

@Dao
public interface PlaceDao {
    @Query("SELECT * FROM places WHERE ownerScope = :owner ORDER BY createdAt DESC, id") List<PlaceRecord> all(String owner);
    @Query("SELECT * FROM places") List<PlaceRecord> deviceRecords();
    @Query("SELECT * FROM places WHERE id = :id AND ownerScope = :owner LIMIT 1") PlaceRecord find(String owner, String id);
    @Insert void insert(PlaceRecord place);
    @Update int update(PlaceRecord place);
    @Query("DELETE FROM places WHERE ownerScope = :owner AND id = :id AND trashedAt IS NOT NULL") int deleteTrashed(String owner, String id);
    @Query("DELETE FROM places WHERE trashedAt IS NOT NULL AND trashedAt <= :cutoff") int purge(long cutoff);
    @Query("DELETE FROM places WHERE ownerScope = :owner") void clear(String owner);
}
