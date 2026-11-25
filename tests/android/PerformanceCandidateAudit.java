package com.orynexa.karadugum;

import android.app.Instrumentation;
import android.content.Context;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public final class PerformanceCandidateAudit {
    private final Instrumentation inst=InstrumentationRegistry.getInstrumentation();
    private WebView web;
    private WebView findWeb(View v) {
        if(v instanceof WebView)return (WebView)v;
        if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++){WebView w=findWeb(group.getChildAt(i));if(w!=null)return w;}}
        return null;
    }
    private Object eval(String script) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);String[] result={null};
        inst.runOnMainSync(()->web.evaluateJavascript(script,v->{result[0]=v;latch.countDown();}));
        assertTrue("WebView evaluation timed out",latch.await(15,TimeUnit.SECONDS));
        return new JSONTokener(result[0]).nextValue();
    }
    private void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        scenario.onActivity(a->web=findWeb(a.getWindow().getDecorView())); assertNotNull(web);
        long end=SystemClock.uptimeMillis()+55000;
        while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(eval("!!window.kdGetLearningState&&!!window.kdNavigate&&!!window.kdPipeFlow&&!document.querySelector('#kdSplash,.kdSplash')")))return;SystemClock.sleep(200);}
        fail("Game not ready");
    }
    private void screenshot(Context context,String name) throws Exception {
        // Real device screenshot, after the Android first-use immersive guidance is dismissed.
        android.view.accessibility.AccessibilityNodeInfo root=inst.getUiAutomation().getRootInActiveWindow();
        if(root!=null) {
            for(android.view.accessibility.AccessibilityNodeInfo node:root.findAccessibilityNodeInfosByText("Got it")) {
                if(node.isClickable()&&node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)){SystemClock.sleep(500);break;}
            }
        }
        System.out.println("VISUAL_657 "+name+" "+eval("JSON.stringify({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})"));
        android.graphics.Bitmap bitmap=inst.getUiAutomation().takeScreenshot();
        assertNotNull("Android screenshot unavailable",bitmap);
        File dir=new File(context.getExternalFilesDir(null),"visual657");
        assertTrue(dir.exists()||dir.mkdirs());
        try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){
            assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));
        } finally {bitmap.recycle();}
    }
    private void fullscreen(ActivityScenario<MainActivity> scenario) throws Exception {
        final boolean[] hidden={false};long limit=SystemClock.uptimeMillis()+10000;
        while(SystemClock.uptimeMillis()<limit){
            scenario.onActivity(a->{android.view.WindowInsets i=a.getWindow().getDecorView().getRootWindowInsets();hidden[0]=i!=null&&!i.isVisible(android.view.WindowInsets.Type.statusBars())&&!i.isVisible(android.view.WindowInsets.Type.navigationBars());});
            if(hidden[0])return;SystemClock.sleep(250);
        }
        fail("Status or navigation bar still visible");
    }
    @Test(timeout=180000) public void minifiedWebViewAndSaveRestart() throws Exception {
        Context context=inst.getTargetContext();
        File record=new File(context.getNoBackupFilesDir(),"audience-choice-v1");
        try(FileOutputStream output=new FileOutputStream(record)){output.write("kd-audience-v1|under13".getBytes(StandardCharsets.UTF_8));output.getFD().sync();}
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);
            assertEquals("6.57",eval("KaraNative.appVersion()"));
            assertEquals("6.57",context.getPackageManager().getPackageInfo(context.getPackageName(),0).versionName);
            assertTrue(Boolean.TRUE.equals(eval("['state','login','syncSave','openAccountDeletion','rewardedAccountRequest','privacyState','installationId'].every(k=>typeof KaraNative[k]==='function')")));
            assertTrue(Boolean.TRUE.equals(eval("(()=>{localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd5_glow','1');document.body.classList.remove('kdNoGlow');document.querySelector('.kdDailyClose')?.click();kdOnboarding.leave();kdNavigate('home');return true;})()")));
            SystemClock.sleep(900);fullscreen(scenario);screenshot(context,"01-ana-menu");
            assertTrue(Boolean.TRUE.equals(eval("(()=>{localStorage.setItem('kd64_level','300');kdNavigate('game');kdSelectLevel(21);kdLearning.leave();kdOnboarding.leave();kdSetPaused(true);return kdGetLearningState().level===21;})()")));
            SystemClock.sleep(1000);fullscreen(scenario);screenshot(context,"02-bolum-21");
            assertTrue("Connected pipes must have visible light canvas",Boolean.TRUE.equals(eval("(()=>{const s=kdPipeFlow.state();return s.enabled&&s.canvas&&s.edges.length>0&&s.effects.layers.settled>0})()")));
            assertTrue(Boolean.TRUE.equals(eval("(()=>{kdSelectLevel(1);kdLearning.leave();kdSetPaused(true);return true})()")));
            SystemClock.sleep(300);
            assertTrue(Boolean.TRUE.equals(eval("(()=>{const s=kdLessonPreview(),base=kdConnectionModel.graph(s.before,s.n,s.flags.fog).edges.length;let best=null;for(let i=0;i<s.before.length;i++){const v=s.before.slice();v[i]=((v[i]<<1)&15)|(v[i]>>3);const score=kdConnectionModel.graph(v,s.n,s.flags.fog).edges.length;if(!s.flags.fixed[i]&&score>base&&(best===null||score>best.score))best={i,score};}if(!best)return false;document.querySelectorAll('#board>.tile')[best.i].click();return true})()")));
            SystemClock.sleep(300);screenshot(context,"03-enerji-efekti");

            assertTrue(Boolean.TRUE.equals(eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdSelectLevel(1);kdLearning.leave();kdSetPaused(true);let moves=kdGetLearningState().moves;for(const t of document.querySelectorAll('#board>.tile')){t.click();if(kdGetLearningState().moves>moves)return true;}return false;})()")));
            Number count=(Number)eval("kdGetLearningState().moves");assertTrue(count.intValue()>0);
            SystemClock.sleep(2500);
            scenario.recreate();ready(scenario);
            assertTrue(Boolean.TRUE.equals(eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdLearning.leave();return true})()")));
            assertEquals(count.intValue(),((Number)eval("kdGetLearningState().moves")).intValue());
            assertTrue(Boolean.TRUE.equals(eval("(()=>{let r=document.querySelector('#board').getBoundingClientRect();const a=document.querySelector(\".kdGameActions\").getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=a.top+1&&a.bottom<=innerHeight+1})()")));
        }
        System.out.println("PASS: minified native bridge, offline game, saved progress after activity recreation, board fits viewport");
    }
}
