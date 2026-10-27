package kr.gajaham.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kr.gajaham.app.AppState
import kr.gajaham.app.PlacesViewModel

@Composable
fun EmailLogin(busy: Boolean, available: Boolean, login: (String, String, Boolean) -> Unit, reset: (String) -> Unit, guest: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var create by rememberSaveable { mutableStateOf(false) }
    var policy by remember { mutableStateOf(false) }
    LazyColumn(modifier = Modifier.testTag("auth-form"), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(if (create) "이메일로 시작하기" else "다시 만나 반가워요", style = MaterialTheme.typography.headlineSmall) }
        item { Text("로그인은 계정 확인을 위한 기능이에요. 개인 기록은 기기에만 보관되며, 앱을 삭제하면 다시 로그인해도 복구되지 않아요.") }
        if (!available) item { Text("현재 로그인 서비스를 이용할 수 없어요. 로그인 없이 개인 기록을 계속 이용할 수 있어요.") }
        item { OutlinedTextField(email, { if (it.length <= 254) email = it }, label = { Text("이메일") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth().testTag("auth-email")) }
        item { OutlinedTextField(password, { if (it.length <= 128) password = it }, label = { Text(if (create) "비밀번호 · 12자 이상" else "비밀번호") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth().testTag("auth-password")) }
        if (create) {
            item { OutlinedTextField(confirmation, { if (it.length <= 128) confirmation = it }, label = { Text("비밀번호 확인") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth().testTag("auth-confirm")) }
            item { Row { Checkbox(policy, { policy = it }); Text("개인 기록은 앱 삭제 시 복구할 수 없음을 확인했어요.") } }
        }
        item { Button(enabled = available && !busy && email.isNotBlank() && password.isNotEmpty() && (!create || (password.length >= 12 && password == confirmation && policy)), onClick = {
            val entered = password; password = ""; confirmation = ""; login(email, entered, create)
        }, modifier = Modifier.fillMaxWidth().testTag("auth-submit")) { Text(if (create) "가입하기" else "로그인") } }
        item { TextButton(enabled = !busy, onClick = { create = !create; password = ""; confirmation = ""; policy = false }) { Text(if (create) "이미 계정이 있어요" else "이메일로 가입하기") } }
        if (!create) item { TextButton(enabled = available && !busy && email.isNotBlank(), onClick = { password = ""; reset(email) }) { Text("비밀번호 재설정 메일 받기") } }
        item { OutlinedButton(enabled = !busy, onClick = guest, modifier = Modifier.fillMaxWidth()) { Text("로그인 없이 이용하기") } }
    }
}

@Composable
fun AccountScreen(state: AppState, model: PlacesViewModel) {
    var moveWarning by remember { mutableStateOf(false) }
    var deleteWarning by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    val user = state.user
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text("내 계정", style = MaterialTheme.typography.headlineSmall) }
        if (user != null) {
            item { Text(user.email) }
            item { Text(if (state.deletionPending) "계정 탈퇴 미완료 · 기기 내 계정 기록은 삭제됨" else if (state.sessionRecheck) "인증 상태 재확인 필요" else if (user.verified) "이메일 확인 완료" else "이메일 확인 필요") }
            if (!state.deletionPending) {
                if (!user.verified) item { OutlinedButton(enabled = !state.authBusy, onClick = { model.sendVerification(user.uid) }) { Text("확인 메일 다시 받기") } }
                item { OutlinedButton(enabled = !state.authBusy, onClick = { model.refreshUser(user.uid) }) { Text("이메일 확인 상태 갱신") } }
                item { OutlinedButton(enabled = !state.authBusy && !state.busy, onClick = { moveWarning = true }) { Text("게스트 기록을 이 계정으로 이동") } }
                item { Text("이동은 이 기기 안에서만 진행해요. 같은 출처의 중복은 게스트에 남겨요. 다른 계정의 개인 기록은 보이지 않아요.") }
            }
            item { OutlinedButton(enabled = !state.authBusy, onClick = { model.useGuest(user.uid) }) { Text("로그아웃하고 게스트로 이용") } }
            item { TextButton(enabled = !state.authBusy, onClick = { deleteWarning = true }) { Text(if (state.deletionPending) "탈퇴 다시 시도" else "계정 탈퇴", color = MaterialTheme.colorScheme.error) } }
        } else item { Button(onClick = { model.navigate("login") }) { Text("로그인") } }
        item { Text("개인 기록은 서버에 보관하지 않아요. 로그아웃하면 계정 기록은 이 기기에 분리 보관되고, 같은 계정으로 로그인하면 다시 볼 수 있어요. 앱 삭제·데이터 초기화 후에는 복구되지 않아요.") }
        item { Text("이메일 확인은 상대 연결 완료를 뜻하지 않아요. 상대 연결·공유 맵은 아직 제공하지 않아요.", style = MaterialTheme.typography.bodySmall) }
    }
    if (moveWarning) AlertDialog(onDismissRequest = { moveWarning = false }, title = { Text("게스트 기록 이동") }, text = { Text("게스트 기록을 현재 계정 영역으로 옮겨요. 원래 게스트 영역에서는 이동된 기록이 사라져요. 중복 기록은 덮어쓰지 않아요.") }, confirmButton = { TextButton(enabled = !state.authBusy && !state.busy, onClick = { moveWarning = false; model.moveGuestRecords(state.context) }) { Text("이동") } }, dismissButton = { TextButton(onClick = { moveWarning = false }) { Text("취소") } })
    if (deleteWarning) AlertDialog(onDismissRequest = { if (!state.authBusy) { deleteWarning = false; password = "" } }, title = { Text("계정 탈퇴") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("비밀번호를 다시 확인한 뒤 이 계정의 기기 내 기록과 인증 계정을 삭제해요. 복구할 수 없어요. 게스트와 다른 계정 기록은 유지돼요.")
            OutlinedTextField(password, { if (it.length <= 128) password = it }, label = { Text("비밀번호 재확인") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.testTag("delete-password"))
        }
    }, confirmButton = { TextButton(enabled = !state.authBusy && password.isNotEmpty(), onClick = { val entered = password; password = ""; deleteWarning = false; model.deleteAccount(entered, user?.uid) }) { Text("탈퇴 실행") } }, dismissButton = { TextButton(enabled = !state.authBusy, onClick = { deleteWarning = false; password = "" }) { Text("취소") } })
}
