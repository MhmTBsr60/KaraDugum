package com.karadugum.puzzle;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.Build;
import android.content.Context;
import android.util.Log;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.database.MutableData;
import com.google.firebase.database.Transaction;
import java.util.Iterator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {

    private static final int SIGN_IN = 101;
    private static final String TAG = "KaraDugum";

    private WebView view;
    private GoogleSignInClient google;
    private FirebaseAuth auth;
    private DatabaseReference scores;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);

        getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        auth = FirebaseAuth.getInstance();

        scores = FirebaseDatabase.getInstance()
                .getReference("leaderboard");

        GoogleSignInOptions options =
                new GoogleSignInOptions.Builder(
                        GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(
                                getString(R.string.default_web_client_id))
                        .requestEmail()
                        .build();

        google = GoogleSignIn.getClient(this, options);

        view = new WebView(this);
        view.setBackgroundColor(Color.BLACK);

        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);

        view.addJavascriptInterface(new Bridge(), "KaraNative");

        view.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                announceUser();
            }
        });

        setContentView(view);
        view.loadUrl("file:///android_asset/index.html");
    }

    private void send(String event, String payload) {
        runOnUiThread(() -> {
            if (view != null) {
                view.evaluateJavascript(
                        "window.kdNativeEvent && window.kdNativeEvent("
                                + JSONObject.quote(event)
                                + ","
                                + payload
                                + ")",
                        null
                );
            }
        });
    }

    private void error(String message) {
        Log.e(TAG, message);

        runOnUiThread(() ->
                Toast.makeText(
                        MainActivity.this,
                        message,
                        Toast.LENGTH_LONG
                ).show()
        );

        send("error", JSONObject.quote(message));
    }

    private void announceUser() {
        FirebaseUser user = auth.getCurrentUser();

        if (user == null) {
            send("user", "null");
            return;
        }

        try {
            JSONObject data = new JSONObject();

            data.put(
                    "name",
                    user.getDisplayName() == null
                            ? "Oyuncu"
                            : user.getDisplayName()
            );

            data.put("uid", user.getUid());
            if (user.getPhotoUrl() != null) data.put("photo", user.getPhotoUrl().toString());

            send("user", data.toString());

        } catch (Exception e) {
            error("Profil yüklenemedi: " + e.getMessage());
        }
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != SIGN_IN) {
            return;
        }

        Log.d(TAG, "Google resultCode: " + resultCode);

        Task<GoogleSignInAccount> task =
                GoogleSignIn.getSignedInAccountFromIntent(data);

        try {
            GoogleSignInAccount account =
                    task.getResult(ApiException.class);

            if (account == null || account.getIdToken() == null) {
                error("Google giriş hatası: ID_TOKEN_NULL");
                return;
            }

            AuthCredential credential =
                    GoogleAuthProvider.getCredential(
                            account.getIdToken(),
                            null
                    );

            auth.signInWithCredential(credential)
                    .addOnCompleteListener(this, result -> {

                        if (result.isSuccessful()) {
                            Log.d(TAG, "Firebase giriş başarılı");

                            Toast.makeText(
                                    MainActivity.this,
                                    "Google girişi başarılı",
                                    Toast.LENGTH_LONG
                            ).show();

                            announceUser();

                        } else {
                            Exception exception =
                                    result.getException();

                            String message = exception == null
                                    ? "Bilinmeyen hata"
                                    : exception.getMessage();

                            error(
                                    "Firebase giriş hatası: "
                                            + message
                            );
                        }
                    });

        } catch (ApiException e) {

            error(
                    "Google giriş hata kodu: "
                            + e.getStatusCode()
            );

        } catch (Exception e) {

            error(
                    "Beklenmeyen giriş hatası: "
                            + e.getMessage()
            );
        }
    }

    private JSONObject mergeSave(JSONObject a, JSONObject b) throws Exception {
        JSONObject result = new JSONObject();
        JSONObject ca = a.optJSONObject("completed"), cb = b.optJSONObject("completed");
        JSONObject ba = a.optJSONObject("best"), bb = b.optJSONObject("best");
        JSONObject completed = new JSONObject(), best = new JSONObject();
        for (int i = 1; i <= 300; i++) {
            String k = String.valueOf(i);
            int stars = Math.max(ca == null ? 0 : ca.optInt(k), cb == null ? 0 : cb.optInt(k));
            int points = Math.max(ba == null ? 0 : ba.optInt(k), bb == null ? 0 : bb.optInt(k));
            if (stars > 0) completed.put(k, Math.min(3, stars));
            if (points > 0) best.put(k, Math.min(10000000, points));
        }
        int level = Math.min(300, Math.max(1, Math.max(a.optInt("level", 1), b.optInt("level", 1))));
        for (int i = 1; i <= 300; i++) if (completed.optInt(String.valueOf(i)) > 0) level = Math.max(level, Math.min(300, i + 1));
        result.put("level", level);
        result.put("completed", completed);
        result.put("best", best);
        return result;
    }

    private JSONObject parseSave(DataSnapshot snapshot) throws Exception {
        JSONObject data = new JSONObject();
        data.put("level", snapshot.child("level").getValue() instanceof Number ? ((Number) snapshot.child("level").getValue()).intValue() : 1);
        Object c = snapshot.child("completed").getValue(), b = snapshot.child("best").getValue();
        data.put("completed", new JSONObject(c instanceof String ? (String)c : "{}"));
        data.put("best", new JSONObject(b instanceof String ? (String)b : "{}"));
        return data;
    }

    public class Bridge {

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            runOnUiThread(() -> {
                try {
                    Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                    if (vibrator == null || !vibrator.hasVibrator()) return;
                    long duration = Math.max(10, Math.min(150, milliseconds));
                    if (Build.VERSION.SDK_INT >= 26) {
                        vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(duration);
                    }
                } catch (Exception e) { Log.w(TAG, "Titreşim kullanılamadı", e); }
            });
        }


        @JavascriptInterface
        public void login() {
            runOnUiThread(() -> {
                try {
                    startActivityForResult(
                            google.getSignInIntent(),
                            SIGN_IN
                    );
                } catch (Exception e) {
                    error(
                            "Giriş ekranı açılamadı: "
                                    + e.getMessage()
                    );
                }
            });
        }

        @JavascriptInterface
        public void logout() {
            runOnUiThread(() -> {
                auth.signOut();

                google.signOut()
                        .addOnCompleteListener(task -> {
                            announceUser();
                        });
            });
        }

        @JavascriptInterface
        public void state() {
            runOnUiThread(() -> announceUser());
        }

        @JavascriptInterface
        public void upload(int points) {
            runOnUiThread(() -> {

                FirebaseUser user = auth.getCurrentUser();

                if (user == null) {
                    error("Önce Google hesabıyla giriş yapın");
                    return;
                }

                if (points < 0 || points > 10000000) {
                    error("Puan geçersiz");
                    return;
                }

                DatabaseReference own =
                        scores.child(user.getUid());

                own.child("points")
                        .get()
                        .addOnCompleteListener(task -> {

                            if (!task.isSuccessful()) {
                                error("Puan okunamadı");
                                return;
                            }

                            long old = 0;

                            if (task.getResult().getValue()
                                    instanceof Number) {

                                old = ((Number)
                                        task.getResult().getValue())
                                        .longValue();
                            }

                            Map<String, Object> values =
                                    new HashMap<>();

                            String name = user.getDisplayName();

                            if (name == null) {
                                name = "Oyuncu";
                            }

                            values.put(
                                    "name",
                                    name.substring(
                                            0,
                                            Math.min(32, name.length())
                                    )
                            );

                            values.put(
                                    "points",
                                    Math.max(old, points)
                            );

                            own.updateChildren(values)
                                    .addOnCompleteListener(result -> {

                                        if (result.isSuccessful()) {
                                            send("synced", "true");
                                        } else {
                                            error(
                                                    "Puan gönderilemedi: "
                                                            + (
                                                            result.getException() == null
                                                                    ? "Bilinmeyen hata"
                                                                    : result.getException().getMessage()
                                                    )
                                            );
                                        }
                                    });
                        });
            });
        }

        @JavascriptInterface
        public void syncSave(String raw) {
            runOnUiThread(() -> {
                FirebaseUser user = auth.getCurrentUser();
                if (user == null) return;
                try {
                    JSONObject incoming = new JSONObject(raw);
                    if (!(incoming.optJSONObject("completed") instanceof JSONObject) || !(incoming.optJSONObject("best") instanceof JSONObject)) return;
                    if (raw.length() > 18000) { error("Kayıt çok büyük"); return; }
                    DatabaseReference own = FirebaseDatabase.getInstance().getReference("playerSaves").child(user.getUid());
                    own.runTransaction(new Transaction.Handler() {
                        @Override public Transaction.Result doTransaction(MutableData current) {
                            try {
                                JSONObject old = new JSONObject();
                                Object oldLevel = current.child("level").getValue();
                                old.put("level", oldLevel instanceof Number ? ((Number)oldLevel).intValue() : 1);
                                Object oldCompleted = current.child("completed").getValue();
                                Object oldBest = current.child("best").getValue();
                                old.put("completed", new JSONObject(oldCompleted instanceof String ? (String)oldCompleted : "{}"));
                                old.put("best", new JSONObject(oldBest instanceof String ? (String)oldBest : "{}"));
                                JSONObject merged = mergeSave(old, incoming);
                                current.child("level").setValue(merged.optInt("level", 1));
                                current.child("completed").setValue(merged.getJSONObject("completed").toString());
                                current.child("best").setValue(merged.getJSONObject("best").toString());
                                current.child("updatedAt").setValue(System.currentTimeMillis());
                                return Transaction.success(current);
                            } catch (Exception e) { return Transaction.abort(); }
                        }
                        @Override public void onComplete(DatabaseError err, boolean committed, DataSnapshot snapshot) {
                            if (err != null || !committed) { error("Bulut kayıt eşitlenemedi: " + (err == null ? "İşlem durdu" : err.getMessage())); return; }
                            try { send("cloudSave", parseSave(snapshot).toString()); }
                            catch (Exception e) { error("Bulut kayıt okunamadı"); }
                        }
                    });
                } catch (Exception e) { error("Kayıt verisi geçersiz"); }
            });
        }

        @JavascriptInterface
        public void ranking() {
            runOnUiThread(() -> {

                if (auth.getCurrentUser() == null) {
                    error(
                            "Dünya sıralaması için giriş yapın"
                    );
                    return;
                }

                scores.orderByChild("points")
                        .limitToLast(50)
                        .addListenerForSingleValueEvent(
                                new ValueEventListener() {

                                    @Override
                                    public void onDataChange(
                                            DataSnapshot snapshot
                                    ) {
                                        try {
                                            ArrayList<JSONObject> list =
                                                    new ArrayList<>();

                                            for (DataSnapshot child
                                                    : snapshot.getChildren()) {

                                                Object points =
                                                        child.child("points")
                                                                .getValue();

                                                if (!(points instanceof Number)) {
                                                    continue;
                                                }

                                                JSONObject item =
                                                        new JSONObject();

                                                Object name =
                                                        child.child("name")
                                                                .getValue();

                                                item.put(
                                                        "name",
                                                        name == null
                                                                ? "Oyuncu"
                                                                : String.valueOf(name)
                                                );

                                                item.put(
                                                        "points",
                                                        ((Number) points)
                                                                .longValue()
                                                );

                                                list.add(item);
                                            }

                                            Collections.sort(
                                                    list,
                                                    (a, b) ->
                                                            Long.compare(
                                                                    b.optLong("points"),
                                                                    a.optLong("points")
                                                            )
                                            );

                                            JSONArray output =
                                                    new JSONArray();

                                            for (JSONObject item : list) {
                                                output.put(item);
                                            }

                                            send(
                                                    "ranking",
                                                    output.toString()
                                            );

                                        } catch (Exception e) {
                                            error(
                                                    "Sıralama okunamadı: "
                                                            + e.getMessage()
                                            );
                                        }
                                    }

                                    @Override
                                    public void onCancelled(
                                            DatabaseError databaseError
                                    ) {
                                        error(
                                                "Sıralama hatası: "
                                                        + databaseError.getMessage()
                                        );
                                    }
                                }
                        );
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (view != null) {
            view.evaluateJavascript("(function(){return !!(window.kdHandleBack && window.kdHandleBack())})()", result -> {
                if (!"true".equals(result)) {
                    new android.app.AlertDialog.Builder(MainActivity.this)
                        .setTitle("KARA DÜĞÜM")
                        .setMessage("Oyundan çıkmak istiyor musun?")
                        .setNegativeButton("Vazgeç", null)
                        .setPositiveButton("Çıkış", (dialog, which) -> finish())
                        .show();
                }
            });
        }
    }
}
