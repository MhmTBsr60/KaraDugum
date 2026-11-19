# KARA DÜĞÜM — Birleşik Hazine + Beyaz-altın Enerji TEST1

[İmzalı TEST APK indir](https://raw.githubusercontent.com/MhmTBsr60/KaraDugum/64e76b05446e63c968fd2316dae927baf84738bb/test-builds/treasure-energy-test1-20261119/KaraDugum-6.50-TREASURE-ENERGY-TEST1.apk) · [Başarılı test/Android çalıştırması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44490852261)

- Sürüm: **6.50-treasure-energy-test1**, sürüm kodu **110**.
- Paket: `com.orynexa.karadugum`; önceki `6.50-pipe-energy-test2` TEST APK ile aynı imza.
- Dal: `integration/treasure-energy-test-20261119`.
- Test edilen kaynak commit: `810ef0504d2950592da81862d5c6c85550a39b27`.
- APK teslim commit: `64e76b05446e63c968fd2316dae927baf84738bb`.
- APK SHA-256: `b54c5a267f7d780dd6fb704f8ffaef91f64fe867306dde26f4d4b0328df91548`.
- Sertifika SHA-1: `A1:65:1D:CD:D6:56:A9:3D:E4:5C:DC:8B:CC:F0:48:1C:4F:A1:22:4A`.

## Birleştirilen çalışmalar

`2917234` boru içi enerji dalı ile `10d5c86` hazine önizleme dalı yeni entegrasyon dalında çakışmasız birleştirildi. Onaylanan özellik dosyalarının bu commit'lerle birebir eşitliği kontrol edildi. Mevcut 300 bölüm, düğüm/bağlantı geometrileri, kayıt/bulut dosyaları, ses/titreşim, öğretici ve ekonomi kodu korundu.

Hazine ekranı; açılmış sandık, mavi kristaller/altın paralar, bordo-altın şerit, parşömen gövde, siyah-altın ödül paneli ve yatay yedi gün takvimiyle korunur. Gün ve ödül gerçek oyunun kaydından okunur. **`daily-treasure.js`, `daily-treasure.css`, görsel ve çeviriler artık bu oyun APK'sının içindedir.** Gerçek APK'dan çıkarılan dosyalar kaynakla karşılaştırıldı; yalnız önizleme enjeksiyonu kullanılmadı.

Dar beyaz-altın enerji çekirdeği, koyu ayırıcı çizgisi, 1,4 saniyelik bağlantı geçişi, hafif kalıcı altın aydınlatma ve sınırlı sıralı tamamlanma dalgası aynen korunur. Altı tema, Işık İzi açık/kapalı, hareketi azalt ve düşük donanım seçenekleri korunur. Taş dokusu/boru yüzeyi değiştirilmedi; eski dokunma parlaması geri getirilmedi.

## Ödüller ve tekrar alma koruması

| Gün | Kristal | İpucu kuponu |
|---|---:|---:|
| 1 | 5 | 0 |
| 2 | 10 | 0 |
| 3 | 0 | 1 |
| 4 | 15 | 0 |
| 5 | 20 | 0 |
| 6 | 0 | 1 |
| 7 | 40 | 0 |

Yedi günün tamamı eski ödül tablosuyla gerçek oyun işlevleri üzerinden karşılaştırıldı; değişiklik yok. Aynı gün, pencereyi yeniden çizme, ana menüye tekrar giriş ve sayfayı yeniden yükleme ek ödeme yapmıyor. Tekrar giriş testinin verileri yalnız ilk açılışta kurulur; sayfa yenilenirken oyuncu kayıtları yeniden tohumlanmaz.

19 → 20 → 19 → 20 → 21 tarih testinde kristaller **500 → 515 → 515 → 515 → 535**, kuponlar **8 → 8 → 8 → 8 → 8** oldu. Bu kontrol hem APK'dan çıkarılan kodda hem Android WebView'deki paketli uygulamada çalıştırıldı. Tarih geri alma koruması hazine dalındaki hâliyle korunur.

**Sunucu doğrulamalı saat yoktur.** İleri tarih sıçraması veya yerel kayıtların elle düzenlenmesi tamamen engellenemez. Gelecek tarihte alınmış ödülden sonra saat düzeltilirse son ödül tarihine yetişene kadar yeni günlük ödeme açılmayabilir. Tamamen hileye dayanıklı zaman sistemi iddia edilmez.

## Test sonuçları

| Kontrol | Sonuç ve kapsam |
|---|---|
| Onaylanan kaynaklar | İki dalın özellik dosyaları birebir; oyun kuralları/kayıtlar/Native geri bildirim ve üretim iş akışı korunmuş. |
| 300 bölüm | Mevcut 18 kaynak test grubu başarılı; çözümler, gerçek ipuçları, mekanikler ve ekonomik korumalar. |
| Tarayıcı regresyonları | 43 test grubu başarılı; altı tema, kayıt/bulut modelleri, mağaza/ödüller, dil/RTL, 400 obsidyen karşılaştırması ve 1.200 hizalama durumu. |
| Ses/titreşim ve UX | 8 test grubu başarılı; bağımsız tercihler, gerçek WebAudio sinyali ve Native yardımcı birim testleri. Fiziksel hoparlör/motor testi değildir. |
| Öğretici | Yeni/mevcut oyuncu, atlama/tamamlama/tekrar açma; hamle/geri al/kupon/kristal korunması; 25 dil, 204 yerleşim ve 60 tahta karşılaştırması. Gerçek APK içeriğiyle de doğrulandı. |
| Hazine ve günlük ekonomi | APK'nın gerçek dosyalarında 7 günlük ödeme, yeniden açma, çevrimdışı/geri tarih, 25 dilde 300 yerleşim başarılı. |
| Animasyon/performans | Hazine efektleri kısa ve sonlu; düşük donanım/hareketi azalt statik. 7×7/8×8, 1×/4× CPU yavaşlatmalı Chromium'da çizim p95 en çok 3.5 ms, en uzun örnek 7.1 ms. Masaüstü sentetik ölçümdür, telefon FPS değeri değildir. |
| Android derleme | `assembleRelease`, `lintRelease`, `assembleReleaseAndroidTest`; imza, paket, sürüm, AD_ID/VIBRATE ve test reklam birimleri başarılı. AAB oluşturulmadı. |
| Üzerine kurulum | Gerçek eski TEST2 → yeniden açma → `adb install -r` → birleşik APK. Sentetik oyuncunun bulmacası, hamlesi, ilerlemesi, cüzdanı, kuponları, tema sahipliği, tercihleri ve günlük ödül tarih/kayıtları korundu; veri silinmedi. |
| Android WebView | Gerçek paket içinden hazine JS/CSS/WebP yüklendi; Native düğme tıklaması, gün 3/7, küçük ekran ve beş tarih koruması kontrol edildi. Özellik kodu/CSS/görsel dışarıdan değiştirilmedi; test tarih/kayıtları sentetiktir. |
| Enerji görünürlüğü | Android Surface görüntülerinde açık/kapalı, gerçek boru yolu ve beyaz-altın çekirdek ayrımı doğrulandı. Hareket çizimi testinde kapasite ve zaman kontrollüdür; fiziksel POCO akıcılığı kanıtı değildir. |

## Telefona kurulum

1. Eski TEST'te ana menüye dönüp 10 saniye bekleyin.
2. Birleşik APK'yı mevcut TEST2 üzerine kurun. **Oyunu kaldırmayın, verileri temizlemeyin.**
3. Android uygulama bilgilerinde `6.50-treasure-energy-test1` sürümünü doğrulayın.
4. Bugünkü giriş ödülü zaten alındıysa güncelleme yeniden ödül veya pencere açmaz. Hazine penceresi bir sonraki uygun günlük giriş ödülünde görünür. Bu kayıt koruma davranışıdır.
5. Işık İzi açıkken gerçek bir bağlantı oluşturup beyaz-altın hattı gözleyin; kapalıyken ek enerji kaybolmalıdır. Hareketi azalt/düşük donanımda sabit hafif ışık beklenir.

Dar Android emülatörü görüntüsünde üstteki “BAĞLANTI” etiketi iki satıra bölünüyor; tahta ve alt kontroller görünür durumda. Onaylanan arayüzü koruma kapsamında bu mevcut metin yerleşimi değiştirilmedi.

Önceki emülatör denemesinde yazılım GPU kare gönderiminde 8,5 saniyelik gecikme gözlendi. Oyun kodu değiştirilmeden testin gerçek görüntü karesini beklemesi ve sınırlı değerlendirme süresi düzeltildi; son Android kontrolü geçti. Bu donanım/yazılım emülatörü ölçümü fiziksel POCO performansı değildir.

**Test kararlılığı notu:** Bir CI denemesinde günlük pencerenin yeniden açılış kontrolü tekil hata verdi; o anda ödül/kupon değerleri ve günlük tarih kaydı değişmedi. Aynı imzalı APK dosyalarıyla yedi günlük yeniden açılış ve ek 25 adet altıncı gün tekrarı başarılı oldu. Son CI çalıştırmasının geçmesi bu tekil sonucun kök nedeninin kanıtlandığı anlamına gelmez; telefon testinde aynı gün yeniden açılış da kontrol edilmelidir.

**Bu birleşik sürüm fiziksel POCO'da test edilmedi.** Canlı Google hesabı/bulut servisi, gerçek reklam videosu ve fiziksel ses/titreşim bu emülatör/otomatik testlerle doğrulanmış sayılmaz. Eski motor geri alma geçmişini süreçler arasında kalıcı saklamadığından yeniden başlatma sonrası geri alma geçmişi korunması iddia edilmez.

## İncelenebilir kanıtlar

- [APK kimlik ve özet bilgisi](build-info.json), [bağımsız indirme doğrulaması](verified-download.json)
- [Ek yerel yeniden açılış tanılama özeti](reload-stress-check.json)
- [APK hazine/ödül/25 dil testi](treasure-apk-check.json), [hazine animasyon kontrolü](treasure-animation-check.json)
- [Paketli Android hazine ve tarih koruması](android-webview/treasure-runtime-report.json)
- [Android üçüncü gün görüntüsü](android-webview/treasure-day3.png), [yedinci gün görüntüsü](android-webview/treasure-day7.png)
- [APK enerji testi](flow-apk-check.json), [beyaz çekirdek kontrastı](strength-apk-check.json)
- [Android enerji görünürlüğü](android-webview/pipe-flow-report.json), [kontrollü hareket](android-webview/animated-flow-report.json)
- [Eski TEST2 üzerine kurulum](android-webview/upgrade-report.json), [sentetik performans](browser-performance.json)

Main'e birleştirilmedi. Google Play üretim 6.50, AdMob hesabı ve diğer uygulamalar değiştirilmedi. Yalnız Google test reklam birimleri kullanılır. AAB oluşturulmadı/yüklenmedi/yayımlanmadı. Main `0acb75b117e9cb4fee53b316dd7226f97a1e7256`; iki kaynak dalın kullanıcı tarafından belirtilen commit'leri korunmuştur.
