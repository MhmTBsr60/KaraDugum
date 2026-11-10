package com.orynexa.karadugum;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Remembers only an explicit age-band choice, locally and outside Android Auto Backup. */
public final class AudienceChoiceStore {
    private static final String PREFIX = "kd-audience-v1|";
    private static final int MAX_RECORD_BYTES = 64;
    private final Store store;

    public interface Store {
        String read() throws IOException;
        boolean write(String value) throws IOException;
    }

    public AudienceChoiceStore(File noBackupDirectory) {
        this(new FileStore(noBackupDirectory));
    }

    public AudienceChoiceStore(Store store) {
        if (store == null) throw new IllegalArgumentException("Audience choice store required");
        this.store = store;
    }

    /** Missing, unreadable, corrupt or unsupported records always require a new answer. */
    public synchronized AudiencePolicy load() {
        try {
            String record = store.read();
            if (record == null || record.length() > MAX_RECORD_BYTES || !record.startsWith(PREFIX)) {
                return AudiencePolicy.choose(null);
            }
            String code = record.substring(PREFIX.length());
            return AudiencePolicy.choose(isExplicitChoice(code) ? code : null);
        } catch (IOException | RuntimeException error) {
            return AudiencePolicy.choose(null);
        }
    }

    /** Call only for an explicit selection; cancelling the dialog must stay session-local. */
    public synchronized boolean save(String code) {
        if (!isExplicitChoice(code)) return false;
        String record = PREFIX + code;
        try {
            return store.write(record) && record.equals(store.read());
        } catch (IOException | RuntimeException error) {
            return false;
        }
    }

    private static boolean isExplicitChoice(String code) {
        return "under13".equals(code) || "teen".equals(code)
            || "adult".equals(code) || "unknown".equals(code);
    }

    private static final class FileStore implements Store {
        private final File directory;
        private final File record;

        FileStore(File directory) {
            if (directory == null) throw new IllegalArgumentException("No-backup directory required");
            this.directory = directory;
            this.record = new File(directory, "audience-choice-v1");
        }

        @Override public String read() throws IOException {
            if (!record.isFile()) return null;
            byte[] bytes = new byte[MAX_RECORD_BYTES + 1];
            int count = 0;
            try (FileInputStream input = new FileInputStream(record)) {
                int amount;
                while (count < bytes.length && (amount = input.read(bytes, count, bytes.length - count)) != -1) {
                    count += amount;
                }
            }
            if (count > MAX_RECORD_BYTES) return null;
            return new String(bytes, 0, count, StandardCharsets.UTF_8);
        }

        @Override public boolean write(String value) throws IOException {
            if (!directory.isDirectory() && !directory.mkdirs()) {
                throw new IOException("Audience choice directory unavailable");
            }
            File temporary = File.createTempFile("audience-choice-", ".tmp", directory);
            try {
                try (FileOutputStream output = new FileOutputStream(temporary)) {
                    output.write(value.getBytes(StandardCharsets.UTF_8));
                    output.getFD().sync();
                }
                if (!temporary.renameTo(record)) throw new IOException("Audience choice commit failed");
                return true;
            } finally {
                if (temporary.exists()) temporary.delete();
            }
        }
    }
}
