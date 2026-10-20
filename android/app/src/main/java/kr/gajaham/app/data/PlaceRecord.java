package kr.gajaham.app.data;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;

@Entity(tableName = "places", indices = {@Index(value = "canonicalSource", unique = true)})
public class PlaceRecord {
    @PrimaryKey @NonNull public String id;
    @Nullable public String canonicalSource;
    @NonNull public String payload;
    public long createdAt;
    @Nullable public Long trashedAt;

    public PlaceRecord(@NonNull String id, @Nullable String canonicalSource, @NonNull String payload, long createdAt, @Nullable Long trashedAt) {
        this.id = id;
        this.canonicalSource = canonicalSource;
        this.payload = payload;
        this.createdAt = createdAt;
        this.trashedAt = trashedAt;
    }
}
