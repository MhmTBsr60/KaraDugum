package com.orynexa.karadugum;

public final class AdLoadGateAudit {
    private static void check(boolean value, String label) {
        if (!value) throw new AssertionError(label);
    }
    public static void main(String[] args) {
        AdLoadGate video = new AdLoadGate(), transition = new AdLoadGate();
        check(video.canAttempt(1000), "Initial request is allowed");
        video.failed(1000);
        for (int i = 0; i < 30000; i++) check(!video.canAttempt(1000 + i), "Repeated events must not spam requests");
        check(video.canAttempt(31000), "A foreground event can recover after initial failure");
        check(transition.canAttempt(1000), "Ad formats have independent failure state");
        video.failed(31000);
        check(!video.canAttempt(90999) && video.canAttempt(91000), "Second failure backs off for one minute");
        video.failed(91000);
        check(!video.canAttempt(210999) && video.canAttempt(211000), "Repeated failure backs off for two minutes");
        video.failed(211000);
        check(!video.canAttempt(450999) && video.canAttempt(451000), "Fourth failure backs off for four minutes");
        video.failed(451000);
        check(!video.canAttempt(750999) && video.canAttempt(751000), "Retry delay is capped at five minutes");
        video.failed(751000);
        check(!video.canAttempt(1050999) && video.canAttempt(1051000), "Long outage stays capped");
        video.loaded();
        check(video.canAttempt(1051000), "Consumed successful ad can be preloaded immediately");
        video.failed(1051000);
        check(!video.canAttempt(1080999) && video.canAttempt(1081000), "Success resets backoff");
        transition.failed(1100000);
        check(video.canAttempt(1100000) && !transition.canAttempt(1100000), "Independent formats recover separately");
        System.out.println("PASS: event-driven ad load recovery, repeated-event throttling, exponential/capped delay and success reset");
    }
}
