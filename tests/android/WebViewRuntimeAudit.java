package com.orynexa.karadugum;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.app.Instrumentation;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import android.view.MotionEvent;
import android.webkit.WebView;
import org.json.*;
import java.io.*;
import java.lang.reflect.Field;
import java.util.concurrent.*;

/** Runs the signed release APK's real file:///android_asset page on Android. No phone data. */
@RunWith(AndroidJUnit4.class)
public final class WebViewRuntimeAudit {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private File output;
    @Before public void setUp() throws Exception {
        Context context=instrumentation.getTargetContext();
        assertTrue(new AudienceChoiceStore(context.getNoBackupFilesDir()).save("under13"));
        scenario=ActivityScenario.launch(MainActivity.class);scenario.onActivity(value->activity=value);
        Field f=MainActivity.class.getDeclaredField("view");f.setAccessible(true);web=(WebView)f.get(activity);
        output=new File(context.getExternalFilesDir(null),"webview-audit");assertTrue(output.isDirectory()||output.mkdirs());
        boolean ready=false;long deadline=SystemClock.uptimeMillis()+45000;
        while(SystemClock.uptimeMillis()<deadline){try{if(Boolean.TRUE.equals(eval("!!(window.kdLightFeedback&&window.kdThemeArt&&window.kdNavigate&&window.kdLocalization)"))){ready=true;break;}}catch(Exception ignored){}SystemClock.sleep(200);}
        assertTrue("WebView page scripts not ready within 45 seconds",ready);
        assertEquals("file:///android_asset/index.html",webUrl());
        eval("(()=>{localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');for(const t of ['gold','ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+t,'true');kdFeedback.setEffects(false);kdFeedback.setHaptics(false);kdSelectLevel(17);kdNavigate('game');kdLearning.leave();kdOnboarding.leave();return true})()");
        SystemClock.sleep(2600);
        // First-boot Android immersive confirmation is a system window, not game input.
        android.view.accessibility.AccessibilityNodeInfo system=instrumentation.getUiAutomation().getRootInActiveWindow();
        if(system!=null&&!system.findAccessibilityNodeInfosByText("Viewing full screen").isEmpty()){
            for(android.view.accessibility.AccessibilityNodeInfo button:system.findAccessibilityNodeInfosByText("Got it"))button.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK);
            SystemClock.sleep(300);
        }
        boolean[] focus={false};instrumentation.runOnMainSync(()->focus[0]=web.hasWindowFocus());
        assertTrue("Real app window must own focus before board input/screenshots",focus[0]);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdLearning.leave();kdSetPaused(true);return true})()");
    }
    @After public void tearDown(){try{if(output!=null){shot("final-state");try(FileOutputStream debug=new FileOutputStream(new File(output,"final-light-state.json"))){debug.write(String.valueOf(eval("kdLightFeedback.state()")).getBytes("UTF-8"));}}}catch(Exception ignored){}if(scenario!=null)scenario.close();}
    private String webUrl() throws Exception {final String[] s={null};instrumentation.runOnMainSync(()->s[0]=web.getUrl());return s[0];}
    private Object eval(String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);String[] answer={null};
        instrumentation.runOnMainSync(()->web.evaluateJavascript("(function(){try{return JSON.stringify("+expression+");}catch(e){return JSON.stringify({error:String(e)})}})()",v->{answer[0]=v;latch.countDown();}));
        // A cold WebView may not answer during its first three seconds. The startup
        // readiness loop retries within 45 seconds; later evaluation timeouts still fail.
        if(!latch.await(3,TimeUnit.SECONDS))throw new TimeoutException("WebView evaluateJavascript callback timeout");
        Object raw=new JSONTokener(answer[0]).nextValue();return raw instanceof String?new JSONTokener((String)raw).nextValue():raw;
    }
    private void visualFrame() throws Exception {
        CountDownLatch frame=new CountDownLatch(1);
        instrumentation.runOnMainSync(()->web.postVisualStateCallback(SystemClock.uptimeMillis(),new WebView.VisualStateCallback(){
            @Override public void onComplete(long requestId){
                web.getViewTreeObserver().registerFrameCommitCallback(frame::countDown);
                web.invalidate();
            }
        }));
        assertTrue("WebView visual state + actual frame commit timeout",frame.await(15,TimeUnit.SECONDS));
        SystemClock.sleep(80);
    }
    private void shot(String name) throws Exception {
        if(name.startsWith("theme-"))visualFrame();
        // Use Android's screencap Surface path instead of emulator UiAutomation bitmap binding.
        try(android.os.ParcelFileDescriptor descriptor=instrumentation.getUiAutomation().executeShellCommand("screencap -p");
            InputStream input=new android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor);
            FileOutputStream out=new FileOutputStream(new File(output,name+".png"))){
            byte[] buffer=new byte[32768];int size;while((size=input.read(buffer))!=-1)out.write(buffer,0,size);
        }
        assertTrue("Real Surface PNG must exist",new File(output,name+".png").length()>1000);
    }
    private void tap() throws Exception { tapSelector("#board>.tile:not(.good)"); }
    private void tapSelector(String selector) throws Exception {
        JSONObject r=(JSONObject)eval("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,vw:innerWidth,vh:innerHeight}})()");
        int[] location=new int[2],size=new int[2];instrumentation.runOnMainSync(()->{web.getLocationOnScreen(location);size[0]=web.getWidth();size[1]=web.getHeight();});
        float x=location[0]+(float)(r.getDouble("x")*size[0]/r.getDouble("vw")),y=location[1]+(float)(r.getDouble("y")*size[1]/r.getDouble("vh"));
        long time=SystemClock.uptimeMillis();MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(time,time+25,MotionEvent.ACTION_UP,x,y,0);
        instrumentation.sendPointerSync(down);instrumentation.sendPointerSync(up);down.recycle();up.recycle();
    }
    @Test(timeout=120000) public void testVisibleWebCanvasSamePuzzle() throws Exception {
        assertEquals("web",((JSONObject)eval("kdLightFeedback.state()")).getString("mode"));
        eval("(()=>{kdLightFeedback.diagnostics();kdSetPaused(true);const s=document.createElement('style');s.textContent='*{animation:none!important;transition:none!important}';document.head.appendChild(s);return true})()");
        visualFrame();
        String before=(String)eval("(()=>{const s=kdGetLearningState();delete s.elapsed;return JSON.stringify(s)})()");
        shot("visible-before");tapSelector("[data-light-preview]");
        long deadline=SystemClock.uptimeMillis()+5000;JSONObject on;
        do{on=(JSONObject)eval("kdLightFeedback.state()");if(on.getInt("htmlPaints")>0)break;SystemClock.sleep(10);}while(SystemClock.uptimeMillis()<deadline);
        assertTrue("WebView visual frame must be acknowledged: "+on,on.getInt("htmlPaints")>0);
        assertEquals(0,on.getInt("nativeDraws"));assertEquals(0,on.getInt("nativePaints"));
        JSONObject paint=on.getJSONObject("paintEvidence");assertTrue(paint.getBoolean("bufferGold"));assertTrue(paint.getBoolean("topLayer"));assertEquals("HTML",paint.getString("parent"));assertEquals("1",paint.getString("opacity"));assertEquals("none",paint.getString("filter"));assertEquals("none",paint.getString("clipPath"));
        assertFalse(on.getJSONObject("nativeInfo").getBoolean("enabled"));
        shot("visible-on");SystemClock.sleep(650);visualFrame();shot("visible-after");
        assertEquals(before,eval("(()=>{const s=kdGetLearningState();delete s.elapsed;return JSON.stringify(s)})()"));
        assertTrue(Boolean.TRUE.equals(eval("!document.getElementById('kdLightCanvas')")));
        JSONObject result=new JSONObject().put("status","PASS").put("phoneVerified",false).put("androidApi",android.os.Build.VERSION.SDK_INT).put("samePuzzleNoMove",true).put("state",on);
        eval("(()=>{kdNavigate('settings');return true})()");tapSelector("[data-setting=\"glow\"]");
        eval("(()=>{kdLightFeedback.diagnostics();kdSetPaused(true);return true})()");
        int count=((JSONObject)eval("kdLightFeedback.state()")).getInt("requested");tapSelector("[data-light-preview]");SystemClock.sleep(150);
        JSONObject off=(JSONObject)eval("kdLightFeedback.state()");assertFalse(off.getBoolean("enabled"));assertEquals(count,off.getInt("requested"));assertTrue(Boolean.TRUE.equals(eval("!document.getElementById('kdLightCanvas')")));
        result.put("off",off).put("protectedWallet",eval("({coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons')})"));
        assertEquals("510",result.getJSONObject("protectedWallet").getString("coins"));assertEquals("7",result.getJSONObject("protectedWallet").getString("hints"));
        try(FileOutputStream f=new FileOutputStream(new File(output,"visibility-report.json"))){f.write(result.toString(2).getBytes("UTF-8"));}
    }
    @Test(timeout=120000) public void testRealFileOriginThemesLightAndSave() throws Exception {
        final int[] delayedAlpha={0};
        instrumentation.runOnMainSync(()->{
            TapLightOverlay layer=new TapLightOverlay(activity,sequence->{});layer.layout(0,0,100,100);layer.enabled(true);layer.flash(10,10,60,60,true,1);
            SystemClock.sleep(350); // Longer than the cue: it must still be visible on its first paint.
            Bitmap pixels=Bitmap.createBitmap(100,100,Bitmap.Config.ARGB_8888);layer.draw(new android.graphics.Canvas(pixels));
            delayedAlpha[0]=android.graphics.Color.alpha(pixels.getPixel(40,40));layer.clear();pixels.recycle();
        });
        assertTrue("Queued UI work must not expire light before first native paint",delayedAlpha[0]>0);
        assertTrue(eval("document.body.textContent.includes('VORYNEXA')").equals(Boolean.TRUE));
        JSONObject report=new JSONObject().put("fileOrigin",webUrl()).put("androidApi",android.os.Build.VERSION.SDK_INT);
        if(android.os.Build.VERSION.SDK_INT>=26)report.put("webview",WebView.getCurrentWebViewPackage().versionName);
        String state=(String)eval("(()=>{const s=kdGetLearningState();delete s.elapsed;return JSON.stringify(s)})()");
        JSONArray themes=new JSONArray();
        java.util.Set<String> scenes=new java.util.HashSet<>(),tones=new java.util.HashSet<>();
        for(String theme:new String[]{"gold","ice","fire","shadow","emerald","ruby"}){
            eval("(()=>{kdNavigate('shop');const b=document.querySelector('[data-shop-theme=\""+theme+"\"]');if(!b.disabled)b.click();kdNavigate('game');kdLearning.leave();kdSetPaused(true);return true})()");
            SystemClock.sleep(150);
            JSONObject appearance=(JSONObject)eval("(()=>{const tile=document.querySelector('#board .kdSculptedPipe'),s=getComputedStyle(document.getElementById('kdGame'));const r=document.getElementById('board').getBoundingClientRect();return {theme:document.documentElement.dataset.kdTheme,pipe:tile.dataset.pipeTheme,scene:s.backgroundPosition,viewportWidth:innerWidth,board:{x:r.left,y:r.top,width:r.width,height:r.height},tone:getComputedStyle(tile).getPropertyValue('--pipe-tone'),stone:getComputedStyle(document.querySelector('#board>.tile:not(.good)')).backgroundImage}})()");
            assertEquals(theme,appearance.getString("theme"));assertEquals(theme,appearance.getString("pipe"));
            assertEquals(state,eval("(()=>{const s=kdGetLearningState();delete s.elapsed;return JSON.stringify(s)})()"));
            scenes.add(appearance.getString("scene"));tones.add(appearance.getString("tone"));
            themes.put(appearance);shot("theme-"+theme);
        }
        assertEquals(6,scenes.size());assertEquals(6,tones.size());
        report.put("themes",themes);
        eval("(()=>{document.body.classList.remove('kdNoGlow');localStorage.setItem('kd5_glow','1');kdLightFeedback.diagnostics();while(kdLightFeedback.state().mode!=='native')document.querySelector('[data-light-mode]').click();return true})()");
        SystemClock.sleep(150);int before=((JSONObject)eval("kdLightFeedback.state()")).getInt("nativePaints");tap();
        long paintDeadline=SystemClock.uptimeMillis()+5000;
        while(SystemClock.uptimeMillis()<paintDeadline&&((JSONObject)eval("kdLightFeedback.state()")).getInt("nativePaints")<=before)SystemClock.sleep(10);
        shot("native-light-on");SystemClock.sleep(650);
        JSONObject on=(JSONObject)eval("kdLightFeedback.state()");assertTrue("Real Android touch must reach native Canvas onDraw: "+on,on.getInt("nativePaints")>before);assertTrue(on.getInt("pointer")>0);assertTrue(on.getBoolean("native"));assertTrue(on.getInt("nativeDraws")>0);assertEquals(500,on.getInt("duration"));
        assertTrue(on.getJSONObject("preference").getBoolean("matches"));
        report.put("lightGeometry",on.getJSONObject("geometry"));
        report.put("lightNativeInfo",on.getJSONObject("nativeInfo"));
        long shownAt=0,clearedAt=0;JSONArray events=on.getJSONArray("history");
        for(int i=0;i<events.length();i++){JSONObject e=events.getJSONObject(i);if(e.getString("phase").equals("native_presented"))shownAt=e.getLong("nativeStartedMs");if((e.getString("phase").startsWith("native_cleared_")||e.getString("phase").startsWith("stale_cleared_"))&&e.has("nativeMs"))clearedAt=e.getLong("nativeMs");}
        JSONObject lastNative=on.getJSONObject("nativeInfo");
        if(lastNative.getString("phase").startsWith("cleared_")&&lastNative.getLong("visibleSinceMs")==shownAt)clearedAt=lastNative.getLong("uptimeMs");
        try(FileOutputStream debug=new FileOutputStream(new File(output,"native-timing-state.json"))){debug.write(on.toString(2).getBytes("UTF-8"));}
        assertTrue("Native committed frame must hold for 500ms: "+(clearedAt-shownAt)+"; "+on,shownAt>0&&clearedAt-shownAt>=500);
        report.put("nativeVisibleHoldMs",clearedAt-shownAt);
        shot("native-light-settled");
        eval("(()=>{document.body.classList.add('kdNoGlow');localStorage.setItem('kd5_glow','0');return true})()");SystemClock.sleep(100);int offBefore=((JSONObject)eval("kdLightFeedback.state()")).getInt("nativePaints");tap();SystemClock.sleep(100);
        JSONObject off=(JSONObject)eval("kdLightFeedback.state()");assertEquals(offBefore,off.getInt("nativePaints"));assertFalse(off.getBoolean("enabled"));shot("native-light-off");
        // Force a native rejection while the JavaScript setting remains on. Old code
        // returned true and silently lost the light; AUTO must now paint its HTML fallback.
        eval("(()=>{document.body.classList.remove('kdNoGlow');localStorage.setItem('kd5_glow','1');while(kdLightFeedback.state().mode!=='auto')document.querySelector('[data-light-mode]').click();return true})()");
        SystemClock.sleep(100);
        assertTrue(Boolean.TRUE.equals(eval("(()=>{const a=document.querySelector('.kdLightDiagnostics').getBoundingClientRect(),b=document.getElementById('board').getBoundingClientRect();return a.bottom<b.top})()")));
        Field overlayField=MainActivity.class.getDeclaredField("tapLightOverlay");overlayField.setAccessible(true);
        TapLightOverlay actualLayer=(TapLightOverlay)overlayField.get(activity);
        instrumentation.runOnMainSync(()->actualLayer.enabled(false));
        tap();long fallbackDeadline=SystemClock.uptimeMillis()+3000;JSONObject fallback;
        do{fallback=(JSONObject)eval("kdLightFeedback.state()");if(fallback.getInt("htmlPaints")>0)break;SystemClock.sleep(10);}while(SystemClock.uptimeMillis()<fallbackDeadline);
        assertTrue("Native rejection must not silently swallow feedback: "+fallback,fallback.getInt("htmlPaints")>0);
        assertTrue(fallback.toString().contains("rejected_disabled"));shot("native-rejection-html-fallback");SystemClock.sleep(650);shot("native-rejection-html-settled");
        report.put("forcedNativeRejectionFallback",fallback).put("phoneVerified",false);
        report.put("lightOn",on).put("lightOff",off).put("protectedWallet",eval("({coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons')})"));
        assertEquals("510",((JSONObject)report.get("protectedWallet")).getString("coins"));assertEquals("7",((JSONObject)report.get("protectedWallet")).getString("hints"));
        eval("(()=>{kdNavigate('settings');return true})()");assertTrue(Boolean.TRUE.equals(eval("!!document.querySelector('[data-onboard-repeat]')")));assertTrue(Boolean.TRUE.equals(eval("!!document.querySelector('[data-feedback-test=sound]')&&!!document.querySelector('[data-feedback-test=haptics]')")));
        report.put("delayedFirstNativePaintVisible",delayedAlpha[0]>0).put("status","PASS");try(FileOutputStream file=new FileOutputStream(new File(output,"report.json"))){file.write(report.toString(2).getBytes("UTF-8"));}
    }
}
