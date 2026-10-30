package com.orynexa.karadugum;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.media.AudioManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
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
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String TAG = "KaraDugum";
    private static final String SAVE_NAME = "karadugum_progress_v1";
    private static final String FULL_SAVE_NAME = "karadugum_full_v1";
    private static final String ACH_FIRST = "CgkI-ZiLnPgfEAIQAg";
    private static final String ACH_STARS = "CgkI-ZiLnPgfEAIQAw";
    private static final String ACH_LEGEND = "CgkI-ZiLnPgfEAIQBA";
    private static final String LEADERBOARD_ID = "CgkI-ZiLnPgfEAIQAQ";
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private final InterstitialCadence adCadence = new InterstitialCadence(android.os.SystemClock.elapsedRealtime());
    private boolean interstitialLoading = false;
    private String rewardPurpose = "coins";
    private boolean rewardedInProgress = false;
    private boolean rewardedLoading = false;
    private WebView view;
    private boolean backHandling = false;
    private boolean signedIn = false;
    private String currentPlayerId = "";
    private int authGeneration = 0;
    private boolean manualSigningIn = false;
    private boolean saving = false;
    private String pendingSave;
    private String installationId;
    private AdConsentGate consentGate;
    private boolean adsInitializing, adsInitialized, interstitialInProgress;
    private int adGeneration;
    private android.app.Dialog privacyDialog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            installationId = InstallationIdentity.load(getNoBackupFilesDir());
        } catch (java.io.IOException e) {
            // A fresh actor preserves counter isolation even if durable storage is unavailable.
            installationId = InstallationIdentity.fresh();
            Log.e(TAG, "Installation identity unavailable", e);
        }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
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
        view = new WebView(this);
        view.setBackgroundColor(Color.BLACK);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setMediaPlaybackRequiresUserGesture(false);
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
            @Override public void onPageFinished(WebView v, String url) { checkSignIn(); deliverPendingRewards(); sendPrivacyState(); }
        });
        setContentView(view);
        initializeConsent();
        view.loadUrl("file:///android_asset/index.html");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> handleGameBack());
        }
    }

    private void initializeConsent() {
        final ConsentInformation information = UserMessagingPlatform.getConsentInformation(this);
        consentGate = new AdConsentGate(new AdConsentGate.Driver() {
            @Override public void update(Runnable success, AdConsentGate.Completion failure) {
                information.requestConsentInfoUpdate(MainActivity.this, new ConsentRequestParameters.Builder().build(),
                    success::run, error -> failure.complete(error.getMessage()));
            }
            @Override public void requiredForm(AdConsentGate.Completion completion) {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(MainActivity.this,
                    error -> completion.complete(error == null ? null : error.getMessage()));
            }
            @Override public void optionsForm(AdConsentGate.Completion completion) {
                UserMessagingPlatform.showPrivacyOptionsForm(MainActivity.this,
                    error -> completion.complete(error == null ? null : error.getMessage()));
            }
            @Override public boolean canRequestAds() { return information.canRequestAds(); }
            @Override public boolean privacyRequired() {
                return information.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
            }
        }, new AdConsentGate.Observer() {
            @Override public void changed(boolean allowed, boolean required, boolean busy) {
                if (isFinishing() || isDestroyed()) return;
                if (!allowed) {
                    adGeneration++;
                    rewardedAd = null;
                    interstitialAd = null;
                    rewardedLoading = false;
                    interstitialLoading = false;
                    send("adReady", "false");
                }
                sendPrivacyState();
                if (allowed) initializeAds();
            }
            @Override public void failed(String message) { Log.w(TAG, "Consent: " + message); }
        });
        consentGate.start();
    }
    private boolean adsAllowed() {
        return consentGate != null && consentGate.canRequestAds() && !isFinishing() && !isDestroyed();
    }
    private void initializeAds() {
        if (!adsAllowed()) return;
        if (adsInitialized) { loadRewarded(); loadInterstitial(); return; }
        if (adsInitializing) return;
        adsInitializing = true;
        MobileAds.initialize(this, status -> runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) return;
            adsInitializing = false;
            adsInitialized = true;
            loadRewarded();
            loadInterstitial();
        }));
    }
    private void sendPrivacyState() {
        try {
            JSONObject state = new JSONObject();
            state.put("required", consentGate != null && consentGate.privacyRequired());
            state.put("busy", consentGate != null && consentGate.busy());
            state.put("formOpen", consentGate != null && consentGate.formOpen());
            send("privacyState", state.toString());
        } catch (Exception error) { Log.w(TAG, "Privacy state", error); }
    }
    private void openPrivacyPolicy() {
        if (isFinishing() || isDestroyed() || privacyDialog != null) return;
        final android.app.Dialog dialog = new android.app.Dialog(this);
        final WebView policy = new WebView(this);
        policy.getSettings().setJavaScriptEnabled(false);
        policy.getSettings().setAllowContentAccess(false);
        policy.getSettings().setAllowFileAccessFromFileURLs(false);
        policy.getSettings().setAllowUniversalAccessFromFileURLs(false);
        policy.setWebViewClient(new WebViewClient() {
            private boolean navigate(String url) {
                if ("file:///android_asset/privacy-policy.html".equals(url)) return false;
                Uri uri = Uri.parse(url);
                if ("https".equals(uri.getScheme()) || "mailto".equals(uri.getScheme())) {
                    try {
                        Intent intent = new Intent("mailto".equals(uri.getScheme()) ? Intent.ACTION_SENDTO : Intent.ACTION_VIEW, uri);
                        if ("https".equals(uri.getScheme())) intent.addCategory(Intent.CATEGORY_BROWSABLE);
                        startActivity(intent);
                    }
                    catch (android.content.ActivityNotFoundException error) { Log.w(TAG, "Privacy link unavailable", error); }
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) { return navigate(request.getUrl().toString()); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return navigate(url); }
        });
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        android.widget.Button close = new android.widget.Button(this);
        close.setText("×");
        close.setContentDescription("Gizlilik politikasını kapat");
        close.setOnClickListener(v -> dialog.dismiss());
        layout.addView(close, new android.widget.LinearLayout.LayoutParams(-1, -2));
        layout.addView(policy, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
        dialog.setContentView(layout);
        dialog.setOnDismissListener(ignored -> { layout.removeView(policy); policy.stopLoading(); policy.destroy(); privacyDialog = null; });
        privacyDialog = dialog;
        dialog.show();
        dialog.getWindow().setLayout(-1, -1);
        policy.loadUrl("file:///android_asset/privacy-policy.html");
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
        if(manualSigningIn)return;
        final int generation = ++authGeneration;
        currentPlayerId = "";
        PlayGames.getGamesSignInClient(this).isAuthenticated().addOnCompleteListener(task -> {
            if(generation!=authGeneration)return;
            if (!task.isSuccessful()) {
                signedIn = false; currentPlayerId = "";
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
        final int generation = authGeneration;
        PlayGames.getPlayersClient(this).getCurrentPlayer().addOnSuccessListener(player -> {
            if(generation!=authGeneration)return;
            try {
                JSONObject data = new JSONObject();
                data.put("name", player.getDisplayName());
                currentPlayerId = player.getPlayerId();
                data.put("uid", currentPlayerId);
                send("user", data.toString());
                deliverPendingRewards();
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
        JSONObject full=CloudMerge.merge(a.optJSONObject("full"),b.optJSONObject("full"));
        if(full!=null)result.put("full",full);
        return result;
    }
    private void syncSave(String raw) {
        if (!signedIn) return;
        if (raw == null || raw.length()>2800000) { error("Kayıt boyutu geçersiz"); return; }
        try {
            JSONObject incoming=new JSONObject(raw);
            JSONObject full=incoming.optJSONObject("full");
            if(full!=null&&(currentPlayerId.isEmpty()||!currentPlayerId.equals(full.optString("account")))){Log.w(TAG,"Stale cloud account request ignored");return;}
            if(incoming.optJSONObject("completed")==null || incoming.optJSONObject("best")==null) return;
            if(saving) { pendingSave=raw; return; }
            saving=true;
            final int generation = authGeneration;
            SnapshotsClient client=PlayGames.getSnapshotsClient(this);
            if(full!=null&&!full.has("root")) importLegacyAndOpen(client,incoming,generation);
            else openCloudSnapshot(client,incoming,generation);
        } catch(Exception e) { saving=false; error("Kayıt verisi geçersiz"); }
    }
    private void openCloudSnapshot(SnapshotsClient client,JSONObject incoming,int generation) {
        if(generation!=authGeneration){saving=false;flushPending();return;}
        String slot=incoming.optJSONObject("full")==null?SAVE_NAME:FULL_SAVE_NAME;
        client.open(slot,true,SnapshotsClient.RESOLUTION_POLICY_MANUAL)
            .addOnSuccessListener(result -> handleSnapshot(client,result,incoming,0,generation))
            .addOnFailureListener(e -> {saving=false;flushPending();error("Bulut kayda erişilemedi: "+e.getMessage());});
    }
    private void importLegacyAndOpen(SnapshotsClient client,JSONObject incoming,int generation) {
        client.open(SAVE_NAME,false,SnapshotsClient.RESOLUTION_POLICY_MANUAL).addOnSuccessListener(result -> {
            JSONObject enriched=incoming;
            try {
                JSONObject legacy;
                if(result.isConflict()) {
                    SnapshotsClient.SnapshotConflict conflict=result.getConflict();
                    if(conflict==null)throw new IllegalStateException("Eski kayıt çakışması boş");
                    legacy=mergeSave(readSnapshot(conflict.getSnapshot()),readSnapshot(conflict.getConflictingSnapshot()));
                    client.discardAndClose(conflict.getSnapshot());client.discardAndClose(conflict.getConflictingSnapshot());
                } else {
                    Snapshot old=result.getData();legacy=old==null?new JSONObject():readSnapshot(old);
                    if(old!=null)client.discardAndClose(old);
                }
                legacy.remove("full");
                enriched=mergeSave(legacy,incoming);
                // Only the new slot may confirm the initial wallet; legacy data imports progression.
                enriched.put("full",incoming.getJSONObject("full"));
            } catch(Exception e){Log.w(TAG,"Legacy cloud import unavailable",e);}
            openCloudSnapshot(client,enriched,generation);
        }).addOnFailureListener(e -> openCloudSnapshot(client,incoming,generation));
    }
    private byte[] snapshotBytes(JSONObject value)throws Exception {
        byte[] bytes=value.toString().getBytes(StandardCharsets.UTF_8);
        if(bytes.length>2800000)throw new IllegalStateException("Bulut kayıt kapasitesi aşıldı; yerel kayıt korundu");
        return bytes;
    }
    private JSONObject readSnapshot(Snapshot snapshot) throws Exception {
        byte[] bytes=snapshot.getSnapshotContents().readFully();
        return bytes.length==0?new JSONObject():new JSONObject(new String(bytes,StandardCharsets.UTF_8));
    }
    private void handleSnapshot(SnapshotsClient client, SnapshotsClient.DataOrConflict<Snapshot> result, JSONObject incoming, int depth, int generation) {
        if(generation!=authGeneration || incoming.optJSONObject("full")!=null&&!currentPlayerId.equals(incoming.optJSONObject("full").optString("account"))) {
            if(result.isConflict()){SnapshotsClient.SnapshotConflict conflict=result.getConflict();if(conflict!=null){client.discardAndClose(conflict.getSnapshot());client.discardAndClose(conflict.getConflictingSnapshot());}}
            else if(result.getData()!=null)client.discardAndClose(result.getData());
            saving=false;flushPending();return;
        }
        if(result.isConflict()) {
            SnapshotsClient.SnapshotConflict conflict=result.getConflict();
            if(conflict==null || depth>=5) { saving=false; error("Bulut kayıt çakışması çözülemedi. Tekrar giriş yaparak eşitle."); return; }
            Snapshot chosen=conflict.getSnapshot();
            Snapshot other=conflict.getConflictingSnapshot();
            try {
                JSONObject merged=mergeSave(mergeSave(readSnapshot(chosen),readSnapshot(other)),incoming);
                chosen.getSnapshotContents().writeBytes(snapshotBytes(merged));
                client.resolveConflict(conflict.getConflictId(),chosen)
                    .addOnSuccessListener(next -> handleSnapshot(client,next,merged,depth+1,generation))
                    .addOnFailureListener(e -> { saving=false; flushPending(); error("Bulut kayıt çakışması: "+e.getMessage()); });
            } catch(Exception e) { client.discardAndClose(chosen); saving=false; flushPending(); error("Bulut kayıt birleştirilemedi: "+e.getMessage()); }
            return;
        }
        Snapshot snapshot=result.getData();
        if(snapshot==null) { saving=false; flushPending(); error("Bulut kayıt açılamadı"); return; }
        try {
            JSONObject merged=mergeSave(readSnapshot(snapshot),incoming);
            snapshot.getSnapshotContents().writeBytes(snapshotBytes(merged));
            client.commitAndClose(snapshot,SnapshotMetadataChange.EMPTY_CHANGE)
                .addOnSuccessListener(meta -> { send("cloudSave",merged.toString()); saving=false; flushPending(); })
                .addOnFailureListener(e -> { saving=false; flushPending(); error("Bulut kayıt yazılamadı: "+e.getMessage()); });
        } catch(Exception e) { client.discardAndClose(snapshot); saving=false; flushPending(); error("Bulut kayıt okunamadı: "+e.getMessage()); }
    }
    private void flushPending() {
        if(pendingSave!=null) { String next=pendingSave; pendingSave=null; syncSave(next); }
    }
    private void rewardUnavailable(String purpose) {
        if (purpose.startsWith("double:")) send("doubleAdUnavailable", JSONObject.quote(purpose.substring(7)));
        else send("adUnavailable", "null");
    }
    private void sendEarnedReward(String purpose,String owner) {
        if(purpose.startsWith("coins:")||purpose.startsWith("hint:")) {
            try { JSONObject data=new JSONObject();data.put("purpose",purpose);data.put("owner",owner);send("accountAdReward",data.toString()); } catch(Exception e){Log.e(TAG,"Reward payload",e);}
        } else send("adReward",JSONObject.quote(purpose));
    }
    private void recordReward(String purpose,String owner) {
        if (purpose.matches("(double|coins|hint):[a-zA-Z0-9_-]{1,100}")) getApplicationContext().getSharedPreferences("reward_receipts",MODE_PRIVATE).edit().putString("earned_"+purpose,purpose).putString("owner_"+purpose,owner).commit();
        sendEarnedReward(purpose,owner);
    }
    private void deliverPendingRewards() {
        android.content.SharedPreferences receipts=getApplicationContext().getSharedPreferences("reward_receipts",MODE_PRIVATE);
        for(String key:receipts.getAll().keySet())if(key.startsWith("earned_")) {
            String purpose=receipts.getString(key,"");
            if(purpose!=null&&purpose.matches("(double|coins|hint):[a-zA-Z0-9_-]{1,100}"))sendEarnedReward(purpose,receipts.getString("owner_"+purpose,""));
        }
    }
    private void loadRewarded() {
        if (!adsAllowed() || !adsInitialized || rewardedLoading || rewardedInProgress || rewardedAd != null) return;
        final int generation = adGeneration;
        rewardedLoading = true;
        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) { if (generation != adGeneration || !adsAllowed()) return; rewardedLoading = false; rewardedAd = ad; send("adReady", "true"); }
            @Override public void onAdFailedToLoad(LoadAdError error) { if (generation != adGeneration || !adsAllowed()) return; rewardedLoading = false; rewardedAd = null; send("adReady", "false"); Log.w(TAG, "Rewarded load: " + error); }
        });
    }
    private void showRewarded() {
        final String purpose = rewardPurpose.equals("coins")||rewardPurpose.equals("hint") ? rewardPurpose+":"+java.util.UUID.randomUUID().toString() : rewardPurpose;
        showRewarded(purpose, currentPlayerId);
    }
    private void showRewarded(final String purpose, final String rewardOwner) {
        if (rewardedInProgress) return;
        if (!adsAllowed() || !adsInitialized || interstitialInProgress) { rewardUnavailable(purpose); return; }
        if (rewardedAd == null) { rewardUnavailable(purpose); loadRewarded(); return; }
        rewardedInProgress = true;
        RewardedAd ad = rewardedAd;
        rewardedAd = null;
        send("adReady", "false");
        final boolean[] rewardEarned = {false};
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); }
            @Override public void onAdDismissedFullScreenContent() {
                adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime());
                rewardedInProgress = false;
                if (!rewardEarned[0]) rewardUnavailable(purpose);
                loadRewarded();
            }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { rewardedInProgress = false; rewardUnavailable(purpose); loadRewarded(); }
        });
        try {
            ad.show(this, reward -> {
                if (rewardEarned[0]) return;
                rewardEarned[0] = true;
                recordReward(purpose,rewardOwner);
            });
        } catch (RuntimeException error) {
            rewardedInProgress = false;
            Log.e(TAG, "Rewarded display failed", error);
            rewardUnavailable(purpose);
            loadRewarded();
        }
    }
    private void loadInterstitial() {
        if (!adsAllowed() || !adsInitialized || interstitialLoading || interstitialAd != null) return;
        final int generation = adGeneration;
        interstitialLoading = true;
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_AD_UNIT_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { if (generation != adGeneration || !adsAllowed()) return; interstitialLoading = false; interstitialAd = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) { if (generation != adGeneration || !adsAllowed()) return; interstitialLoading = false; interstitialAd = null; Log.w(TAG, "Interstitial load: " + error); }
        });
    }
    private void onLevelCompletedForAds(int level) {
        if (level < 3 || level > 300) return;
        adCadence.transitioned(level);
        if (!adsAllowed() || !adsInitialized || interstitialInProgress || !adCadence.eligible(android.os.SystemClock.elapsedRealtime()) || interstitialAd == null || rewardedInProgress) return;
        InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        interstitialInProgress = true;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); }
            @Override public void onAdDismissedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); interstitialInProgress = false; loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { interstitialInProgress = false; loadInterstitial(); }
        });
        try { ad.show(this); }
        catch (RuntimeException e) { interstitialInProgress = false; Log.w(TAG,"Interstitial display failed",e); loadInterstitial(); }
    }
    public class Bridge {
        @JavascriptInterface public void rewardedAccountRequest(String kind, String requestId, String owner) {
            if ((!"coins".equals(kind) && !"hint".equals(kind)) || requestId == null || !requestId.matches("[a-zA-Z0-9_-]{1,100}") || owner == null || !owner.matches("[^\\x00-\\x1f\\x7f]{0,256}")) return;
            // Bind to the account shown by the game before the UI-thread hop or SDK auth refresh.
            runOnUiThread(() -> {
                if (rewardedInProgress) { rewardUnavailable(kind + ":" + requestId); return; }
                showRewarded(kind + ":" + requestId, owner);
            });
        }
        @JavascriptInterface public void privacyState() { runOnUiThread(() -> sendPrivacyState()); }
        @JavascriptInterface public void privacyOptions() { runOnUiThread(() -> { if (consentGate != null && !rewardedInProgress && !interstitialInProgress) consentGate.openOptions(); sendPrivacyState(); }); }
        @JavascriptInterface public void openPrivacyPolicy() { runOnUiThread(() -> MainActivity.this.openPrivacyPolicy()); }
        @JavascriptInterface public String installationId() { return installationId; }
        @JavascriptInterface public void rewardedAd() { runOnUiThread(() -> { rewardPurpose = "coins"; showRewarded(); }); }
        @JavascriptInterface public void rewardedHint() { runOnUiThread(() -> { rewardPurpose = "hint"; showRewarded(); }); }
        @JavascriptInterface public void rewardedWheel(String requestId) {
            if(requestId==null || !requestId.matches("[a-zA-Z0-9_-]{1,100}"))return;
            runOnUiThread(() -> { if(rewardedInProgress){send("wheelAdUnavailable",JSONObject.quote(requestId));return;}rewardPurpose="wheel:"+requestId;showRewarded(); });
        }
        @JavascriptInterface public void rewardedDouble() { runOnUiThread(() -> { if(rewardedInProgress)return;rewardPurpose="double";showRewarded(); }); }
        @JavascriptInterface public void rewardedDoubleRequest(String requestId) {
            if(requestId==null || !requestId.matches("[a-zA-Z0-9_-]{1,100}"))return;
            runOnUiThread(() -> { if(rewardedInProgress){send("doubleAdUnavailable",JSONObject.quote(requestId));return;}rewardPurpose="double:"+requestId;showRewarded(); });
        }
        @JavascriptInterface public void ackReward(String purpose) {
            if(purpose==null || !purpose.matches("(double|coins|hint):[a-zA-Z0-9_-]{1,100}"))return;
            getApplicationContext().getSharedPreferences("reward_receipts", MODE_PRIVATE).edit().remove("earned_"+purpose).remove("owner_"+purpose).apply();
        }
        @JavascriptInterface public void levelCompletedForAds(int level) { runOnUiThread(() -> onLevelCompletedForAds(level)); }
        @JavascriptInterface public void login() {
            runOnUiThread(() -> {
                if(manualSigningIn)return;manualSigningIn=true;signedIn=false;currentPlayerId="";authGeneration++;
                PlayGames.getGamesSignInClient(MainActivity.this).signIn()
                .addOnCompleteListener(task -> {
                    manualSigningIn=false;
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
                    checkSignIn();
                });
            });
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
        @JavascriptInterface public void uploadForAccount(String owner,long points) {
            runOnUiThread(() -> {
                if(!signedIn||owner==null||!owner.equals(currentPlayerId))return;
                PlayGames.getLeaderboardsClient(MainActivity.this).submitScore(LEADERBOARD_ID,Math.max(0L,Math.min(3000000000L,points)));
            });
        }
        @JavascriptInterface public void achievementsForAccount(String owner,int completed,int stars) {
            runOnUiThread(() -> {
                if(!signedIn||owner==null||!owner.equals(currentPlayerId))return;
                if(completed>=10)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_FIRST);
                if(stars>=50)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_STARS);
                if(completed>=100)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_LEGEND);
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
        if (view != null) { view.evaluateJavascript("window.kdAppBackground=true;window.kdSetPaused && window.kdSetPaused(true);window.kdCloudSync && window.kdCloudSync()",null); view.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (view != null) { view.onResume(); checkSignIn(); deliverPendingRewards(); view.evaluateJavascript("window.kdAppBackground=false;window.kdUnlockAudio && window.kdUnlockAudio();window.kdSetPaused && window.kdSetPaused(document.getElementById('kdGame').hidden)",null); }
    }
    @Override protected void onDestroy() {
        if (consentGate != null) consentGate.destroy();
        adGeneration++;
        if (privacyDialog != null) privacyDialog.dismiss();
        rewardedAd=null; interstitialAd=null;
        if(view!=null){view.removeJavascriptInterface("KaraNative");view.stopLoading();view.destroy();view=null;}
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        handleGameBack();
    }
}
