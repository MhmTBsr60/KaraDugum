package com.orynexa.karadugum;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.content.Context;
import android.util.Log;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import com.google.android.gms.games.Player;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String TAG = "KaraDugum";
    private static final String SAVE_NAME = "karadugum_progress_v1";
    private static final String ACH_FIRST = "CgkI-ZiLnPgfEAIQAg";
    private static final String ACH_STARS = "CgkI-ZiLnPgfEAIQAw";
    private static final String ACH_LEGEND = "CgkI-ZiLnPgfEAIQBA";
    private static final String LEADERBOARD_ID = "CgkI-ZiLnPgfEAIQAQ";
    private static final String REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";
    private static final String INTERSTITIAL_TEST_ID = "ca-app-pub-3940256099942544/1033173712";
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private long lastInterstitialAt = 0;
    private boolean interstitialLoading = false;
    private String rewardPurpose = "coins";
    private boolean rewardedInProgress = false;
    private boolean rewardedLoading = false;
    private WebView view;
    private boolean backHandling = false;
    private boolean signedIn = false;
    private boolean saving = false;
    private String pendingSave;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            android.view.View.SYSTEM_UI_FLAG_FULLSCREEN |
            android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        PlayGamesSdk.initialize(this);
        MobileAds.initialize(this, status -> {});
        loadRewarded();
        loadInterstitial();
        view = new WebView(this);
        view.setBackgroundColor(Color.BLACK);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.getSettings().setAllowContentAccess(false);
        view.getSettings().setAllowFileAccessFromFileURLs(false);
        view.getSettings().setAllowUniversalAccessFromFileURLs(false);
        view.addJavascriptInterface(new Bridge(), "KaraNative");
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return !"file:///android_asset/index.html".equals(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return !"file:///android_asset/index.html".equals(url);
            }
            @Override public void onPageFinished(WebView v, String url) { checkSignIn(); }
        });
        setContentView(view);
        view.loadUrl("file:///android_asset/index.html");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> handleGameBack());
        }
    }

    private void send(String event, String payload) {
        runOnUiThread(() -> {
            if (view != null && !isFinishing() && !isDestroyed()) view.evaluateJavascript(
                "window.kdNativeEvent && window.kdNativeEvent(" +
                JSONObject.quote(event) + "," + payload + ")", null);
        });
    }
    private void error(String message) {
        Log.e(TAG, message);
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show());
        send("error", JSONObject.quote(message));
    }
    private void checkSignIn() {
        PlayGames.getGamesSignInClient(this).isAuthenticated().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                signedIn = false;
                Log.e(TAG, "Play Games kimlik kontrolu basarisiz", task.getException());
                send("user", "null");
                error("Play Games kimlik kontrolü başarısız: " + (task.getException() == null ? "bilinmeyen" : task.getException().getMessage()));
                return;
            }
            signedIn = task.getResult() != null && task.getResult().isAuthenticated();
            Log.i(TAG, "Play Games authenticated=" + signedIn);
            announceUser();
        });
    }
    private void announceUser() {
        if (!signedIn) { send("user", "null"); return; }
        PlayGames.getPlayersClient(this).getCurrentPlayer().addOnSuccessListener(player -> {
            try {
                JSONObject data = new JSONObject();
                data.put("name", player.getDisplayName());
                data.put("uid", player.getPlayerId());
                send("user", data.toString());
            } catch (Exception e) { error("Oyuncu profili okunamadı"); }
        }).addOnFailureListener(e -> error("Play Games profili alınamadı: " + e.getMessage()));
    }
    private JSONObject mergeSave(JSONObject a, JSONObject b) throws Exception {
        JSONObject result = new JSONObject(), completed = new JSONObject(), best = new JSONObject();
        JSONObject ca = a.optJSONObject("completed"), cb = b.optJSONObject("completed");
        JSONObject ba = a.optJSONObject("best"), bb = b.optJSONObject("best");
        int level = Math.max(a.optInt("level", 1), b.optInt("level", 1));
        for (int i=1;i<=300;i++) {
            String k=String.valueOf(i);
            int stars=Math.max(ca==null?0:ca.optInt(k),cb==null?0:cb.optInt(k));
            int points=Math.max(ba==null?0:ba.optInt(k),bb==null?0:bb.optInt(k));
            if(stars>0) { completed.put(k,Math.min(3,stars)); level=Math.max(level,Math.min(300,i+1)); }
            if(points>0) best.put(k,Math.min(10000000,points));
        }
        result.put("saveVersion",64);
        result.put("level",Math.max(1,Math.min(300,level)));
        result.put("completed",completed);
        result.put("best",best);
        return result;
    }
    private void syncSave(String raw) {
        if (!signedIn) return;
        if (raw == null || raw.length()>18000) { error("Kayıt boyutu geçersiz"); return; }
        try {
            JSONObject incoming=new JSONObject(raw);
            if(incoming.optJSONObject("completed")==null || incoming.optJSONObject("best")==null) return;
            if(saving) { pendingSave=raw; return; }
            saving=true;
            SnapshotsClient client=PlayGames.getSnapshotsClient(this);
            client.open(SAVE_NAME,true,SnapshotsClient.RESOLUTION_POLICY_MANUAL)
                .addOnSuccessListener(result -> handleSnapshot(client,result,incoming,0))
                .addOnFailureListener(e -> { saving=false; flushPending(); error("Bulut kayda erişilemedi: "+e.getMessage()); });
        } catch(Exception e) { saving=false; error("Kayıt verisi geçersiz"); }
    }
    private JSONObject readSnapshot(Snapshot snapshot) throws Exception {
        byte[] bytes=snapshot.getSnapshotContents().readFully();
        return bytes.length==0?new JSONObject():new JSONObject(new String(bytes,StandardCharsets.UTF_8));
    }
    private void handleSnapshot(SnapshotsClient client, SnapshotsClient.DataOrConflict<Snapshot> result, JSONObject incoming, int depth) {
        if(result.isConflict()) {
            SnapshotsClient.SnapshotConflict conflict=result.getConflict();
            if(conflict==null || depth>=5) { saving=false; error("Bulut kayıt çakışması çözülemedi. Tekrar giriş yaparak eşitle."); return; }
            Snapshot chosen=conflict.getSnapshot();
            Snapshot other=conflict.getConflictingSnapshot();
            try {
                JSONObject merged=mergeSave(mergeSave(readSnapshot(chosen),readSnapshot(other)),incoming);
                chosen.getSnapshotContents().writeBytes(merged.toString().getBytes(StandardCharsets.UTF_8));
                client.resolveConflict(conflict.getConflictId(),chosen)
                    .addOnSuccessListener(next -> handleSnapshot(client,next,merged,depth+1))
                    .addOnFailureListener(e -> { saving=false; flushPending(); error("Bulut kayıt çakışması: "+e.getMessage()); });
            } catch(Exception e) { client.discardAndClose(chosen); saving=false; flushPending(); error("Bulut kayıt birleştirilemedi: "+e.getMessage()); }
            return;
        }
        Snapshot snapshot=result.getData();
        if(snapshot==null) { saving=false; flushPending(); error("Bulut kayıt açılamadı"); return; }
        try {
            JSONObject merged=mergeSave(readSnapshot(snapshot),incoming);
            snapshot.getSnapshotContents().writeBytes(merged.toString().getBytes(StandardCharsets.UTF_8));
            client.commitAndClose(snapshot,SnapshotMetadataChange.EMPTY_CHANGE)
                .addOnSuccessListener(meta -> { send("cloudSave",merged.toString()); saving=false; flushPending(); })
                .addOnFailureListener(e -> { saving=false; flushPending(); error("Bulut kayıt yazılamadı: "+e.getMessage()); });
        } catch(Exception e) { client.discardAndClose(snapshot); saving=false; flushPending(); error("Bulut kayıt okunamadı: "+e.getMessage()); }
    }
    private void flushPending() {
        if(pendingSave!=null) { String next=pendingSave; pendingSave=null; syncSave(next); }
    }
    private void loadRewarded() {
        if (rewardedLoading || rewardedInProgress || rewardedAd != null || isFinishing() || isDestroyed()) return;
        rewardedLoading = true;
        RewardedAd.load(this, REWARDED_TEST_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) { rewardedLoading = false; rewardedAd = ad; send("adReady", "true"); }
            @Override public void onAdFailedToLoad(LoadAdError error) { rewardedLoading = false; rewardedAd = null; send("adReady", "false"); Log.w(TAG, "Rewarded load: " + error); }
        });
    }
    private void showRewarded() {
        if (rewardedInProgress) return;
        if (rewardedAd == null) { send("adUnavailable", "null"); loadRewarded(); return; }
        rewardedInProgress = true;
        RewardedAd ad = rewardedAd;
        rewardedAd = null;
        send("adReady", "false");
        final boolean[] rewardEarned = {false};
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() {
                rewardedInProgress = false;
                if (!rewardEarned[0]) send("adUnavailable", "null");
                loadRewarded();
            }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { rewardedInProgress = false; send("adUnavailable", "null"); loadRewarded(); }
        });
        final String purpose = rewardPurpose;
        try {
            ad.show(this, reward -> {
                if (rewardEarned[0]) return;
                rewardEarned[0] = true;
                send("adReward", JSONObject.quote(purpose));
            });
        } catch (RuntimeException error) {
            rewardedInProgress = false;
            Log.e(TAG, "Rewarded display failed", error);
            send("adUnavailable", "null");
            loadRewarded();
        }
    }
    private void loadInterstitial() {
        if (interstitialLoading || interstitialAd != null || isFinishing() || isDestroyed()) return;
        interstitialLoading = true;
        InterstitialAd.load(this, INTERSTITIAL_TEST_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { interstitialLoading = false; interstitialAd = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) { interstitialLoading = false; interstitialAd = null; Log.w(TAG, "Interstitial load: " + error); }
        });
    }
    private void onLevelCompletedForAds(int level) {
        if (level < 3 || level % 3 != 0 || interstitialAd == null || rewardedInProgress || System.currentTimeMillis()-lastInterstitialAt < 60000) return;
        InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        lastInterstitialAt = System.currentTimeMillis();
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { loadInterstitial(); }
        });
        try { ad.show(this); }
        catch (RuntimeException e) { Log.w(TAG,"Interstitial display failed",e); loadInterstitial(); }
    }
    public class Bridge {
        @JavascriptInterface public void rewardedAd() { runOnUiThread(() -> { rewardPurpose = "coins"; showRewarded(); }); }
        @JavascriptInterface public void rewardedHint() { runOnUiThread(() -> { rewardPurpose = "hint"; showRewarded(); }); }
        @JavascriptInterface public void rewardedDouble() { runOnUiThread(() -> { rewardPurpose = "double"; showRewarded(); }); }
        @JavascriptInterface public void levelCompletedForAds(int level) { runOnUiThread(() -> onLevelCompletedForAds(level)); }
        @JavascriptInterface public void vibrate(int milliseconds) {
            runOnUiThread(() -> {
                try {
                    Vibrator v=(Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
                    if(v==null || !v.hasVibrator())return;
                    long ms=Math.max(10,Math.min(150,milliseconds));
                    if(Build.VERSION.SDK_INT>=26)v.vibrate(VibrationEffect.createOneShot(ms,VibrationEffect.DEFAULT_AMPLITUDE));
                    else v.vibrate(ms);
                }catch(Exception e){Log.w(TAG,"Titreşim",e);}
            });
        }
        @JavascriptInterface public void login() {
            runOnUiThread(() -> PlayGames.getGamesSignInClient(MainActivity.this).signIn()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.e(TAG, "Play Games giris hatasi", task.getException());
                        error("Play Games giriş hatası: " + (task.getException() == null ? "bilinmeyen" : task.getException().getMessage()));
                        return;
                    }
                    if (task.getResult() == null || !task.getResult().isAuthenticated()) {
                        error("Play Games girişini tamamlayamadı. Test kullanıcısı ve Play Oyunlar hesabını kontrol edin.");
                        checkSignIn();
                        return;
                    }
                    signedIn = true;
                    announceUser();
                }));
        }
        @JavascriptInterface public void logout() {
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                "Play Games hesabını Google Play Oyunlar ayarlarından değiştirebilirsin.",
                Toast.LENGTH_LONG).show());
        }
        @JavascriptInterface public void state() { runOnUiThread(() -> checkSignIn()); }
        @JavascriptInterface public void syncSave(String raw) { runOnUiThread(() -> MainActivity.this.syncSave(raw)); }
        @JavascriptInterface public void achievements(int completed, int stars) {
            runOnUiThread(() -> {
                if (!signedIn) return;
                if (completed >= 10) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_FIRST);
                if (stars >= 50) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_STARS);
                if (completed >= 100) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_LEGEND);
            });
        }
        @JavascriptInterface public void upload(int points) {
            runOnUiThread(() -> {
                if (!signedIn) return;
                PlayGames.getLeaderboardsClient(MainActivity.this).submitScore(LEADERBOARD_ID, Math.max(0, points));
            });
        }
        @JavascriptInterface public void ranking() {
            runOnUiThread(() -> {
                if (!signedIn) { error("Önce Play Games hesabına giriş yap."); return; }
                PlayGames.getLeaderboardsClient(MainActivity.this).getLeaderboardIntent(LEADERBOARD_ID)
                    .addOnSuccessListener(intent -> startActivityForResult(intent, 9001))
                    .addOnFailureListener(e -> error("Dünya sıralaması açılamadı: " + e.getMessage()));
            });
        }
    }
    private void handleGameBack() {
        if (backHandling || isFinishing() || isDestroyed()) return;
        backHandling = true;
        if (view == null) {
            backHandling = false;
            showExitConfirmation();
            return;
        }
        view.evaluateJavascript(
            "(function(){try{return !!(window.kdHandleBack && window.kdHandleBack())}catch(e){return false}})()",
            result -> {
                backHandling = false;
                if (!"true".equals(result) && !isFinishing() && !isDestroyed()) {
                    showExitConfirmation();
                }
            }
        );
    }

    private void showExitConfirmation() {
        new android.app.AlertDialog.Builder(this)
            .setTitle("KARA DÜĞÜM")
            .setMessage("Oyundan çıkmak istiyor musun?")
            .setNegativeButton("Vazgeç", null)
            .setPositiveButton("Çıkış", (dialog, which) -> finish())
            .show();
    }

    @Override protected void onPause() {
        if (view != null) { view.evaluateJavascript("window.kdSetPaused && window.kdSetPaused(true)",null); view.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (view != null) { view.onResume(); view.evaluateJavascript("window.kdSetPaused && window.kdSetPaused(document.getElementById('kdGame').hidden)",null); }
    }
    @Override protected void onDestroy() {
        rewardedAd=null; interstitialAd=null;
        if(view!=null){view.removeJavascriptInterface("KaraNative");view.stopLoading();view.destroy();view=null;}
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        handleGameBack();
    }
}
