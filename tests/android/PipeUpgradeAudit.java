package com.orynexa.karadugum;

import android.content.Context;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.io.*;
import java.lang.reflect.Field;
import java.util.concurrent.*;
import static org.junit.Assert.*;

/** Two separately invoked stages around adb install -r; never uninstalls or clears app data. */
@RunWith(AndroidJUnit4.class)
public final class PipeUpgradeAudit {
    private final android.app.Instrumentation inst=InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;
    private WebView web;
    private File output;
    @Before public void start() throws Exception {
        Context context=inst.getTargetContext();
        assertTrue(new AudienceChoiceStore(context.getNoBackupFilesDir()).save("under13"));
        scenario=ActivityScenario.launch(MainActivity.class);
        final MainActivity[] activity={null};scenario.onActivity(a->activity[0]=a);
        Field f=MainActivity.class.getDeclaredField("view");f.setAccessible(true);web=(WebView)f.get(activity[0]);
        output=new File(context.getExternalFilesDir(null),"webview-audit");assertTrue(output.exists()||output.mkdirs());
        ready();SystemClock.sleep(2700);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();return true})()");
    }
    @After public void close(){if(scenario!=null)scenario.close();}
    private Object eval(String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);String[] answer={null};
        inst.runOnMainSync(()->web.evaluateJavascript("(function(){try{return JSON.stringify("+expression+");}catch(e){return JSON.stringify({error:String(e)})}})()",v->{answer[0]=v;latch.countDown();}));
        if(!latch.await(5,TimeUnit.SECONDS))throw new TimeoutException("evaluateJavascript");
        Object raw=new JSONTokener(answer[0]).nextValue();Object value=raw instanceof String?new JSONTokener((String)raw).nextValue():raw;
        if(value instanceof JSONObject&&((JSONObject)value).has("error"))fail(value.toString());return value;
    }
    private void ready() throws Exception {
        long limit=SystemClock.uptimeMillis()+45000;
        while(SystemClock.uptimeMillis()<limit){try{if(Boolean.TRUE.equals(eval("!!window.kdGetLearningState&&!!window.kdNavigate")))return;}catch(TimeoutException ignored){}SystemClock.sleep(100);}
        fail("game did not load");
    }
    private String snapshot() throws Exception {
        return (String)eval("(()=>{const saved=JSON.parse(localStorage.getItem('kd64_activeGame'));delete saved.elapsed;return JSON.stringify({saved,values:Object.fromEntries(['kd64_level','kd64_completed','kd64_best','kd64_coins','kd64_hintCoupons','kd64_shopTheme_ruby','kd5_glow','kd6_lang','kd3_sound'].map(k=>[k,localStorage.getItem(k)]))})})()");
    }
    private void write(String name,String text) throws Exception {try(FileOutputStream f=new FileOutputStream(new File(output,name))){f.write(text.getBytes("UTF-8"));}}
    @Test(timeout=60000) public void seedPreviousSignedTest() throws Exception {
        assertEquals("strong-1",((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        eval("(()=>{localStorage.setItem('kd64_level','6');localStorage.setItem('kd64_completed','{\\\"1\\\":3,\\\"2\\\":2,\\\"3\\\":3}');localStorage.setItem('kd64_best','{\\\"1\\\":4200,\\\"2\\\":3100,\\\"3\\\":5000}');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');localStorage.setItem('kd64_shopTheme_ruby','true');localStorage.setItem('kd5_glow','1');localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd3_sound','0');return true})()");
        inst.runOnMainSync(()->web.reload());SystemClock.sleep(500);ready();SystemClock.sleep(2600);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdSelectLevel(6);kdLearning.leave();kdFeedback.setHaptics(false);document.querySelector('#board>.tile').click();kdSetPaused(true);return true})()");
        assertEquals(1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
        write("upgrade-expected.json",snapshot());
        // Chromium LocalStorage is synchronous to JS, but commits its backing database
        // asynchronously. Do not kill the seed process immediately after its final move.
        SystemClock.sleep(10000);
    }
    private String expectedSnapshot() throws Exception {
        try(InputStream in=new FileInputStream(new File(output,"upgrade-expected.json"))){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)bytes.write(buffer,0,n);return bytes.toString("UTF-8");}
    }
    private void comparePersisted(String stage) throws Exception {
        eval("(()=>{kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(true);return true})()");
        String expected=expectedSnapshot(),actual=snapshot();
        write("upgrade-"+stage+"-actual.json",actual);
        write("upgrade-"+stage+"-storage.json",(String)eval("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))"));
        assertEquals("Persisted fixture differs at "+stage,expected,actual);
        assertEquals(1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
    }
    @Test(timeout=60000) public void verifyPreviousBeforeUpgrade() throws Exception {
        assertEquals("strong-1",((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        comparePersisted("old-restart");
        write("upgrade-old-restart-report.json",new JSONObject().put("status","PASS").put("scope","Same old signed APK in a new process, before any package update").put("phoneVerified",false).toString(2));
    }
    @Test(timeout=60000) public void verifyAfterInPlaceInstall() throws Exception {
        assertEquals("contrast-2",((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        comparePersisted("new-install");
        assertTrue(Boolean.TRUE.equals(eval("!window.kdLightFeedback")));
        write("upgrade-report.json",new JSONObject().put("status","PASS").put("previousVersion","6.50-pipe-energy-test1").put("newVersion","6.50-pipe-energy-test2").put("inPlaceInstall",true).put("oldProcessRestartVerified",true).put("seedCommitWaitMs",10000).put("uninstalledOrClearedData",false).put("phoneVerified",false).put("puzzleAndProgressPreserved",true).put("inventoryOwnershipAndPreferencesPreserved",true).put("undoAcrossProcessRestart","Not claimed; original engine does not persist undo history across restart").toString(2));
    }
}
