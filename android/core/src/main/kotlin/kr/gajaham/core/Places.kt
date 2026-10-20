package kr.gajaham.core

import java.net.URI
import java.net.URLEncoder
import java.util.UUID
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

const val MAX_BACKUP_BYTES = 2 * 1024 * 1024
const val MAX_RECORDS = 5_000
const val TRASH_RETENTION_MS = 30L * 24 * 60 * 60 * 1000

class InputProblem(message: String) : IllegalArgumentException(message)

@Serializable
enum class Category(val label: String) { FOOD("맛집"), CAFE("카페"), BAR("술집"), TRAVEL("여행"), OTHER("기타") }

@Serializable
data class Place(
    val id: String,
    val sourceUrl: String? = null,
    val name: String = "",
    val address: String = "",
    val memo: String = "",
    val menu: String = "",
    val category: Category = Category.OTHER,
    val visited: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long,
    val trashedAt: Long? = null,
) {
    val confirmed: Boolean get() = name.isNotBlank() && address.isNotBlank()
    val canonicalSource: String? get() = sourceUrl?.let(Links::canonical)
    fun expired(now: Long) = trashedAt?.let { it <= now - TRASH_RETENTION_MS } ?: false
}

object Links {
    fun validate(value: String): String {
        val text = value.trim()
        if (text.length !in 1..2048 || text.any { it.isISOControl() }) throw InputProblem("링크 길이와 형식을 확인해 주세요.")
        val uri = try { URI(text) } catch (_: Exception) { throw InputProblem("올바른 웹 링크를 입력해 주세요.") }
        if (uri.scheme?.lowercase() !in setOf("http", "https") || uri.host.isNullOrBlank() || uri.rawUserInfo != null || uri.port !in -1..65535) {
            throw InputProblem("http 또는 https 웹 링크만 저장할 수 있어요.")
        }
        return text
    }

    fun canonical(value: String): String {
        val uri = URI(validate(value))
        val host = uri.host.lowercase()
        val instagram = host in setOf("instagram.com", "www.instagram.com", "m.instagram.com")
        val path = uri.rawPath.ifEmpty { "/" }
        if (instagram && Regex("^/(p|reel|reels|tv)/[A-Za-z0-9_-]+/?$").matches(path)) {
            return "https://www.instagram.com${path.trimEnd('/')}"
        }
        val scheme = uri.scheme.lowercase()
        val port = if ((scheme == "https" && uri.port == 443) || (scheme == "http" && uri.port == 80) || uri.port == -1) "" else ":${uri.port}"
        return "$scheme://$host$port$path${uri.rawQuery?.let { "?$it" }.orEmpty()}${uri.rawFragment?.let { "#$it" }.orEmpty()}"
    }

    fun extract(text: String): List<String> {
        if (text.length > 16_384) throw InputProblem("한 번에 전달할 수 있는 텍스트 양을 넘었어요.")
        val whole = text.trim()
        if (whole.startsWith("http", ignoreCase = true) && whole.none { it.isWhitespace() }) {
            return listOf(validate(whole))
        }
        val candidates = Regex("https?://[^\\s<>\\\"]+", RegexOption.IGNORE_CASE).findAll(text)
            .map { match ->
                var value = match.value.trimEnd('.', ',', '!', '。', '，')
                for ((close, open) in listOf(')' to '(', ']' to '[', '}' to '{')) {
                    while (value.endsWith(close) && value.count { it == close } > value.count { it == open }) value = value.dropLast(1)
                }
                value
            }.toList()
        if (candidates.isEmpty()) throw InputProblem("저장할 웹 링크를 찾지 못했어요. 링크를 붙여 넣거나 장소를 직접 입력해 주세요.")
        if (candidates.size > 10) throw InputProblem("링크는 한 번에 10개까지 받을 수 있어요.")
        return candidates.map(::validate).distinctBy(::canonical)
    }

    fun directions(place: Place): String {
        if (!place.confirmed) throw InputProblem("장소 이름과 주소를 먼저 확인해 주세요.")
        val query = URLEncoder.encode("${place.address} ${place.name}", "UTF-8").replace("+", "%20")
        return "geo:0,0?q=$query"
    }
}

object Places {
    fun pending(url: String, now: Long) = Place(UUID.randomUUID().toString(), Links.validate(url), createdAt = now, updatedAt = now)

