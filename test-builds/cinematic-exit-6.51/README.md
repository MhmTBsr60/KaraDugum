# KARA DÜĞÜM 6.51 RC3 TEST

6.51 RC2 (`0b87c78`) temel alındı. Sürüm adı `6.51-rc3-test`, sürüm kodu **113**. Paket `com.orynexa.karadugum`. APK, RC2 TEST ile aynı sertifika ve Google’ın örnek reklam birimlerini kullanıyor.

[İmzalı TEST APK](KaraDugum-6.51-RC3-TEST.apk) · [SHA-256](SHA256SUMS) · [Sertifika parmak izi](signer-sha256.txt) · [Android derleme ve test koşusu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44722282946)

## Çıkış penceresi

Kalenin üst görseli, ana menüde kullanılan mevcut dosyadan kırpıldı. Karartılmış menünün üstünde altın çerçeve, KARA DÜĞÜM başlığı, koyu VAZGEÇ düğmesi, altın ÇIKIŞ düğmesi ve X bulunuyor. Dar ekranlarda simgeler etiketlerin üstüne geçiyor. Arapça, Urduca ve Farsçada metin yönü sağdan sola, VAZGEÇ solda ve ÇIKIŞ sağda.

Android geri tuşu veya kenar hareketi ana menüde onayı açar. İkinci geri, VAZGEÇ ve X onayı kapatır. ÇIKIŞ, aktif bulmaca kaydı ve yerel Geri Al geçmişi kaydedildikten sonra Android’in normal Activity kapanışını kullanır. Kaydetme başarısız olursa oyuncu oyunda kalır ve yeniden deneyebilir. Geri Al geçmişi aynı oyuncu ve bulmaca için yerel olarak geri yüklenir. Mevcut bulut kayıt biçimi kullanılır.

[Android 35 ekran görüntüsü](exit-dialog-android.png)

## Test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| Android 35 WebView | Sistem geri tuşu, emülatörde kenardan geri hareketi, ikinci geri, VAZGEÇ, X ve ÇIKIŞ geçti. Oyun içindeki geri önce ana menüye döndü. [Android işlem kanıtı](exit-android-actions.json) |
| Küçük ve büyük ekran | 640×1136 ve 1080×2160 Android ekranlarında pencere ekrana sığdı. WebView genişlikleri 244 ve 412 CSS pikseliydi. 44 CSS piksel veya daha büyük düğmeler ve tek satır VAZGEÇ, WebView yerleşim ölçümleriyle doğrulandı. [Dar ekran ölçümü](exit-viewport-244.json) · [Geniş ekran ölçümü](exit-viewport-412.json) |
| 25 dil | Beş ekran boyutunda 125 Chromium yerleşimi geçti. Etiketlerde kesilme ve kelime bölünmesi görülmedi. Arapça, Urduca ve Farsçada RTL kontrol edildi. [Kaynak dosyalarla yerleşim matrisi](exit-browser-report.json) · [APK içeriğiyle aynı test](packaged-exit-report.json) |
| Kurulum ve yeniden açılış | RC2 TEST üzerine veri silmeden kurulum geçti. Çıkıştan sonra ayrı süreçte aktif tahta, hamleler, ilerleme, kristaller, kuponlar, altı tema hakkı ve tercihler korundu. Geri Al düğmesi önceki hamleyi gerçekten geri aldı. [Kurulum](upgrade-report.json) · [Çıkış sonrası](exit-restart-report.json) |
| 300 bölüm ve altı tema | 300 bölüm yasal oyun hamleleriyle tamamlandı. Altı temada toplam 1.800 oyun tahtası kontrol edildi. [Çekirdek testler](core.log) · [Tarayıcı regresyonları](browser.log) |
| Kayıt, ekonomi ve RC2 özellikleri | Yerel kayıt ve bulut modeli senaryoları, satın alma onayı, tema hakkı, Hazine günlük ödülünün yeniden ödenmemesi ve öğretici geçti. Işık İzi bileşenlerinin kaynak dosyaları RC2 ile eşleşti. [Satın alma](purchase.log) · [Günlük ödül](login-recovery.json) · [Öğretici](tutorial.log) |
| Ses ve titreşim | Bağımsız tercihler, kısa seslerin tarayıcıda üretilmesi ve Android titreşim köprüsünün otomatik kontrolleri geçti. [UX regresyonları](ux.log) |
| Android paketi | Release APK derlemesi, lint, RC2 imzasıyla karşılaştırma ve imza doğrulaması geçti. APK kaynak dosyaları ve örnek reklam birimleri denetlendi. [Paket içeriği](test-assets.json) |

Fiziksel POCO testi, gerçek hoparlör ve titreşim motoru ölçümü ve canlı Google Play Games hesabıyla eşitleme bu koşuda yapılmadı. Android etkileşimi API 35 emülatöründe, bulut senaryoları yerel doğrulama ve örnek hesaplarla çalıştırıldı. RC2’den yükseltme geçmiş sürümün kaydetmediği Geri Al hamlelerini geri getiremez. RC3’te onaylı çıkıştan sonraki Geri Al ayrı olarak doğrulandı.

Teslim `feat/cinematic-exit-6.51` geliştirme dalında. [APK kaynak commit’i](source-commit.txt)
