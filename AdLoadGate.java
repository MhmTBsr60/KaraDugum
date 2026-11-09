package com.orynexa.karadugum;

/** Retry only on a foreground event, using Android's monotonic elapsed clock. */
public final class AdLoadGate {
    private static final long INITIAL_DELAY_MS = 30000;
    private static final long MAX_DELAY_MS = 300000;
    private long retryAfter;
    private long delay = INITIAL_DELAY_MS;

    public boolean canAttempt(long now) { return now >= retryAfter; }
    public void failed(long now) {
        retryAfter = now + delay;
        delay = Math.min(MAX_DELAY_MS, delay * 2);
    }
    public void loaded() { retryAfter = 0; delay = INITIAL_DELAY_MS; }
}
