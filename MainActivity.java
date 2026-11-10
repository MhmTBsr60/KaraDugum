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
    private boolean checkingSignIn, gamesInitialized, gamesLifecycleReady, gamesStartupPending, gamesStartupFailed;
    private boolean pendingInteractiveLogin;
    private static final int GAMES_STARTUP_REQUEST = 9002;
    private boolean saving = false;
    private String pendingSave;
    private String installationId;
    private AdConsentGate consentGate;
    private boolean adsInitializing, adsInitialized, interstitialInProgress;
    private int adGeneration;
    private volatile String uiLanguage = NativeStrings.language(java.util.Locale.getDefault().getLanguage());
    private final AdLoadGate rewardedLoadGate = new AdLoadGate();
    private final AdLoadGate interstitialLoadGate = new AdLoadGate();
    private android.app.Dialog privacyDialog;
    private android.app.AlertDialog audienceDialog;
    private static volatile AudiencePolicy audience = AudiencePolicy.choose(null);
    private static boolean audienceAnswered;
    private AudienceChoiceStore audienceChoices;

    @Override public void onCreate(Bundle state) {
        audienceChoices = new AudienceChoiceStore(getNoBackupFilesDir());
        if (!audienceAnswered) {
            audience = audienceChoices.load();
            audienceAnswered = audience.allowAds();
        }
        // super.onCreate dispatches onActivityCreated: eligible SDK listeners must exist first.
        if (audience.allowOnlineAccounts()) {
            PlayGamesSdk.initialize(getApplicationContext());
            gamesInitialized = true;
            gamesLifecycleReady = true;
        }
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
        // Safe child defaults before any explicit ad initialization; wait for the age screen.
        configureAudienceAds();
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
            @Override public void onPageFinished(WebView v, String url) {
                if (!audienceAnswered) showAudienceScreen(); else startEligibleServices();
                deliverPendingRewards(); sendPrivacyState();
            }
        });
        setContentView(view);
        view.loadUrl("file:///android_asset/index.html");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> handleGameBack());
        }
    }

    private void configureAudienceAds() {
        com.google.android.gms.ads.RequestConfiguration.Builder configuration = new com.google.android.gms.ads.RequestConfiguration.Builder();
        configuration.setAgeRestrictedTreatment(audience.restrictedAds()
            ? com.google.android.gms.ads.AgeRestrictedTreatment.CHILD : com.google.android.gms.ads.AgeRestrictedTreatment.UNSPECIFIED);
        if (audience.restrictedAds()) {
            // Keep the documented AAID-suppression flag for compatible SDK/service paths too.
            configuration.setTagForChildDirectedTreatment(com.google.android.gms.ads.RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE);
            configuration.setMaxAdContentRating(com.google.android.gms.ads.RequestConfiguration.MAX_AD_CONTENT_RATING_G);
            configuration.setPublisherPrivacyPersonalizationState(com.google.android.gms.ads.RequestConfiguration.PublisherPrivacyPersonalizationState.DISABLED);
        }
        MobileAds.setRequestConfiguration(configuration.build());
    }
    private AdRequest createAdRequest() {
        AdRequest.Builder request = new AdRequest.Builder();
        if (audience.restrictedAds()) {
            Bundle extras = new Bundle(); extras.putString("npa", "1");
            request.addNetworkExtrasBundle(com.google.ads.mediation.admob.AdMobAdapter.class, extras);
        }
        return request.build();
    }
    private void discardLoadedAds() {
        adGeneration++;
        rewardedAd = null; interstitialAd = null;
        rewardedLoading = false; interstitialLoading = false;
        send("adReady", "false");
    }
    private boolean audienceOptionsBusy() {
        return audienceDialog != null || gamesStartupPending || rewardedInProgress || interstitialInProgress
            || adsInitializing || privacyDialog != null || (consentGate != null && consentGate.busy());
    }
    private void applyAudienceChoice(String code) {
        AudiencePolicy selected = AudiencePolicy.choose(code);
        if (!selected.allowAds()) return;
        if (!audienceChoices.save(code)) error("Yaş seçimi bu cihazda kaydedilemedi. Bu oturumda seçimin uygulanacak.");
        if (!audienceAnswered || selected.band() != audience.band()) {
            discardLoadedAds();
            if (consentGate != null) { consentGate.destroy(); consentGate = null; }
            authGeneration++; signedIn = false; currentPlayerId = "";
            checkingSignIn = false; manualSigningIn = false;
            pendingInteractiveLogin = false;
            saving = false; pendingSave = null;
            send("user", "null");
        }
        audience = selected; audienceAnswered = true;
        if (audience.allowOnlineAccounts() && !gamesLifecycleReady) gamesStartupFailed = false;
        configureAudienceAds();
    }
    private void showAudienceScreen() { showAudienceScreen(false, false); }
    private void showAudienceScreen(boolean reviewing, boolean loginRequested) {
        if ((!reviewing && audienceAnswered) || isFinishing() || isDestroyed()) return;
        if (audienceOptionsBusy()) { sendAudienceState(); return; }
        final boolean previouslyAnswered = audienceAnswered;
        discardLoadedAds();
        final String[] codes = {"under13", "teen", "adult", "unknown"};
        final String[] labels = {
            NativeStrings.text("13 yaşından küçüğüm", uiLanguage), NativeStrings.text("13–17 yaşındayım", uiLanguage),
            NativeStrings.text("18 yaş ve üzerindeyim", uiLanguage), NativeStrings.text("Belirtmek istemiyorum", uiLanguage)
        };
        audienceDialog = new android.app.AlertDialog.Builder(this)
            .setTitle(NativeStrings.text("Yaş aralığın nedir?", uiLanguage))
            .setItems(labels, (dialog, position) -> {
                applyAudienceChoice(codes[position]);
                if (loginRequested && audience.allowOnlineAccounts()) pendingInteractiveLogin = true;
            })
            .create();
        audienceDialog.setOnCancelListener(dialog -> {
            if (!previouslyAnswered) { audience = AudiencePolicy.choose("unknown"); audienceAnswered = true; }
        });
        audienceDialog.setOnDismissListener(dialog -> {
            audienceDialog = null;
            sendPrivacyState();
            if (audienceAnswered && !isFinishing() && !isDestroyed()) startEligibleServices();
        });
        audienceDialog.show();
        audienceDialog.getWindow().getDecorView().setLayoutDirection("ar".equals(uiLanguage) ? android.view.View.LAYOUT_DIRECTION_RTL : android.view.View.LAYOUT_DIRECTION_LTR);
        sendPrivacyState();
    }
    private void startEligibleServices() {
        if (!audienceAnswered || isFinishing() || isDestroyed()) return;
        configureAudienceAds();
        if (audience.allowOnlineAccounts()) {
            if (!gamesLifecycleReady) {
                if (!gamesStartupFailed) prepareGamesLifecycle();
                if (gamesStartupPending) return;
            }
            else if (pendingInteractiveLogin) { pendingInteractiveLogin = false; signIn(); }
            else checkSignIn();
        }
        if (audience.allowAds() && consentGate == null) initializeConsent();
        else if (adsAllowed()) initializeAds();
        sendAudienceState();
    }
    private void prepareGamesLifecycle() {
        if (!audience.allowOnlineAccounts() || gamesLifecycleReady || gamesStartupPending || gamesStartupFailed || isFinishing() || isDestroyed()) return;
        if (!gamesInitialized) { PlayGamesSdk.initialize(getApplicationContext()); gamesInitialized = true; }
        gamesStartupPending = true;
        sendAudienceState();
        try {
            // A real Activity supplies the missed Created/Resumed events without replacing the game WebView.
            startActivityForResult(new Intent(this, GamesStartupActivity.class), GAMES_STARTUP_REQUEST);
        } catch (RuntimeException failure) {
            gamesStartupPending = false;
            gamesStartupFailed = true; pendingInteractiveLogin = false;
            Log.e(TAG, "Play Games lifecycle start failed", failure);
            error("Google Play Oyunlar'a bağlanılamadı. Yerel kayıtların korunuyor; daha sonra yeniden deneyebilirsin.");
            sendAudienceState();
        }
    }
    private void initializeConsent() {
        if (!audience.allowAds()) return;
        final ConsentInformation information = UserMessagingPlatform.getConsentInformation(this);
        consentGate = new AdConsentGate(new AdConsentGate.Driver() {
            @Override public void update(Runnable success, AdConsentGate.Completion failure) {
                information.requestConsentInfoUpdate(MainActivity.this, new ConsentRequestParameters.Builder()
                    .setTagForUnderAgeOfConsent(audience.restrictedAds()).build(),
                    success::run, error -> failure.complete(error.getMessage()));
            }
            @Override public void requiredForm(AdConsentGate.Completion completion) {
                // Child requests were tagged in the SDK update; never ask them for adult consent.
                if (audience.restrictedAds()) { completion.complete(null); return; }
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(MainActivity.this,
                    error -> completion.complete(error == null ? null : error.getMessage()));
            }
            @Override public void optionsForm(AdConsentGate.Completion completion) {
                UserMessagingPlatform.showPrivacyOptionsForm(MainActivity.this,
                    error -> completion.complete(error == null ? null : error.getMessage()));
            }
            @Override public boolean canRequestAds() { return information.canRequestAds(); }
            @Override public boolean privacyRequired() {
                return !audience.restrictedAds() && information.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
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
        return audienceDialog == null && !gamesStartupPending && audience.allowAds() && consentGate != null && consentGate.canRequestAds() && !isFinishing() && !isDestroyed();
    }
    private void initializeAds() {
        if (!adsAllowed()) return;
        if (adsInitialized) { loadRewarded(); loadInterstitial(); return; }
        if (adsInitializing) return;
        adsInitializing = true;
        sendAudienceState();
        MobileAds.initialize(this, status -> runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) return;
            adsInitializing = false;
            adsInitialized = true;
            sendAudienceState();
            loadRewarded();
            loadInterstitial();
        }));
    }
    private void sendPrivacyState() {
        try {
            JSONObject state = new JSONObject();
            state.put("required", consentGate != null && consentGate.privacyRequired());
            state.put("busy", audienceDialog != null || (consentGate != null && consentGate.busy()));
            state.put("formOpen", audienceDialog != null || (consentGate != null && consentGate.formOpen()));
            send("privacyState", state.toString());
        } catch (Exception error) { Log.w(TAG, "Privacy state", error); }
        sendAudienceState();
    }
    private void sendAudienceState() {
        try {
            JSONObject state = new JSONObject();
            String band = !audienceAnswered ? "pending" : audience.band() == AudiencePolicy.Band.ADULT ? "adult"
                : audience.band() == AudiencePolicy.Band.UNDER_13 ? "under13" : audience.band() == AudiencePolicy.Band.TEEN ? "teen" : "unknown";
            state.put("band", band);
            state.put("accountsAllowed", audienceAnswered && audience.allowOnlineAccounts());
            state.put("busy", audienceOptionsBusy());
            send("audienceState", state.toString());
        } catch (Exception error) { Log.w(TAG, "Audience state", error); }
    }
    private void openPrivacyPolicy() { openLegalPage("privacy-policy.html"); }
    private void openLegalPage(String filename) {
        if (!"privacy-policy.html".equals(filename) && !"delete-account.html".equals(filename)) return;
        final String legalUrl = "file:///android_asset/" + filename;
        if (isFinishing() || isDestroyed() || privacyDialog != null) return;
        final android.app.Dialog dialog = new android.app.Dialog(this);
        final WebView policy = new WebView(this);
        policy.getSettings().setJavaScriptEnabled(false);
        policy.getSettings().setAllowContentAccess(false);
        policy.getSettings().setAllowFileAccessFromFileURLs(false);
        policy.getSettings().setAllowUniversalAccessFromFileURLs(false);
        policy.setWebViewClient(new WebViewClient() {
            private boolean navigate(String url) {
                if (legalUrl.equals(url) || url.startsWith(legalUrl + "#")) return false;
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
        layout.setLayoutDirection("ar".equals(uiLanguage) ? android.view.View.LAYOUT_DIRECTION_RTL : android.view.View.LAYOUT_DIRECTION_LTR);
        android.widget.Button close = new android.widget.Button(this);
        close.setText("×");
        close.setContentDescription(NativeStrings.text("Sayfayı kapat", uiLanguage));
        close.setOnClickListener(v -> dialog.dismiss());
        layout.addView(close, new android.widget.LinearLayout.LayoutParams(-1, -2));
        layout.addView(policy, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
        dialog.setContentView(layout);
        dialog.setOnDismissListener(ignored -> { layout.removeView(policy); policy.stopLoading(); policy.destroy(); privacyDialog = null; sendAudienceState(); });
        privacyDialog = dialog;
        sendAudienceState();
        dialog.show();
        dialog.getWindow().setLayout(-1, -1);
        policy.getSettings().setDefaultTextEncodingName("UTF-8");
        policy.loadUrl(legalUrl + "#" + uiLanguage);
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
        runOnUiThread(() -> Toast.makeText(this, NativeStrings.text(message, uiLanguage), Toast.LENGTH_LONG).show());
        send("error", JSONObject.quote(NativeStrings.text(message, uiLanguage)));
    }
    private void checkSignIn() {
        if (!audience.allowOnlineAccounts() || !gamesInitialized || !gamesLifecycleReady || gamesStartupPending || audienceDialog != null || manualSigningIn || checkingSignIn || isFinishing() || isDestroyed()) return;
        checkingSignIn = true;
        final int generation = ++authGeneration;
        signedIn = false; currentPlayerId = "";
        PlayGames.getGamesSignInClient(this).isAuthenticated().addOnCompleteListener(task -> {
            if (generation != authGeneration || isFinishing() || isDestroyed()) return;
            if (!task.isSuccessful()) {
                signInFailed("Automatic Play Games authentication failed", task.getException(), false);
                return;
            }
            signedIn = task.getResult() != null && task.getResult().isAuthenticated();
            if (!signedIn) { checkingSignIn = false; send("user", "null"); return; }
            announceUser(false);
        });
    }
    private void signInFailed(String context, Exception failure, boolean interactive) {
        checkingSignIn = false; manualSigningIn = false;
        signedIn = false; currentPlayerId = "";
        Log.w(TAG, context, failure);
        send("user", "null");
        if (interactive) error("Google Play Oyunlar'a bağlanılamadı. Yerel kayıtların korunuyor; daha sonra yeniden deneyebilirsin.");
    }
    private void signIn() {
        if (!audience.allowOnlineAccounts()) { showAudienceScreen(true, true); return; }
        if (manualSigningIn || audienceDialog != null || isFinishing() || isDestroyed()) return;
        if (!gamesLifecycleReady) { gamesStartupFailed = false; pendingInteractiveLogin = true; prepareGamesLifecycle(); return; }
        if (!gamesInitialized || gamesStartupPending) return;
        manualSigningIn = true; checkingSignIn = false; signedIn = false; currentPlayerId = "";
        final int generation = ++authGeneration;
        PlayGames.getGamesSignInClient(this).signIn().addOnCompleteListener(task -> {
            if (generation != authGeneration || isFinishing() || isDestroyed()) return;
            if (!task.isSuccessful()) { signInFailed("Manual Play Games authentication failed", task.getException(), true); return; }
            if (task.getResult() == null || !task.getResult().isAuthenticated()) { signInFailed("Manual Play Games authentication was not completed", null, true); return; }
            signedIn = true; checkingSignIn = true;
            announceUser(true);
        });
    }
    private void announceUser(boolean interactive) {
        if (!audience.allowOnlineAccounts()) return;
        final int generation = authGeneration;
        PlayGames.getPlayersClient(this).getCurrentPlayer().addOnSuccessListener(player -> {
            if (generation != authGeneration || isFinishing() || isDestroyed()) return;
            try {
                if (player == null || player.getPlayerId() == null || player.getPlayerId().isEmpty()) {
                    signInFailed("Play Games returned an empty player profile", null, interactive); return;
                }
                JSONObject data = new JSONObject();
                data.put("name", player.getDisplayName());
                currentPlayerId = player.getPlayerId();
                data.put("uid", currentPlayerId);
                checkingSignIn = false; manualSigningIn = false;
                send("user", data.toString());
                deliverPendingRewards();
            } catch (Exception e) { signInFailed("Play Games profile could not be read", e, interactive); }
        }).addOnFailureListener(e -> {
            if (generation != authGeneration || isFinishing() || isDestroyed()) return;
            signInFailed("Play Games profile could not be loaded", e, interactive);
        });
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
    private static final class CloudSaveOperation {
        final int generation;
        final String owner;
        CloudSaveOperation(int generation, String owner) { this.generation = generation; this.owner = owner; }
    }
    private CloudSaveOperation activeCloudSave;
    private boolean cloudSaveCurrent(CloudSaveOperation operation) {
        return operation != null && activeCloudSave == operation && operation.generation == authGeneration
            && operation.owner.equals(currentPlayerId) && audience.allowOnlineAccounts() && signedIn
            && !isFinishing() && !isDestroyed();
    }
    private void finishCloudSave(CloudSaveOperation operation, String message) {
        if (!cloudSaveCurrent(operation)) return;
        activeCloudSave = null; saving = false;
        if (message != null) error(message);
        flushPending();
    }
    private void discardCloudSnapshot(SnapshotsClient client, Snapshot snapshot) {
        if (snapshot == null) return;
        try { client.discardAndClose(snapshot); }
        catch (RuntimeException error) { Log.w(TAG, "Cloud snapshot cleanup failed", error); }
    }
    private void discardCloudResult(SnapshotsClient client, SnapshotsClient.DataOrConflict<Snapshot> result) {
        if (result == null) return;
        if (result.isConflict()) {
            SnapshotsClient.SnapshotConflict conflict = result.getConflict();
            if (conflict != null) {
                discardCloudSnapshot(client, conflict.getSnapshot());
                if (conflict.getConflictingSnapshot() != conflict.getSnapshot()) discardCloudSnapshot(client, conflict.getConflictingSnapshot());
            }
        } else discardCloudSnapshot(client, result.getData());
    }
    private void syncSave(String raw) {
        if (!audience.allowOnlineAccounts() || !signedIn || currentPlayerId.isEmpty() || isFinishing() || isDestroyed()) return;
        if (raw == null || raw.length()>2800000) { error("Kayıt boyutu geçersiz"); return; }
        CloudSaveOperation operation = null;
        try {
            JSONObject incoming=new JSONObject(raw);
            JSONObject full=incoming.optJSONObject("full");
            if(full!=null&&!currentPlayerId.equals(full.optString("account"))){Log.w(TAG,"Stale cloud account request ignored");return;}
            if(incoming.optJSONObject("completed")==null || incoming.optJSONObject("best")==null) return;
            if(saving && cloudSaveCurrent(activeCloudSave)) { pendingSave=raw; return; }
            // A finished auth probe or age/account change invalidates the previous native queue.
            // The account-scoped JavaScript outbox remains durable and sends its current model again.
            pendingSave = null;
            operation = new CloudSaveOperation(authGeneration, currentPlayerId);
            activeCloudSave = operation; saving = true;
            SnapshotsClient client=PlayGames.getSnapshotsClient(this);
            if(full!=null&&!full.has("root")) importLegacyAndOpen(client,incoming,operation);
            else openCloudSnapshot(client,incoming,operation);
        } catch(Exception e) {
            if (operation != null) finishCloudSave(operation, "Kayıt verisi geçersiz");
            else error("Kayıt verisi geçersiz");
        }
    }
    private void openCloudSnapshot(SnapshotsClient client,JSONObject incoming,CloudSaveOperation operation) {
        if (!cloudSaveCurrent(operation)) return;
        String slot=incoming.optJSONObject("full")==null?SAVE_NAME:FULL_SAVE_NAME;
        try {
            client.open(slot,true,SnapshotsClient.RESOLUTION_POLICY_MANUAL)
                .addOnSuccessListener(result -> handleSnapshot(client,result,incoming,0,operation))
                .addOnFailureListener(e -> finishCloudSave(operation,"Bulut kayda erişilemedi: "+e.getMessage()));
        } catch (RuntimeException e) { finishCloudSave(operation,"Bulut kayda erişilemedi: "+e.getMessage()); }
    }
    private void importLegacyAndOpen(SnapshotsClient client,JSONObject incoming,CloudSaveOperation operation) {
        if (!cloudSaveCurrent(operation)) return;
        try {
            client.open(SAVE_NAME,false,SnapshotsClient.RESOLUTION_POLICY_MANUAL).addOnSuccessListener(result -> {
                if (!cloudSaveCurrent(operation)) { discardCloudResult(client,result); return; }
                JSONObject enriched=incoming;
                try {
                    JSONObject legacy;
                    if(result.isConflict()) {
                        SnapshotsClient.SnapshotConflict conflict=result.getConflict();
                        if(conflict==null)throw new IllegalStateException("Eski kayıt çakışması boş");
                        legacy=mergeSave(readSnapshot(conflict.getSnapshot()),readSnapshot(conflict.getConflictingSnapshot()));
                    } else {
                        Snapshot old=result.getData();legacy=old==null?new JSONObject():readSnapshot(old);
                    }
                    legacy.remove("full");
                    enriched=mergeSave(legacy,incoming);
                    // Only the new slot may confirm the initial wallet; legacy data imports progression.
                    enriched.put("full",incoming.getJSONObject("full"));
                } catch(Exception e){Log.w(TAG,"Legacy cloud import unavailable",e);}
                finally { discardCloudResult(client,result); }
                openCloudSnapshot(client,enriched,operation);
            }).addOnFailureListener(e -> { if (cloudSaveCurrent(operation)) openCloudSnapshot(client,incoming,operation); });
        } catch (RuntimeException e) { if (cloudSaveCurrent(operation)) openCloudSnapshot(client,incoming,operation); }
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
    private void handleSnapshot(SnapshotsClient client, SnapshotsClient.DataOrConflict<Snapshot> result, JSONObject incoming, int depth, CloudSaveOperation operation) {
        if (!cloudSaveCurrent(operation)) { discardCloudResult(client,result); return; }
        if (incoming.optJSONObject("full")!=null&&!operation.owner.equals(incoming.optJSONObject("full").optString("account"))) {
            discardCloudResult(client,result); finishCloudSave(operation,null); return;
        }
        if (result == null) { finishCloudSave(operation,"Bulut kayıt açılamadı"); return; }
        if(result.isConflict()) {
            SnapshotsClient.SnapshotConflict conflict=result.getConflict();
            if(conflict==null || depth>=5) {
                discardCloudResult(client,result);
                finishCloudSave(operation,"Bulut kayıt çakışması çözülemedi. Tekrar giriş yaparak eşitle."); return;
            }
            Snapshot chosen=conflict.getSnapshot();
            Snapshot other=conflict.getConflictingSnapshot();
            try {
                JSONObject merged=mergeSave(mergeSave(readSnapshot(chosen),readSnapshot(other)),incoming);
                chosen.getSnapshotContents().writeBytes(snapshotBytes(merged));
                if (other != chosen) discardCloudSnapshot(client,other);
                client.resolveConflict(conflict.getConflictId(),chosen)
                    .addOnSuccessListener(next -> handleSnapshot(client,next,merged,depth+1,operation))
                    .addOnFailureListener(e -> {
                        discardCloudSnapshot(client,chosen);
                        finishCloudSave(operation,"Bulut kayıt çakışması: "+e.getMessage());
                    });
            } catch(Exception e) { discardCloudResult(client,result); finishCloudSave(operation,"Bulut kayıt birleştirilemedi: "+e.getMessage()); }
            return;
        }
        Snapshot snapshot=result.getData();
        if(snapshot==null) { finishCloudSave(operation,"Bulut kayıt açılamadı"); return; }
        try {
            JSONObject merged=mergeSave(readSnapshot(snapshot),incoming);
            snapshot.getSnapshotContents().writeBytes(snapshotBytes(merged));
            client.commitAndClose(snapshot,SnapshotMetadataChange.EMPTY_CHANGE)
                .addOnSuccessListener(meta -> {
                    if (!cloudSaveCurrent(operation)) return;
                    send("cloudSave",merged.toString()); finishCloudSave(operation,null);
                })
                .addOnFailureListener(e -> {
                    discardCloudSnapshot(client,snapshot);
                    finishCloudSave(operation,"Bulut kayıt yazılamadı: "+e.getMessage());
                });
        } catch(Exception e) { discardCloudSnapshot(client,snapshot); finishCloudSave(operation,"Bulut kayıt okunamadı: "+e.getMessage()); }
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
        if (!adsAllowed() || !adsInitialized || rewardedLoading || rewardedInProgress || interstitialInProgress || rewardedAd != null || !rewardedLoadGate.canAttempt(android.os.SystemClock.elapsedRealtime())) return;
        final int generation = adGeneration;
        rewardedLoading = true;
        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, createAdRequest(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) { if (generation != adGeneration || !adsAllowed()) return; rewardedLoadGate.loaded(); rewardedLoading = false; rewardedAd = ad; send("adReady", "true"); }
            @Override public void onAdFailedToLoad(LoadAdError error) { if (generation != adGeneration || !adsAllowed()) return; rewardedLoadGate.failed(android.os.SystemClock.elapsedRealtime()); rewardedLoading = false; rewardedAd = null; send("adReady", "false"); Log.w(TAG, "Rewarded load: " + error); }
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
        rewardedInProgress = true; sendAudienceState();
        RewardedAd ad = rewardedAd;
        rewardedAd = null;
        send("adReady", "false");
        final boolean[] rewardEarned = {false};
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); }
            @Override public void onAdDismissedFullScreenContent() {
                adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime());
                rewardedInProgress = false; sendAudienceState();
                if (!rewardEarned[0]) rewardUnavailable(purpose);
                loadRewarded();
            }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { rewardedInProgress = false; sendAudienceState(); rewardUnavailable(purpose); loadRewarded(); }
        });
        try {
            ad.show(this, reward -> {
                if (rewardEarned[0]) return;
                rewardEarned[0] = true;
                recordReward(purpose,rewardOwner);
            });
        } catch (RuntimeException error) {
            rewardedInProgress = false; sendAudienceState();
            Log.e(TAG, "Rewarded display failed", error);
            rewardUnavailable(purpose);
            loadRewarded();
        }
    }
    private void loadInterstitial() {
        if (!audience.allowInterstitials() || !adsAllowed() || !adsInitialized || interstitialLoading || interstitialInProgress || rewardedInProgress || interstitialAd != null || !interstitialLoadGate.canAttempt(android.os.SystemClock.elapsedRealtime())) return;
        final int generation = adGeneration;
        interstitialLoading = true;
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_AD_UNIT_ID, createAdRequest(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { if (generation != adGeneration || !adsAllowed()) return; interstitialLoadGate.loaded(); interstitialLoading = false; interstitialAd = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) { if (generation != adGeneration || !adsAllowed()) return; interstitialLoadGate.failed(android.os.SystemClock.elapsedRealtime()); interstitialLoading = false; interstitialAd = null; Log.w(TAG, "Interstitial load: " + error); }
        });
    }
    private void onLevelCompletedForAds(int level) {
        if (level < 3 || level > 300) return;
        adCadence.transitioned(level);
        // Recover from an earlier load failure; loading never triggers a late display.
        loadRewarded();
        loadInterstitial();
        if (!audience.allowInterstitials() || !adsAllowed() || !adsInitialized || interstitialInProgress || !adCadence.eligible(android.os.SystemClock.elapsedRealtime()) || interstitialAd == null || rewardedInProgress) return;
        InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        interstitialInProgress = true; sendAudienceState();
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); }
            @Override public void onAdDismissedFullScreenContent() { adCadence.fullScreenShown(android.os.SystemClock.elapsedRealtime()); interstitialInProgress = false; sendAudienceState(); loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { interstitialInProgress = false; sendAudienceState(); loadInterstitial(); }
        });
        try { ad.show(this); }
        catch (RuntimeException e) { interstitialInProgress = false; sendAudienceState(); Log.w(TAG,"Interstitial display failed",e); loadInterstitial(); }
    }
    public class Bridge {
        @JavascriptInterface public void setLanguage(String code) { runOnUiThread(() -> uiLanguage = NativeStrings.language(code)); }
        @JavascriptInterface public void openAccountDeletion() { runOnUiThread(() -> openLegalPage("delete-account.html")); }
        @JavascriptInterface public void rewardedAccountRequest(String kind, String requestId, String owner) {
            if ((!"coins".equals(kind) && !"hint".equals(kind)) || requestId == null || !requestId.matches("[a-zA-Z0-9_-]{1,100}") || owner == null || !owner.matches("[^\\x00-\\x1f\\x7f]{0,256}")) return;
            // Bind to the account shown by the game before the UI-thread hop or SDK auth refresh.
            runOnUiThread(() -> {
                if (rewardedInProgress) { rewardUnavailable(kind + ":" + requestId); return; }
                showRewarded(kind + ":" + requestId, owner);
            });
        }
        @JavascriptInterface public void privacyState() { runOnUiThread(() -> sendPrivacyState()); }
        @JavascriptInterface public void audienceState() { runOnUiThread(() -> sendAudienceState()); }
        @JavascriptInterface public void ageOptions() { runOnUiThread(() -> showAudienceScreen(true, false)); }
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
            runOnUiThread(() -> MainActivity.this.signIn());
        }
        @JavascriptInterface public void logout() {
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                NativeStrings.text("Play Games hesabını Google Play Oyunlar ayarlarından değiştirebilirsin.", uiLanguage),
                Toast.LENGTH_LONG).show());
        }
        @JavascriptInterface public void state() { runOnUiThread(() -> checkSignIn()); }
        @JavascriptInterface public void syncSave(String raw) { runOnUiThread(() -> MainActivity.this.syncSave(raw)); }
        @JavascriptInterface public void achievements(int completed, int stars) {
            runOnUiThread(() -> {
                if (!audience.allowOnlineAccounts() || !signedIn) return;
                if (completed >= 10) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_FIRST);
                if (stars >= 50) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_STARS);
                if (completed >= 100) PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_LEGEND);
            });
        }
        @JavascriptInterface public void uploadForAccount(String owner,long points) {
            runOnUiThread(() -> {
                if(!audience.allowOnlineAccounts()||!signedIn||owner==null||!owner.equals(currentPlayerId))return;
                PlayGames.getLeaderboardsClient(MainActivity.this).submitScore(LEADERBOARD_ID,Math.max(0L,Math.min(3000000000L,points)));
            });
        }
        @JavascriptInterface public void achievementsForAccount(String owner,int completed,int stars) {
            runOnUiThread(() -> {
                if(!audience.allowOnlineAccounts()||!signedIn||owner==null||!owner.equals(currentPlayerId))return;
                if(completed>=10)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_FIRST);
                if(stars>=50)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_STARS);
                if(completed>=100)PlayGames.getAchievementsClient(MainActivity.this).unlock(ACH_LEGEND);
            });
        }
        @JavascriptInterface public void upload(int points) {
            runOnUiThread(() -> {
                if (!audience.allowOnlineAccounts() || !signedIn) return;
                PlayGames.getLeaderboardsClient(MainActivity.this).submitScore(LEADERBOARD_ID, Math.max(0, points));
            });
        }
        @JavascriptInterface public void ranking() {
            runOnUiThread(() -> {
                if (!audience.allowOnlineAccounts()) { error("Bu oturum yerel oyun modunda. Kayıtların cihazında korunur."); return; }
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
        android.app.AlertDialog confirmation = new android.app.AlertDialog.Builder(this)
            .setTitle("KARA DÜĞÜM")
            .setMessage(NativeStrings.text("Oyundan çıkmak istiyor musun?", uiLanguage))
            .setNegativeButton(NativeStrings.text("Vazgeç", uiLanguage), null)
            .setPositiveButton(NativeStrings.text("Çıkış", uiLanguage), (dialog, which) -> finish())
            .show();
        confirmation.getWindow().getDecorView().setLayoutDirection("ar".equals(uiLanguage) ? android.view.View.LAYOUT_DIRECTION_RTL : android.view.View.LAYOUT_DIRECTION_LTR);
    }

    @Override protected void onPause() {
        if (view != null) { view.evaluateJavascript("window.kdAppBackground=true;window.kdSetPaused && window.kdSetPaused(true);window.kdCloudSync && window.kdCloudSync()",null); view.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        loadRewarded();
        loadInterstitial();
        if (view != null) { view.onResume(); if (audienceAnswered && audienceDialog == null) startEligibleServices(); deliverPendingRewards(); view.evaluateJavascript("window.kdAppBackground=false;window.kdUnlockAudio && window.kdUnlockAudio();window.kdSetPaused && window.kdSetPaused(document.getElementById('kdGame').hidden)",null); }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == GAMES_STARTUP_REQUEST) {
            gamesStartupPending = false;
            gamesLifecycleReady = resultCode == RESULT_OK;
            gamesStartupFailed = !gamesLifecycleReady;
            if (gamesStartupFailed) pendingInteractiveLogin = false;
            sendAudienceState();
        }
    }
    @Override protected void onDestroy() {
        if (audienceDialog != null) { audienceDialog.setOnDismissListener(null); audienceDialog.dismiss(); audienceDialog = null; }
        if (consentGate != null) consentGate.destroy();
        adGeneration++;
        if (privacyDialog != null) privacyDialog.dismiss();
        rewardedAd=null; interstitialAd=null;
        if(view!=null){view.removeJavascriptInterface("KaraNative");view.stopLoading();view.destroy();view=null;}
        super.onDestroy();
    }

    // API 33+ uses the registered OnBackInvokedCallback; this is the API 24-32 fallback.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override
    public void onBackPressed() {
        handleGameBack();
    }
}
