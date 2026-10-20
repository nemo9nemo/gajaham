package kr.gajaham.app

import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ApplicationProvider
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import org.junit.rules.RuleChain
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h891dp", application = IsolatedTestApplication::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AppUiTest {
    val compose = createAndroidComposeRule<MainActivity>()
    @get:Rule val rules: RuleChain = RuleChain.outerRule(object : ExternalResource() {
        override fun before() {
            val app = ApplicationProvider.getApplicationContext<GajahamApplication>()
            assertEquals(IsolatedTestApplication::class.java, app.javaClass)
            runBlocking(Dispatchers.IO) { app.repository.clear() }
        }
    }).around(compose)
    private val model get() = ViewModelProvider(compose.activity)[PlacesViewModel::class.java]
    private fun loaded() { compose.waitUntil(20_000) { !model.state.value.loading && !model.state.value.busy }; compose.waitForIdle() }

    @Test fun manualPlaceCanBeSavedAndViewedWithoutLogin() {
        loaded()
        compose.onNodeWithTag("places-list").performScrollToNode(hasText("직접 장소 추가"))
        compose.onNodeWithText("직접 장소 추가").performClick()
        compose.onNodeWithTag("place-name").performTextInput("가상 카페")
        compose.onNodeWithTag("place-address").performTextInput("서울 가상로 1")
        compose.onNodeWithTag("place-memo").performTextInput("다음 주에 커피")
        compose.onNodeWithTag("editor-list").performScrollToNode(hasTestTag("save-place"))
        compose.onNodeWithTag("save-place").performClick()
        compose.waitUntil(20_000) { model.state.value.route == "detail" && !model.state.value.busy && model.state.value.records.size == 1 }
        compose.waitForIdle()
        compose.onNodeWithText("가상 카페").assertIsDisplayed()
        compose.onNodeWithText("다음 주에 커피").assertIsDisplayed()
        assertEquals(1, model.state.value.records.size)
        compose.onNodeWithText("외부 지도에서 찾기").assertIsDisplayed()
        val screenshot = File("build/reports/ui/personal-place.png")
        requireNotNull(screenshot.parentFile).mkdirs()
        lateinit var bitmap: Bitmap
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(bitmap))
        }
        screenshot.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun sharedCaptureAppearsInInboxAndCanBeConfirmed() {
        loaded()
        model.capture("HTTPS://instagram.com/p/UI_TEST?igsh=1", shared = true)
        compose.waitUntil(20_000) { model.state.value.records.size == 1 && !model.state.value.busy }
        compose.waitForIdle()
        compose.onNodeWithText("장소 확인이 필요한 링크").performClick()
        compose.onNodeWithTag("place-name").performTextInput("확인한 장소")
        compose.onNodeWithTag("place-address").performTextInput("서울 확인로 2")
        compose.onNodeWithTag("editor-list").performScrollToNode(hasTestTag("save-place"))
        compose.onNodeWithTag("save-place").performClick()
        compose.waitUntil(20_000) { model.state.value.records.single().confirmed && !model.state.value.busy }
        compose.waitForIdle()
        assertEquals("HTTPS://instagram.com/p/UI_TEST?igsh=1", model.state.value.records.single().sourceUrl)
        compose.onNodeWithText("원본 열기").performClick()
        assertEquals("https", shadowOf(compose.activity).nextStartedActivity.data?.scheme)
    }

    @Test fun leavingPendingEditorReturnsToInboxWithoutDirections() {
        loaded()
        model.capture("https://instagram.com/p/PENDING", shared = true)
        compose.waitUntil(20_000) { model.state.value.records.size == 1 && !model.state.value.busy }
        compose.onNodeWithText("장소 확인이 필요한 링크").performClick()
        compose.onNodeWithText("이전").performClick()
        compose.waitForIdle()
        assertEquals("inbox", model.state.value.route)
        compose.onNodeWithText("외부 지도에서 찾기").assertDoesNotExist()
    }

    @Test fun newSharePreservesUnsavedManualEditor() {
        loaded()
        compose.onNodeWithTag("places-list").performScrollToNode(hasText("직접 장소 추가"))
        compose.onNodeWithText("직접 장소 추가").performClick()
        compose.onNodeWithTag("place-name").performTextInput("작성 중인 이름")
        model.capture("https://instagram.com/p/NEW_SHARE", shared = true)
        compose.waitUntil(20_000) { model.state.value.records.size == 1 && !model.state.value.busy }
        compose.waitForIdle()
        assertEquals("edit", model.state.value.route)
        compose.onNodeWithTag("place-name").assertTextContains("작성 중인 이름")
    }
}
