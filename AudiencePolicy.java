package com.orynexa.karadugum;

/** Process-local age choice; only derived restricted-ad signals go to the ads SDK. */
public final class AudiencePolicy {
    public enum Band { UNKNOWN, UNDER_13, TEEN, ADULT }
    private final Band band;
    private final boolean answered;
    private AudiencePolicy(Band band, boolean answered) { this.band = band; this.answered = answered; }
    public static AudiencePolicy choose(String code) {
        if ("adult".equals(code)) return new AudiencePolicy(Band.ADULT, true);
        if ("under13".equals(code)) return new AudiencePolicy(Band.UNDER_13, true);
        if ("teen".equals(code)) return new AudiencePolicy(Band.TEEN, true);
        if ("unknown".equals(code)) return new AudiencePolicy(Band.UNKNOWN, true);
        return new AudiencePolicy(Band.UNKNOWN, false);
    }
    public Band band() { return band; }
    public boolean allowAds() { return answered; }
    public boolean restrictedAds() { return band != Band.ADULT; }
    public boolean allowInterstitials() { return answered && band == Band.ADULT; }
    public boolean allowOnlineAccounts() { return band == Band.ADULT; }
}
