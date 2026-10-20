package kr.gajaham.core

/** A previous queued receipt must not acknowledge the newest incoming intent. */
class ShareReceipts {
    private var latest = 0L
    @Volatile var committed = false
        private set

    @Synchronized fun begin(): Long { latest++; committed = false; return latest }
    @Synchronized fun complete(receipt: Long) { if (receipt == latest) committed = true }
    @Synchronized fun restoreCommitted() { committed = true }
}
