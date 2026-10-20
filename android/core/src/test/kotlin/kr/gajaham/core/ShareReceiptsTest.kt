package kr.gajaham.core

import org.junit.Assert.*
import org.junit.Test

class ShareReceiptsTest {
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
