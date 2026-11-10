package com.orynexa.karadugum;

/** A coarse, process-local choice. No birth date or age is saved or sent. */
public final class AudiencePolicy {
    public enum Band { UNKNOWN, UNDER_13, TEEN, ADULT }
    private final Band band;
    private AudiencePolicy(Band band) { this.band = band; }
    public static AudiencePolicy choose(String code) {
        if ("adult".equals(code)) return new AudiencePolicy(Band.ADULT);
        if ("under13".equals(code)) return new AudiencePolicy(Band.UNDER_13);
        if ("teen".equals(code)) return new AudiencePolicy(Band.TEEN);
        return new AudiencePolicy(Band.UNKNOWN);
    }
    public Band band() { return band; }
    public boolean allowAds() { return band == Band.ADULT; }
    public boolean allowOnlineAccounts() { return band == Band.ADULT; }
}
