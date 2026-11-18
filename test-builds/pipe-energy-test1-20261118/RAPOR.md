# KARA DÜĞÜM — Güçlendirilmiş Boru Enerjisi TEST1

[TEST APK indir](https://raw.githubusercontent.com/MhmTBsr60/KaraDugum/38e0cb5e7461595407bd17c0b35d9b748a011220/test-builds/pipe-energy-test1-20261118/KaraDugum-6.50-PIPE-ENERGY-TEST1.apk) · [Başarılı Android/test çalıştırması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44422846590)

- Sürüm: **6.50-pipe-energy-test1**, kod **110**.
- Paket: `com.orynexa.karadugum`; önceki LIGHT-VISIBILITY-TEST2 TEST APK ile aynı sertifika.
- Dal: `design/pipe-energy-strong-test-20261118`; temel `41aef50`.
- Test edilen kaynak commit: `06ecfcf20f2a527b645cf27c8f76a37614c80631`.
- APK teslim commit: `38e0cb5e7461595407bd17c0b35d9b748a011220`.
- APK SHA-256: `ec9884ee961a7461de1f241156fba001428a2b5389de416e5c6d35032e8e9649`.
- İmza SHA-1: `A1:65:1D:CD:D6:56:A9:3D:E4:5C:DC:8B:CC:F0:48:1C:4F:A1:22:4A`.

## Değişiklikler

Altın çevre çizgisi ve açık renk çekirdek güçlendirildi. Hareketli enerji, gerçek karşılıklı bağlantının iç hattında hızlanıp yavaşlayan bir iz olarak ilerler. Önceki kesikli çizgi yerine aynı boru yolundan örneklenen kesintisiz kuyruk kullanılır. Bağlı borular hafif aydınlık kalır. Bağlantı kopunca değişmeyen komşu 180 ms içinde söner; dönen parçanın eski çizgisi hemen kaldırılır. Yanlış/açık uçlara yeni enerji çizilmez. Bölüm tamamlanınca motorun tamamlanma durumundan gelen sıralı dalga daha güçlü çekirdek kullanır; azami süre 2,2 saniyedir.

Taş dokusunun üstüne taşan kutu parlaması, blur ve parçacık eklenmedi. Eski dokunma parlamasına dönülmedi; Canvas desteklenmese bile eski sistem açılmaz. Işık İzi kapatılınca enerji Canvas'ı kaldırılır. Hareketi azalt/düşük donanım yolunda animasyon yerine hafif sabit bağlantı aydınlatması vardır. Ayarın yeni açıklaması 25 dilde sağlanır.

Aynı bölüm, hamle ve 400 ms anındaki yeni bağlantı ışığı önceki kaynakla altı temada karşılaştırıldı. Alfa ağırlıklı ışık artışı yaklaşık %32–37; bu bir telefon ekranı nits/parlaklık ölçümü değildir. Boru dışına taşma piksel maskesiyle kontrol edildi.

Ana oyun kapanışı, düğüm/bağlantı geometrileri, 300 bölüm, kayıt ve bulut kodu, ses/titreşim, öğretici, ipucu/kristal/ödül ekonomisi ve üretim reklam yapılandırması korunur. Paket ve imza kimliği değiştirilmedi. TEST derlemesinde yalnız Google test reklam birimleri kullanılır; AdMob hesabına işlem yapılmadı.

## Doğrulamalar

| Kontrol | Sonuç / kapsam |
|---|---|
| Mevcut kaynak testleri | 18 test grubu; 300 bölüm çözümü, geçerli ipuçları, mekanikler, kayıt/bulut ve ekonomi korumaları başarılı. |
| Tarayıcı regresyonu | 43 test grubu başarılı; tema/oyun/mağaza/reklam/ilerleme, dil/RTL, 400 obsidyen karşılaştırması ve 1.200 hizalama durumu. |
| Ses/titreşim ve UX | 8 test grubu başarılı; bağımsız tercihler, gerçek Chromium WebAudio sinyali, native yardımcı birim testleri. Fiziksel hoparlör/motor doğrulaması değildir. |
| Öğretici | İlk oyuncu/mevcut oyuncu/atla/tamamla/yeniden aç/hamle/geri al/ekonomi; 25 dil, 204 yerleşim ve 60 tahta boyutu karşılaştırması başarılı. |
| Boru enerjisi | 300 bölümde 7566 gerçek eşleşen bağlantı; gerçek tıklama ile bağlama/koparma/geri alma; açık/kapalı; altı tema; dar/geniş ekranlar, hareket azalt/düşük donanım ve sonlu tamamlanma dalgası başarılı. |
| APK içeriği | İmzalı APK'dan çıkarılan gerçek enerji ve öğretici dosyalarıyla testler başarılı; dosyalar kaynakla byte düzeyinde eşleştirildi. |
| Android derleme/lint/imza | assembleRelease, lintRelease ve APK imza/paket/test reklam denetimleri başarılı; yalnız APK oluşturuldu. |
| Üzerine kurulum | Android 35 emülatörde eski imzalı TEST → yeniden aç → `adb install -r` → yeni TEST. Sentetik oyuncunun bulmacası, hamlesi, ilerlemesi, cüzdanı, ipuçları, tema sahipliği ve tercihleri korundu; veri temizlenmedi. |
| Android görünürlük | Gerçek Android WebView/Surface görüntülerinde açık/kapalı/açık sabit ışık farkı ve altı tema kontrol edildi. Hareketli yol testi kapasite değerlerini 8 olarak benzetir ve zamanı 200/420/640 ms'ye kontrollü ilerletir. Gerçek Surface piksellerinde ışığın boru içinde ilerlemesi ölçülür: 129.8 piksel. Bu test telefon FPS/akıcılık kanıtı değildir. |
| Performans | Chromium'da 7×7/8×8, 1×/4× CPU yavaşlatma: Canvas çizim p95 en çok 5,5 ms. Düşük donanım yolunda boşta sürekli animasyon yok. Sentetik masaüstü ölçümüdür. |

## Telefon testi ve kalan sınırlar

**Fiziksel POCO testi yapılmadı. Telefonda görünürlük ve akıcılık doğrulanmadan “sorun kesin çözüldü” denmiyor.** Yazılım GPU'lu emülatörün gerçek zamanlı 900 ms video kaydı yeterli kare üretmedi; native hareket çizimi bu nedenle kontrollü zamanlı Surface görüntüleriyle sınandı. Gerçek telefon performansı ayrıca denenmeli.

Oyunda ana menüye dönüp 10 saniye bekleyin; APK'yı mevcut TEST'in üzerine kurun. **Oyunu kaldırmayın, verilerini temizlemeyin.** Android uygulama bilgilerinde sürümü doğrulayın. Ayarlar → Işık İzi açıkken iki boru ucunu karşılıklı bağlayın; yalnız düğümü döndürmek enerji üretmez. Kapalıyken ek enerji tamamen kaybolmalı. Hareketi azalt/düşük donanım yolunda hareket yerine sabit hafif aydınlatma beklenir.

Eski WebView son hamleyi diske gecikmeli yazabildiği için güncelleme senaryosu önce eski uygulamada ayrı süreçte kaydın kalıcılığını doğrular. Kayıt motoruna değişiklik yapılmadı. Mevcut motor geri alma geçmişini süreçler arasında kalıcı saklamadığından güncelleme testi yeniden başlatmadan sonra geri alma geçmişinin korunmasını iddia etmez.

Tamamlanma anındaki mevcut sonuç paneli bazı boruları örtebilir; ödül/kayıt/panel zamanlaması değiştirilmedi. Gerçek reklam izleme, Google hesabı/bulut sunucusu ve fiziksel ses/titreşim bu emülatör testiyle doğrulanmış sayılmaz.

**Main'e birleştirilmedi. Google Play 6.50, AdMob hesabı ve mağaza görselleri değiştirilmedi. AAB oluşturulmadı, yüklenmedi, yayımlanmadı.** Main `0acb75b117e9cb4fee53b316dd7226f97a1e7256` olarak kaldı.

## İncelenebilir kanıtlar

- [APK kimlik/özet bilgisi](build-info.json)
- [APK enerji testi](flow-apk-check.json) ve [güçlendirme karşılaştırması](strength-apk-check.json)
- [APK öğretici testi](apk-tutorial-check.json)
- [Android açık/kapalı piksel testi](android-webview/pipe-flow-report.json)
- [Android kontrollü hareket testi](android-webview/animated-flow-report.json)
- [Üzerine kurulum/kayıt koruma](android-webview/upgrade-report.json)
- [Yerel sentetik performans](browser-performance.json)
- [Bağımsız son indirme doğrulaması](verified-download.json)

Değişen ürün dosyaları: `pipe-flow.js`, `light-feedback.js`, `index.html` (yalnız ayar açıklaması), `localization.js`. Diğer değişiklikler APK teslim iş akışı, testler, doğrulama betikleri ve bu rapordur.
