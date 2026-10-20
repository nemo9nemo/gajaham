package kr.gajaham.app

import android.content.Intent
import android.os.Looper
import android.os.Bundle
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = IsolatedTestApplication::class)
class ShareIntentTest {
    @Before fun resetDatabase() {
        val app = ApplicationProvider.getApplicationContext<GajahamApplication>()
        assertEquals(IsolatedTestApplication::class.java, app.javaClass)
        runBlocking(Dispatchers.IO) { app.repository.clear() }
    }
    private fun await(condition: () -> Boolean) {
        val deadline = System.nanoTime() + 20_000_000_000L
        while (!condition() && System.nanoTime() < deadline) { shadowOf(Looper.getMainLooper()).idle(); Thread.sleep(10) }
        assertTrue("Android local work did not complete", condition())
    }

    @Test fun actionSendIsPersistedAndRotationDoesNotDuplicateIt() {
        val intent = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "여기 가자 https://instagram.com/reel/INTENT_TEST")
        val controller = Robolectric.buildActivity(MainActivity::class.java, intent).setup()
        val model = ViewModelProvider(controller.get())[PlacesViewModel::class.java]
        await { model.sharedIntentCommitted && !model.state.value.busy }
        assertEquals(1, model.state.value.records.size)
        controller.configurationChange()
        val rotated = ViewModelProvider(controller.get())[PlacesViewModel::class.java]
        await { !rotated.state.value.loading && !rotated.state.value.busy }
        assertEquals(1, rotated.state.value.records.size)
        controller.pause().stop().destroy()
    }

    @Test fun unsupportedMimeDoesNotAcknowledgeOrCreateARecord() {
        val intent = Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_TEXT, "https://example.com")
        val controller = Robolectric.buildActivity(MainActivity::class.java, intent).setup()
        val model = ViewModelProvider(controller.get())[PlacesViewModel::class.java]
        await { !model.state.value.loading && !model.state.value.busy }
        assertFalse(model.sharedIntentCommitted); assertTrue(model.state.value.records.isEmpty())
        controller.pause().stop().destroy()
    }

    @Test fun handledShareStaysHandledAfterNewViewModelAndRotation() {
        val intent = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "https://instagram.com/p/OLD_SHARE")
        val original = Robolectric.buildActivity(MainActivity::class.java, intent).setup()
        val model = ViewModelProvider(original.get())[PlacesViewModel::class.java]
        await { model.sharedIntentCommitted && !model.state.value.busy }
        model.clear()
        await { model.state.value.records.isEmpty() && !model.state.value.busy }
        val saved = Bundle()
        original.saveInstanceState(saved).pause().stop().destroy()
        val recreated = Robolectric.buildActivity(MainActivity::class.java, intent).create(saved).start().resume().visible()
        val restored = ViewModelProvider(recreated.get())[PlacesViewModel::class.java]
        await { !restored.state.value.loading && !restored.state.value.busy }
        assertTrue(restored.sharedIntentCommitted)
        recreated.configurationChange()
        val rotated = ViewModelProvider(recreated.get())[PlacesViewModel::class.java]
        await { !rotated.state.value.loading && !rotated.state.value.busy }
        assertTrue(rotated.state.value.records.isEmpty())
        recreated.pause().stop().destroy()
    }
}
