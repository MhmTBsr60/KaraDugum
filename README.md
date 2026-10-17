# KARA DÜĞÜM — Android deneme sürümü
Bu proje çevrimdışı çalışan HTML bulmaca oyununu Android WebView içinde açar.

## GitHub üzerinden APK
1. Bu klasörün **içeriğini** GitHub'da yeni ve tercihen özel (private) bir depoya yükleyin. `.github/workflows/android-apk.yml` dahil tüm dosyalar korunmalı.
2. Actions > Android APK > Run workflow ile derlemeyi başlatın. `main` dalına yükleme de otomatik tetikler.
3. Başarılı derlemenin altında Artifacts > KaraDugum-debug-apk dosyasını indirin, ZIP'i açın ve `app-debug.apk` dosyasını telefona kurun.

Bu sürüm **test için imzalanmış debug APK** üretir; Play Store'a yayımlamak için ayrıca release yapılandırması ve imzalama gerekir. APK'nın başarıyla derlendiği henüz doğrulanmadı.
