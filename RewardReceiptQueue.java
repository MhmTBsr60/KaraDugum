package com.orynexa.karadugum;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/** Serializes earned receipts before handing them to the WebView for settlement. */
final class RewardReceiptQueue {
    private static final Pattern PURPOSE = Pattern.compile("(double|coins|hint):[a-zA-Z0-9_-]{1,100}");

    interface Store {
        boolean record(String purpose, String owner);
        Map<String, String> pending();
        void acknowledge(String purpose);
    }

    private final Store store;
    private final Map<String, String> waiting = new LinkedHashMap<>();

    RewardReceiptQueue(Store store) {
        this.store = store;
    }

    static boolean isTracked(String purpose) {
        return purpose != null && PURPOSE.matcher(purpose).matches();
    }

    void earn(String purpose, String owner) {
        waiting.putIfAbsent(purpose, owner == null ? "" : owner);
    }

    boolean flush() {
        waiting.entrySet().removeIf(entry -> store.record(entry.getKey(), entry.getValue()));
        return !waiting.isEmpty();
    }

    Map<String, String> ready() {
        Map<String, String> persisted = store.pending();
        // SharedPreferences updates its in-memory map even when commit() fails.
        persisted.keySet().removeAll(waiting.keySet());
        return persisted;
    }

    void discardWaiting(String owner) {
        waiting.values().removeIf(owner::equals);
    }

    void acknowledge(String purpose) {
        if (!waiting.containsKey(purpose)) store.acknowledge(purpose);
    }
}
