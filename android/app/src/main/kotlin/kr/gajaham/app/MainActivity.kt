package kr.gajaham.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import java.security.MessageDigest
import kr.gajaham.app.ui.GajahamApp

class MainActivity : ComponentActivity() {
    private val model: PlacesViewModel by viewModels {
        viewModelFactory { initializer { PlacesViewModel(this@MainActivity.application) } }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val appModel = model
        val sameShare = savedInstanceState != null && savedInstanceState.getString("shareFingerprint") == shareFingerprint(intent) && shareFingerprint(intent) != null
        val handled = sameShare && (appModel.sharedIntentHandled || savedInstanceState?.getBoolean("shareHandled") == true || savedInstanceState?.getBoolean("shareCommitted") == true)
        if (handled) appModel.restoreShareHandled(appModel.sharedIntentOwner ?: savedInstanceState?.getString("shareOwner"), appModel.sharedIntentCommitted || savedInstanceState?.getBoolean("shareCommitted") == true)
        setContent { GajahamApp(appModel, ::openExternal) }
        if (!handled) {
            if (sameShare && savedInstanceState?.getString("shareOwner") == null) {
                appModel.restoreShareHandled(null, false)
                appModel.report("이전 공유의 저장 영역을 확인하지 못했어요. 처리함을 확인한 뒤 필요하면 다시 공유해 주세요.")
            } else acceptShare(intent, if (sameShare) savedInstanceState?.getString("shareOwner") else null)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        acceptShare(intent)
    }
    override fun onStart() {
        super.onStart()
        model.recheckSession()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putBoolean("shareCommitted", model.sharedIntentCommitted)
        outState.putBoolean("shareHandled", model.sharedIntentHandled)
        outState.putString("shareOwner", model.sharedIntentOwner)
        outState.putString("shareFingerprint", shareFingerprint(intent))
        super.onSaveInstanceState(outState)
    }

    private fun shareFingerprint(intent: Intent?): String? = runCatching {
        if (intent?.action != Intent.ACTION_SEND) return null
        val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: return null
        val bytes = "${intent.type}\n$text".toByteArray(Charsets.UTF_8)
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }.getOrNull()

    private fun acceptShare(intent: Intent?, expectedOwner: String? = null) {
        if (intent?.action != Intent.ACTION_SEND) return
        if (intent.type != "text/plain") { model.report("웹 링크를 텍스트로 공유해 주세요."); return }
        val text = runCatching { intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() }.getOrNull()
        if (text == null) { model.report("공유된 링크를 읽지 못했어요. 링크를 직접 붙여 넣어 주세요."); return }
        model.capture(text, shared = true, expectedOwner = expectedOwner)
    }

    private fun openExternal(value: String) {
        val uri = Uri.parse(value).normalizeScheme()
        if (uri.scheme !in setOf("http", "https", "geo")) { model.report("이 링크는 열 수 없어요."); return }
        try { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        catch (_: ActivityNotFoundException) { model.report("연결할 앱을 찾지 못했어요. 브라우저나 지도 앱을 설치한 뒤 다시 시도해 주세요.") }
        catch (_: SecurityException) { model.report("외부 앱을 열지 못했어요.") }
    }
}
