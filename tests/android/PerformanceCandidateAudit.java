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
    @Test(timeout=180000) public void minifiedWebViewAndSaveRestart() throws Exception {
        Context context=inst.getTargetContext();
        File record=new File(context.getNoBackupFilesDir(),"audience-choice-v1");
        try(FileOutputStream output=new FileOutputStream(record)){output.write("kd-audience-v1|under13".getBytes(StandardCharsets.UTF_8));output.getFD().sync();}
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);
            assertEquals("6.56",eval("KaraNative.appVersion()"));
            assertEquals("6.56",context.getPackageManager().getPackageInfo(context.getPackageName(),0).versionName);
            assertTrue(Boolean.TRUE.equals(eval("['state','login','syncSave','openAccountDeletion','rewardedAccountRequest','privacyState','installationId'].every(k=>typeof KaraNative[k]==='function')")));
            assertTrue(Boolean.TRUE.equals(eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdSelectLevel(1);kdLearning.leave();kdSetPaused(true);let moves=kdGetLearningState().moves;for(const t of document.querySelectorAll('#board>.tile')){t.click();if(kdGetLearningState().moves>moves)return true;}return false;})()")));
            Number count=(Number)eval("kdGetLearningState().moves");assertTrue(count.intValue()>0);
            SystemClock.sleep(2500);
            scenario.recreate();ready(scenario);
            assertTrue(Boolean.TRUE.equals(eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdLearning.leave();return true})()")));
            assertEquals(count.intValue(),((Number)eval("kdGetLearningState().moves")).intValue());
            assertTrue(Boolean.TRUE.equals(eval("(()=>{let r=document.querySelector('#board').getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=innerWidth+1})()")));
        }
        System.out.println("PASS: minified native bridge, offline game, saved progress after activity recreation, board fits viewport");
    }
}
