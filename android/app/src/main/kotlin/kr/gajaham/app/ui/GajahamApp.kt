package kr.gajaham.app.ui

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.LocalDate
import kr.gajaham.app.PlacesViewModel
import kr.gajaham.core.*

private val Green = Color(0xFF0F5C4C)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GajahamApp(model: PlacesViewModel, openExternal: (String) -> Unit) {
    val state by model.state.collectAsStateWithLifecycle()
    val selected = state.records.find { it.id == state.selectedId }
    val snackbar = remember { SnackbarHostState() }
    var exportWarning by rememberSaveable { mutableStateOf(false) }
    var clearWarning by rememberSaveable { mutableStateOf(false) }
    var permanentId by rememberSaveable { mutableStateOf<String?>(null) }
    var trashWarning by rememberSaveable { mutableStateOf(false) }
    var editorDirty by remember { mutableStateOf(false) }
    var discardWarning by rememberSaveable { mutableStateOf(false) }
    val exportFile = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri -> if (uri != null) model.export(uri) }
    val importFile = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) model.previewImport(uri) }
    val root = state.route in setOf("home", "inbox", "settings")
    fun leave() {
        editorDirty = false
        val route = if (state.route == "edit" && selected != null) { if (selected.confirmed) "detail" else "inbox" } else "home"
        model.navigate(route, if (route == "detail") selected?.id else null)
    }
    val back = { if (!state.busy) { if (state.route == "edit" && editorDirty) discardWarning = true else leave() } }
    BackHandler(!root) { back() }

    LaunchedEffect(state.notice) {
        state.notice?.let { message -> snackbar.showSnackbar(message); model.dismissNotice() }
    }
    val colors = if (isSystemInDarkTheme()) darkColorScheme(primary = Color(0xFF91D5BD), secondary = Color(0xFFFFB486))
        else lightColorScheme(primary = Green, secondary = Color(0xFFC2571A), background = Color(0xFFF3F5F2), surface = Color.White)
    MaterialTheme(colorScheme = colors) {
        Scaffold(
            topBar = {
                TopAppBar(title = { Text(when (state.route) {
                    "home" -> "내 장소"; "inbox" -> "처리함"; "settings" -> "설정"
                    "add" -> "링크 추가"; "edit" -> if (selected == null) "직접 장소 추가" else "장소 확인·수정"
                    "trash" -> "휴지통"; else -> "장소 상세"
                }) }, navigationIcon = { if (!root) TextButton(onClick = back) { Text("이전") } })
            },
            bottomBar = {
                if (root) NavigationBar {
                    listOf(Triple("home", "내 장소", "●"), Triple("inbox", "처리함", "▤"), Triple("settings", "설정", "⚙")).forEach { (route, label, icon) ->
                        NavigationBarItem(selected = state.route == route, onClick = { model.navigate(route) }, icon = { Text(icon) }, label = { Text(label) })
                    }
                }
            },
            floatingActionButton = {
                if (state.route in setOf("home", "inbox") && !state.loading && !state.loadFailed) ExtendedFloatingActionButton(onClick = { model.navigate("add") }, text = { Text("링크 추가") }, icon = { Text("+") })
            },
            snackbarHost = { SnackbarHost(snackbar) },
        ) { insets ->
            Column(Modifier.fillMaxSize().padding(insets).imePadding()) {
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (state.loading) { Text("기록을 불러오고 있어요.", Modifier.padding(24.dp)); return@Column }
                if (state.loadFailed) {
                    Text("기록을 읽지 못했어요. 앱 데이터나 앱을 삭제하지 말고 다시 불러와 주세요.", Modifier.padding(24.dp))
                    Button(enabled = !state.busy, onClick = { model.reload() }, modifier = Modifier.padding(horizontal = 24.dp)) { Text("다시 불러오기") }
                    return@Column
                }
                when (state.route) {
                    "home", "inbox" -> PlaceList(
                        records = state.records.filter { it.trashedAt == null && it.confirmed == (state.route == "home") },
                        pending = state.route == "inbox",
                        open = { model.navigate(if (it.confirmed) "detail" else "edit", it.id) },
                        manual = { model.navigate("edit") },
                    )
                    "add" -> AddLinks(state.failedSharedText, state.busy, { model.capture(it) }, { model.navigate("edit") })
                    "edit" -> Editor(selected, state.busy, { name, address, memo, menu, category -> model.save(selected?.id, name, address, memo, menu, category) }, { editorDirty = it }, { trashWarning = true })
                    "detail" -> if (selected != null && selected.trashedAt == null && selected.confirmed) PlaceDetail(selected, state.busy,
                        edit = { model.navigate("edit", selected.id) }, visited = { model.visited(selected.id) },
                        trash = { trashWarning = true }, openExternal = openExternal)
                    else Text("기록이 없거나 휴지통에 있어요.", Modifier.padding(24.dp))
                    "trash" -> TrashList(state.records.filter { it.trashedAt != null }, state.busy, { model.restore(it.id) }, { permanentId = it.id })
                    "settings" -> Settings(state.records.size, state.busy,
                        export = { exportWarning = true }, import = { importFile.launch(arrayOf("*/*")) },
                        trash = { model.navigate("trash") }, clear = { clearWarning = true })
                }
            }
        }
        if (exportWarning) AlertDialog(onDismissRequest = { exportWarning = false }, title = { Text("백업 파일 저장") },
            text = { Text("출처 링크·메모·휴지통 기록이 평문 JSON에 포함돼요. 파일을 안전한 곳에 보관하세요. 앱을 삭제하면 파일 없이 기록을 복구할 수 없어요.") },
            confirmButton = { TextButton(onClick = { exportWarning = false; exportFile.launch("gajaham-backup-${LocalDate.now()}.json") }) { Text("파일 위치 선택") } },
            dismissButton = { TextButton(onClick = { exportWarning = false }) { Text("취소") } })
        if (state.pendingImport != null && state.importPlan != null) {
            val plan = requireNotNull(state.importPlan)
            AlertDialog(onDismissRequest = { if (!state.busy) model.cancelImport() }, title = { Text("가져올 기록 확인") },
                text = { Text("추가 ${plan.additions.size}개 · 중복 ${plan.duplicates}개 · 보관 만료 ${plan.expired}개 제외\n현재 기록을 우선하며 덮어쓰지 않아요. 휴지통 상태도 함께 가져와요.") },
                confirmButton = { TextButton(enabled = !state.busy, onClick = { model.confirmImport() }) { Text("가져오기 실행") } },
                dismissButton = { TextButton(enabled = !state.busy, onClick = { model.cancelImport() }) { Text("취소") } })
        }
        if (clearWarning) ClearDialog(state.busy, { clearWarning = false }, { clearWarning = false; model.clear() })
        if (trashWarning) ConfirmDialog("휴지통으로 이동", if (state.route == "edit" && editorDirty) "저장하지 않은 입력은 버려지고 원래 기록을 휴지통으로 옮겨요. 30일이 지난 기록은 다음 실행 시 정리돼요." else "30일이 지난 기록은 다음 실행 시 정리돼요.", "이동", { trashWarning = false }) {
            trashWarning = false; selected?.let { model.trash(it.id) }
        }
        permanentId?.let { id -> ConfirmDialog("영구 삭제", "이 기기의 기록을 되돌릴 수 없어요. 이미 내보낸 파일은 별도로 관리해 주세요.", "영구 삭제", { permanentId = null }) { permanentId = null; model.deletePermanently(id) } }
        if (discardWarning) ConfirmDialog("수정을 그만할까요?", "저장하지 않은 입력은 사라져요.", "그만하기", { discardWarning = false }) { discardWarning = false; leave() }
    }
}

