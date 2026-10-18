package com.karadugum.puzzle;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final int SIGN_IN = 101;
  private WebView view;
  private GoogleSignInClient google;
  private FirebaseAuth auth;
  private DatabaseReference scores;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.BLACK);
    getWindow().setNavigationBarColor(Color.BLACK);
    auth = FirebaseAuth.getInstance();
    scores = FirebaseDatabase.getInstance().getReference("leaderboard");
    GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
      .requestIdToken(getString(R.string.default_web_client_id)).requestEmail().build();
    google = GoogleSignIn.getClient(this, options);
    view = new WebView(this);
    view.setBackgroundColor(Color.BLACK);
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.addJavascriptInterface(new Bridge(), "KaraNative");
    view.setWebViewClient(new WebViewClient() {
      @Override public void onPageFinished(WebView v, String url) { announceUser(); }
    });
    setContentView(view);
    view.loadUrl("file:///android_asset/index.html");
  }

  private void send(String event, String payload) {
    runOnUiThread(() -> view.evaluateJavascript("window.kdNativeEvent && window.kdNativeEvent(" + JSONObject.quote(event) + "," + payload + ")", null));
  }
  private void error(String message) { send("error", JSONObject.quote(message)); }
  private void announceUser() {
    FirebaseUser u = auth.getCurrentUser();
    if (u == null) { send("user", "null"); return; }
    try {
      JSONObject data = new JSONObject();
      data.put("name", u.getDisplayName() == null ? "Oyuncu" : u.getDisplayName());
      data.put("uid", u.getUid());
      send("user", data.toString());
    } catch (Exception e) { error("Profil yüklenemedi"); }
  }
  @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode != SIGN_IN) return;
    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
    try {
      GoogleSignInAccount account = task.getResult(ApiException.class);
      AuthCredential credential = GoogleAuthProvider.getCredential(account.getIdToken(), null);
      auth.signInWithCredential(credential).addOnCompleteListener(this, result -> {
        if (result.isSuccessful()) announceUser();
        else error("Google oturumu açılamadı: " + (result.getException() == null ? "Bilinmeyen hata" : result.getException().getMessage()));
      });
    } catch (ApiException e) { error("Google giriş iptal edildi veya başarısız: " + e.getStatusCode()); }
  }
  public class Bridge {
    @JavascriptInterface public void login() { runOnUiThread(() -> startActivityForResult(google.getSignInIntent(), SIGN_IN)); }
    @JavascriptInterface public void logout() { runOnUiThread(() -> { auth.signOut(); google.signOut().addOnCompleteListener(t -> announceUser()); }); }
    @JavascriptInterface public void state() { runOnUiThread(() -> announceUser()); }
    @JavascriptInterface public void upload(int points) {
      runOnUiThread(() -> {
        FirebaseUser user = auth.getCurrentUser();
        if (user == null) { error("Önce Google hesabıyla giriş yapın"); return; }
        if (points < 0 || points > 10000000) { error("Puan geçersiz"); return; }
        DatabaseReference own = scores.child(user.getUid());
        own.child("points").get().addOnCompleteListener(task -> {
          if (!task.isSuccessful()) { error("Puan okunamadı. İnternet bağlantınızı kontrol edin."); return; }
          long old = 0;
          if (task.getResult().getValue() instanceof Number) old = ((Number) task.getResult().getValue()).longValue();
          Map<String,Object> values = new HashMap<>();
          values.put("name", user.getDisplayName() == null ? "Oyuncu" : user.getDisplayName().substring(0, Math.min(32,user.getDisplayName().length())));
          values.put("points", Math.max(old, points));
          own.updateChildren(values).addOnCompleteListener(t -> {
            if (t.isSuccessful()) send("synced", "true"); else error("Puan gönderilemedi");
          });
        });
      });
    }
    @JavascriptInterface public void ranking() {
      runOnUiThread(() -> {
        if (auth.getCurrentUser() == null) { error("Dünya sıralaması için giriş yapın"); return; }
        scores.orderByChild("points").limitToLast(50).addListenerForSingleValueEvent(new ValueEventListener() {
          @Override public void onDataChange(DataSnapshot snapshot) {
            try {
              ArrayList<JSONObject> list = new ArrayList<>();
              for (DataSnapshot child : snapshot.getChildren()) {
                Object p = child.child("points").getValue();
                if (!(p instanceof Number)) continue;
                JSONObject item = new JSONObject();
                item.put("name", String.valueOf(child.child("name").getValue() == null ? "Oyuncu" : child.child("name").getValue()));
                item.put("points", ((Number)p).longValue());
                list.add(item);
              }
              Collections.sort(list, (a,b) -> Long.compare(b.optLong("points"), a.optLong("points")));
              JSONArray out = new JSONArray(); for (JSONObject x : list) out.put(x);
              send("ranking", out.toString());
            } catch (Exception e) { error("Sıralama okunamadı"); }
          }
          @Override public void onCancelled(DatabaseError err) { error("Sıralama hatası: " + err.getMessage()); }
        });
      });
    }
  }
  @Override public void onBackPressed() { if (view.canGoBack()) view.goBack(); else super.onBackPressed(); }
}
