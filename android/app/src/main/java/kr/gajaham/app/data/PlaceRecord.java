package kr.gajaham.app.data;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;
import androidx.room.ColumnInfo;

@Entity(tableName = "places", indices = {@Index(value = {"ownerScope", "canonicalSource"}, unique = true)})
public class PlaceRecord {
    @PrimaryKey @NonNull public String id;
    @NonNull @ColumnInfo(defaultValue = "'guest'") public String ownerScope;
    @Nullable public String canonicalSource;
    @NonNull public String payload;
    public long createdAt;
    @Nullable public Long trashedAt;

    public PlaceRecord(@NonNull String id, @NonNull String ownerScope, @Nullable String canonicalSource, @NonNull String payload, long createdAt, @Nullable Long trashedAt) {
        this.id = id;
        this.ownerScope = ownerScope;
        this.canonicalSource = canonicalSource;
        this.payload = payload;
        this.createdAt = createdAt;
        this.trashedAt = trashedAt;
    }
}
