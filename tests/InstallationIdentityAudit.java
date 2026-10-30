package com.orynexa.karadugum;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.ArrayList;
import java.util.List;

public final class InstallationIdentityAudit {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        File root = Files.createTempDirectory("kd-installation-audit-").toFile();
        ExecutorService threads = Executors.newFixedThreadPool(8);
        try {
            File original = new File(root, "original/no_backup");
            String first = InstallationIdentity.load(original);
            check(first.matches("d_[a-f0-9]{32}"), "Identity format");
            check(first.equals(InstallationIdentity.load(original)), "Process restart/upgrade keeps identity");
            File restored = new File(root, "restored/no_backup");
            String second = InstallationIdentity.load(restored);
            check(!first.equals(second), "A fresh installation cannot share the previous identity");
            File concurrent = new File(root, "concurrent/no_backup");
            List<Future<String>> tasks = new ArrayList<>();
            for (int i = 0; i < 16; i++) tasks.add(threads.submit(() -> InstallationIdentity.load(concurrent)));
            Set<String> values = new HashSet<>();
            for (Future<String> task : tasks) values.add(task.get());
            check(values.size() == 1 && values.contains(InstallationIdentity.load(concurrent)) && !values.contains(second), "Concurrent initializers share one persisted identity");
            try (FileOutputStream output = new FileOutputStream(new File(original, "installation-id-v1"))) {
                output.write("corrupted".getBytes(StandardCharsets.UTF_8));
            }
            String repaired = InstallationIdentity.load(original);
            check(!first.equals(repaired) && repaired.equals(InstallationIdentity.load(original)), "Corrupt identity repaired durably");
            File blocked = new File(root, "not-a-directory");
            check(blocked.createNewFile(), "Failure fixture");
            try {
                InstallationIdentity.load(blocked);
                throw new AssertionError("Unavailable directory must report failure");
            } catch (IOException expected) { }
            System.out.println("PASS: native installation identity stability, isolation, concurrent loads, corruption repair and write failure");
        } finally {
            threads.shutdownNow();
            try (java.util.stream.Stream<java.nio.file.Path> files = Files.walk(root.toPath())) {
                files.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            }
        }
    }
}
