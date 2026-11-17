package com.orynexa.karadugum;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.media.AudioAttributes;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;

/** One bounded native pulse, respecting the user's system touch preference. */
final class HapticFeedbackPlayer {
    private final Context context;
    private final Vibrator vibrator;
    HapticFeedbackPlayer(Context context) {
        this.context = context;
        Vibrator motor = null;
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (manager != null) motor = manager.getDefaultVibrator();
            }
            if (motor == null) motor = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        } catch (RuntimeException ignored) { }
        vibrator = motor;
    }
    boolean available() { try { return vibrator != null && vibrator.hasVibrator(); } catch (RuntimeException failure) { return false; } }
    String play(String kind) {
        if (!UiFeedbackGate.known(kind) || !available()) return "unavailable";
        if (context.checkSelfPermission(Manifest.permission.VIBRATE) != PackageManager.PERMISSION_GRANTED) return "permission";
        long duration = "wheelTick".equals(kind) ? 7 : "tap".equals(kind) || "ui".equals(kind) ? 12
            : "win".equals(kind) || "reward".equals(kind) ? 32 : 24;
        int amplitude = duration <= 12 ? 45 : 65;
        try {
            if (Settings.System.getInt(context.getContentResolver(), Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 0) return "blocked";
            AudioAttributes attributes = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            if (Build.VERSION.SDK_INT >= 26) {
                VibrationEffect effect = Build.VERSION.SDK_INT >= 29
                    ? VibrationEffect.createPredefined(duration <= 12 ? VibrationEffect.EFFECT_TICK : VibrationEffect.EFFECT_CLICK)
                    : VibrationEffect.createOneShot(duration, vibrator.hasAmplitudeControl() ? amplitude : VibrationEffect.DEFAULT_AMPLITUDE);
                vibrator.vibrate(effect, attributes);
            } else vibrator.vibrate(duration, attributes);
            return null;
        } catch (SecurityException denied) { return "permission"; }
        catch (RuntimeException failure) { return "unavailable"; }
    }
    void cancel() { try { if (vibrator != null) vibrator.cancel(); } catch (RuntimeException ignored) { } }
}
