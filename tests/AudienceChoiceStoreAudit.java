package com.orynexa.karadugum;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public final class AudienceChoiceStoreAudit {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void pending(AudiencePolicy policy, String message) {
        check(!policy.allowAds() && policy.restrictedAds() && !policy.allowInterstitials()
            && !policy.allowOnlineAccounts(), message);
    }

    private static final class MemoryStore implements AudienceChoiceStore.Store {
        String value;
        boolean readFailure, writeFailure, ignoreWrite, declineWrite;
        int writes;
        @Override public String read() throws IOException {
            if (readFailure) throw new IOException("Read fixture");
            return value;
        }
        @Override public boolean write(String next) throws IOException {
            writes++;
            if (writeFailure) throw new IOException("Write fixture");
            if (declineWrite) return false;
            if (!ignoreWrite) value = next;
            return true;
        }
    }

    public static void main(String[] args) throws Exception {
        File root = Files.createTempDirectory("kd-audience-choice-audit-").toFile();
        try {
            File original = new File(root, "original/no_backup");
            AudienceChoiceStore first = new AudienceChoiceStore(original);
            pending(first.load(), "A fresh install must show the age screen before any SDK/account request");
            check(!original.exists(), "Reading an unanswered choice must not create a record");
            for (String code : new String[]{"under13", "teen", "adult", "unknown"}) {
                check(first.save(code), "Explicit selection commits: " + code);
                AudiencePolicy restored = new AudienceChoiceStore(original).load();
                AudiencePolicy expected = AudiencePolicy.choose(code);
                check(restored.allowAds() && restored.band() == expected.band(), "New process restores exact chosen band: " + code);
                check(restored.restrictedAds() == expected.restrictedAds()
                    && restored.allowInterstitials() == expected.allowInterstitials()
                    && restored.allowOnlineAccounts() == expected.allowOnlineAccounts(), "Restored restrictions preserved: " + code);
                String persisted = new String(Files.readAllBytes(new File(original, "audience-choice-v1").toPath()), StandardCharsets.UTF_8);
                check(persisted.equals("kd-audience-v1|" + code), "Persist only schema version and band, with no date/account/identifier");
            }
            check(first.load().band() == AudiencePolicy.Band.UNKNOWN && first.load().allowAds(), "An explicit unstated choice is distinct from no answer");
            for (String invalid : new String[]{null, "", "ADULT", "18", "adult\n", " adult", "under18"}) {
                check(!first.save(invalid), "Reject non-choice input: " + invalid);
                check(first.load().band() == AudiencePolicy.Band.UNKNOWN && first.load().allowAds(), "Rejected input cannot overwrite prior choice");
            }
            pending(new AudienceChoiceStore(new File(root, "restored/no_backup")).load(), "Another installation/device starts unanswered; no shared cloud choice");
            File record = new File(original, "audience-choice-v1");
            for (String invalid : new String[]{"", "adult", "kd-audience-v2|adult", "kd-audience-v1|ADULT", "kd-audience-v1|adult\n",
                    " kd-audience-v1|adult", "kd-audience-v1|", "kd-audience-v1|adult|under13", "kd-audience-v1|adult\u0000",
                    "kd-audience-v1|adult" + new String(new char[80]).replace('\0', 'x')}) {
                try (FileOutputStream output = new FileOutputStream(record)) {
                    output.write(invalid.getBytes(StandardCharsets.UTF_8));
                }
                pending(new AudienceChoiceStore(original).load(), "Corrupt/unsupported/oversized record cannot restore adult eligibility");
            }
            check(first.save("under13"), "Explicit child choice repairs a corrupt record");
            check(new AudienceChoiceStore(original).load().band() == AudiencePolicy.Band.UNDER_13, "Repair remains child on later launch, with no calendar-based promotion");
            File blocked = new File(root, "not-a-directory");
            check(blocked.createNewFile(), "Unavailable directory fixture");
            check(!new AudienceChoiceStore(blocked).save("adult"), "Unavailable directory reports failed persistence");
            pending(new AudienceChoiceStore(blocked).load(), "Unavailable directory cannot imply an answer");
            File blockedRecordDir = new File(root, "blocked-record/no_backup");
            File blockedRecord = new File(blockedRecordDir, "audience-choice-v1");
            check(blockedRecord.mkdirs() && new File(blockedRecord, "keep").createNewFile(), "Atomic rename failure fixture");
            check(!new AudienceChoiceStore(blockedRecordDir).save("adult"), "Failed atomic commit cannot report persistence");
            check(blockedRecordDir.listFiles().length == 1, "Failed commit cleans temporary records");
            MemoryStore memory = new MemoryStore();
            AudienceChoiceStore store = new AudienceChoiceStore(memory);
            check(store.save("under13"), "Baseline durable restricted choice");
            memory.writeFailure = true;
            check(!store.save("adult"), "Write exception is reported");
            check(new AudienceChoiceStore(memory).load().band() == AudiencePolicy.Band.UNDER_13, "Failed write preserves previous durable restricted choice");
            memory.writeFailure = false; memory.ignoreWrite = true;
            check(!store.save("adult"), "A silently ignored write is detected by readback");
            memory.ignoreWrite = false; memory.declineWrite = true;
            check(!store.save("adult"), "A declined write is not persisted");
            memory.readFailure = true;
            pending(store.load(), "Read failure must ask again rather than assume adult");
            pending(new AudienceChoiceStore(new AudienceChoiceStore.Store() {
                @Override public String read() { throw new IllegalStateException("Unavailable storage"); }
                @Override public boolean write(String value) { throw new IllegalStateException("Unavailable storage"); }
            }).load(), "Runtime storage failures are conservative too");
            check(!new AudienceChoiceStore(new AudienceChoiceStore.Store() {
                @Override public String read() { return null; }
                @Override public boolean write(String value) { throw new IllegalStateException("Unavailable storage"); }
            }).save("adult"), "Runtime save failure cannot report persistence");
            System.out.println("PASS: explicit age choices survive process restart without DOB/account data, no-backup isolation, corrupt/read-failed records require a new answer, exact restrictions and atomic write/failure/readback safety");
        } finally {
            try (java.util.stream.Stream<java.nio.file.Path> files = Files.walk(root.toPath())) {
                files.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            }
        }
    }
}
