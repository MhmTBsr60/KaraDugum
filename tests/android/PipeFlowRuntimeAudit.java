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
public final class PipeFlowRuntimeAudit {
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
    @Test(timeout=120000) public void testConnectionsThemesPixelsAndPerformance() throws Exception {
        assertTrue(Boolean.TRUE.equals(eval("!!kdPipeFlow && !window.kdLightFeedback")));
        eval("(()=>{kdSelectLevel(1);kdNavigate('game');kdLearning.leave();kdSetPaused(true);return true})()");
        SystemClock.sleep(200);JSONObject result=new JSONObject().put("status","RUNNING").put("phoneVerified",false).put("androidApi",android.os.Build.VERSION.SDK_INT);
        JSONArray themes=new JSONArray();
        for(String t:new String[]{"gold","ice","fire","shadow","emerald","ruby"}){
            eval("(()=>{kdNavigate('shop');document.querySelector('[data-shop-theme=\""+t+"\"]').click();kdNavigate('game');kdSetPaused(true);return true})()");
            visualFrame();JSONObject f=(JSONObject)eval("kdPipeFlow.state()");assertEquals(t,f.getString("theme"));assertTrue(f.getBoolean("canvas"));shot("theme-"+t);themes.put(t);
        }
        eval("(()=>{kdNavigate('shop');document.querySelector('[data-shop-theme=gold]').click();kdNavigate('game');kdSetPaused(true);return true})()");
        JSONObject old=(JSONObject)eval("kdPipeFlow.state()");
        int index=((Number)eval("(()=>{const s=kdLessonPreview();let best={i:-1,score:-1};for(let i=0;i<s.before.length;i++){const v=s.before.slice();v[i]=((v[i]<<1)&15)|(v[i]>>3);const score=kdConnectionModel.graph(v,s.n,s.flags.fog).edges.length;if(score>best.score)best={i,score}}return best.i})()")).intValue();
        tapSelector("#board>.tile[data-i=\""+index+"\"]");SystemClock.sleep(100);shot("connection-flow");JSONObject joined=(JSONObject)eval("kdPipeFlow.state()");assertTrue(joined.getJSONArray("edges").length()>old.getJSONArray("edges").length());
        assertTrue(Boolean.TRUE.equals(eval("(()=>{const l=kdLessonPreview();return JSON.stringify(kdConnectionModel.graph(l.before,l.n,l.flags.fog).edges)===JSON.stringify(kdPipeFlow.state().edges)})()")));
        SystemClock.sleep(1100);visualFrame();shot("connected-on");
        String snapshot=(String)eval("JSON.stringify({tiles:kdLessonPreview().before,coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons')})");
        eval("(()=>{kdNavigate('settings');return true})()");tapSelector("[data-setting=\"glow\"]");eval("(()=>{kdNavigate('game');kdSetPaused(true);return true})()");visualFrame();shot("connected-off");assertFalse(((JSONObject)eval("kdPipeFlow.state()")).getBoolean("enabled"));assertTrue(Boolean.TRUE.equals(eval("!document.getElementById('kdPipeFlowCanvas')")));
        eval("(()=>{kdNavigate('settings');return true})()");tapSelector("[data-setting=\"glow\"]");eval("(()=>{kdNavigate('game');kdSetPaused(true);return true})()");visualFrame();shot("connected-restored");assertEquals(snapshot,eval("JSON.stringify({tiles:kdLessonPreview().before,coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons')})"));
        result.put("pixelState",eval("({flow:kdPipeFlow.state(),vw:innerWidth,vh:innerHeight})"));
        JSONArray perf=new JSONArray();for(int level:new int[]{76,151}){
            eval("(()=>{kdSelectLevel("+level+");kdNavigate('game');kdLearning.leave();kdSetPaused(true);return true})()");
            tapSelector("#board>.tile:not(.good)");SystemClock.sleep(1200);
            JSONObject f=(JSONObject)eval("kdPipeFlow.state()");f.put("level",level);perf.put(f);
            int frames=f.getJSONObject("stats").getInt("frames");SystemClock.sleep(400);assertEquals(frames,((JSONObject)eval("kdPipeFlow.state()")).getJSONObject("stats").getInt("frames"));
        }
        result.put("themes",themes).put("performance",perf).put("status","PASS");
        try(FileOutputStream f=new FileOutputStream(new File(output,"pipe-flow-report.json"))){f.write(result.toString(2).getBytes("UTF-8"));}
    }
    /** Real Android WebView/GPU, simulated capable-device properties. Default-device path is tested separately. */
    @Test(timeout=120000) public void testAnimatedConnectionPathOnAndroidWebView() throws Exception {
        String html;try(InputStream in=activity.getAssets().open("index.html")){html=new String(in.readAllBytes(),"UTF-8");}
        String injected="<script>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__kdAnimatedHarness=true;</script>";
        final String page=html.replace("<head>","<head>"+injected);
        instrumentation.runOnMainSync(()->web.loadDataWithBaseURL("file:///android_asset/index.html",page,"text/html","UTF-8",null));
        long ready=SystemClock.uptimeMillis()+15000;while(SystemClock.uptimeMillis()<ready){if(Boolean.TRUE.equals(eval("!!window.__kdAnimatedHarness&&!!window.kdPipeFlow")))break;SystemClock.sleep(100);}
        assertTrue(Boolean.TRUE.equals(eval("!!window.__kdAnimatedHarness&&!!window.kdPipeFlow")));SystemClock.sleep(2600);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdFeedback.setEffects(false);kdFeedback.setHaptics(false);kdNavigate('game');kdOnboarding.leave();kdSelectLevel(1);kdLearning.leave();kdSetPaused(true);return true})()");
        SystemClock.sleep(150);JSONObject before=(JSONObject)eval("kdPipeFlow.state()");assertFalse(before.getBoolean("static"));
        tapSelector("#board>.tile[data-i=\"0\"]");SystemClock.sleep(220);shot("animated-flow-on");JSONObject during=(JSONObject)eval("kdPipeFlow.state()");
        assertEquals("strong-1",during.getString("style"));assertTrue(during.getJSONArray("edges").length()>before.getJSONArray("edges").length());
        SystemClock.sleep(1000);JSONObject after=(JSONObject)eval("kdPipeFlow.state()");shot("animated-flow-rest");
        assertTrue(after.getJSONObject("stats").getInt("frames")-before.getJSONObject("stats").getInt("frames")>5);
        int frames=after.getJSONObject("stats").getInt("frames");SystemClock.sleep(300);assertEquals(frames,((JSONObject)eval("kdPipeFlow.state()")).getJSONObject("stats").getInt("frames"));
        eval("(()=>{localStorage.setItem('kd64_hintCoupons','2000');let k=0;while(!kdGetLearningState().locked&&k++<100)document.getElementById('hint').click();return true})()");
        assertTrue(Boolean.TRUE.equals(eval("kdGetLearningState().locked")));SystemClock.sleep(200);JSONObject completion=(JSONObject)eval("kdPipeFlow.state()");assertFalse(completion.isNull("wave"));shot("animated-completion");SystemClock.sleep(2300);assertTrue(Boolean.TRUE.equals(eval("kdPipeFlow.state().wave===null")));
        JSONObject report=new JSONObject().put("status","PASS").put("phoneVerified",false).put("androidApi",android.os.Build.VERSION.SDK_INT).put("hardwareOverrideForTest",true).put("scope","Packaged runtime assets in actual Android WebView; navigator properties forced to capable-device values, not physical POCO performance").put("during",during).put("after",after).put("completion",completion);
        try(FileOutputStream f=new FileOutputStream(new File(output,"animated-flow-report.json"))){f.write(report.toString(2).getBytes("UTF-8"));}
    }

}