@Composable
private fun PlaceList(records: List<Place>, pending: Boolean, open: (Place) -> Unit, manual: () -> Unit) {
    var query by rememberSaveable(pending) { mutableStateOf("") }
    var category by rememberSaveable(pending) { mutableStateOf<String?>(null) }
    var onlyUnvisited by rememberSaveable { mutableStateOf(false) }
    val visible = records.filter { place ->
        listOf(place.name, place.address, place.memo, place.menu, place.sourceUrl.orEmpty()).any { it.contains(query, ignoreCase = true) } &&
            (category == null || place.category.name == category) && (!onlyUnvisited || !place.visited)
    }
    LazyColumn(modifier = Modifier.testTag("places-list"), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(if (pending) "장소를 확인하면 내 장소에 담겨요." else "저장한 이유까지 기억하는 나의 장소", style = MaterialTheme.typography.titleMedium) }
        item { Text("로그인 없이 이 기기에 저장해요. 기기 변경 전에는 설정에서 백업하세요.", style = MaterialTheme.typography.bodySmall) }
        item { OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("기록 검색") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        if (!pending) item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = category == null, onClick = { category = null }, label = { Text("전체") }) }
                items(Category.entries) { value -> FilterChip(selected = category == value.name, onClick = { category = value.name }, label = { Text(value.label) }) }
                item { FilterChip(selected = onlyUnvisited, onClick = { onlyUnvisited = !onlyUnvisited }, label = { Text("아직 안 간 곳") }) }
            }
        }
        item { Text("${visible.size}개", style = MaterialTheme.typography.labelLarge) }
        if (visible.isEmpty()) item {
            Text(if (records.isEmpty()) if (pending) "공유하거나 붙여 넣은 링크가 여기에 모여요." else "아직 저장한 장소가 없어요. 링크를 추가하거나 직접 장소를 입력하세요." else "검색 조건에 맞는 기록이 없어요.")
            TextButton(onClick = manual) { Text("직접 장소 추가") }
        }
        items(visible, key = { it.id }) { place ->
            ElevatedCard(onClick = { open(place) }, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(if (place.confirmed) place.name else "장소 확인이 필요한 링크", fontWeight = FontWeight.Bold)
                    Text(if (place.confirmed) place.address else place.sourceUrl.orEmpty(), maxLines = 2)
                    if (place.memo.isNotBlank()) Text(place.memo, maxLines = 2, style = MaterialTheme.typography.bodySmall)
                    if (place.confirmed) Text("${place.category.label} · ${if (place.visited) "다녀왔어요" else "가고 싶어요"}", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}

@Composable
private fun AddLinks(failedText: String, busy: Boolean, capture: (String) -> Unit, manual: () -> Unit) {
    var text by rememberSaveable(failedText) { mutableStateOf(failedText) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Text("인스타그램의 공유 메뉴에서 가자함을 고르거나 웹 링크를 붙여 넣으세요. 링크를 보관한 뒤 장소를 직접 확인해요.") }
        item { OutlinedTextField(value = text, onValueChange = { if (it.length <= 16_384) text = it }, label = { Text("공유 링크 또는 텍스트") }, minLines = 4, modifier = Modifier.fillMaxWidth().testTag("link-input")) }
        item { Button(enabled = !busy && text.isNotBlank(), onClick = { capture(text) }, modifier = Modifier.fillMaxWidth()) { Text("링크 접수") } }
        item { OutlinedButton(enabled = !busy, onClick = manual, modifier = Modifier.fillMaxWidth()) { Text("링크 없이 장소 직접 입력") } }
        item { Text("이 버전은 게시물 본문·영상 자동 분석과 앱 안의 지도·장소 검색을 제공하지 않아요. 주소를 추측해 저장하지 않아요.", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun Editor(place: Place?, busy: Boolean, save: (String, String, String, String, Category) -> Unit, dirty: (Boolean) -> Unit, trash: () -> Unit) {
    var name by rememberSaveable(place?.id) { mutableStateOf(place?.name.orEmpty()) }
    var address by rememberSaveable(place?.id) { mutableStateOf(place?.address.orEmpty()) }
    var memo by rememberSaveable(place?.id) { mutableStateOf(place?.memo.orEmpty()) }
    var menu by rememberSaveable(place?.id) { mutableStateOf(place?.menu.orEmpty()) }
    var category by rememberSaveable(place?.id) { mutableStateOf(place?.category?.name ?: Category.OTHER.name) }
    LaunchedEffect(name, address, memo, menu, category) {
        dirty(name != place?.name.orEmpty() || address != place?.address.orEmpty() || memo != place?.memo.orEmpty() || menu != place?.menu.orEmpty() || category != (place?.category ?: Category.OTHER).name)
    }
    LazyColumn(modifier = Modifier.testTag("editor-list"), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("장소 이름과 주소를 확인해 주세요. 메뉴와 저장 이유는 원하는 만큼만 적어도 좋아요.") }
        place?.sourceUrl?.let { source -> item { SelectionContainer { Text(source, style = MaterialTheme.typography.bodySmall) } } }
        item { OutlinedTextField(value = name, onValueChange = { if (it.length <= 200) name = it }, label = { Text("장소 이름 · 필수") }, modifier = Modifier.fillMaxWidth().testTag("place-name")) }
        item { OutlinedTextField(value = address, onValueChange = { if (it.length <= 500) address = it }, label = { Text("주소 · 필수") }, modifier = Modifier.fillMaxWidth().testTag("place-address")) }
        item { OutlinedTextField(value = menu, onValueChange = { if (it.length <= 200) menu = it }, label = { Text("먹고 싶은 메뉴") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(value = memo, onValueChange = { if (it.length <= 2000) memo = it }, label = { Text("저장한 이유 · 메모") }, minLines = 2, modifier = Modifier.fillMaxWidth().testTag("place-memo")) }
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(Category.entries) { value -> FilterChip(selected = category == value.name, onClick = { category = value.name }, label = { Text(value.label) }) }
        } }
        item { Button(enabled = !busy && name.isNotBlank() && address.isNotBlank(), onClick = { save(name, address, memo, menu, Category.valueOf(category)) }, modifier = Modifier.fillMaxWidth().testTag("save-place")) { Text("장소 저장") } }
        if (place != null) item { TextButton(enabled = !busy, onClick = trash, modifier = Modifier.testTag("discard-record")) { Text("휴지통으로 이동", color = MaterialTheme.colorScheme.error) } }
    }
}

@Composable
private fun PlaceDetail(place: Place, busy: Boolean, edit: () -> Unit, visited: () -> Unit, trash: () -> Unit, openExternal: (String) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Text(place.name, style = MaterialTheme.typography.headlineMedium); SelectionContainer { Text(place.address) } }
        item { Text("${place.category.label} · ${if (place.visited) "다녀왔어요" else "가고 싶어요"}") }
        if (place.menu.isNotBlank()) item { Text("먹고 싶은 메뉴", fontWeight = FontWeight.Bold); Text(place.menu) }
        if (place.memo.isNotBlank()) item { Text("저장한 이유", fontWeight = FontWeight.Bold); Text(place.memo) }
        item { Button(onClick = { openExternal(Links.directions(place)) }, modifier = Modifier.fillMaxWidth()) { Text("외부 지도에서 찾기") } }
        place.sourceUrl?.let { source -> item { OutlinedButton(onClick = { openExternal(source) }, modifier = Modifier.fillMaxWidth()) { Text("원본 열기") } } }
        item { OutlinedButton(enabled = !busy, onClick = visited, modifier = Modifier.fillMaxWidth()) { Text(if (place.visited) "아직 안 간 곳으로 변경" else "다녀왔어요") } }
        item { OutlinedButton(enabled = !busy, onClick = edit, modifier = Modifier.fillMaxWidth()) { Text("장소 수정") } }
        item { TextButton(enabled = !busy, onClick = trash) { Text("휴지통으로 이동", color = MaterialTheme.colorScheme.error) } }
    }
}

@Composable
private fun TrashList(records: List<Place>, busy: Boolean, restore: (Place) -> Unit, permanent: (Place) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("30일이 지난 기록은 다음 앱 실행·저장소 정리 시 영구 삭제돼요. 내보낸 백업 파일은 별도로 관리해 주세요.") }
        if (records.isEmpty()) item { Text("휴지통이 비어 있어요.") }
        items(records, key = { it.id }) { place -> Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text(place.name.ifBlank { "확인 전 링크" }, fontWeight = FontWeight.Bold)
                Text(place.sourceUrl ?: place.address, maxLines = 2)
                Row { TextButton(enabled = !busy, onClick = { restore(place) }) { Text("복원") }; TextButton(enabled = !busy, onClick = { permanent(place) }) { Text("영구 삭제") } }
            }
        } }
    }
}

