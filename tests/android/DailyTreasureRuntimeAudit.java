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
public final class DailyTreasureRuntimeAudit {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private MainActivity activity;
    private WebView web;
    private File output;
    private long maxEvalMs=0;
    @Before public void setUp() throws Exception {
        Context context=instrumentation.getTargetContext();
        assertTrue(new AudienceChoiceStore(context.getNoBackupFilesDir()).save("under13"));
        scenario=ActivityScenario.launch(MainActivity.class);scenario.onActivity(value->activity=value);
        Field f=MainActivity.class.getDeclaredField("view");f.setAccessible(true);web=(WebView)f.get(activity);
        output=new File(context.getExternalFilesDir(null),"webview-audit");assertTrue(output.isDirectory()||output.mkdirs());
        boolean ready=false;long deadline=SystemClock.uptimeMillis()+45000;
        while(SystemClock.uptimeMillis()<deadline){try{if(Boolean.TRUE.equals(eval("!!(window.kdPipeFlow&&window.kdThemeArt&&window.kdNavigate&&window.kdLocalization)"))){ready=true;break;}}catch(Exception ignored){}SystemClock.sleep(200);}
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
    @After public void tearDown(){try{if(output!=null){shot("final-state");try(FileOutputStream debug=new FileOutputStream(new File(output,"final-light-state.json"))){debug.write(String.valueOf(eval("kdPipeFlow.state()")).getBytes("UTF-8"));}}}catch(Exception ignored){}if(scenario!=null)scenario.close();}
    private String webUrl() throws Exception {final String[] s={null};instrumentation.runOnMainSync(()->s[0]=web.getUrl());return s[0];}
    private Object eval(String expression) throws Exception {
        long started=SystemClock.uptimeMillis();CountDownLatch latch=new CountDownLatch(1);String[] answer={null};
        instrumentation.runOnMainSync(()->web.evaluateJavascript("(function(){try{return JSON.stringify("+expression+");}catch(e){return JSON.stringify({error:String(e)})}})()",v->{answer[0]=v;latch.countDown();}));
        // A cold WebView may not answer during its first three seconds. The startup
        // readiness loop retries within 45 seconds; later evaluation timeouts still fail.
        if(!latch.await(12,TimeUnit.SECONDS))throw new TimeoutException("WebView evaluateJavascript callback timeout after bounded compositor wait");
        maxEvalMs=Math.max(maxEvalMs,SystemClock.uptimeMillis()-started);
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
        if(name.startsWith("theme-")||name.startsWith("animated-")||name.equals("connection-flow"))visualFrame();
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
        // Navigation and scroll JS can precede the compositor hit-test tree. Wait for
        // its frame before resolving coordinates; then require a click on THIS node.
        eval("(()=>{document.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'nearest'});return true})()");
        visualFrame();
        JSONObject r=(JSONObject)eval("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+"),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);window.__kdAuditClicked=false;e.addEventListener('click',()=>window.__kdAuditClicked=true,{once:true});return {x:r.left+r.width/2,y:r.top+r.height/2,vw:innerWidth,vh:innerHeight,hit:e===hit||e.contains(hit)}})()");
        assertTrue("Expected input node must own its centre",r.getBoolean("hit"));
        int[] location=new int[2],size=new int[2];instrumentation.runOnMainSync(()->{web.getLocationOnScreen(location);size[0]=web.getWidth();size[1]=web.getHeight();});
        float x=location[0]+(float)(r.getDouble("x")*size[0]/r.getDouble("vw")),y=location[1]+(float)(r.getDouble("y")*size[1]/r.getDouble("vh"));
        long time=SystemClock.uptimeMillis();MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(time,time+25,MotionEvent.ACTION_UP,x,y,0);
        instrumentation.sendPointerSync(down);instrumentation.sendPointerSync(up);down.recycle();up.recycle();
        long deadline=SystemClock.uptimeMillis()+3000;boolean clicked=false;while(SystemClock.uptimeMillis()<deadline){if(Boolean.TRUE.equals(eval("window.__kdAuditClicked===true"))){clicked=true;break;}SystemClock.sleep(10);}assertTrue("Native tap must dispatch a click on the intended node",clicked);
    }
    @Test(timeout=120000) public void testPackagedTreasureAndDailyDateGuard() throws Exception {
        assertTrue("Treasure script must have loaded from the actual APK",Boolean.TRUE.equals(eval("!!window.kdDailyTreasure")));
        assertTrue(Boolean.TRUE.equals(eval("document.querySelector('script[src=\"daily-treasure.js\"]')!==null&&document.querySelector('link[href=\"daily-treasure.css\"]')!==null")));
        JSONArray cases=new JSONArray();
        for(int day:new int[]{3,7}){
            eval("(()=>{document.querySelectorAll('.kdDailyOverlay').forEach(e=>e.remove());const yesterday=new Date(Date.now()-86400000).toLocaleDateString('en-CA');localStorage.setItem('kd64_dailyDate',JSON.stringify(yesterday));localStorage.setItem('kd64_dailySeen','\"\"');localStorage.setItem('kd64_streak','"+(day-1)+"');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');kdNavigate('home');return true})()");
            // The software GPU previously blocked SwapBuffers for 8.5 s. Wait for
            // actual committed pixels before inspecting the newly opened modal.
            // This is test synchronization, never a phone performance assertion.
            SystemClock.sleep(180);visualFrame();
            Object progress=eval("({date:new Date().toLocaleDateString('en-CA'),last:localStorage.getItem('kd64_dailyDate'),seen:localStorage.getItem('kd64_dailySeen'),reward:localStorage.getItem('kd64_dailyLastReward'),accountActive:kdEconomy.active(),owner:kdEconomy.owner(),overlay:!!document.querySelector('.kdDailyOverlay')})");
            try(FileOutputStream f=new FileOutputStream(new File(output,"treasure-progress-day"+day+".json"))){f.write(String.valueOf(progress).getBytes("UTF-8"));}
            long limit=SystemClock.uptimeMillis()+12000;while(SystemClock.uptimeMillis()<limit){if(Boolean.TRUE.equals(eval("document.querySelector('.kdTreasureOverlay')?.dataset.rewardDay==='"+day+"'")))break;SystemClock.sleep(100);}
            assertTrue(Boolean.TRUE.equals(eval("document.querySelector('.kdTreasureOverlay')?.dataset.rewardDay==='"+day+"'")));
            long imageLimit=SystemClock.uptimeMillis()+8000;while(SystemClock.uptimeMillis()<imageLimit&&!Boolean.TRUE.equals(eval("document.querySelector('.kdTreasureHero img').complete&&document.querySelector('.kdTreasureHero img').naturalWidth>0")))SystemClock.sleep(50);
            assertTrue(Boolean.TRUE.equals(eval("document.querySelector('.kdTreasureHero img').complete&&document.querySelector('.kdTreasureHero img').naturalWidth>0")));
            JSONObject state=(JSONObject)eval("(()=>{const c=document.querySelector('.kdTreasureCard'),days=[...document.querySelectorAll('.kdTreasureDay')],r=JSON.parse(localStorage.getItem('kd64_dailyLastReward'));return {r,rect:c.getBoundingClientRect().toJSON(),heroRect:document.querySelector('.kdTreasureHero').getBoundingClientRect().toJSON(),prizeRect:document.querySelector('.kdTreasurePrize').getBoundingClientRect().toJSON(),count:days.length,claimed:days.filter(e=>e.classList.contains('claimed')).length,future:days.filter(e=>e.classList.contains('future')).length,cardWidth:c.clientWidth,scrollWidth:c.scrollWidth,cardHeight:c.clientHeight,scrollHeight:c.scrollHeight,vw:innerWidth,vh:innerHeight,coins:JSON.parse(localStorage.getItem('kd64_coins')),hints:JSON.parse(localStorage.getItem('kd64_hintCoupons')),rowSpread:Math.max(...days.map(e=>e.getBoundingClientRect().top))-Math.min(...days.map(e=>e.getBoundingClientRect().top)),motion:document.querySelector('.kdTreasureOverlay').dataset.motion}})()");
            assertTrue("Chest must come from packaged assets, not injected data",Boolean.TRUE.equals(eval("document.querySelector('.kdTreasureHero img').src.startsWith('file:///android_asset/assets/daily-treasure-chest.webp')")));
            assertEquals(7,state.getInt("count"));assertEquals(day-1,state.getInt("claimed"));assertEquals(7-day,state.getInt("future"));assertEquals(day,state.getJSONObject("r").getInt("day"));assertTrue(state.getDouble("rowSpread")<1);assertTrue(state.getInt("scrollWidth")<=state.getInt("cardWidth")+1);assertTrue("Small Android viewport must show entire card without clipping: "+state,state.getInt("scrollHeight")<=state.getInt("cardHeight")+1);
            assertEquals(day==7?550:510,state.getInt("coins"));assertEquals(day==3?8:7,state.getInt("hints"));
            visualFrame();shot("treasure-day"+day);
            tapSelector(".kdTreasureConfirm");assertTrue(Boolean.TRUE.equals(eval("!document.querySelector('.kdDailyOverlay')")));
            eval("(()=>{kdNavigate('home');return true})()");SystemClock.sleep(200);assertTrue(Boolean.TRUE.equals(eval("!document.querySelector('.kdDailyOverlay')")));
            assertEquals(state.getInt("coins"),((Number)eval("JSON.parse(localStorage.getItem('kd64_coins'))")).intValue());assertEquals(state.getInt("hints"),((Number)eval("JSON.parse(localStorage.getItem('kd64_hintCoupons'))")).intValue());cases.put(state);
        }
        // Only the test clock is simulated. All reward/date decisions use the APK's real engine.
        JSONArray clockCases=new JSONArray();
        eval("(()=>{window.__kdRealDate=Date;window.__kdDayTime=__kdRealDate.parse('2026-11-19T12:00:00Z');window.Date=class extends __kdRealDate{constructor(...args){super(...(args.length?args:[window.__kdDayTime]))}static now(){return window.__kdDayTime}};localStorage.setItem('kd64_dailyDate','\"2026-11-18\"');localStorage.setItem('kd64_streak','2');localStorage.setItem('kd64_dailySeen','\"\"');localStorage.setItem('kd64_coins','500');localStorage.setItem('kd64_hintCoupons','7');return true})()");
        String[] dates={"2026-11-19","2026-11-20","2026-11-19","2026-11-20","2026-11-21"};int[] coins={500,515,515,515,535};
        try{for(int i=0;i<dates.length;i++){
            eval("(()=>{document.querySelector('.kdDailyClose')?.click();__kdDayTime=__kdRealDate.parse('"+dates[i]+"T12:00:00Z');kdNavigate('home');return true})()");SystemClock.sleep(140);
            JSONObject state=(JSONObject)eval("({coins:JSON.parse(localStorage.getItem('kd64_coins')),hints:JSON.parse(localStorage.getItem('kd64_hintCoupons')),last:JSON.parse(localStorage.getItem('kd64_dailyDate'))})");
            assertEquals("Duplicate/rollback reward on "+dates[i],coins[i],state.getInt("coins"));assertEquals(8,state.getInt("hints"));state.put("testDate",dates[i]);clockCases.put(state);
        }}finally{eval("(()=>{window.Date=window.__kdRealDate;return true})()");}
        JSONObject report=new JSONObject().put("status","PASS").put("androidApi",android.os.Build.VERSION.SDK_INT).put("phoneVerified",false).put("maxEvaluateCallbackMs",maxEvalMs).put("compositorSynchronization",true).put("runtimeAssets",true).put("injectedPreview",false).put("scope","Actual signed combined APK file:///android_asset assets. No JS/CSS/image injection. Real reward engine, native close-button taps, same-day and rollback guard; test dates are simulated, not trusted server time.").put("clockCases",clockCases).put("cases",cases);
        try(FileOutputStream f=new FileOutputStream(new File(output,"treasure-runtime-report.json"))){f.write(report.toString(2).getBytes("UTF-8"));}
    }
}
