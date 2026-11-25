package com.orynexa.karadugum;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.media.AudioManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
import com.google.android.gms.games.snapshot.SnapshotMetadata;
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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {
    private final UiFeedbackGate uiFeedbackGate = new UiFeedbackGate();
    private HapticFeedbackPlayer uiHapticPlayer;
    private boolean uiHapticsEnabled, uiFeedbackForeground;
    private static final String TAG = "KaraDugum";
    private static final String SAVE_NAME = "karadugum_progress_v1";
    private static final String FULL_SAVE_NAME = "karadugum_full_v1";
    private static final String RECOVERY_SAVE_NAME = "karadugum_full_recovery_v1";
    static boolean isGameSave(String name) { return SAVE_NAME.equals(name) || FULL_SAVE_NAME.equals(name) || RECOVERY_SAVE_NAME.equals(name); }
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
    private TapLightOverlay tapLightOverlay;
    private volatile String tapLightDebug = "{}";
    private boolean backHandling = false;
    private boolean signedIn = false;
    private String currentPlayerId = "";
    private int authGeneration = 0;
    private boolean manualSigningIn = false;
    private boolean checkingSignIn, gamesInitialized, gamesLifecycleReady, gamesStartupPending, gamesStartupFailed;
    private boolean pendingInteractiveLogin;
    private static final int GAMES_STARTUP_REQUEST = 9002;
    private static final java.util.concurrent.atomic.AtomicInteger cloudWritesInFlight = new java.util.concurrent.atomic.AtomicInteger();
    static boolean cloudWriteBusy() { return cloudWritesInFlight.get() != 0; }
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
    private static final ScheduledExecutorService REWARD_WRITER = Executors.newSingleThreadScheduledExecutor();
    private static RewardReceiptQueue rewardReceipts;

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
        if (GameDataDeletion.pending(this, "")) {
            openDeletionScreen("");
            return;
        }
        try {
            installationId = InstallationIdentity.load(getNoBackupFilesDir());
        } catch (java.io.IOException e) {
            // A fresh actor preserves counter isolation even if durable storage is unavailable.
            installationId = InstallationIdentity.fresh();
            Log.e(TAG, "Installation identity unavailable", e);
        }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        // Safe child defaults before any explicit ad initialization; wait for the age screen.
        configureAudienceAds();
        view = new WebView(this);
        uiHapticPlayer = new HapticFeedbackPlayer(this);
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
        android.widget.FrameLayout gameSurface = new android.widget.FrameLayout(this);
        gameSurface.addView(view, new android.widget.FrameLayout.LayoutParams(-1,-1));
        tapLightOverlay = new TapLightOverlay(this, new TapLightOverlay.Listener() {
            @Override public void painted(int sequence) { tapLightStage(sequence,"presented"); }
            @Override public void stage(int sequence,String phase) { tapLightStage(sequence,phase); }
        });
        gameSurface.addView(tapLightOverlay,new android.widget.FrameLayout.LayoutParams(-1,-1));
        if (Build.VERSION.SDK_INT >= 30) {
            // Consume only visible system bars and physical cutouts; keep the board and
            // native feedback layer in the same coordinate space.
            gameSurface.setOnApplyWindowInsetsListener((surface, insets) -> {
                android.graphics.Insets safe = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                surface.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return insets;
            });
        }
        setContentView(gameSurface);
        configureGameWindow();
        gameSurface.requestApplyInsets();
        view.loadUrl("file:///android_asset/index.html");
        tapLightStage(0,"ready");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> handleGameBack());
        }
    }

    @SuppressWarnings("deprecation")
    private void configureGameWindow() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            android.view.WindowInsetsController controller = getWindow().getDecorView().getWindowInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(android.view.WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                android.view.View.SYSTEM_UI_FLAG_FULLSCREEN |
                android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            getWindow().setStatusBarColor(Color.BLACK);
            getWindow().setNavigationBarColor(Color.BLACK);
        }
    }

    // UI-thread snapshot only. The JS bridge reads a volatile string, never Android Views.
    private void tapLightStage(int sequence,String phase) {
        String webview="unknown";
        if(Build.VERSION.SDK_INT>=26&&WebView.getCurrentWebViewPackage()!=null)webview=WebView.getCurrentWebViewPackage().versionName;
        tapLightDebug="{\"build\":"+JSONObject.quote(BuildConfig.VERSION_NAME)
            +",\"uptimeMs\":"+android.os.SystemClock.uptimeMillis()+",\"model\":"+JSONObject.quote(Build.MODEL)+",\"android\":"+Build.VERSION.SDK_INT
            +",\"webview\":"+JSONObject.quote(webview)+",\"phase\":"+JSONObject.quote(phase)
            +",\"visibleSinceMs\":"+(tapLightOverlay==null?0:tapLightOverlay.visibleSinceMs())
            +",\"enabled\":"+(tapLightOverlay!=null&&tapLightOverlay.lightEnabled())
            +",\"foreground\":"+uiFeedbackForeground+",\"focus\":"+(view!=null&&view.hasWindowFocus())
            +",\"visible\":"+(tapLightOverlay!=null&&tapLightOverlay.isShown())
            +",\"width\":"+(tapLightOverlay==null?0:tapLightOverlay.getWidth())
            +",\"height\":"+(tapLightOverlay==null?0:tapLightOverlay.getHeight())+"}";
        if(view!=null)view.evaluateJavascript("window.kdLightFeedback&&window.kdLightFeedback.nativeEvent("
            +sequence+","+JSONObject.quote(phase)+","+tapLightDebug+")",null);
    }

    private void configureAudienceAds() {
        com.google.android.gms.ads.RequestConfiguration.Builder configuration = new com.google.android.gms.ads.RequestConfiguration.Builder();
        configuration.setAgeRestrictedTreatment(audience.restrictedAds()
            ? com.google.android.gms.ads.AgeRestrictedTreatment.CHILD : com.google.android.gms.ads.AgeRestrictedTreatment.UNSPECIFIED);
        // The game's general-audience content rating also applies to adult ad requests.
        // This client cap does not certify the account settings or individual creatives.
        configuration.setMaxAdContentRating(com.google.android.gms.ads.RequestConfiguration.MAX_AD_CONTENT_RATING_G);
        if (audience.restrictedAds()) {
            // Keep the documented AAID-suppression flag for compatible SDK/service paths too.
            configuration.setTagForChildDirectedTreatment(com.google.android.gms.ads.RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE);
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
    private void openDeletionScreen(String owner) {
        if (isFinishing() || isDestroyed()) return;
        Intent intent = new Intent(this, GameDataDeletion.class);
        intent.putExtra("owner", owner);
        intent.putExtra("language", uiLanguage);
        startActivity(intent);
        finish();
    }

    private void openPrivacyPolicy() { openLegalPage("privacy-policy.html"); }
    private void showAccountHelp() {
        if (isFinishing() || isDestroyed()) return;
        if (audienceOptionsBusy()) { sendAudienceState(); return; }
        final android.app.AlertDialog dialog = new android.app.AlertDialog.Builder(this)
            .setTitle(NativeStrings.text("Hesap değiştirme yardımı", uiLanguage))
            .setMessage(NativeStrings.text(NativeStrings.ACCOUNT_HELP, uiLanguage))
            .setNegativeButton(NativeStrings.text("Kapat", uiLanguage), null)
            .setPositiveButton(NativeStrings.text("Google yardımını aç", uiLanguage), (ignored, which) -> {
                String language = "zh".equals(uiLanguage) ? "zh-CN" : uiLanguage;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://support.google.com/googleplay/answer/14754238?hl=" + language))); }
                catch (android.content.ActivityNotFoundException failure) { Log.w(TAG, "Account help browser unavailable", failure); }
            })
            .create();
        dialog.setOnDismissListener(ignored -> { privacyDialog = null; sendAudienceState(); });
        privacyDialog = dialog;
        sendAudienceState();
        dialog.show();
        dialog.getWindow().getDecorView().setLayoutDirection("ar".equals(uiLanguage) ? android.view.View.LAYOUT_DIRECTION_RTL : android.view.View.LAYOUT_DIRECTION_LTR);
    }
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
        if ("delete-account.html".equals(filename)) {
            android.widget.Button erase = new android.widget.Button(this);
            erase.setText(NativeStrings.text("Oyun verilerimi sil", uiLanguage));
            erase.setOnClickListener(v -> {
                if ((saving && cloudSaveCurrent(activeCloudSave)) || cloudWriteBusy()
                        || rewardedInProgress || checkingSignIn || manualSigningIn) {
                    error("İşlem sürüyor. Biraz sonra tekrar dene.");
                    return;
                }
                openDeletionScreen(signedIn && audience.allowOnlineAccounts() ? currentPlayerId : "");
            });
            layout.addView(erase);
        }
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
        String localized = NativeStrings.text(message, uiLanguage);
        if ("Google Play Oyunlar'a bağlanılamadı. Yerel kayıtların korunuyor; daha sonra yeniden deneyebilirsin.".equals(message)) {
            send("loginError", JSONObject.quote(localized));
            return;
        }
        runOnUiThread(() -> Toast.makeText(this, localized, Toast.LENGTH_LONG).show());
        send("error", JSONObject.quote(localized));
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
                if (GameDataDeletion.pending(this, currentPlayerId)) {
                    signedIn = false;
                    openDeletionScreen(currentPlayerId);
                    return;
                }
                if (!GameDataDeletion.allowProfile(this, currentPlayerId, interactive)) {
                    checkingSignIn = false; manualSigningIn = false; signedIn = false; currentPlayerId = "";
                    send("user", "null");
                    return;
                }
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
        String generation = checkSaveGeneration(a, b);
        String otherGeneration = checkSaveGeneration(b, a);
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
        if(full!=null) {
            result.put("full",full);
            if (generation.isEmpty()) generation = otherGeneration;
            if (!generation.isEmpty()) result.put("saveGeneration", generation);
        }
        return result;
    }
    // New full slots record their first confirmed root. A returning device with an
    // older, already-confirmed root must never merge its pre-deletion profile into one.
    static String checkSaveGeneration(JSONObject remote, JSONObject incoming) {
        String generation = remote.optString("saveGeneration", "");
        JSONObject full = incoming.optJSONObject("full");
        JSONObject root = full == null ? null : full.optJSONObject("root");
        if (!generation.isEmpty() && root != null && !generation.equals(root.optString("id")))
            throw new IllegalStateException("Obsolete save generation");
        return generation;
    }
    private static <T> com.google.android.gms.tasks.Task<T> trackCloudWrite(com.google.android.gms.tasks.Task<T> write) {
        cloudWritesInFlight.incrementAndGet();
        write.addOnCompleteListener(done -> cloudWritesInFlight.decrementAndGet());
        return write;
    }
    private static final class CloudSaveOperation {
        final int generation;
        final String owner;
        int identityRetries;
        boolean recoverySlot, recoveryKnown;
        CloudSaveOperation(int generation, String owner) { this.generation = generation; this.owner = owner; }
    }
    private CloudSaveOperation activeCloudSave;
    private boolean cloudSaveCurrent(CloudSaveOperation operation) {
        return operation != null && activeCloudSave == operation && operation.generation == authGeneration
            && operation.owner.equals(currentPlayerId) && audience.allowOnlineAccounts() && signedIn
            && !GameDataDeletion.pending(this, operation.owner)
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
        if (!audience.allowOnlineAccounts() || !signedIn || currentPlayerId.isEmpty() || GameDataDeletion.pending(this,currentPlayerId) || isFinishing() || isDestroyed()) return;
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
            discoverCloudRoute(client,incoming,operation);
        } catch(Exception e) {
            if (operation != null) finishCloudSave(operation, "Kayıt verisi geçersiz");
            else error("Kayıt verisi geçersiz");
        }
    }
    private void discoverCloudRoute(SnapshotsClient client, JSONObject incoming, CloudSaveOperation operation) {
        if (!cloudSaveCurrent(operation)) return;
        // Always discover an existing recovery slot before writing. A new device must not fork the account.
        client.load(true).addOnSuccessListener(list -> {
            if (list == null || list.get() == null) { finishCloudSave(operation,"Bulut kayıt listesi alınamadı; yerel kayıt korundu."); return; }
            boolean valid=!list.isStale(), recovery=false;
            try {
                if (!cloudSaveCurrent(operation)) return;
                if (valid) for (SnapshotMetadata entry : list.get()) {
                    if (!RECOVERY_SAVE_NAME.equals(entry.getUniqueName())) continue;
                    if (entry.getOwner()==null || !operation.owner.equals(entry.getOwner().getPlayerId())) { valid=false; break; }
                    recovery=true;
                }
            } catch (RuntimeException error) { valid=false; }
            finally { list.get().release(); }
            if (!cloudSaveCurrent(operation)) return;
            if (!valid) { finishCloudSave(operation,"Bulut kayıt listesi doğrulanamadı; yerel kayıt korundu."); return; }
            JSONObject full=incoming.optJSONObject("full");
            if (recovery && full==null) { finishCloudSave(operation,"Hesap kaydı doğrulanamadı; yerel kayıt korundu."); return; }
            operation.recoverySlot=recovery;
            operation.recoveryKnown=recovery;
            if (!recovery && full!=null && !full.has("root")) importLegacyAndOpen(client,incoming,operation);
            else openCloudSnapshot(client,incoming,operation);
        }).addOnFailureListener(e -> finishCloudSave(operation,"Bulut kayıt listesi alınamadı; yerel kayıt korundu."));
    }
    private void openCloudSnapshot(SnapshotsClient client,JSONObject incoming,CloudSaveOperation operation) {
        if (!cloudSaveCurrent(operation)) return;
        String slot=operation.recoverySlot?RECOVERY_SAVE_NAME:(incoming.optJSONObject("full")==null?SAVE_NAME:FULL_SAVE_NAME);
        try {
            // A previously synchronized device must not recreate a cloud slot erased elsewhere.
            JSONObject full = incoming.optJSONObject("full");
            boolean mayCreate = !operation.recoveryKnown && (full == null || !full.has("root"));
            client.open(slot,mayCreate,SnapshotsClient.RESOLUTION_POLICY_MANUAL)
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
                        legacy=mergeSave(readOwnedSnapshot(conflict.getSnapshot(),operation),readOwnedSnapshot(conflict.getConflictingSnapshot(),operation));
                    } else {
                        Snapshot old=result.getData();legacy=old==null?new JSONObject():readOwnedSnapshot(old,operation);
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
    // The SDK owner and the embedded account are separate checks. Never re-label or merge foreign data.
    private static final class CloudIdentityMismatch extends Exception {
        final boolean payloadOnly;
        CloudIdentityMismatch(boolean payloadOnly) { this.payloadOnly=payloadOnly; }
    }
    private JSONObject readOwnedSnapshot(Snapshot snapshot, CloudSaveOperation operation) throws Exception {
        if (snapshot == null || snapshot.getMetadata() == null || snapshot.getMetadata().getOwner() == null
                || !operation.owner.equals(snapshot.getMetadata().getOwner().getPlayerId()))
            throw new CloudIdentityMismatch(false);
        JSONObject value=readSnapshot(snapshot);
        JSONObject full=value.optJSONObject("full");
        if (full != null && !operation.owner.equals(full.optString("account")))
            throw new CloudIdentityMismatch(true);
        return value;
    }
    private void recoverCloudMismatch(SnapshotsClient client, JSONObject incoming, CloudSaveOperation operation,
                                      CloudIdentityMismatch mismatch) {
        if (!cloudSaveCurrent(operation)) return;
        final String message="Bulut kayıt sahibi doğrulanamadı; eski ve yerel kayıtlar korundu.";
        // A second slot never adopts the old payload. A rooted device cannot recreate erased data.
        if (operation.recoverySlot || operation.identityRetries >= 2 || incoming.optJSONObject("full")==null
                || (operation.identityRetries > 0 && !mismatch.payloadOnly)) {
            finishCloudSave(operation,message); return;
        }
        final boolean useRecovery=operation.identityRetries > 0;
        operation.identityRetries++;
        try {
            PlayGames.getPlayersClient(this).getCurrentPlayer(true).addOnSuccessListener(player -> {
                if (!cloudSaveCurrent(operation)) return;
                if (player == null || player.isStale() || player.get() == null
                        || !operation.owner.equals(player.get().getPlayerId())) {
                    finishCloudSave(operation,message); return;
                }
                // Refresh the SDK's cached snapshot list before retrying. No old data is copied.
                client.load(true).addOnSuccessListener(list -> {
                    if (list == null || list.get() == null) { finishCloudSave(operation,message); return; }
                    boolean verified=false, existingRecovery=false, valid=true;
                    try {
                        if (!cloudSaveCurrent(operation)) return;
                        if (!list.isStale()) for (SnapshotMetadata entry : list.get()) {
                            if (!FULL_SAVE_NAME.equals(entry.getUniqueName()) && !RECOVERY_SAVE_NAME.equals(entry.getUniqueName())) continue;
                            boolean owned=entry.getOwner()!=null && operation.owner.equals(entry.getOwner().getPlayerId());
                            if (!owned) { valid=false; break; }
                            if (FULL_SAVE_NAME.equals(entry.getUniqueName())) verified=true;
                            if (RECOVERY_SAVE_NAME.equals(entry.getUniqueName())) existingRecovery=true;
                        }
                    } catch (RuntimeException error) { valid=false; }
                    finally { list.get().release(); }
                    if (!cloudSaveCurrent(operation)) return;
                    if (!valid || (!verified && !existingRecovery)) { finishCloudSave(operation,message); return; }
                    operation.recoverySlot=useRecovery || existingRecovery;
                    operation.recoveryKnown=existingRecovery;
                    openCloudSnapshot(client,incoming,operation);
                }).addOnFailureListener(e -> finishCloudSave(operation,message));
            }).addOnFailureListener(e -> finishCloudSave(operation,message));
        } catch (RuntimeException error) { finishCloudSave(operation,message); }
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
                JSONObject merged=mergeSave(mergeSave(readOwnedSnapshot(chosen,operation),readOwnedSnapshot(other,operation)),incoming);
                chosen.getSnapshotContents().writeBytes(snapshotBytes(merged));
                if (other != chosen) discardCloudSnapshot(client,other);
                trackCloudWrite(client.resolveConflict(conflict.getConflictId(),chosen))
                    .addOnSuccessListener(next -> handleSnapshot(client,next,merged,depth+1,operation))
                    .addOnFailureListener(e -> {
                        discardCloudSnapshot(client,chosen);
                        finishCloudSave(operation,"Bulut kayıt çakışması: "+e.getMessage());
                    });
            } catch(CloudIdentityMismatch mismatch) { discardCloudResult(client,result); recoverCloudMismatch(client,incoming,operation,mismatch); }
            catch(Exception e) { discardCloudResult(client,result); finishCloudSave(operation,"Bulut kayıt birleştirilemedi: "+e.getMessage()); }
            return;
        }
        Snapshot snapshot=result.getData();
        if(snapshot==null) { finishCloudSave(operation,"Bulut kayıt açılamadı"); return; }
        try {
            JSONObject remote = readOwnedSnapshot(snapshot,operation);
            JSONObject merged=mergeSave(remote,incoming);
            JSONObject incomingFull = incoming.optJSONObject("full");
            JSONObject mergedFull = merged.optJSONObject("full");
            if (remote.length() == 0 && incomingFull != null && !incomingFull.has("root")
                    && mergedFull != null && mergedFull.optJSONObject("root") != null) {
                merged.put("saveGeneration", mergedFull.optJSONObject("root").optString("id"));
            }
            snapshot.getSnapshotContents().writeBytes(snapshotBytes(merged));
            trackCloudWrite(client.commitAndClose(snapshot,SnapshotMetadataChange.EMPTY_CHANGE))
                .addOnSuccessListener(meta -> {
                    if (!cloudSaveCurrent(operation)) return;
                    if (operation.recoverySlot) {
                        try { merged.put("recoverySlot",true); }
                        catch (Exception ignored) { /* the commit already succeeded */ }
                    }
                    send("cloudSave",merged.toString()); finishCloudSave(operation,null);
                })
                .addOnFailureListener(e -> {
                    discardCloudSnapshot(client,snapshot);
                    finishCloudSave(operation,"Bulut kayıt yazılamadı: "+e.getMessage());
                });
        } catch(CloudIdentityMismatch mismatch) { discardCloudSnapshot(client,snapshot); recoverCloudMismatch(client,incoming,operation,mismatch); }
        catch(Exception e) { discardCloudSnapshot(client,snapshot); finishCloudSave(operation,"Bulut kayıt okunamadı: "+e.getMessage()); }
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
    /** Called on REWARD_WRITER so disk writes cannot block the ad callback or UI. */
    private static RewardReceiptQueue rewardReceipts(Context application) {
        if (rewardReceipts != null) return rewardReceipts;
        SharedPreferences preferences = application.getSharedPreferences("reward_receipts", MODE_PRIVATE);
        rewardReceipts = new RewardReceiptQueue(new RewardReceiptQueue.Store() {
            @Override public boolean record(String purpose, String owner) {
                return preferences.edit().putString("earned_"+purpose,purpose).putString("owner_"+purpose,owner).commit();
            }
            @Override public Map<String, String> pending() {
                Map<String, ?> stored = preferences.getAll();
                Map<String, String> pending = new LinkedHashMap<>();
                for (Map.Entry<String, ?> entry : stored.entrySet()) {
                    if (!entry.getKey().startsWith("earned_") || !(entry.getValue() instanceof String)) continue;
                    String purpose = (String) entry.getValue();
                    if (!RewardReceiptQueue.isTracked(purpose) || !entry.getKey().equals("earned_"+purpose)) continue;
                    Object owner = stored.get("owner_"+purpose);
                    pending.put(purpose, owner instanceof String ? (String) owner : "");
                }
                return pending;
            }
            @Override public void acknowledge(String purpose) {
                preferences.edit().remove("earned_"+purpose).remove("owner_"+purpose).apply();
            }
        });
        return rewardReceipts;
    }
    private void recordReward(String purpose,String owner) {
        if (!RewardReceiptQueue.isTracked(purpose)) { sendEarnedReward(purpose, owner); return; }
        Context application = getApplicationContext();
        REWARD_WRITER.execute(() -> {
            if (GameDataDeletion.pending(application, owner == null ? "" : owner) ||
                    (owner != null && !owner.isEmpty() && !GameDataDeletion.allowProfile(application, owner, false))) return;
            rewardReceipts(application).earn(purpose, owner);
            flushRewardReceipts(application, 2);
        });
    }
    private void flushRewardReceipts(Context application, int retries) {
        RewardReceiptQueue queue = rewardReceipts(application);
        boolean waiting = queue.flush();
        for (Map.Entry<String, String> receipt : queue.ready().entrySet())
            sendEarnedReward(receipt.getKey(), receipt.getValue());
        if (waiting) {
            if (retries > 0) REWARD_WRITER.schedule(() -> flushRewardReceipts(application, retries - 1),
                retries == 2 ? 250 : 1000, TimeUnit.MILLISECONDS);
            else Log.w(TAG, "Earned reward receipt awaits writable storage");
        }
    }
    static void eraseNativeRecords(Context context, String owner, java.util.function.Consumer<Boolean> done) {
        REWARD_WRITER.execute(() -> {
            Context app = context.getApplicationContext();
            String scope = owner.isEmpty() ? "guest" : "account:" + owner;
            boolean ok = app.getSharedPreferences("kd_exit_undo", MODE_PRIVATE).edit()
                .remove("campaign:" + scope).remove("daily:" + scope).commit();
            RewardReceiptQueue queue = rewardReceipts(app);
            queue.discardWaiting(owner);
            SharedPreferences prefs = app.getSharedPreferences("reward_receipts", MODE_PRIVATE);
            SharedPreferences.Editor edit = prefs.edit();
            for (Map.Entry<String, String> entry : queue.ready().entrySet()) {
                if (owner.equals(entry.getValue())) {
                    edit.remove("earned_" + entry.getKey()).remove("owner_" + entry.getKey());
                }
            }
            boolean saved = edit.commit() && ok;
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> done.accept(saved));
        });
    }

    private void deliverPendingRewards() {
        Context application = getApplicationContext();
        REWARD_WRITER.execute(() -> flushRewardReceipts(application, 0));
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
        @JavascriptInterface public String appVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public boolean feedbackAudioAllowed() {
            AudioManager manager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (manager == null || manager.getRingerMode() == AudioManager.RINGER_MODE_SILENT || manager.getStreamVolume(AudioManager.STREAM_MUSIC) == 0) return false;
            try {
                android.app.NotificationManager notifications = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                int filter = notifications == null ? android.app.NotificationManager.INTERRUPTION_FILTER_UNKNOWN : notifications.getCurrentInterruptionFilter();
                return filter != android.app.NotificationManager.INTERRUPTION_FILTER_NONE && filter != android.app.NotificationManager.INTERRUPTION_FILTER_ALARMS;
            } catch (RuntimeException unavailable) { return true; } // The media stream still enforces the OS policy.
        }
        @JavascriptInterface public boolean hapticAvailable() { return uiHapticPlayer != null && uiHapticPlayer.available(); }
        @JavascriptInterface public void setHapticsEnabled(boolean enabled) { runOnUiThread(() -> { uiHapticsEnabled = enabled; if (!enabled && uiHapticPlayer != null) uiHapticPlayer.cancel(); }); }
        @JavascriptInterface public void haptic(String kind) { triggerUiHaptic(kind, false); }
        @JavascriptInterface public void testHaptic() { triggerUiHaptic("confirm", true); }
        private void triggerUiHaptic(String kind, boolean preview) {
            runOnUiThread(() -> {
                if (view == null || isFinishing()) return;
                AudioManager manager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                boolean quiet = manager != null && manager.getRingerMode() == AudioManager.RINGER_MODE_SILENT;
                boolean allowed = uiFeedbackGate.allow(kind, uiHapticsEnabled, uiFeedbackForeground,
                    view.isAttachedToWindow() && view.isShown() && view.hasWindowFocus(), quiet, hapticAvailable(), android.os.SystemClock.uptimeMillis());
                String reason = allowed ? uiHapticPlayer.play(kind) : quiet ? "blocked" : !hapticAvailable() ? "unavailable" : "busy";
                if (preview) {
                    JSONObject result = new JSONObject();
                    try { result.put("channel", "haptics"); result.put("reason", reason == null ? JSONObject.NULL : reason); }
                    catch (Exception ignored) { }
                    view.evaluateJavascript("window.kdFeedback && window.kdFeedback.nativeResult(" + result + ")", null);
                }
            });
        }

        @JavascriptInterface public boolean saveExitUndo(String key, String value) {
            if (key == null || key.length() > 280 || value == null || value.length() > 1024 * 1024) return false;
            android.content.SharedPreferences.Editor checkpoint = getSharedPreferences("kd_exit_undo", MODE_PRIVATE).edit();
            return (value.isEmpty() ? checkpoint.remove(key) : checkpoint.putString(key, value)).commit();
        }
        @JavascriptInterface public String takeExitUndo(String key) {
            if (key == null || key.length() > 280) return "";
            android.content.SharedPreferences checkpoint = getSharedPreferences("kd_exit_undo", MODE_PRIVATE);
            String value = checkpoint.getString(key, "");
            if (!value.isEmpty()) checkpoint.edit().remove(key).apply();
            return value;
        }
        @JavascriptInterface public void finishGame() {
            runOnUiThread(() -> { if (!isFinishing() && !isDestroyed()) finish(); });
        }

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
        @JavascriptInterface public void setTapLightEnabled(boolean enabled) {
            runOnUiThread(()->{if(tapLightOverlay!=null)tapLightOverlay.enabled(enabled);tapLightStage(0,enabled?"enabled":"disabled");});
        }
        @JavascriptInterface public String tapLightInfo() { return tapLightDebug; }
        @JavascriptInterface public void cancelTapLight(int sequence) {
            runOnUiThread(()->{if(tapLightOverlay!=null)tapLightOverlay.cancel(sequence);});
        }
        @JavascriptInterface public void requestWebLightFrame(int sequence) {
            runOnUiThread(()->{
                if(view==null||!uiFeedbackForeground){tapLightStage(sequence,"rejected_web_background");return;}
                view.postVisualStateCallback(sequence,new WebView.VisualStateCallback(){
                    @Override public void onComplete(long requestId){
                        if(view==null||!uiFeedbackForeground)return;
                        if(Build.VERSION.SDK_INT>=29&&view.isHardwareAccelerated()){
                            view.getViewTreeObserver().registerFrameCommitCallback(()->runOnUiThread(()->{
                                if(view!=null&&uiFeedbackForeground)tapLightStage(sequence,"html_presented");
                            }));
                            view.invalidate();
                        }else view.postOnAnimation(()->{if(view!=null)view.postOnAnimation(()->{
                            if(view!=null&&uiFeedbackForeground)tapLightStage(sequence,"html_legacy_frame");
                        });});
                    }
                });
            });
        }
        @JavascriptInterface public boolean drawTapLight(double x,double y,double width,double height,double viewportWidth,double viewportHeight,boolean reduced,int sequence) {
            if(!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(width)||!Double.isFinite(height)||!Double.isFinite(viewportWidth)||!Double.isFinite(viewportHeight)
                ||viewportWidth<=0||viewportHeight<=0||width<=0||height<=0||x<0||y<0||x+width>viewportWidth+1||y+height>viewportHeight+1)return false;
            runOnUiThread(()->{
                tapLightStage(sequence,"queued");
                if(view==null||tapLightOverlay==null){tapLightStage(sequence,"rejected_missing_view");return;}
                if(!uiFeedbackForeground){tapLightStage(sequence,"rejected_background");return;}
                if(!view.hasWindowFocus()){tapLightStage(sequence,"rejected_focus");return;}
                float sx=view.getWidth()/(float)viewportWidth,sy=view.getHeight()/(float)viewportHeight;
                tapLightOverlay.flash((float)x*sx,(float)y*sy,(float)width*sx,(float)height*sy,reduced,sequence);
            });
            return true;
        }
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
            if (!RewardReceiptQueue.isTracked(purpose)) return;
            Context application = getApplicationContext();
            REWARD_WRITER.execute(() -> rewardReceipts(application).acknowledge(purpose));
        }
        @JavascriptInterface public void levelCompletedForAds(int level) { runOnUiThread(() -> onLevelCompletedForAds(level)); }
        @JavascriptInterface public void login() {
            runOnUiThread(() -> MainActivity.this.signIn());
        }
        @JavascriptInterface public void logout() {
            runOnUiThread(() -> showAccountHelp());
        }
        @JavascriptInterface public void accountHelp() { runOnUiThread(() -> showAccountHelp()); }
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
        if (backHandling || view == null || isFinishing() || isDestroyed()) return;
        backHandling = true;
        view.evaluateJavascript(
            "window.kdHandleBack && window.kdHandleBack()",
            result -> backHandling = false
        );
    }

    @Override protected void onPause() {
        uiFeedbackForeground = false;
        if(tapLightOverlay!=null)tapLightOverlay.clear();
        if (uiHapticPlayer != null) uiHapticPlayer.cancel();
        if (view != null) { view.evaluateJavascript("window.kdAppBackground=true;window.kdFeedback && window.kdFeedback.stop();window.kdSetPaused && window.kdSetPaused(true);window.kdCloudSync && window.kdCloudSync()",null); view.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (isFinishing()) return;
        uiFeedbackForeground = true;
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
        if (uiHapticPlayer != null) uiHapticPlayer.cancel();
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

