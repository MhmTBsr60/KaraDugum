package com.orynexa.karadugum;

/** Consent transitions run on the UI thread. The SDK remains the source of truth. */
public final class AdConsentGate {
    public interface Completion { void complete(String error); }
    public interface Driver {
        void update(Runnable success, Completion failure);
        void requiredForm(Completion completion);
        void optionsForm(Completion completion);
        boolean canRequestAds();
        boolean privacyRequired();
    }
    public interface Observer {
        void changed(boolean allowed, boolean required, boolean busy);
        void failed(String message);
    }
    private final Driver driver;
    private final Observer observer;
    private boolean started, destroyed, allowed, required;
    private int optionsSequence;
    private int phase; // 0: idle, 1: info update, 2: required form, 3: options form

    public AdConsentGate(Driver driver, Observer observer) {
        this.driver = driver;
        this.observer = observer;
    }
    public boolean canRequestAds() { return !destroyed && allowed && phase == 0 && driver.canRequestAds(); }
    public boolean privacyRequired() { return !destroyed && required; }
    public boolean busy() { return !destroyed && phase != 0; }
    public boolean formOpen() { return !destroyed && (phase == 2 || phase == 3); }
    private void publish() { observer.changed(canRequestAds(), privacyRequired(), busy()); }

    public void start() {
        if (started || destroyed) return;
        started = true;
        phase = 1;
        publish();
        try {
            driver.update(() -> {
                if (destroyed || phase != 1) return;
                required = driver.privacyRequired();
                phase = 2;
                publish();
                try { driver.requiredForm(error -> finish(2, error)); }
                catch (RuntimeException error) { finish(2, error.getMessage()); }
            }, error -> finish(1, error));
        } catch (RuntimeException error) { finish(1, error.getMessage()); }
    }
    public boolean openOptions() {
        if (destroyed || !started || phase != 0 || !required) return false;
        phase = 3;
        final int sequence = ++optionsSequence;
        allowed = false;
        publish();
        try { driver.optionsForm(error -> { if (sequence == optionsSequence) finish(3, error); }); }
        catch (RuntimeException error) { finish(3, error.getMessage()); }
        return true;
    }
    private void finish(int expectedPhase, String error) {
        if (destroyed || phase != expectedPhase) return;
        allowed = driver.canRequestAds();
        required = driver.privacyRequired();
        phase = 0;
        if (error != null) observer.failed(error);
        publish();
    }
    public void destroy() { destroyed = true; allowed = false; phase = 0; }
}
