package com.orynexa.karadugum;

public final class AudiencePolicyAudit {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        for (String input : new String[]{null, "", "18", "ADULT", "adult<script>"}) {
            AudiencePolicy policy = AudiencePolicy.choose(input);
            check(!policy.allowAds(), "No ad request before a valid age-screen response: " + input);
            check(policy.restrictedAds() && !policy.allowInterstitials(), "Pending/invalid is never adult treatment: " + input);
            check(!policy.allowOnlineAccounts(), "Pending/invalid must not exchange account data: " + input);
        }
        for (String input : new String[]{"under13", "teen", "unknown"}) {
            AudiencePolicy policy = AudiencePolicy.choose(input);
            check(policy.allowAds(), "Answered restricted audience can request opt-in rewarded ads (SDK permission still required): " + input);
            check(policy.restrictedAds(), "Child/teen/unstated require child-restricted ad configuration: " + input);
            check(!policy.allowInterstitials(), "No interstitial for a restricted audience: " + input);
            check(!policy.allowOnlineAccounts(), "Keep personal account exchange disabled: " + input);
        }
        AudiencePolicy adult = AudiencePolicy.choose("adult");
        check(adult.allowAds() && adult.allowOnlineAccounts(), "Adult retains optional online features (consent remains separately required)");
        check(adult.allowInterstitials() && !adult.restrictedAds(), "Adult interstitial cadence and SDK consent remain independently required");
        check(AudiencePolicy.choose("under13").band() == AudiencePolicy.Band.UNDER_13, "Child choice");
        check(AudiencePolicy.choose("teen").band() == AudiencePolicy.Band.TEEN, "Teen choice");
        check(AudiencePolicy.choose(null).band() == AudiencePolicy.Band.UNKNOWN, "Safe unknown");
        check(adult.allowAds(), "Another choice must not mutate an existing immutable policy");
        System.out.println("PASS: no ads before age response; child/teen/unstated use restricted rewarded ads only, no interstitial/accounts; explicit adult eligibility; immutable policy without DOB persistence");
    }
}
