package com.orynexa.karadugum;

public final class InterstitialCadenceAudit {
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    public static void main(String[] args) {
        InterstitialCadence cadence = new InterstitialCadence(1000);
        for(int level:new int[]{-1,0,1,2,301})cadence.transitioned(level);
        check(!cadence.eligible(999999), "Invalid/introductory levels do not trigger an ad");
        cadence.transitioned(3);cadence.transitioned(4);
        check(!cadence.eligible(999999), "At least three normal transitions are required");
        cadence.transitioned(5);
        check(!cadence.eligible(120999) && cadence.eligible(121000), "First two session minutes are ad-free");
        check(cadence.eligible(121500), "An unavailable ad does not consume the eligible opportunity");
        cadence.fullScreenShown(122000);
        for(int i=0;i<300;i++)cadence.transitioned(17);
        check(!cadence.eligible(121000) && !cadence.eligible(241999) && cadence.eligible(242000), "Shown ad resets count and monotonic cooldown");
        cadence.fullScreenShown(243000); // a completed/cancelled rewarded video also resets the cooldown
        cadence.transitioned(18);cadence.transitioned(19);
        check(!cadence.eligible(999999), "Rewarded video also requires fresh transitions before a forced ad");
        cadence.transitioned(20);check(cadence.eligible(363000), "Both cooldown and transitions must pass");
        System.out.println("PASS: native interstitial cadence, intro protection, three normal transitions, two-minute monotonic cooldown, unavailable ad and rewarded-video spacing");
    }
}
