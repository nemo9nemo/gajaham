# Room and Kotlin serialization publish their own consumer rules.
# Firebase Auth may emit an email in informational SDK logs. Remove these in release.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
