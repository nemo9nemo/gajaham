package kr.gajaham.core

import org.junit.Assert.*
import org.junit.Test

class ShareReceiptsTest {
    @Test fun rejectedShareIsHandledButNeverReportedCommitted() {
        val receipts = ShareReceipts()
        val old = receipts.begin("guest")
        val latest = receipts.begin("account:a")
        receipts.reject(old); assertFalse(receipts.handled)
        receipts.bind(old, "wrong"); assertEquals("account:a", receipts.owner)
        receipts.reject(latest); assertTrue(receipts.handled); assertFalse(receipts.committed)
        receipts.begin(); assertFalse(receipts.handled); assertNull(receipts.owner)
    }
    @Test fun olderQueuedCompletionCannotAcknowledgeANewerIntent() {
        val receipts = ShareReceipts()
        val first = receipts.begin()
        val second = receipts.begin()
        receipts.complete(first)
        assertFalse(receipts.committed)
        receipts.complete(second)
        assertTrue(receipts.committed)
    }

    @Test fun restoredAcknowledgmentDoesNotConsumeTheNextShare() {
        val receipts = ShareReceipts()
        receipts.restoreCommitted()
        assertTrue(receipts.committed)
        receipts.begin()
        assertFalse(receipts.committed)
    }
}
