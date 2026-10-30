package com.orynexa.karadugum;

import java.util.ArrayList;
import java.util.List;

public final class AdConsentGateAudit {
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    private static final class Driver implements AdConsentGate.Driver {
        boolean allowed, required, throwUpdate, throwOptions;
        int updates, forms;
        Runnable success;
        AdConsentGate.Completion failure, form;
        final List<AdConsentGate.Completion> options = new ArrayList<>();
        @Override public void update(Runnable success, AdConsentGate.Completion failure) {
            updates++; this.success = success; this.failure = failure;
            if (throwUpdate) throw new IllegalStateException("offline");
        }
        @Override public void requiredForm(AdConsentGate.Completion completion) { forms++; form = completion; }
        @Override public void optionsForm(AdConsentGate.Completion completion) {
            if (throwOptions) throw new IllegalStateException("form unavailable");
            options.add(completion);
        }
        @Override public boolean canRequestAds() { return allowed; }
        @Override public boolean privacyRequired() { return required; }
    }
    private static final class Observer implements AdConsentGate.Observer {
        int changes, failures;
        boolean allowed, required, busy;
        @Override public void changed(boolean allowed, boolean required, boolean busy) { changes++; this.allowed=allowed; this.required=required; this.busy=busy; }
        @Override public void failed(String message) { failures++; }
    }
    public static void main(String[] args) {
        Driver d = new Driver(); Observer o = new Observer(); AdConsentGate gate = new AdConsentGate(d,o);
        check(!gate.canRequestAds() && !gate.openOptions(), "Nothing before consent update");
        gate.start(); gate.start();
        check(d.updates==1 && gate.busy() && o.busy && !o.allowed, "One update per launch and no early ads");
        d.required=true; d.success.run(); d.success.run();
        check(d.forms==1 && gate.privacyRequired() && !gate.openOptions() && !gate.canRequestAds(), "Required form is exclusive");
        d.allowed=true; d.form.complete(null);
        check(gate.canRequestAds() && !gate.busy() && o.required, "SDK permits ads after form");
        d.allowed=false;
        check(!gate.canRequestAds(), "Every permission check consults the SDK");
        d.allowed=true;
        check(gate.openOptions() && gate.busy() && !gate.canRequestAds() && !gate.openOptions(), "Privacy options stop ad requests and cannot stack");
        d.allowed=false; d.options.get(0).complete(null);
        check(!gate.canRequestAds() && !gate.busy(), "Withdrawn SDK permission blocks ads");
        check(gate.openOptions(), "Options can be reopened");
        d.options.get(0).complete(null);
        check(gate.busy(), "Late callback from previous options cannot finish the new form");
        d.allowed=true; d.options.get(1).complete("transient form error");
        check(gate.canRequestAds() && o.failures==1, "A form error uses current SDK permission, not a fabricated choice");
        d.throwOptions=true; check(gate.openOptions() && !gate.busy() && gate.canRequestAds(), "Synchronous form failure recovers controls");

        for(boolean cached:new boolean[]{false,true}) {
            Driver offline = new Driver(); offline.allowed=cached; Observer observer = new Observer();
            AdConsentGate g = new AdConsentGate(offline,observer); g.start();
            check(!g.canRequestAds(), "Even cached permission waits for launch update");
            offline.failure.complete("offline");
            check(g.canRequestAds()==cached && !g.busy(), "Update failure honors only SDK cached permission");
        }
        Driver outside = new Driver(); Observer outsideObserver = new Observer();
        AdConsentGate outsideGate = new AdConsentGate(outside,outsideObserver); outsideGate.start(); outside.success.run(); outside.allowed=true; outside.form.complete(null);
        check(outsideGate.canRequestAds() && !outsideGate.privacyRequired() && !outsideGate.openOptions(), "No unnecessary options entry point outside required regions");
        Driver broken = new Driver(); broken.throwUpdate=true; Observer brokenObserver = new Observer();
        AdConsentGate brokenGate = new AdConsentGate(broken,brokenObserver); brokenGate.start();
        check(!brokenGate.busy() && !brokenGate.canRequestAds() && brokenObserver.failures==1, "SDK update exception does not authorize ads");
        for(int phase=1;phase<=3;phase++) {
            Driver dying = new Driver(); Observer observer = new Observer(); AdConsentGate g = new AdConsentGate(dying,observer); g.start();
            if(phase>=2){dying.required=true;dying.success.run();}
            if(phase==3){dying.allowed=true;dying.form.complete(null);g.openOptions();}
            int changes=observer.changes;g.destroy();
            if(phase==1){dying.success.run();dying.failure.complete("late");}
            if(phase==2)dying.form.complete(null);
            if(phase==3)dying.options.get(0).complete(null);
            check(!g.canRequestAds() && !g.openOptions() && changes==observer.changes, "Destroyed activity ignores callbacks in phase "+phase);
        }
        System.out.println("PASS: native consent gate, launch update, required form, SDK denial/cached permission, exclusive/repeated options, stale callbacks, failures and destroyed activities");
    }
}
