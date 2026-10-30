package com.orynexa.karadugum;

/** Use a monotonic clock; ads are eligible only at a normal level transition. */
public final class InterstitialCadence {
    public static final long COOLDOWN_MS = 120000;
    private long lastFullScreen;
    private int transitions;
    public InterstitialCadence(long sessionStartedAt) { lastFullScreen = sessionStartedAt; }
    public void transitioned(int finishedLevel) {
        if (finishedLevel >= 3 && finishedLevel <= 300) transitions = Math.min(3, transitions + 1);
    }
    public boolean eligible(long now) { return transitions >= 3 && now >= lastFullScreen && now - lastFullScreen >= COOLDOWN_MS; }
    public void fullScreenShown(long now) { lastFullScreen = now; transitions = 0; }
}
