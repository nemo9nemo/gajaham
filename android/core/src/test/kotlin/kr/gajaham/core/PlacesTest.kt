package kr.gajaham.core

import java.util.UUID
import org.junit.Assert.*
import org.junit.Test

class PlacesTest {
    private fun place(url: String? = "https://www.instagram.com/reel/AbC_12/?igsh=x") = Place(
        UUID.randomUUID().toString(), url, "가상 카페", "서울 가상로 1", memo = "다음 주에 가기", createdAt = 1000, updatedAt = 1000,
    )
    private fun backup(vararg records: Place) = Backup("gajaham-local-backup", 1, 2000, records.toList())
    private fun fails(action: () -> Unit) { assertThrows(InputProblem::class.java) { action() } }

    @Test fun instagramTrackingDoesNotCreateDuplicateButPostIdCaseMatters() {
        assertEquals(Links.canonical("https://instagram.com/reel/AbC_12?igsh=a"), Links.canonical("http://m.instagram.com/reel/AbC_12/?utm_source=x#part"))
        assertNotEquals(Links.canonical("https://instagram.com/p/AbC"), Links.canonical("https://instagram.com/p/abc"))
    }
    @Test fun ordinaryQueryAndEncodedPathRemainPartOfIdentity() {
        assertNotEquals(Links.canonical("https://example.com/place?id=1"), Links.canonical("https://example.com/place?id=2"))
        assertEquals("https://example.com/a%2Fb?id=1#section", Links.canonical("https://EXAMPLE.com:443/a%2Fb?id=1#section"))
        assertNotEquals(Links.canonical("https://example.com/#/place/1"), Links.canonical("https://example.com/#/place/2"))
    }
    @Test fun instagramNonDefaultPortsKeepSeparateCaptureAndBackupIdentity() {
        val standard = "https://instagram.com/p/A"
        val custom = "https://instagram.com:8443/p/A?variant=1#part"
        assertEquals(Links.canonical(standard), Links.canonical("https://instagram.com:443/p/A?igsh=x"))
        assertEquals(Links.canonical(standard), Links.canonical("http://instagram.com:80/p/A"))
        for (url in listOf(custom, "https://instagram.com:80/p/A?x=1", "http://instagram.com:443/p/A#part")) {
            assertEquals(url, Links.canonical(url))
            assertNotEquals(Links.canonical(standard), Links.canonical(url))
        }
        assertEquals(listOf(standard, custom), Links.extract("$standard $custom"))
        val encoded = Backups.encode(listOf(place(standard), place(custom)), 2000)
        val plan = Backups.plan(emptyList(), Backups.decode(encoded), 2000)
        assertEquals(2, plan.additions.size); assertEquals(0, plan.duplicates)
    }
    @Test fun credentialsUnsafeSchemesAndControlsAreRejected() {
        listOf("javascript:alert(1)", "file:///x", "https://user:secret@example.com", "https://", "https://example.com/\nfoo").forEach { fails { Links.validate(it) } }
    }
    @Test fun sharedTextExtractsDistinctLinksAndTrimsProsePunctuation() {
        assertEquals(listOf("https://instagram.com/p/A", "https://example.com/b"), Links.extract("여기 https://instagram.com/p/A. https://m.instagram.com/p/A/?igsh=1\n(https://example.com/b)"))
    }
    @Test fun noLinkAndOversizedBatchesAreRejected() {
        fails { Links.extract("여기 가자") }; fails { Links.extract("x".repeat(16_385)) }
        fails { Links.extract((1..11).joinToString(" ") { "https://example.com/$it" }) }
    }
    @Test fun exactLinksAndBalancedParenthesesKeepTheirOriginalResource() {
        assertEquals(listOf("https://example.com/place_(A)"), Links.extract("https://example.com/place_(A)"))
        assertEquals(listOf("https://example.com/place_(A)"), Links.extract("여기 (https://example.com/place_(A))"))
        assertEquals(listOf("https://example.com/a."), Links.extract("https://example.com/a."))
    }
    @Test fun pendingCaptureDoesNotInventAPlace() {
        val pending = Places.pending("https://instagram.com/p/A", 1000)
        assertFalse(pending.confirmed); assertEquals("", pending.name); assertEquals("", pending.address)
    }
    @Test fun confirmationNeedsBothFieldsAndPreservesSourceAndIdentity() {
        val pending = Places.pending("https://instagram.com/p/A?igsh=1", 1000)
        fails { Places.edit(pending, "카페", " ", "", "", Category.CAFE, 2000) }
        val edited = Places.edit(pending, " 카페 ", " 서울 가상로 1 ", " 기억 ", " 커피 ", Category.CAFE, 2000)
        assertEquals(pending.id, edited.id); assertEquals(pending.sourceUrl, edited.sourceUrl)
        assertTrue(edited.confirmed); assertEquals("기억", edited.memo)
    }
    @Test fun manualAndImportedRecordsAreValidated() {
        fails { Places.validate(place().copy(id = "not-an-id")) }
        fails { Places.validate(place().copy(sourceUrl = null, address = "")) }
        fails { Places.validate(place().copy(memo = "x".repeat(2001))) }
        fails { Places.validate(place().copy(updatedAt = 0)) }
        fails { Places.validate(place().copy(trashedAt = 1)) }
    }
    @Test fun backupRoundTripPreservesPrivateTextAndTrashState() {
        val original = place().copy(memo = "비공개 <메모>\n\"커피\"", trashedAt = 1500, updatedAt = 1500)
        assertEquals(listOf(original), Backups.decode(Backups.encode(listOf(original), 2000)).records)
    }
    @Test fun backupRequiresExplicitHeaderAndSupportedVersion() {
        fails { Backups.decode("{\"exportedAt\":2000,\"records\":[]}".toByteArray()) }
        fails { Backups.plan(emptyList(), backup().copy(version = 2), 2000) }
        fails { Backups.plan(emptyList(), backup().copy(format = "other"), 2000) }
    }
    @Test fun invalidUtf8AndTooLargeFilesAreRejected() {
        val text = Backups.encode(listOf(place().copy(memo = "UTF8_MARKER")), 2000).decodeToString()
        val marker = text.indexOf("UTF8_MARKER")
        val corrupt = text.substring(0, marker).toByteArray() + byteArrayOf(0xC3.toByte(), 0x28) + text.substring(marker + 11).toByteArray()
        fails { Backups.decode(corrupt) }
        fails { Backups.decode(ByteArray(MAX_BACKUP_BYTES + 1)) }
    }
    @Test fun duplicateIdsOrCanonicalSourcesInvalidateWholeBackup() {
        val original = place()
        fails { Backups.plan(emptyList(), backup(original, original.copy(sourceUrl = "https://example.com/other")), 2000) }
        fails { Backups.plan(emptyList(), backup(original, original.copy(id = UUID.randomUUID().toString(), sourceUrl = "https://instagram.com/reel/AbC_12?igsh=other")), 2000) }
    }
    @Test fun importKeepsCurrentEditsAndSkipsIdAndSourceConflicts() {
        val original = place()
        val duplicate = original.copy(id = UUID.randomUUID().toString(), memo = "덮어쓸 수 없음")
        val idConflict = original.copy(sourceUrl = "https://example.com/different")
        val extra = place("https://example.com/new")
        val plan = Backups.plan(listOf(original), backup(duplicate, idConflict, extra), 2000)
        assertEquals(listOf(extra), plan.additions); assertEquals(2, plan.duplicates); assertEquals("다음 주에 가기", original.memo)
    }
    @Test fun expiredTrashIsNeverRevivedByImportOrExport() {
        val old = place().copy(trashedAt = 1500, updatedAt = 1500)
        val time = 1500 + TRASH_RETENTION_MS
        assertEquals(1, Backups.plan(emptyList(), backup(old), time).expired)
        assertTrue(Backups.decode(Backups.encode(listOf(old), time)).records.isEmpty())
        assertFalse(old.expired(time - 1))
    }
    @Test fun directionsRequiresConfirmedPlaceAndEscapesAddress() {
        fails { Links.directions(Places.pending("https://example.com", 1000)) }
        val uri = Links.directions(place(null))
        assertTrue(uri.startsWith("geo:0,0?q=")); assertFalse(uri.contains(' ')); assertTrue(uri.contains("%"))
    }
}