    fun validate(place: Place) {
        try {
            if (UUID.fromString(place.id).toString() != place.id) throw IllegalArgumentException()
        } catch (_: Exception) { throw InputProblem("기록 ID가 올바르지 않아요.") }
        place.sourceUrl?.let(Links::validate)
        if (place.name.length > 200 || place.address.length > 500 || place.memo.length > 2000 || place.menu.length > 200) {
            throw InputProblem("기록의 입력 길이를 확인해 주세요.")
        }
        if (place.createdAt < 0 || place.updatedAt < place.createdAt || (place.trashedAt != null && place.trashedAt < place.createdAt)) {
            throw InputProblem("기록 시간이 올바르지 않아요.")
        }
        if (place.sourceUrl == null && !place.confirmed) throw InputProblem("직접 저장하려면 장소 이름과 주소가 필요해요.")
    }

    fun edit(original: Place, name: String, address: String, memo: String, menu: String, category: Category, now: Long): Place {
        if (name.isBlank() || address.isBlank()) throw InputProblem("장소 이름과 주소를 모두 입력해 주세요.")
        val edited = original.copy(name = name.trim(), address = address.trim(), memo = memo.trim(), menu = menu.trim(), category = category, updatedAt = maxOf(now, original.createdAt))
        validate(edited)
        return edited
    }
}

@Serializable
data class Backup(val format: String, val version: Int, val exportedAt: Long, val records: List<Place>)
data class ImportPlan(val additions: List<Place>, val duplicates: Int, val expired: Int)

object Backups {
    private val json = Json { encodeDefaults = true; prettyPrint = true }

    fun encode(records: List<Place>, now: Long): ByteArray {
        val backup = Backup("gajaham-local-backup", 1, now, records.filterNot { it.expired(now) })
        validate(backup)
        val bytes = json.encodeToString(backup).toByteArray(Charsets.UTF_8)
        if (bytes.size > MAX_BACKUP_BYTES) throw InputProblem("백업 크기가 2MiB를 넘었어요. 기록을 정리한 뒤 다시 시도해 주세요.")
        return bytes
    }

    fun decode(bytes: ByteArray): Backup {
        if (bytes.size > MAX_BACKUP_BYTES) throw InputProblem("2MiB 이하의 가자함 백업 파일을 선택해 주세요.")
        val backup = try { json.decodeFromString<Backup>(bytes.decodeToString(throwOnInvalidSequence = true)) }
        catch (_: Exception) { throw InputProblem("가자함 백업 형식을 확인해 주세요. 현재 기록은 바뀌지 않았어요.") }
        validate(backup)
        return backup
    }

    private fun validate(backup: Backup) {
        if (backup.format != "gajaham-local-backup" || backup.version != 1 || backup.exportedAt < 0) throw InputProblem("지원하지 않는 백업 형식이나 버전이에요.")
        if (backup.records.size > MAX_RECORDS) throw InputProblem("백업은 5,000건까지 가져올 수 있어요.")
        backup.records.forEach(Places::validate)
        if (backup.records.map { it.id }.distinct().size != backup.records.size) throw InputProblem("백업에 중복된 기록 ID가 있어요.")
        val sources = backup.records.mapNotNull { it.canonicalSource }
        if (sources.distinct().size != sources.size) throw InputProblem("백업에 중복된 출처가 있어요.")
    }

    fun plan(existing: List<Place>, backup: Backup, now: Long): ImportPlan {
        validate(backup)
        val current = existing.filterNot { it.expired(now) }
        val ids = current.map { it.id }.toMutableSet()
        val urls = current.mapNotNull { it.canonicalSource }.toMutableSet()
        var duplicates = 0
        var expired = 0
        val additions = backup.records.filter { incoming ->
            when {
                incoming.expired(now) -> { expired++; false }
                incoming.id in ids || (incoming.canonicalSource != null && incoming.canonicalSource in urls) -> { duplicates++; false }
                else -> { ids.add(incoming.id); incoming.canonicalSource?.let(urls::add); true }
            }
        }
        if (current.size + additions.size > MAX_RECORDS) throw InputProblem("최대 5,000건을 넘어요. 현재 기록은 바뀌지 않았어요.")
        return ImportPlan(additions, duplicates, expired)
    }
}
