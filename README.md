# KARA DÜĞÜM — Android

KARA DÜĞÜM, 300 bölümlük HTML/WebView tabanlı Android bulmaca oyunudur.

## Android APK ve AAB derlemesi

- GitHub Actions > **KaraDugum Android APK** > **Run workflow** ile derleme başlatılır. `main` dalına gönderilen değişiklikler de derlemeyi tetikler.
- Aktif iş akışı: `.github/workflows/android-apk.yml`.
- Paket adı: `com.orynexa.karadugum`.
- Sürüm: `6.7` (versionCode `67`).
- Başarılı çalışmanın **Artifacts** bölümünden `KaraDugum-v6.7-APK-AAB` arşivi indirilir. Arşiv imzalı release APK ve Google Play için AAB içerir.
- Derleme için GitHub Secrets içinde `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` gereklidir. Gizli anahtarları depoya eklemeyin.

Kök dizindeki `android-apk.yml` ve iç içe `.github/workflows/.github/workflows/android-apk.yml` aktif iş akışı değildir; derlemeler için yalnızca yukarıdaki aktif dosyayı düzenleyin.

Not: Başarılı derleme, oyun içi bütün işlevlerin cihazda hatasız çalıştığını tek başına kanıtlamaz.
