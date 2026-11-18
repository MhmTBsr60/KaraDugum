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
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdLearning.leave();kdSetPaused(true);return true})()");
    }
    @After public void tearDown(){try{if(output!=null)shot("final-state");}catch(Exception ignored){}if(scenario!=null)scenario.close();}
    private String webUrl() throws Exception {final String[] s={null};instrumentation.runOnMainSync(()->s[0]=web.getUrl());return s[0];}
    private Object eval(String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);String[] answer={null};
        instrumentation.runOnMainSync(()->web.evaluateJavascript("(function(){try{return JSON.stringify("+expression+");}catch(e){return JSON.stringify({error:String(e)})}})()",v->{answer[0]=v;latch.countDown();}));
        assertTrue("WebView evaluateJavascript callback timeout",latch.await(3,TimeUnit.SECONDS));
        Object raw=new JSONTokener(answer[0]).nextValue();return raw instanceof String?new JSONTokener((String)raw).nextValue():raw;
    }
    private void shot(String name) throws Exception {
        Bitmap bitmap=instrumentation.getUiAutomation().takeScreenshot();assertNotNull("Surface screenshot",bitmap);
        try(FileOutputStream out=new FileOutputStream(new File(output,name+".png"))){bitmap.compress(Bitmap.CompressFormat.PNG,100,out);}bitmap.recycle();
    }
    private void tap() throws Exception {
        JSONObject r=(JSONObject)eval("(()=>{const r=document.querySelector('#board>.tile:not(.good)').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,vw:innerWidth,vh:innerHeight}})()");
        int[] location=new int[2],size=new int[2];instrumentation.runOnMainSync(()->{web.getLocationOnScreen(location);size[0]=web.getWidth();size[1]=web.getHeight();});
        float x=location[0]+(float)(r.getDouble("x")*size[0]/r.getDouble("vw")),y=location[1]+(float)(r.getDouble("y")*size[1]/r.getDouble("vh"));
        long time=SystemClock.uptimeMillis();MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(time,time+25,MotionEvent.ACTION_UP,x,y,0);
        instrumentation.sendPointerSync(down);instrumentation.sendPointerSync(up);down.recycle();up.recycle();
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
            eval("(()=>{kdNavigate('shop');const b=document.querySelector('[data-shop-theme=\""+theme+"\"]');if(!b.disabled)b.click();kdNavigate('game');kdLearning.leave();return true})()");
            SystemClock.sleep(150);
            JSONObject appearance=(JSONObject)eval("(()=>{const tile=document.querySelector('#board .kdSculptedPipe'),s=getComputedStyle(document.getElementById('kdGame'));return {theme:document.documentElement.dataset.kdTheme,pipe:tile.dataset.pipeTheme,scene:s.backgroundPosition,tone:getComputedStyle(tile).getPropertyValue('--pipe-tone'),stone:getComputedStyle(document.querySelector('#board>.tile:not(.good)')).backgroundImage}})()");
            assertEquals(theme,appearance.getString("theme"));assertEquals(theme,appearance.getString("pipe"));
            assertEquals(state,eval("(()=>{const s=kdGetLearningState();delete s.elapsed;return JSON.stringify(s)})()"));
            scenes.add(appearance.getString("scene"));tones.add(appearance.getString("tone"));
            themes.put(appearance);shot("theme-"+theme);
        }
        assertEquals(6,scenes.size());assertEquals(6,tones.size());
        report.put("themes",themes);
        eval("(()=>{document.body.classList.remove('kdNoGlow');localStorage.setItem('kd5_glow','1');return true})()");
        SystemClock.sleep(150);int before=((JSONObject)eval("kdLightFeedback.state()")).getInt("nativePaints");tap();SystemClock.sleep(35);shot("native-light-on");SystemClock.sleep(350);
        JSONObject on=(JSONObject)eval("kdLightFeedback.state()");assertTrue("Real Android touch must reach native Canvas onDraw: "+on,on.getInt("nativePaints")>before);assertTrue(on.getInt("pointer")>0);assertTrue(on.getBoolean("native"));
        shot("native-light-settled");
        eval("(()=>{document.body.classList.add('kdNoGlow');localStorage.setItem('kd5_glow','0');return true})()");SystemClock.sleep(100);int offBefore=((JSONObject)eval("kdLightFeedback.state()")).getInt("nativePaints");tap();SystemClock.sleep(100);
        JSONObject off=(JSONObject)eval("kdLightFeedback.state()");assertEquals(offBefore,off.getInt("nativePaints"));assertFalse(off.getBoolean("enabled"));shot("native-light-off");
        report.put("lightOn",on).put("lightOff",off).put("protectedWallet",eval("({coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons')})"));
        assertEquals("510",((JSONObject)report.get("protectedWallet")).getString("coins"));assertEquals("7",((JSONObject)report.get("protectedWallet")).getString("hints"));
        eval("(()=>{kdNavigate('settings');return true})()");assertTrue(Boolean.TRUE.equals(eval("!!document.querySelector('[data-onboard-repeat]')")));assertTrue(Boolean.TRUE.equals(eval("!!document.querySelector('[data-feedback-test=sound]')&&!!document.querySelector('[data-feedback-test=haptics]')")));
        report.put("delayedFirstNativePaintVisible",delayedAlpha[0]>0).put("status","PASS");try(FileOutputStream file=new FileOutputStream(new File(output,"report.json"))){file.write(report.toString(2).getBytes("UTF-8"));}
    }
}
