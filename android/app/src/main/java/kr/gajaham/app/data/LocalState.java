package kr.gajaham.app.data;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "local_state")
public class LocalState {
    @PrimaryKey @NonNull public String key;
    @NonNull public String value;
    public LocalState(@NonNull String key, @NonNull String value) { this.key = key; this.value = value; }
}
