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
    private MainActivity currentActivity;
    private File output;
    @Before public void start() throws Exception {
        Context context=inst.getTargetContext();
        assertTrue(new AudienceChoiceStore(context.getNoBackupFilesDir()).save("under13"));
        scenario=ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(a->currentActivity=a);
        Field f=MainActivity.class.getDeclaredField("view");f.setAccessible(true);web=(WebView)f.get(currentActivity);
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
    private boolean baseline650() { return Boolean.parseBoolean(argument("baseline650", "false")); }
    private void expectPreviousStyle() throws Exception {
        if (!baseline650()) assertEquals(argument("fromStyle","energy-reference-3-layered"),((JSONObject)eval("kdPipeFlow.state()")).getString("style"));
    }
    @Test(timeout=100000) public void seedPreviousSignedTest() throws Exception {
        expectPreviousStyle();
        expectVersion(argument("fromVersion","6.50-energy-finish-test2"));
        eval("(()=>{localStorage.setItem('kd64_level','6');localStorage.setItem('kd64_completed','{\\\"1\\\":3,\\\"2\\\":2,\\\"3\\\":3}');localStorage.setItem('kd64_best','{\\\"1\\\":4200,\\\"2\\\":3100,\\\"3\\\":5000}');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');localStorage.setItem('kd64_shopTheme_ruby','true');localStorage.setItem('kd5_glow','1');localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd3_sound','0');return true})()");
        inst.runOnMainSync(()->web.reload());SystemClock.sleep(500);ready();SystemClock.sleep(2600);
        eval("(()=>{document.querySelector('.kdDailyClose')?.click();kdNavigate('game');window.kdOnboarding?.leave();kdSelectLevel(6);kdLearning.leave();window.kdFeedback?.setHaptics(false);const today=new Date().toLocaleDateString('en-CA');localStorage.setItem('kd64_dailyDate',JSON.stringify(today));localStorage.setItem('kd64_streak','3');localStorage.setItem('kd64_dailySeen',JSON.stringify(today));localStorage.setItem('kd64_dailyLastReward',JSON.stringify({date:today,day:3,coins:0,hints:1}));document.querySelector('#board>.tile').click();kdSetPaused(true);return true})()");
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
        eval("(()=>{kdNavigate('game');window.kdOnboarding?.leave();kdLearning.leave();kdSetPaused(true);return true})()");
        String expected=expectedSnapshot(),actual=snapshot();
        write("upgrade-"+stage+"-actual.json",actual);
        write("upgrade-"+stage+"-storage.json",(String)eval("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))"));
        assertEquals("Persisted fixture differs at "+stage,expected,actual);
        assertEquals(1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
    }
    @Test(timeout=100000) public void verifyPreviousBeforeUpgrade() throws Exception {
        expectPreviousStyle();
        expectVersion(argument("fromVersion","6.50-energy-finish-test2"));
        comparePersisted("old-restart");
        if (baseline650()) {
            eval("document.getElementById('undo').click()");
            assertEquals("6.50 never persisted the undo stack",expectedSnapshot(),snapshot());
        }
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

    private boolean waitForExitDialog(boolean expected, long timeout) throws Exception {
        long until=SystemClock.uptimeMillis()+timeout;
        do {
            if (Boolean.valueOf(expected).equals(eval("!!document.querySelector('.kdExitDialog[open]')"))) return true;
            SystemClock.sleep(75);
        } while (SystemClock.uptimeMillis()<until);
        return false;
    }
    private void pressAndroidBack() {
        inst.sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
    }
    private void screenshotExit(String file) throws Exception {
        SystemClock.sleep(600);
        android.graphics.Bitmap shot=inst.getUiAutomation().takeScreenshot();
        assertNotNull(shot);
        try (FileOutputStream stream = new FileOutputStream(new File(output,file))) {
            assertTrue(shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,stream));
        } finally {
            shot.recycle();
        }
    }
    @Test(timeout=100000) public void verifyExitViewport() throws Exception {
        expectVersion(argument("toVersion","6.51-rc3-test"));
        pressAndroidBack();
        assertTrue(waitForExitDialog(true,5000));
        JSONObject geometry=(JSONObject)eval("(()=>{const d=document.querySelector('.kdExitDialog'),r=d.getBoundingClientRect();const label=d.querySelector('[data-exit-cancel] span'),range=document.createRange();range.selectNodeContents(label);return {width:innerWidth,height:innerHeight,visible:r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,targets:[...d.querySelectorAll('button')].every(e=>e.getBoundingClientRect().height>=44),scroll:d.scrollWidth>d.clientWidth+1,cancelFitsOneLine:range.getClientRects().length===1}})()");
        assertTrue(geometry.getBoolean("visible"));
        assertTrue(geometry.getBoolean("targets"));
        assertFalse(geometry.getBoolean("scroll"));
        assertTrue(geometry.getBoolean("cancelFitsOneLine"));
        String name="exit-viewport-"+geometry.getInt("width");
        geometry.put("status","PASS");
        write(name+".json",geometry.toString(2));
        screenshotExit(name+".png");
        eval("document.querySelector('.kdExitClose').click()");
        assertTrue(waitForExitDialog(false,5000));
    }
    @Test(timeout=100000) public void verifyCinematicExit() throws Exception {
        expectVersion(argument("toVersion","6.51-rc3-test"));
        eval("(()=>{kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(true);return true})()");
        String before=(String)eval("JSON.stringify(kdLessonPreview().before)");
        int moves=((JSONObject)eval("kdGetLearningState()")).getInt("moves");
        eval("(()=>{document.querySelector('#board .tile:not(.good)').click();kdSetPaused(true);return true})()");
        assertEquals(moves+1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
        pressAndroidBack();
        long until=SystemClock.uptimeMillis()+5000;
        while (SystemClock.uptimeMillis()<until && !Boolean.TRUE.equals(eval("!!document.querySelector('.kdExactHome')"))) SystemClock.sleep(75);
        assertEquals(Boolean.TRUE,eval("!!document.querySelector('.kdExactHome')"));
        assertTrue(waitForExitDialog(false,2000));

        pressAndroidBack();
        assertTrue(waitForExitDialog(true,5000));
        assertEquals("KARA DÜĞÜM",eval("document.getElementById('kdExitTitle').textContent"));
        pressAndroidBack();
        assertTrue(waitForExitDialog(false,5000));
        pressAndroidBack();
        assertTrue(waitForExitDialog(true,5000));
        eval("document.querySelector('[data-exit-cancel]').click()");
        assertTrue(waitForExitDialog(false,5000));
        pressAndroidBack();
        assertTrue(waitForExitDialog(true,5000));
        eval("document.querySelector('.kdExitClose').click()");
        assertTrue(waitForExitDialog(false,5000));

        // Start at the left display edge with Android gesture navigation enabled.
        final int[] size=new int[2];
        scenario.onActivity(a->{
            android.graphics.Rect bounds=a.getWindowManager().getCurrentWindowMetrics().getBounds();
            size[0]=bounds.width();size[1]=bounds.height();
        });
        boolean gesture=false;
        for(int i=0;i<3&&!gesture;i++){
            int y=size[1]/2;
            try(android.os.ParcelFileDescriptor fd=inst.getUiAutomation().executeShellCommand("input swipe 1 "+y+" "+(size[0]/3)+" "+y+" 220");
                FileInputStream output=new FileInputStream(fd.getFileDescriptor())) {
                while(output.read()!=-1) {}
            }
            gesture=waitForExitDialog(true,1500);
        }
        assertTrue("The emulator edge swipe should open the WebView exit confirmation",gesture);
        screenshotExit("exit-dialog-android.png");
        write("exit-before.json",new JSONObject().put("active",snapshot())
            .put("boardBeforeLastMove",before).put("movesBeforeLastMove",moves).toString(2));
        // Trigger the real UI button and wait for Activity.finish, not an instrumented substitute.
        inst.runOnMainSync(()->web.evaluateJavascript("document.querySelector('[data-exit-confirm]').click()",null));
        until=SystemClock.uptimeMillis()+10000;
        while(SystemClock.uptimeMillis()<until&&scenario.getState()!=androidx.lifecycle.Lifecycle.State.DESTROYED) SystemClock.sleep(100);
        assertEquals(androidx.lifecycle.Lifecycle.State.DESTROYED,scenario.getState());
        write("exit-android-actions.json",new JSONObject().put("status","PASS")
            .put("gameBackReturnsHome",true).put("backKeyOpenAndClose",true).put("edgeGestureOpen",true)
            .put("cancelAndCloseStayInGame",true).put("confirmFinishedActivity",true).toString(2));
    }
    @Test(timeout=100000) public void verifyCinematicExitAfterRestart() throws Exception {
        expectVersion(argument("toVersion","6.51-rc3-test"));
        JSONObject expected;
        try(FileInputStream input=new FileInputStream(new File(output,"exit-before.json"))){
            expected=new JSONObject(new String(input.readAllBytes(),"UTF-8"));
        }
        assertEquals("The active board and paid rights must survive actual exit",expected.getString("active"),snapshot());
        eval("(()=>{kdNavigate('game');kdOnboarding.leave();kdLearning.leave();document.getElementById('undo').click();kdSetPaused(true);return true})()");
        assertEquals(expected.getString("boardBeforeLastMove"),eval("JSON.stringify(kdLessonPreview().before)"));
        assertEquals(expected.getInt("movesBeforeLastMove"),((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
        write("exit-restart-report.json",new JSONObject().put("status","PASS")
            .put("activeBoardAndResourcesPreserved",true).put("undoRestoredAndExecuted",true)
            .put("phoneVerified",false).toString(2));
    }

    private void tapWeb(String selector) throws Exception {
        String query=JSONObject.quote(selector);
        long deadline=SystemClock.uptimeMillis()+10000;
        String previous=null;
        JSONArray point=null;
        do {
            boolean[] focused={false};
            inst.runOnMainSync(()->focused[0]=web.hasWindowFocus());
            Object result=eval("(()=>{const e=document.querySelector("+query+");if(!e)return null;const r=e.getBoundingClientRect();"+
                "const x=r.left+r.width/2,y=r.top+r.height/2;return [x,y,innerWidth,innerHeight,e.contains(document.elementFromPoint(x,y))]})()");
            if(focused[0]&&result instanceof JSONArray&&((JSONArray)result).getBoolean(4)){
                if(result.toString().equals(previous)){point=(JSONArray)result;break;}
                previous=result.toString();
            }else previous=null;
            SystemClock.sleep(110);
        }while(SystemClock.uptimeMillis()<deadline);
        assertNotNull("Focused WebView with a stable touch target expected: "+selector,point);
        CountDownLatch painted=new CountDownLatch(1);
        inst.runOnMainSync(()->{
            web.postVisualStateCallback(0,new WebView.VisualStateCallback(){
                @Override public void onComplete(long requestId){painted.countDown();}
            });
            web.invalidate();
        });
        assertTrue("WebView did not present the touch target: "+selector,painted.await(5,TimeUnit.SECONDS));
        JSONArray stable=point;
        int[] origin=new int[2];float[] screenPoint=new float[2];
        inst.runOnMainSync(()->{
            web.getLocationOnScreen(origin);
            screenPoint[0]=origin[0]+(float)(stable.optDouble(0)*web.getWidth()/stable.optDouble(2));
            screenPoint[1]=origin[1]+(float)(stable.optDouble(1)*web.getHeight()/stable.optDouble(3));
        });
        long down=SystemClock.uptimeMillis();
        for(int action:new int[]{android.view.MotionEvent.ACTION_DOWN,android.view.MotionEvent.ACTION_UP}){
            android.view.MotionEvent event=android.view.MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,screenPoint[0],screenPoint[1],0);
            event.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
            try{assertTrue("Android rejected the touch: "+selector,inst.getUiAutomation().injectInputEvent(event,true));}
            finally{event.recycle();}
        }
    }

    private void expectTutorialStep(int step) throws Exception {
        long deadline=SystemClock.uptimeMillis()+5000;
        do {
            Object value=eval("document.querySelector('#kdOnboardingOverlay')?.dataset.step||'0'");
            if(String.valueOf(step).equals(value))return;
            SystemClock.sleep(50);
        }while(SystemClock.uptimeMillis()<deadline);
        fail("Tutorial step "+step+" was not displayed");
    }

    @Test(timeout=100000) public void verifyTutorial114() throws Exception {
        expectVersion("6.51");
        tapWeb(".kdHotPlay");expectTutorialStep(1);
        assertEquals(Boolean.TRUE,eval("document.querySelector('[data-onboard-next]').disabled"));
        tapWeb("[data-onboard-next]");expectTutorialStep(1);
        tapWeb(".kdTutorialTarget");tapWeb("[data-onboard-next]");expectTutorialStep(2);
        tapWeb("[data-onboard-skip]");expectTutorialStep(0);
        write("tutorial-baseline-114.json",new JSONObject().put("status","PASS").put("baselineReproduced",true)
            .put("nextOnlyWorkedAfterPractice",true).toString(2));
    }

    @Test(timeout=100000) public void verifyTutorialFresh115() throws Exception {
        expectVersion("6.52");
        assertEquals(115,inst.getTargetContext().getPackageManager().getPackageInfo("com.orynexa.karadugum",0).versionCode);
        tapWeb(".kdHotPlay");expectTutorialStep(1);
        String before=snapshot();
        assertEquals(Boolean.TRUE,eval("!document.getElementById('kdGame').inert"));
        tapWeb("[data-onboard-next]");expectTutorialStep(2);
        tapWeb("[data-onboard-back]");expectTutorialStep(1);
        String tile=(String)eval("(()=>{for(const tile of document.querySelectorAll('#board>.tile:not(.good)')){const r=tile.getBoundingClientRect();"+
            "if(Number(tile.dataset.pipe)<15&&tile.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))return tile.dataset.i;}return '';})()");
        assertFalse("Ordinary board tiles must be touchable during step one",tile.isEmpty());
        String selector="#board>.tile[data-i=\""+tile+"\"]";
        tapWeb(selector);
        assertEquals(Boolean.TRUE,eval("!!document.querySelector("+JSONObject.quote(selector+" > .kdTutorialDemoTile")+")"));
        assertEquals(before,snapshot());
        for(int step=2;step<=4;step++){
            tapWeb("[data-onboard-next]");expectTutorialStep(step);
            tapWeb(".kdTutorialTarget");
            assertEquals(Boolean.TRUE,eval("document.querySelector('#kdOnboardingOverlay').classList.contains('kdTutorialDidAct')"));
            assertEquals(before,snapshot());
        }
        tapWeb("[data-onboard-next]");expectTutorialStep(0);
        assertEquals(before,snapshot());
        assertEquals(Boolean.TRUE,eval("Object.keys(localStorage).some(k=>k.startsWith('kd_onboarding_v1_')&&JSON.parse(localStorage.getItem(k)).completed)"));
        eval("(()=>{kdNavigate('home');return true;})()");
        tapWeb(".kdHotPlay");SystemClock.sleep(400);expectTutorialStep(0);
        tapWeb(selector);
        assertEquals(1,((JSONObject)eval("kdGetLearningState()")).getInt("moves"));
        write("tutorial-fresh-115.json",new JSONObject().put("status","PASS").put("apiLevel",android.os.Build.VERSION.SDK_INT)
            .put("realTouch",true).put("fourSteps",true).put("nextWithoutPractice",true).put("back",true)
            .put("practiceDoesNotMutateSave",true).put("boardPlayableAfterCompletion",true).toString(2));
    }

    @Test(timeout=100000) public void verifyTutorialExisting115() throws Exception {
        expectVersion("6.52");
        String before=snapshot();assertEquals(expectedSnapshot(),before);
        tapWeb(".kdHotPlay");SystemClock.sleep(400);expectTutorialStep(0);
        assertEquals(before,snapshot());
        eval("(()=>{kdNavigate('settings');return true;})()");
        tapWeb("[data-onboard-repeat]");expectTutorialStep(1);
        tapWeb("[data-onboard-skip]");expectTutorialStep(0);
        assertEquals(Boolean.TRUE,eval("!!document.querySelector('.kdSettingsScreen')"));
        assertEquals(before,snapshot());
        write("tutorial-existing-115.json",new JSONObject().put("status","PASS").put("apiLevel",android.os.Build.VERSION.SDK_INT)
            .put("existingDoesNotAutoOpen",true).put("settingsReplayAndSkip",true).put("savedBoardAndPurchasesPreserved",true).toString(2));
    }

    @Test public void verifyReceiptWriteFailure() throws Exception {
        expectVersion(argument("toVersion", "6.51-reward-safety-test"));
        class FailingStore implements RewardReceiptQueue.Store {
            final java.util.Map<String, String> memory = new java.util.LinkedHashMap<>();
            final java.util.Map<String, String> disk = new java.util.LinkedHashMap<>();
            boolean writable;
            @Override public boolean record(String purpose, String owner) {
                memory.put(purpose, owner);
                if (writable) disk.put(purpose, owner);
                return writable;
            }
            @Override public java.util.Map<String, String> pending() { return new java.util.LinkedHashMap<>(memory); }
            @Override public void acknowledge(String purpose) { memory.remove(purpose);disk.remove(purpose); }
        }
        FailingStore store = new FailingStore();
        String purpose = "hint:interrupted-android";
        RewardReceiptQueue queue = new RewardReceiptQueue(store);
        queue.earn(purpose, "original-owner");
        assertTrue(queue.flush());
        assertTrue(store.disk.isEmpty());
        assertTrue(queue.ready().isEmpty());
        queue.acknowledge(purpose);
        assertTrue(store.memory.containsKey(purpose));
        store.writable = true;
        queue.earn(purpose, "another-owner");
        assertFalse(queue.flush());
        assertEquals("original-owner", queue.ready().get(purpose));
        store.memory.clear();store.memory.putAll(store.disk);
        queue = new RewardReceiptQueue(store);
        assertEquals("original-owner", queue.ready().get(purpose));
        queue.acknowledge(purpose);
        assertTrue(queue.ready().isEmpty());
        write("receipt-native-android.json", new JSONObject().put("status", "PASS")
            .put("failedCommitWasNotDelivered",true).put("ownerPinned",true).put("receiptReplayedAfterReload",true).toString(2));
    }

    @Test(timeout=100000) public void seedInterruptedLoginReward() throws Exception {
        eval("(()=>{const today=new Date().toLocaleDateString('en-CA');localStorage.setItem('kd64_dailyDate',JSON.stringify(today));localStorage.setItem('kd64_streak','3');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');localStorage.removeItem('kd64_dailyLastReward');kdCloud.activate('android16-receipt-fixture');return true;})()");
        // Recreate the footprint of a stop after the account operation but before
        // the presentation receipt is written. Browser tests inject the actual write failure.
        eval("(()=>{const date=new Date();date.setDate(date.getDate()+1);const next=date.toLocaleDateString('en-CA');const previous=new Date().toLocaleDateString('en-CA');const journal={date:next,day:4,coins:15,hints:0};localStorage.setItem('kdCloud_login_android16-receipt-fixture',JSON.stringify(journal));kdEconomy.transact('login:'+next,{coins:15});localStorage.removeItem('kd64_dailyLastReward');kdCloud.exportFull();return true;})()");
        assertEquals(Boolean.TRUE, eval("!!localStorage.getItem('kdCloud_login_android16-receipt-fixture')"));
        SystemClock.sleep(10000);
    }

    @Test(timeout=100000) public void verifyInterruptedLoginAfterRestart() throws Exception {
        JSONObject after = (JSONObject)eval("(()=>{const d=new Date(),prev=d.toLocaleDateString('en-CA');d.setDate(d.getDate()+1);const date=d.toLocaleDateString('en-CA');const before=Number(localStorage.getItem('kd64_coins'));const duplicate=kdEconomy.claimLoginReward(date,prev);const recovered=JSON.parse(localStorage.getItem('kd64_dailyLastReward'));return {before,after:Number(localStorage.getItem('kd64_coins')),duplicate,recovered,date,pending:localStorage.getItem('kdCloud_login_android16-receipt-fixture')};})()");
        assertEquals(after.getInt("before"),after.getInt("after"));
        assertEquals(525,after.getInt("after"));
        assertFalse(after.getBoolean("duplicate"));
        assertTrue(after.isNull("pending"));
        assertEquals(after.getString("date"),after.getJSONObject("recovered").getString("date"));
        assertEquals(15,after.getJSONObject("recovered").getInt("coins"));
        write("receipt-webview-android.json",new JSONObject().put("status","PASS")
            .put("apiLevel",android.os.Build.VERSION.SDK_INT).put("interruptedAccountStateRecoveredAfterProcessStop",true)
            .put("duplicateCredit",false).toString(2));
    }

}
