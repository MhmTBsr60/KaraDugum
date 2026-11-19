# KARA DÜĞÜM — Beyaz-altın boru enerjisi TEST2

[TEST APK indir](https://raw.githubusercontent.com/MhmTBsr60/KaraDugum/d86878a090f878dbe5c69587a884c37feca33b3a/test-builds/pipe-energy-test2-20261119/KaraDugum-6.50-PIPE-ENERGY-TEST2.apk) · [Başarılı test/Android çalıştırması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44466926216)

Sürüm **6.50-pipe-energy-test2**, sürüm kodu **110**. Paket `com.orynexa.karadugum`. TEST1 ile aynı imza: `A1:65:1D:CD:D6:56:A9:3D:E4:5C:DC:8B:CC:F0:48:1C:4F:A1:22:4A`.

Dal `design/pipe-energy-contrast-test-20261119`, temel `f18a62f` (TEST1). Test edilen kod `09ad0c3c8d1074649d133c66aa8c7b9fbd7d3b04`. APK teslim commit `d86878a090f878dbe5c69587a884c37feca33b3a`. APK SHA-256 `c66a4b326d48ad97c9efaeb34a02a2159b4e029e09f82c9df700da733c4340c2`.

## Enerji kontrastı

POCO'da TEST1 ışığının ve aç/kapat davranışının çalıştığı kullanıcı tarafından doğrulandı. Kalan kontrast isteği için metal yüzey değiştirilmeden dar, beyaza yakın altın çekirdek ve çok ince koyu altın ayırıcı çizgi kullanıldı. Akış yalnız motorun gerçek karşılıklı bağlantı yollarını izler. Normal geçiş 900 ms'den 1.400 ms'ye çıktı; daha rahat takip edilir. Sonrasında hafif altın aydınlatma kalır. Bağlantı kopunca değişmeyen komşu 180 ms içinde söner; dönen parçanın eski hattı hemen kaldırılır.

Tamamlanmada 900 ms'lik çekirdek geçişleri motorun tamamlanma durumuyla sıralanır; toplam dalga üst sınırı 2,2 saniye korunur. Mevcut sonuç panelinin zamanlaması değişmediğinden bazı borular panel arkasında kalabilir. Yanlış/açık uçlara yeni ışık çizilmez. Taş dokusuna taşma, blur, parçacık veya eski dokunma parlaması eklenmedi.

Altı tema aynı dış metal/arka plan paletini korur; hareketli çekirdek beyaza yakın, hafif tema tonludur. Işık İzi kapalıyken Canvas kaldırılır. Hareketi azalt/düşük donanımda yalnız statik hafif bağlantı ışığı kullanılır. 7×7/8×8 sıklık sınırları ve boşta animasyon durdurma korunur.

### Görsel ölçüm

Aynı bölüm/hamle ve 400 ms anında, gerçek tahta üzerinde enerji açık ve yalnız Canvas gizliyken metal karşılaştırıldı. Yeni hedef daha fazla alanı parlatmak değil, dar beyaz hattı metalden ayırmaktır. Bu nedenle toplam ışık alanı ölçümü tek başına başarı sayılmadı.

| Tema | TEST1 ayırt edilebilir beyaz piksel | TEST2 ayırt edilebilir beyaz piksel | Çekirdek/metal parlaklık farkı p95 |
|---|---:|---:|---:|
| gold | 0 | 209 | 194.3 |
| ice | 343 | 212 | 135.2 |
| fire | 0 | 206 | 134.1 |
| shadow | 280 | 209 | 169.1 |
| emerald | 0 | 212 | 125.9 |
| ruby | 0 | 205 | 193.0 |

Piksel/fark değerleri test görüntüsünün 8 bit renklerinden hesaplanır; telefon ekranı nits ölçümü değildir. Tüm temalarda değişen ışığın gerçek boru maskesi dışına taşması sıfırdır. [Ayrıntılı APK kontrast testi](strength-apk-check.json).

## Testler

- Mevcut 18 kaynak test grubu, 300 bölümün çözülebilirliği/gerçek ipuçları ve mekanikler başarılı.
- 43 tarayıcı grubu; kayıt/bulut modelleri, ekonomi/reklam korumaları, 400 obsidyen karşılaştırması ve 1.200 hizalama durumu başarılı.
- 8 ses/titreşim ve UX grubu; bağımsız tercihler, gerçek Chromium WebAudio sinyali ve native yardımcı testleri başarılı. Fiziksel ses/motor doğrulaması değildir.
- Öğretici: ilk/mevcut oyuncu, atla/tamamla/tekrar aç, hamle/geri al/kupon/kristal; 25 dil, 204 yerleşim, 60 tahta karşılaştırması başarılı.
- Boru: 300 bölümde 7.566 motor bağlantısı, gerçek bağlama/koparma/geri alma, altı tema, açık/kapalı ve hareket azalt/düşük donanım kontrolleri başarılı.
- İmzalı APK'dan çıkarılan enerji ve öğretici dosyalarıyla testler başarılı. İndirilen APK dosya özeti, sertifikası, test reklam birimleri ve 25 çalışma zamanı dosyası kaynakla yeniden karşılaştırıldı.
- Android derleme, lint ve imza/paket denetimi başarılı. TEST1 → ayrı süreçte yeniden açma → `adb install -r` → TEST2 senaryosunda sentetik oyuncunun bulmacası, hamlesi, ilerlemesi, cüzdanı, kuponları, tema sahipliği ve tercihleri korundu.
- Android 35 emülatörünün gerçek WebView/Surface görüntülerinde sabit ışık açık/kapalı ve temalar test edildi. Hareketli çizim testi, kapasite değerlerini benzetip zamanı kontrollü ilerletir; gerçek piksellerde boru içi ilerleme `48.9` piksel ölçüldü. Bu bir telefon FPS testi değildir.

[Android görünürlük](android-webview/pipe-flow-report.json) · [Kontrollü hareket](android-webview/animated-flow-report.json) · [Üzerine kurulum](android-webview/upgrade-report.json) · [Son bağımsız indirme doğrulaması](verified-download.json)

## Performans ve telefon sınırı

CI'da 7×7/8×8, 1× ve 4× CPU yavaşlatmalı Chromium ölçümünde Canvas çizim p95 en çok **3.9 ms**, en uzun örnek **6.7 ms**. [Ham sonuçlar](browser-performance.json). Yerel paralel test yükü ve 4× yavaşlatma altında ayrıca tek bir 154 ms örnek görüldü; bu yüzden tüm koşullarda takılmasızlık iddiası yapılmıyor. Düşük donanım yolunda sürekli animasyon yoktur.

**TEST2 gerçek POCO'da henüz test edilmedi.** TEST1'in çalıştığı kullanıcı geri bildirimidir; yeni beyaz kontrastın okunabilirliği ve gerçek telefon akıcılığı ayrıca doğrulanmalıdır. Gerçek Google hesabı/bulut servisi, canlı reklam izleme ve fiziksel hoparlör/motor bu testlerle doğrulanmış sayılmaz. Mevcut motor geri alma geçmişini süreçler arasında saklamadığından yeniden başlatma sonrası geçmiş korunması iddia edilmez.

Ana menüye dönüp 10 saniye bekleyin, TEST2'yi mevcut TEST1 üzerine kurun. **Kaldırmayın; verileri temizlemeyin.** Android uygulama bilgilerinde sürümü doğrulayın. Gerçek karşılıklı bağlantı kurun; yalnız bir düğümü döndürmek tek başına enerji üretmez.

## Hazine önizlemesi ayrı

Hazine temalı günlük giriş, `design/daily-treasure-preview-20261119` dalında onay bekler. Bu oyun APK'sında `daily-treasure` dosyaları ve yeni günlük tarih koruması YOKTUR; ZIP kontrolüyle doğrulandı. Android sunum testi yalnız test düzeneğine yüklenen `cc0d6029ab54ea0ba75bae12d9e8abe489acb2e6` JS/CSS/görseliyle yapıldı; hazine oyun APK'sı oluşturulmadı/yayımlanmadı.

Hazine dalında eski misafir günlük girişindeki geri-tarih tekrar ödeme açığı doğrulanıp küçük bir son-tarih koruması eklendi; tutarlar değişmedi. Bu düzeltme de önizleme dalında onay bekler, boru APK'sının ekonomisine karıştırılmadı. Sunucusuz ileri tarih/değiştirilmiş yerel veri sınırı devam eder.

Main'e birleştirilmedi. Google Play üretim 6.50, AdMob hesabı, diğer uygulamalar ve mağaza görselleri değiştirilmedi. AAB oluşturulmadı/yüklenmedi/yayımlanmadı. Main `0acb75b117e9cb4fee53b316dd7226f97a1e7256` olarak kaldı.
