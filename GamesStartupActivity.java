package com.orynexa.karadugum;

import android.app.Activity;
import android.os.Bundle;

/** Supplies SDK lifecycle events after an explicit adult choice; the game WebView stays intact. */
public final class GamesStartupActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_OK);
    }
    @Override protected void onResume() {
        super.onResume();
        finish();
    }
}