@Composable
private fun Settings(count: Int, busy: Boolean, export: () -> Unit, import: () -> Unit, trash: () -> Unit, clear: () -> Unit) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("가자함 · 개인 저장 개발 버전", style = MaterialTheme.typography.titleLarge) }
        item { Text("이 기기에 $count 개 기록이 있어요. 서버 계정이나 자동 동기화는 없어요. 앱 삭제·저장 공간 초기화·기기 교체 전에 파일로 백업해 주세요.") }
        item { OutlinedButton(enabled = !busy, onClick = export, modifier = Modifier.fillMaxWidth()) { Text("파일로 백업") } }
        item { OutlinedButton(enabled = !busy, onClick = import, modifier = Modifier.fillMaxWidth()) { Text("백업 가져오기") } }
        item { Text("가자함 JSON · 최대 2MiB / 5,000건. 현재 기록과 겹치면 현재 기록을 유지해요. 저장 시에도 백업 가능한 용량을 확인해요.", style = MaterialTheme.typography.bodySmall) }
        item { OutlinedButton(enabled = !busy, onClick = trash, modifier = Modifier.fillMaxWidth()) { Text("휴지통") } }
        item { TextButton(enabled = !busy, onClick = clear) { Text("이 기기의 모든 기록 삭제", color = MaterialTheme.colorScheme.error) } }
        item { HorizontalDivider(); Text("기록과 출처는 앱 전용 저장소에 보관해요. 외부 지도·원본을 열거나 백업 파일을 내보내면 선택한 앱·저장소에서 처리돼요. 이 버전에는 광고·분석 SDK가 없어요.", modifier = Modifier.padding(top = 12.dp), style = MaterialTheme.typography.bodySmall) }
        item { Text("자동 클라우드 백업과 기기 이전은 앱 설정에서 제외했어요. 제조사별 실제 이전 동작은 검증 중이에요. 지도·자동 분석·DM·광고·로그인·공유 맵은 후속 개발 항목이에요.", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun ConfirmDialog(title: String, text: String, action: String, cancel: () -> Unit, confirm: () -> Unit) {
    AlertDialog(onDismissRequest = cancel, title = { Text(title) }, text = { Text(text) },
        confirmButton = { TextButton(onClick = confirm) { Text(action) } }, dismissButton = { TextButton(onClick = cancel) { Text("취소") } })
}

@Composable
private fun ClearDialog(busy: Boolean, cancel: () -> Unit, confirm: () -> Unit) {
    var text by rememberSaveable { mutableStateOf("") }
    AlertDialog(onDismissRequest = cancel, title = { Text("모든 기록 영구 삭제") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("처리함·장소·휴지통을 모두 지워요. 복구하려면 미리 내보낸 백업 파일이 필요해요. 계속하려면 ‘삭제’를 입력해 주세요.")
            OutlinedTextField(value = text, onValueChange = { text = it }, label = { Text("삭제 입력") }, singleLine = true)
        }
    }, confirmButton = { TextButton(enabled = !busy && text == "삭제", onClick = confirm) { Text("모두 영구 삭제") } }, dismissButton = { TextButton(onClick = cancel) { Text("취소") } })
}
