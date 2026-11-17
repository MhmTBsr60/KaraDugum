KARA DÜĞÜM — ONAYLANAN OBSİDYEN/ALTIN TASARIM ENTEGRASYONU
17 Kasım 2026
Onaylanan referans: design/obsidian-gold-preview-20261117 /0fd4419
Entegrasyon dalı: design/obsidian-gold-integration-20261117
Taban main:40b165edf3cd6fad7bc43f7a812c31fa872b79f1

Tasarım kullanıcı tarafından onaylandı. Artık obsidian-gold.css ve obsidian-gold.js
oyun girişinden yüklenir; büyük karşılaştırma JPEG'leri Android'e paketlenmez.
Önceki design/visual-review/final klasörü tarihli onay referansı olarak korunur.

KORUMA
300 bölüm, mekanikler, hamle kuralları, kayıt modeli, ilerleme ve ödül/reklam
akışları aynı kaldı. Index içindeki bütün JavaScript bloklarının SHA256 özeti
önceki main ile aynıdır; bu, entegrasyon testinde sabit referansla doğrulanır.
SVG düğüm yolları, yönler, enerji renkleri ve buton geometrileri değişmedi.
Öğretici mini tahta aynı obsidyen yüzeyi ve mevcut sabit-düğüm görselini kullanır;
oyun durumuna yazmaz. Diğer beş temanın görünümü ayrıca karşılaştırılır.

DOKUNMA
Düğüm boyutlarını veya butonları taşımak yerine tahta içindeki boş aralıklar ve
kenar dolgusu en yakın gerçek düğüme yönlendirilir. Bu, mevcut kurallara göre
tek gerçek düğüm tıklaması üretir; doğrudan tıklama iki kez işlenmez. Tahta dışı,
klavye ve kilitli/sabit düğümlerin mevcut davranışı korunur.320px'de8×8 görsel
düğüm yaklaşık25px kalır; bu alanların hepsini44px yapmak, düzen değiştirmeden
geometrik olarak mümkün değildir. Boş aralıkları kazanmak ve mevcut Tahtaya
odaklan seçeneği yardım eder; rahatlık fiziksel telefonda değerlendirilmelidir.

PERFORMANS
Tahta MutationObserver'ı kaldırıldı. Mevcut görsel renderer bittikten sonra,
yalnız değişen düğüm ve komşular için ışık durumu güncellenir. Yeni parçacık
motoru, büyük oyun görseli, sürekli döngü veya kayıt yazımı yoktur.
4×4–6×6:140ms mevcut SVG ışık çizgisi;160ms yerel bağlantı geçişi.
7×7–8×8: dokunma parıltısı statik; düğüm animasyonu/geçişi yok.
Tamamlama450ms, panel220ms.4 veya daha az çekirdek/bellek4GB veya altında ya da
slow-update bildiren ortamda yeni hareket efektleri kapanır. Bu, gerçek cihaz
performans ölçümü yerine geçmez. Sistem hareketi azalt ve oyun ışık ayarları
ayrıca geçerlidir. Süreler ve yasal kazanma gerçek sayfa üzerinde test edilir.

TESTLER
npm test
npm run test:browser (sonunda obsidyen entegrasyon testi dahil)
npm run test:obsidian (tek başına400 geometri/dil +1200 hizalanma kontrolü)
node tests/obsidian-performance-audit.cjs (karşılaştırmalı CPU stres ölçümü)
Yeni testler sentetik hesaplar ve izole Chromium context'leri kullanır.
Fiziksel Android/gerçek hesap/gerçek reklam/termal/GPU testi iddiası yoktur.

TEST APK VE ÜRETİM AYRIMI
android-design-test.yml yalnız imzalı TEST APK ve lint üretir. Google örnek
reklam birimleri kullanılır; AdMob hesabı veya canlı birimleri değiştirilmez.
TEST sürüm adı:6.50-obsidian-test1; sürüm kodu110; paketcom.orynexa.karadugum.
Mevcut imza doğrulanır. Aynı imzalı APK'yı güncellerken uygulama verisi korunur.
Paket kodu korunarak üretim6.50 APK'sına geri dönme için kod düşürme engeli
oluşturulmaz. Play uygulaması farklı imzalıysa oyunu SİLME; veri temizleme yapma.
Telefon kontrol adımları TELEFON-TESTI.txt dosyasındadır.

Üretim workflow'u [test-apk-only] etiketli commit'lerde atlanır. Bu etiketli
entegrasyon/main commit'leri yalnız TEST akışını çalıştırır; AAB oluşturma,
Google Play yükleme/yayınlama veya mağaza medyası üretme adımı çalışmaz.
Üretim6.50 kaynak sürüm bilgileri ve mağaza varlıkları değiştirilmedi.
Google Play üretim sürümü ve AdMob hesabına işlem yapılmaz.
