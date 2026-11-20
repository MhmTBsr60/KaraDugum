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
public final class PocoEnergyUpgradeAudit {
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
        if(!latch.await(15,TimeUnit.SECONDS))throw new TimeoutException("evaluateJavascript");
        Object raw=new JSONTokener(answer[0]).nextValue();Object value=raw instanceof String?new JSONTokener((String)raw).nextValue():raw;
        if(value instanceof JSONObject&&((JSONObject)value).has("error"))fail(value.toString());return value;
    }
    private void ready() throws Exception {
        long limit=SystemClock.uptimeMillis()+60000;
        while(SystemClock.uptimeMillis()<limit){try{if(Boolean.TRUE.equals(eval("!!window.kdGetLearningState&&!!window.kdNavigate")))return;}catch(TimeoutException ignored){}SystemClock.sleep(100);}
        fail("game did not load");
    }
    private String snapshot() throws Exception {
        return (String)eval("(()=>{const saved=JSON.parse(localStorage.getItem('kd64_activeGame'));delete saved.elapsed;return JSON.stringify({saved,values:Object.fromEntries(['kd64_level','kd64_completed','kd64_best','kd64_coins','kd64_hintCoupons','kd64_shopTheme_ruby','kd64_shopTheme_gold','kd64_shopTheme_ice','kd64_shopTheme_fire','kd64_shopTheme_shadow','kd64_shopTheme_emerald','kd5_glow','kd6_lang','kd3_sound','kd64_dailyDate','kd64_streak','kd64_dailySeen','kd64_dailyLastReward'].map(k=>[k,localStorage.getItem(k)]))})})()");
    }
    private void write(String name,String text) throws Exception {try(FileOutputStream f=new FileOutputStream(new File(output,name))){f.write(text.getBytes("UTF-8"));}}
    private String argument(String name,String fallback) {
        return InstrumentationRegistry.getArguments().getString(name,fallback);
    }
    private void expectVersion(String name) throws Exception {
        assertEquals(name,inst.getTargetContext().getPackageManager().getPackageInfo("com.orynexa.karadugum",0).versionName);
    }
    @Test(timeout=100000) public void seedPreviousSignedTest() throws Exception {
        assertEquals(argument("fromStyle","energy-reference-3-layered"),((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        expectVersion(argument("fromVersion","6.50-energy-finish-test2"));
        eval("(()=>{localStorage.setItem('kd64_level','6');localStorage.setItem('kd64_completed','{\\\"1\\\":3,\\\"2\\\":2,\\\"3\\\":3}');localStorage.setItem('kd64_best','{\\\"1\\\":4200,\\\"2\\\":3100,\\\"3\\\":5000}');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');localStorage.setItem('kd64_shopTheme_ruby','true');localStorage.setItem('kd5_glow','1');localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd3_sound','0');return true})()");
        inst.runOnMainSync(()->web.reload());SystemClock.sleep(500);ready();SystemClock.sleep(2600);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');kdOnboarding.leave();kdSelectLevel(6);kdLearning.leave();kdFeedback.setHaptics(false);const today=new Date().toLocaleDateString('en-CA');localStorage.setItem('kd64_dailyDate',JSON.stringify(today));localStorage.setItem('kd64_streak','3');localStorage.setItem('kd64_dailySeen',JSON.stringify(today));localStorage.setItem('kd64_dailyLastReward',JSON.stringify({date:today,day:3,coins:0,hints:1}));document.querySelector('#board>.tile').click();kdSetPaused(true);return true})()");
        assertEquals(1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
        if (!argument("candidateCode","").isEmpty()) {
            if (themePurchaseAudit()) {
                eval("(()=>{for(const id of ['gold','ice','fire','shadow','ruby'])localStorage.setItem('kd64_shopTheme_'+id,'true');localStorage.setItem('kd64_coins','1250');return true})()");
            } else {
                eval("(()=>{for(const id of ['gold','ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+id,'true');return true})()");
            }
        }
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
    @Test(timeout=100000) public void verifyPreviousBeforeUpgrade() throws Exception {
        assertEquals(argument("fromStyle","energy-reference-3-layered"),((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        expectVersion(argument("fromVersion","6.50-energy-finish-test2"));
        comparePersisted("old-restart");
        write("upgrade-old-restart-report.json",new JSONObject().put("status","PASS").put("scope","Same old signed APK in a new process, before any package update").put("phoneVerified",false).toString(2));
    }
    @Test(timeout=100000) public void verifyAfterInPlaceInstall() throws Exception {
        assertEquals("energy-reference-3-poco",((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
        expectVersion(argument("toVersion","6.50-poco-energy-test3"));
        assertTrue(Boolean.TRUE.equals(eval("!!window.kdDailyTreasure")));
        comparePersisted("new-install");
        assertTrue(Boolean.TRUE.equals(eval("!!document.querySelector('#board .kdPipeCuffInset path.kdPipeCuffRivets') && typeof kdPipeFlow.state().effects.layers.wave === 'number'")));

        assertTrue(Boolean.TRUE.equals(eval("!window.kdLightFeedback")));
        eval("(()=>{kdNavigate('home');kdNavigate('home');return true})()");
        SystemClock.sleep(420);
        assertEquals(0,((Number)eval("document.querySelectorAll('.kdDailyOverlay').length")).intValue());
        assertEquals("Returning home must not grant a second award",expectedSnapshot(),snapshot());
        if (!argument("candidateCode","").isEmpty()) verifyCandidateWebView();
        if (themePurchaseAudit()) verifyThemePurchase();
        write("upgrade-report.json",new JSONObject().put("status","PASS").put("previousVersion",argument("fromVersion","6.50-energy-finish-test2")).put("newVersion",argument("toVersion","6.50-poco-energy-test3")).put("inPlaceInstall",true).put("oldProcessRestartVerified",true).put("seedCommitWaitMs",10000).put("uninstalledOrClearedData",false).put("phoneVerified",false).put("puzzleAndProgressPreserved",true).put("inventoryOwnershipAndPreferencesPreserved",true).put("undoAcrossProcessRestart","Not claimed; original engine does not persist undo history across restart").toString(2));
    }
    private void verifyCandidateWebView() throws Exception {
        int expectedCode=Integer.parseInt(argument("candidateCode",""));
        assertEquals(expectedCode,inst.getTargetContext().getPackageManager().getPackageInfo("com.orynexa.karadugum",0).versionCode);
        assertTrue(Boolean.TRUE.equals(eval("(()=>{const l=kdLocalization,d=l.dictionaries;return Object.keys(l.languages).length===25&&Object.keys(d.en).length>=586&&Object.keys(l.languages).filter(x=>x!=='tr').every(x=>Object.keys(d.en).every(k=>d[x][k]))})()")));
        eval("(()=>{kdNavigate('game');window.kdFixtureBoard=document.querySelector('#board');window.kdFixtureCell=kdFixtureBoard.querySelector('.tile');return true})()");
        for (String code:new String[]{"en","ar","ja","tr"}) {
            eval("(()=>{kdNavigate('settings');return true})()");
            JSONObject language=(JSONObject)eval("(()=>{const picker=document.getElementById('kdLangSelect');picker.value='"+code+"';picker.dispatchEvent(new Event('change',{bubbles:true}));kdNavigate('game');kdSetPaused(true);const board=document.querySelector('#board');return {language:document.documentElement.lang,direction:document.documentElement.dir,board:getComputedStyle(board).direction,same:board===window.kdFixtureBoard&&board.querySelector('.tile')===window.kdFixtureCell,actions:[...document.querySelectorAll('.kdGameActions button')].sort((a,b)=>a.getBoundingClientRect().x-b.getBoundingClientRect().x).map(b=>b.id).join(',')}})()");
            assertEquals(code,language.getString("language"));
            assertEquals(code.equals("ar")?"rtl":"ltr",language.getString("direction"));
            assertEquals("ltr",language.getString("board"));
            assertTrue("Language selection must keep the same board and first tile",language.getBoolean("same"));
            assertEquals("hint,undo,restart,new",language.getString("actions"));
        }
        assertEquals("Language changes must preserve progress and resources",expectedSnapshot(),snapshot());
        write("candidate-webview-report.json",new JSONObject().put("status","PASS")
            .put("versionCode",expectedCode).put("locales",new JSONArray("[\"en\",\"ar\",\"ja\",\"tr\"]"))
            .put("dictionaryKeys",eval("Object.keys(kdLocalization.dictionaries.en).length")).put("savedThemeEntitlements",themePurchaseAudit()?5:6).put("boardDirectionPreserved",true)
            .put("noPageReload",true).put("phoneVerified",false).toString(2));
    }

    private boolean themePurchaseAudit() {
        return Boolean.parseBoolean(argument("themePurchaseAudit","false"));
    }
    private void openEmerald() throws Exception {
        eval("(()=>{kdNavigate('shop');document.querySelector('[data-shop-theme=emerald]').click();return true})()");
    }
    private void verifyThemePurchase() throws Exception {
        openEmerald();
        assertEquals("900",eval("document.querySelector('[data-purchase-price]').textContent"));
        assertEquals("1.250",eval("document.querySelector('[data-purchase-balance]').textContent"));
        assertEquals(1250,((Number)eval("+localStorage.getItem('kd64_coins')")).intValue());
        eval("(()=>{document.querySelector('[data-theme-cancel]').click();return true})()");
        assertEquals(expectedSnapshot(),snapshot());
        openEmerald();
        inst.sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
        long limit=SystemClock.uptimeMillis()+5000;
        while (SystemClock.uptimeMillis()<limit && Boolean.TRUE.equals(eval("!!document.querySelector('.kdThemePurchase')"))) {
            SystemClock.sleep(75);
        }
        assertEquals(Boolean.FALSE,eval("!!document.querySelector('.kdThemePurchase')"));
        assertEquals(expectedSnapshot(),snapshot());
        openEmerald();
        eval("(()=>{const confirm=document.querySelector('[data-theme-confirm]');confirm.click();confirm.click();return true})()");
        verifyEmeraldOwnership();
        eval("(()=>{document.querySelector('[data-shop-theme=gold]').click();document.querySelector('[data-shop-theme=emerald]').click();return true})()");
        assertEquals(Boolean.FALSE,eval("!!document.querySelector('.kdThemePurchase')"));
        verifyEmeraldOwnership();
        write("theme-purchase-webview.json",new JSONObject().put("status","PASS")
            .put("androidBackWithoutCharge",true).put("cancelWithoutCharge",true)
            .put("confirmPrice",900).put("balanceBefore",1250).put("balanceAfter",350)
            .put("confirmDoubleClickDeduplicated",true).put("ownedThemeReappliedWithoutCharge",true).toString(2));
        SystemClock.sleep(10000);
    }
    private void verifyEmeraldOwnership() throws Exception {
        assertEquals(350,((Number)eval("+localStorage.getItem('kd64_coins')")).intValue());
        assertEquals("true",eval("localStorage.getItem('kd64_shopTheme_emerald')"));
        assertEquals("emerald",eval("document.documentElement.dataset.kdTheme"));
    }
    @Test(timeout=100000) public void verifyThemePurchaseAfterRestart() throws Exception {
        expectVersion(argument("toVersion","6.51-rc2-test"));
        verifyEmeraldOwnership();
        write("theme-purchase-restart.json",new JSONObject().put("status","PASS")
            .put("balance",350).put("emeraldOwned",true).toString(2));
    }

}
