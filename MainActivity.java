package com.karadugum.puzzle;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
public class MainActivity extends Activity {
  private WebView view;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.BLACK);
    getWindow().setNavigationBarColor(Color.BLACK);
    view = new WebView(this);
    view.setBackgroundColor(Color.BLACK);
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.setWebViewClient(new WebViewClient());
    setContentView(view);
    view.loadUrl("file:///android_asset/index.html");
  }
  @Override public void onBackPressed() { if (view.canGoBack()) view.goBack(); else super.onBackPressed(); }
}