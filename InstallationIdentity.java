package com.orynexa.karadugum;

import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Random installation identity kept outside Android Auto Backup. No hardware identifier. */
public final class InstallationIdentity {
    private InstallationIdentity() {}

    public static String fresh() {
        return "d_" + UUID.randomUUID().toString().replace("-", "");
    }

    public static synchronized String load(File noBackupDirectory) throws IOException {
        if (!noBackupDirectory.isDirectory() && !noBackupDirectory.mkdirs()) {
            throw new IOException("Installation identity directory unavailable");
        }
        File record = new File(noBackupDirectory, "installation-id-v1");
        if (record.isFile() && record.length() <= 80) {
            byte[] bytes = new byte[(int) record.length()];
            try (DataInputStream input = new DataInputStream(new FileInputStream(record))) {
                input.readFully(bytes);
            }
            String existing = new String(bytes, StandardCharsets.UTF_8).trim();
            if (existing.matches("d_[a-f0-9]{32}")) return existing;
        }
        String next = fresh();
        File temporary = File.createTempFile("installation-id-", ".tmp", noBackupDirectory);
        try {
            try (FileOutputStream output = new FileOutputStream(temporary)) {
                output.write(next.getBytes(StandardCharsets.UTF_8));
                output.getFD().sync();
            }
            if (!temporary.renameTo(record)) throw new IOException("Installation identity commit failed");
        } finally {
            if (temporary.exists()) temporary.delete();
        }
        return next;
    }
}
