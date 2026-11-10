package com.orynexa.karadugum;

public final class AudiencePolicyAudit {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        for (String input : new String[]{null, "", "unknown", "under13", "teen", "18", "ADULT", "adult<script>"}) {
            AudiencePolicy policy = AudiencePolicy.choose(input);
            check(!policy.allowAds(), "Child/teen/unknown must not request ads: " + input);
            check(!policy.allowOnlineAccounts(), "Child/teen/unknown must not exchange account data: " + input);
        }
        AudiencePolicy adult = AudiencePolicy.choose("adult");
        check(adult.allowAds() && adult.allowOnlineAccounts(), "Adult retains optional online features (consent remains separately required)");
        check(AudiencePolicy.choose("under13").band() == AudiencePolicy.Band.UNDER_13, "Child choice");
        check(AudiencePolicy.choose("teen").band() == AudiencePolicy.Band.TEEN, "Teen choice");
        check(AudiencePolicy.choose(null).band() == AudiencePolicy.Band.UNKNOWN, "Safe unknown");
        check(adult.allowAds(), "Another choice must not mutate an existing immutable policy");
        System.out.println("PASS: child/teen/unknown fail closed for ads and account data; adult eligibility is explicit and immutable; no birth-date persistence");
    }
}
