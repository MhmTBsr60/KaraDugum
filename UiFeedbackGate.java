package com.orynexa.karadugum;

/** Pure eligibility/rate gate; Android performs its own system haptic checks as well. */
final class UiFeedbackGate {
    private boolean used;
    private long lastAt;
    boolean allow(String kind, boolean enabled, boolean foreground, boolean visible,
                  boolean quiet, boolean hardware, long now) {
        if (!enabled || !foreground || !visible || quiet || !hardware || !known(kind)) return false;
        if (used && (now < lastAt || now - lastAt < ("wheelTick".equals(kind) ? 28 : 65))) return false;
        used = true;
        lastAt = now;
        return true;
    }
    static boolean known(String kind) {
        return "wheelTick".equals(kind) || "tap".equals(kind) || "ui".equals(kind) || "lock".equals(kind)
            || "undo".equals(kind) || "chain".equals(kind) || "win".equals(kind)
            || "fail".equals(kind) || "wheel".equals(kind) || "reward".equals(kind)
            || "empty".equals(kind) || "confirm".equals(kind);
    }
}
