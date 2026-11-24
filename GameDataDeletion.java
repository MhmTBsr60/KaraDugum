package com.orynexa.karadugum;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.SnapshotMetadata;
import com.google.android.gms.games.snapshot.SnapshotMetadataBuffer;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

/** Non-exported, isolated from gameplay: no game timers or automatic cloud saves run here. */
public final class GameDataDeletion extends Activity {
    private static final String GAME_URL = "file:///android_asset/index.html";
    private static final String GOOGLE_URL = "https://play.google.com/games/profile";
    private String owner, language, cleanupCode;
    private boolean verifiedGuest, busy;
    private WebView storage;
    private TextView status;
    private Button action;

    private static File marker(Context context, String owner, String prefix) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(owner.getBytes(StandardCharsets.UTF_8));
            return new File(context.getNoBackupFilesDir(), prefix + android.util.Base64.encodeToString(digest,
                android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING));
        } catch (NoSuchAlgorithmException impossible) { throw new AssertionError(impossible); }
    }
    static boolean pending(Context context, String owner) { return marker(context, owner, "erase-").isFile(); }

    // Remember the opt-out locally, without retaining the player ID or restoring it in a backup.
    static boolean allowProfile(Context context, String owner, boolean explicitSignIn) {
        File optOut = marker(context, owner, "signed-out-");
        return !optOut.exists() || (explicitSignIn && optOut.delete());
    }
    @Override protected void onCreate(Bundle state) {
        owner = getIntent().getStringExtra("owner");
        boolean eligible = new AudienceChoiceStore(getNoBackupFilesDir()).load().allowOnlineAccounts();
        if (eligible && owner != null && !owner.isEmpty())
            com.google.android.gms.games.PlayGamesSdk.initialize(getApplicationContext());
        super.onCreate(state);
        if (owner == null) { finish(); return; }
        language = NativeStrings.language(getIntent().getStringExtra("language"));
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding, padding, padding);
        layout.setLayoutDirection("ar".equals(language) ? android.view.View.LAYOUT_DIRECTION_RTL : android.view.View.LAYOUT_DIRECTION_LTR);
        status = new TextView(this);
        status.setTextSize(18);
        layout.addView(status);
        action = button(layout, "Yeniden dene", this::inspect);
        button(layout, "Google Play Oyunlar verilerini yönet", () -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(GOOGLE_URL))); }
            catch (android.content.ActivityNotFoundException ignored) { message("Tarayıcıda play.google.com/games/profile adresini aç."); }
        });
        button(layout, "Kapat", this::finish);
        setContentView(layout);
        if (!owner.isEmpty() && !eligible) { fail(); return; }
        try (InputStream in = getAssets().open("erase-local.js"); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int n;
            while ((n = in.read(buffer)) != -1) bytes.write(buffer, 0, n);
            cleanupCode = bytes.toString("UTF-8");
        } catch (IOException e) { fail(); return; }

        // Use exactly the gameplay URL / WebView storage partition, serving an inert document.
        // An independent WebView needs no JavaScript bridge and cannot run game startup code.
        storage = new WebView(this);
        storage.getSettings().setJavaScriptEnabled(true);
        storage.getSettings().setDomStorageEnabled(true);
        storage.getSettings().setAllowContentAccess(false);
        storage.getSettings().setBlockNetworkLoads(true);
        storage.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView web, WebResourceRequest request) {
                return new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream(
                    "<!doctype html><meta charset=utf-8><title>KARA DÜĞÜM</title>".getBytes(StandardCharsets.UTF_8)));
            }
            @Override public void onPageFinished(WebView web, String url) {
                if (GAME_URL.equals(url) && !closed()) inspect();
            }
        });
        layout.addView(storage, new LinearLayout.LayoutParams(1, 1));
        action.setEnabled(false);
        storage.loadUrl(GAME_URL);
    }
    private Button button(LinearLayout layout, String label, Runnable click) {
        Button b = new Button(this);
        b.setText(t(label));
        b.setOnClickListener(v -> click.run());
        layout.addView(b);
        return b;
    }
    private String t(String text) { return NativeStrings.text(text, language); }
    private void message(String text) { status.setText(t(text)); }
    private boolean closed() { return isFinishing() || isDestroyed(); }
    private void fail() {
        if (closed()) return;
        busy = false;
        action.setEnabled(storage != null);
        message("İşlem tamamlanamadı. Oyunda kullandığın hesapla internete bağlanıp tekrar dene.");
    }
    private void inspect() {
        if (busy || closed() || storage == null) return;
        busy = true;
        action.setEnabled(false);
        message("Oyun kaydı kontrol ediliyor…");
        if (owner.isEmpty()) {
            storage.evaluateJavascript("localStorage.getItem('kdCloud_activeAccount') === null", result -> {
                if (closed()) return;
                verifiedGuest = "true".equals(result);
                if (verifiedGuest) confirm(t("Bu cihazdaki misafir kaydı"));
                else fail();
            });
        } else {
            verifyPlayer(name -> confirm(name));
        }
    }
    private void verifyPlayer(java.util.function.Consumer<String> next) {
        // Also recheck after listing: an empty list for another account cannot prove erasure.
        PlayGames.getPlayersClient(this).getCurrentPlayer(true).addOnCompleteListener(task -> {
            if (closed()) return;
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isStale()
                    || task.getResult().get() == null || !owner.equals(task.getResult().get().getPlayerId())) {
                fail(); return;
            }
            next.accept(task.getResult().get().getDisplayName());
        });
    }
    private void confirm(String name) {
        if (pending(this, owner)) { runDeletion(); return; }
        String detail = owner.isEmpty() ? "Bu cihazdaki misafir ilerlemesi kalıcı olarak silinecek."
            : "Bu profildeki bulut kayıtları ve bu cihazdaki oyun ilerlemesi kalıcı olarak silinecek. Diğer cihazlarda oyunu kapat. Google başarımları ve sıralama için Google Play Oyunlar verilerini ayrıca yönetebilirsin.";
        new AlertDialog.Builder(this).setTitle(t("Oyun verilerimi sil"))
            .setMessage(name + "\n\n" + t(detail))
            .setNegativeButton(t("Vazgeç"), (d,w) -> finish())
            .setPositiveButton(t("Kalıcı olarak sil"), (d,w) -> {
                if (owner.isEmpty()) recordConsent();
                else verifyPlayer(confirmedName -> recordConsent());
            }).setOnCancelListener(d -> finish()).show();
    }
    private void recordConsent() {
        try {
            File file = marker(this, owner, "erase-");
            if (!file.createNewFile() && !file.isFile()) { fail(); return; }
            runDeletion();
        } catch (IOException error) { fail(); }
    }
    private void runDeletion() {
        if (MainActivity.cloudWriteBusy()) { fail(); return; }
        if (owner.isEmpty() && !verifiedGuest) { fail(); return; }
        message("Oyun verileri siliniyor…");
        String target = owner.isEmpty() ? "null" : JSONObject.quote(owner);
        storage.evaluateJavascript(cleanupCode + "\neraseLocalGame(localStorage, " + target + ")", result -> {
            if (closed()) return;
            if (!"true".equals(result)) { fail(); return; }
            MainActivity.eraseNativeRecords(this, owner, ok -> {
                if (closed()) return;
                if (!ok) { fail(); return; }
                if (owner.isEmpty()) complete();
                else verifyPlayer(name -> snapshots(false));
            });
        });
    }
    private void snapshots(boolean verifying) {
        SnapshotsClient client = PlayGames.getSnapshotsClient(this);
        client.load(true).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) { fail(); return; }
            SnapshotMetadataBuffer buffer = task.getResult().get();
            if (buffer == null) { fail(); return; }
            List<SnapshotMetadata> matches = new ArrayList<>();
            try {
                if (closed()) return;
                if (task.getResult().isStale()) { fail(); return; }
                for (SnapshotMetadata record : buffer) {
                    if (!MainActivity.isGameSave(record.getUniqueName())) continue;
                    if (record.hasChangePending() || record.getOwner() == null || !owner.equals(record.getOwner().getPlayerId())) { fail(); return; }
                    matches.add(record.freeze());
                }
            } finally { buffer.release(); }
            if (matches.isEmpty()) { verifyPlayer(name -> complete()); return; }
            if (verifying) { fail(); return; }
            verifyPlayer(name -> {
                List<com.google.android.gms.tasks.Task<?>> deletes = new ArrayList<>();
                for (SnapshotMetadata record : matches) deletes.add(client.delete(record));
                com.google.android.gms.tasks.Tasks.whenAll(deletes).addOnCompleteListener(all -> {
                    if (closed()) return;
                    if (all.isSuccessful()) verifyPlayer(verified -> snapshots(true));
                    else fail();
                });
            });
        });
    }
    private void complete() {
        if (closed()) return;
        File job = marker(this, owner, "erase-");
        if (!owner.isEmpty()) {
            File optOut = marker(this, owner, "signed-out-");
            try { if (!optOut.createNewFile() && !optOut.isFile()) { fail(); return; } }
            catch (IOException error) { fail(); return; }
        }
        if (job.exists() && !job.delete()) { fail(); return; }
        message(owner.isEmpty() ? "Bu cihazdaki misafir kaydı silindi."
            : "Bu cihazdaki oyun kaydın ve KARA DÜĞÜM bulut ilerlemen silindi. Google başarımları ve sıralama için Google Play Oyunlar verilerini yönetebilirsin.");
        action.setVisibility(android.view.View.GONE);
    }
    @Override protected void onDestroy() {
        if (storage != null) {
            ((android.view.ViewGroup) storage.getParent()).removeView(storage);
            storage.destroy();
        }
        super.onDestroy();
    }
}
