KARA DÜĞÜM — ÖNERİ A / SON GÖRSEL İYİLEŞTİRME
Dal: design/obsidian-gold-preview-20261117
Taban main: 40b165edf3cd6fad7bc43f7a812c31fa872b79f1
Durum: Öneri A temel olarak onaylandı; bu son tasarımın onayı henüz alınmadı.

İNCELEME
comparison.html / comparison-large.jpg: mevcut / A / son tasarım, üç sütun.
boards.html / boards-large.jpg: aynı tahtanın çerçeve dahil büyük yakın görünümü.
current.jpg / A.jpg / final.jpg: ekranları tek tek tam boy inceleme.
Bölüm 53, 6×6, katman 1, 0 hamle, %39 bağlantı, 0:00; her üçünde aynı durum.
Görseller gerçek Chromium yakalamalarıdır (3× piksel yoğunluğu).
compact-8x8.jpg / tablet-8x8.jpg / landscape-8x8.jpg: bölüm151, dar/tablet/yatay.
motion.html: gerçek ekran yakalamaları üzerinde güvenli hareket örnekleri;
oyun başlatmaz, kayıt veya reklam SDK'sı kullanmaz. Sonuç kartı hareket örneğidir.
Statik inceleme sayfaları dosyadan açılabilir; resimleri aynı klasörde tutun.

GÖRSEL DEĞİŞİKLİKLER
- A'nın koyu taşını daha sakin obsidyen yüzeye indirdik. Mevcut taş atlası
  kullanılıyor; oyun için yeni bitmap, video veya parçacık motoru eklenmedi.
- Altın SVG metal yansıması ve ince ışık çizgisi belirginleştirildi. Boru
  şekilleri, kalınlıkları, yönleri ve mekanik bilgi taşıyan enerji renkleri aynı.
- Çerçeve ve butonların yüzeyleri iyileştirildi; ölçüler ve işlevler korunuyor.
- Dokunma: 140ms hafif altın saydamlık darbesi; ölçek veya yer değiştirme yok.
- Yerel karşılıklı hizalanmış bağlantı: mevcut SVG ışık çizgisinde160ms geçiş.
  Bu, bütün bulmacanın çözüldüğü anlamına gelmez. Anahtar, hedef, sis, portal ve
  katman kurallarını oyun belirler; sisin arkasındaki bağlantı gösterilmez.
- Tamamlama: gerçek kdWinPanel run kimliği izlenir;450ms tek çerçeve vurgusu.
  Ödül, kayıt veya kazanma fonksiyonu çağrılmaz. Aynı run tekrar tetiklenmez.
- Sonuç paneli:220ms saydamlık ve4px hafif giriş.
- 7×7/8×8: bağlantı geçişi statik; tek dokunma ve tek çerçeve animasyonu var.
  Taş yüzeyi tek gradyana iner, mevcut SVG enerji filtresi kaldırılır.
- Reduced-motion veya oyunun ışık ayarı kapalıyken hareketler kapalıdır.
- Efektler yalnız altın tema + açık önizleme bayrağında etkindir; diğer beş
  temanın renkleri ve görselleri değişmez.

KAPSAM VE GÜVENLİK
Bu klasör üretim index.html tarafından yüklenmez ve Android paketleme listesine
alınmamıştır. Tasarım yalnız izole tarayıcı önizlemesinde gerçek oyuna enjekte
edilir. Kayıt verilerine yazan bir tasarım kodu yoktur. Testler yeni, geçici
browser context'leri ve sentetik oyuncular kullanır. Kullanıcı kaydı okunmadı.
Original Öneri A proposal.css dosyası ve önceki karşılaştırmalar korunmuştur.
Ana oyun kaynakları,300 bölüm, oyun mekaniği, ana menü, ipucu, ödül, reklam,
mağaza medyası ve Android sürüm bilgileri değiştirilmedi.

DOĞRULAMA
checks.json:20 bölüm ×5 viewport ×4 dil =400 üçlü karşılaştırma; ayrıca300
bölümde1.200 hareket sonrası hizalanma kontrolü. Tüm15 mekanik ailesi ve4×4–8×8.
TR/EN/AR/ZH;320×568,390×844,768×1024,1024×768,844×390.
Oyun durumu, tüm test kayıt anahtarları, SVG, enerji renkleri ve buton/tahta/düğüm
kutuları aynı. Tahta ekran içinde, yatay taşma yok. Efekt süreleri, yasal kazanma,
tek run, yoğun tahta, ışık kapatma, reduced-motion, boşta gözlemci ve destroy testi.
capture.json: aynı durum,3× görüntüler, statik hareket sayfası ve dosya hash'leri.
source-tests.log: npm test;300 yasal ipucu çözümü dahil bütün kaynak testleri.
browser-tests.log: mevcut10 ilgili tarayıcı test dosyası;1800 temalı tahta,
542 tablet/yatay +255 kenar yerleşimi, ilerleme, reklam rızası, mağaza, bulut,
son anahtar ve25 dilde75 mağaza altyazısı kontrolü.
benchmark.json: iki CPU profili ×6×6/7×7/8×8 ×üç tasarım ×40 gerçek giriş =720.
Aynı girdilerde mekanik/kaynak sonucu eşit, hücre DOM kimlikleri korunur,
boşta gözlemci döngüsü yoktur. Rakamlar ve sınırlar RAPOR.txt içindedir.

TEKRAR ÇALIŞTIRMA
Repo kökünde npm ci kurulumundan sonra:
env -u CHROMIUM_PATH node design/visual-review/final/checks.cjs
env -u CHROMIUM_PATH node design/visual-review/final/capture.cjs
env -u CHROMIUM_PATH node design/visual-review/final/benchmark.cjs
npm test
Tarayıcılar kurulmamışsa Playwright Chromium kurulumu gerekir.
Ölçüm koşarken başka tarayıcı testlerini paralel çalıştırmayın.

KALAN SINIRLAR
Fiziksel Android, emülatör, telefon GPU'su, gerçek FPS, termal durum ve ANR
ölçümleri yoktur. Chromium CPU yavaşlatması bu doğrulamanın yerine geçmez.
320px genişlikte8×8 düğüm yaklaşık25,3px; bazı örnekler23px'e iner. Geometri
önceki tasarımla aynıdır. Bu, yoğun tahtada hassas dokunma için kalan sınırdır;
bütün cihazlarda rahat okunabilirlik veya akıcılık onayı anlamına gelmez.
Görsel önizleme benchmark PASS sonucu performans bütçesinin geçtiği anlamına
gelmez; durum, testte hata olmaması ve davranış eşitliğini ifade eder.

ONAY KAPISI
Son tasarım kullanıcı onayından önce main'e birleştirilmez.
Google Play6.50, AdMob ve incelemedeki mağaza medyasına işlem yapılmadı.
Yeni AAB/APK oluşturulmadı veya yüklenmedi; yayın ve workflow başlatılmadı.

DOKUNMA MALİYETİ İYİLEŞTİRMESİ
İlk örnekteki hücre gradyan katmanı kaldırıldı.140ms vurgu, zaten var olan SVG
ışık çizgisinin yalnızca saydamlığını değiştirir; ek hücre katmanı oluşturmaz.
