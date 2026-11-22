package com.orynexa.karadugum;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.util.Log;
import android.view.MotionEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.google.android.ump.ConsentInformation;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONArray;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class UmpRegionAudit {
    private static final String TAG = "KdUmpRegion";
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private final UiAutomation ui = instrumentation.getUiAutomation();
    private ActivityScenario<MainActivity> scenario;

    @Test public void verifiesActualPrivacyOptions() throws Exception {
        Context context = instrumentation.getTargetContext();
        String region = InstrumentationRegistry.getArguments().getString("region");
        assertTrue("eea".equals(region) || "us".equals(region));
        assertTrue("Disposable emulator age fixture", new AudienceChoiceStore(context.getNoBackupFilesDir()).save("adult"));

        Intent intent = new Intent(context, MainActivity.class).putExtra("kdUmpRegion", region);
        try (ActivityScenario<MainActivity> running = ActivityScenario.launch(intent)) {
            scenario = running;
            ConsentInformation.PrivacyOptionsRequirementStatus required = ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
            ConsentInformation.PrivacyOptionsRequirementStatus notRequired = ConsentInformation.PrivacyOptionsRequirementStatus.NOT_REQUIRED;
            ConsentInformation sdk = UserMessagingPlatform.getConsentInformation(context);

            waitFor("Game page", 25000, () -> js("typeof kdNavigate").equals("function"));
            waitFor("UMP privacy eligibility", 30000, () -> sdk.getPrivacyOptionsRequirementStatus() != ConsentInformation.PrivacyOptionsRequirementStatus.UNKNOWN);
            ConsentInformation.PrivacyOptionsRequirementStatus status = sdk.getPrivacyOptionsRequirementStatus();
            Log.i(TAG, "eligibility region=" + region + " status=" + status + " available=" + sdk.isConsentFormAvailable());

            long diagnose = SystemClock.elapsedRealtime() + 8000;
            boolean[] captured = {false};
            waitFor("Startup consent sequence finished", 50000, () -> {
                if (!gateBusy()) return true;
                AccessibilityNodeInfo root = ui.getRootInActiveWindow();
                if (!hasGameWindowFocus() && clickConsentDecision(root)) return false;
                if (!captured[0] && SystemClock.elapsedRealtime() >= diagnose) {
                    captured[0] = true;
                    screenshot(context, region + "-startup");
                    dumpLabels(root);
                }
                return false;
            });
            js("document.querySelector('.kdDailyClose')?.click(); kdNavigate('settings'); 'settings'");
            waitFor("Settings rendered", 10000, () -> js("!!document.querySelector('[data-privacy-options]')").equals(Boolean.TRUE));
            assertEquals("Installed version in settings", "VORYNEXA · 6.52", js("document.querySelector('.kdModernFoot small').textContent"));
            assertEquals("English device label", "Privacy preferences", js("document.querySelector('[data-privacy-options]').textContent"));

            if (status == notRequired) {
                assertEquals("Entry hidden for SDK NOT_REQUIRED", Boolean.TRUE, js("document.querySelector('[data-privacy-options]').hidden"));
                assertEquals("SDK supplied no form", false, sdk.isConsentFormAvailable());
                js("KaraNative.privacyOptions(); 'requested'");
                SystemClock.sleep(500);
                assertTrue("No dialog opened when the SDK didn't require one", !gateFormOpen());
                screenshot(context, region + "-not-required");
                Log.i(TAG, "verified region=" + region + " required=false visible=false native_form_displayed=false");
                return;
            }
            assertEquals("UMP must require the options entry", required, status);
            String ready = "(() => { const b = document.querySelector('[data-privacy-options]'); return !b.hidden && !b.disabled && b.getClientRects().length > 0; })()";
            waitFor("Options button visible and enabled", 12000, () -> js(ready).equals(Boolean.TRUE));
            screenshot(context, region + "-settings");

            assertTrue("Game window focused before touch", hasGameWindowFocus());
            tapPrivacyButton();
            waitFor("Native UMP options dialog presented", 18000, () ->
                gateFormOpen() && !hasGameWindowFocus() && hasWebView(ui.getRootInActiveWindow()));
            screenshot(context, region + "-options-form");
            Log.i(TAG, "verified region=" + region + " required=true visible=true native_form_displayed=true");
        } finally {
            scenario = null;
        }
    }

    private interface Condition { boolean matches() throws Exception; }

    private void waitFor(String description, long timeout, Condition condition) throws Exception {
        long end = SystemClock.elapsedRealtime() + timeout;
        while (SystemClock.elapsedRealtime() < end) {
            if (condition.matches()) return;
            SystemClock.sleep(250);
        }
        throw new AssertionError(description + " timed out");
    }

    private Object js(String code) throws Exception {
        CountDownLatch ready = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> webView(activity).evaluateJavascript(code, json -> {
            result.set(json);
            ready.countDown();
        }));
        assertTrue("WebView response", ready.await(5, TimeUnit.SECONDS));
        return new JSONTokener(result.get()).nextValue();
    }

    private Object field(MainActivity activity, String name) {
        try {
            Field field = MainActivity.class.getDeclaredField(name);
            field.setAccessible(true);
            return field.get(activity);
        } catch (ReflectiveOperationException failure) {
            throw new AssertionError(failure);
        }
    }

    private WebView webView(MainActivity activity) { return (WebView) field(activity, "view"); }

    private boolean gateBusy() {
        AtomicReference<Boolean> result = new AtomicReference<>();
        scenario.onActivity(activity -> {
            AdConsentGate gate = (AdConsentGate) field(activity, "consentGate");
            result.set(gate == null || gate.busy());
        });
        return result.get();
    }

    private boolean gateFormOpen() {
        AtomicReference<Boolean> result = new AtomicReference<>();
        scenario.onActivity(activity -> {
            AdConsentGate gate = (AdConsentGate) field(activity, "consentGate");
            result.set(gate != null && gate.formOpen());
        });
        return result.get();
    }

    private boolean hasGameWindowFocus() {
        AtomicReference<Boolean> result = new AtomicReference<>();
        scenario.onActivity(activity -> result.set(webView(activity).hasWindowFocus()));
        return result.get();
    }

    private void tapPrivacyButton() throws Exception {
        JSONArray point = (JSONArray) js("(() => {"
            + "const r=document.querySelector('[data-privacy-options]').getBoundingClientRect();"
            + "return [(r.left+r.width/2)*devicePixelRatio,(r.top+r.height/2)*devicePixelRatio];"
            + "})()");
        int[] location = new int[2];
        scenario.onActivity(activity -> webView(activity).getLocationOnScreen(location));
        float x = location[0] + (float) point.getDouble(0);
        float y = location[1] + (float) point.getDouble(1);
        long now = SystemClock.uptimeMillis();
        for (int action : new int[]{MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
            MotionEvent touch = MotionEvent.obtain(now, SystemClock.uptimeMillis(), action, x, y, 0);
            touch.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
            instrumentation.sendPointerSync(touch);
            touch.recycle();
        }
    }

    private boolean hasWebView(AccessibilityNodeInfo node) {
        if (node == null) return false;
        if ("android.webkit.WebView".equals(String.valueOf(node.getClassName()))) return true;
        for (int i = 0; i < node.getChildCount(); i++) {
            if (hasWebView(node.getChild(i))) return true;
        }
        return false;
    }

    private boolean clickConsentDecision(AccessibilityNodeInfo node) {
        if (node == null) return false;
        CharSequence text = node.getText();
        if (text == null) text = node.getContentDescription();
        String label = text == null ? "" : text.toString().trim().toLowerCase(Locale.ROOT);
        if (label.matches("do not consent|don.t consent|reject all|reject|confirm choices|save preferences|consent|accept all|agree|continue|confirm")) {
            for (AccessibilityNodeInfo button = node; button != null; button = button.getParent()) {
                if (button.isClickable() && button.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            if (clickConsentDecision(node.getChild(i))) return true;
        }
        return false;
    }

    private void dumpLabels(AccessibilityNodeInfo node) {
        if (node == null) return;
        if (node.getText() != null) Log.i(TAG, "startup_label " + node.getText());
        if (node.getContentDescription() != null) Log.i(TAG, "startup_description " + node.getContentDescription());
        for (int i = 0; i < node.getChildCount(); i++) dumpLabels(node.getChild(i));
    }

    private void screenshot(Context context, String filename) throws Exception {
        Bitmap image = ui.takeScreenshot();
        assertNotNull(image);
        File target = new File(context.getFilesDir(), filename + ".png");
        try (FileOutputStream stream = new FileOutputStream(target)) {
            assertTrue(image.compress(Bitmap.CompressFormat.PNG, 100, stream));
        } finally {
            image.recycle();
        }
    }
}
