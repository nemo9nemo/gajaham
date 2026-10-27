package kr.gajaham.core

/** A previous queued receipt must not acknowledge the newest incoming intent. */
class ShareReceipts {
    private var latest = 0L
    @Volatile var committed = false
        private set
    @Volatile var handled = false
        private set
    @Volatile var owner: String? = null
        private set

    @Synchronized fun begin(scope: String? = null): Long { latest++; committed = false; handled = false; owner = scope; return latest }
    @Synchronized fun bind(receipt: Long, scope: String) { if (receipt == latest) owner = scope }
    @Synchronized fun complete(receipt: Long) { if (receipt == latest) { committed = true; handled = true } }
    @Synchronized fun reject(receipt: Long) { if (receipt == latest) { committed = false; handled = true } }
    @Synchronized fun restoreCommitted() { committed = true; handled = true }
    @Synchronized fun restoreHandled(scope: String?, saved: Boolean) { owner = scope; committed = saved; handled = true }
}
