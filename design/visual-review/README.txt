KARA DÜĞÜM — OBSİDYEN & ALTIN / ÖNERİ A
Onay bekleyen görsel geliştirme dalı: design/obsidian-gold-preview-20261117
Taban main: 40b165edf3cd6fad7bc43f7a812c31fa872b79f1

Bu klasör oyunun giriş dosyasından yüklenmez. Main'e görsel birleştirme yapılmadı.
Kaynak oyun, 300 bölüm, kayıt modeli, reklam kimlikleri ve mağaza görselleri bu
görsel dalda değiştirilmedi. Görseller gerçek Chromium ekran yakalamalarıdır;
AI ile yeniden çizilmiş veya çalışan oyunun yerine sunulmuş ekranlar değildir.
Bu klasör Play Store mağaza medya çıktısı değildir ve Play'e gönderilmedi.

Karşılaştırma:
- comparison.png: aynı bölüm53 /6×6, aynı oyun durumunda mevcut ve önerilen ekran.
- current.png, proposed.png: iki ekranın ayrı dosyaları.
- proposed-8x8-320.png: dar 320px görünümde yoğun tahta okunabilirliği.
- index.html: göreli PNG'lerle açılan etkileşimli inceleme dosyası. Dokunma,
  çerçeve ışığı ve sonuç paneli girişini örnekler; gerçek oyun/ödül işlemi yapmaz,
  localStorage, hesap veya reklam SDK'sı kullanmaz.

Tasarım:
- Siyah-altın fantastik sahne ve mevcut altın SVG borular korunur.
- Serbest düğümlerde daha sakin obsidyen yüzey, ince metal kenar ve derinlik.
  Sabit düğüm görünümü, özel simgeler, enerji renkleri ve boru maskeleri korunur.
- Tahta çevresinde hafif, sabit sıcak ışık. Arka plan videosu, parçacık sistemi,
  sürekli hareket, yeni büyük bitmap veya yeni dış bağımlılık yoktur.
- 4×4–6×6 dokunması: 140ms, en fazla%3,5 ölçek geri bildirimi.
- 7×7–8×8: ölçek animasyonu kapalı; daha sade tek gradyan yüzey.
- Tamamlanma çerçeve ışığı: bir kez450ms, saydamlık.
- Sonuç paneli: 220ms, saydamlık ve5px konum. Reduced-motion tercihinde kapalı.
- Çerçeve tamamlama vurgusu henüz gerçek kazanma olayına bağlanmadı. Onay sonrası
  entegrasyon aşamasında, mevcut oyunun ödül/kazanma mantığı korunarak ele alınır.

Doğrulama:
- 20 bölüm örneği ×3 viewport =60 mevcut/öneri karşılaştırması: oyun durumu,
  kaynaklar, SVG maskeleri, enerji renkleri, düğüm ve tahta ölçüleri aynı.
- 320×568,390×844,844×390. Tüm15 mekanik ve4×4–8×8 boyutlarından örnekler.
- Gömülü CSS'nin gerçekten uygulandığı, reduced-motion ve yoğun tahta koruması
  ayrıca doğrulandı. Tam liste preview-checks.json'da.
- benchmark-results.json:8 sahne ×20 giriş, her çiftte aynı hamle sonucunu ve
  kaynakları korudu. Hiçbir taş DOM düğümü değiştirilmedi. CPU6 dar profilde
  8×8 handler medyanı mevcut14,5ms /öneri14,6ms; CPU4 standartta10,9 /10,2ms.
  Bunlar sentetik Chromium ölçümleridir; az örnek ve sistem yükü nedeniyle kesin
  hızlanma veya telefon FPS/ANR garantisi çıkarılamaz. Gerçek Android/GPU testi yok.

Yeniden oluşturma (yalnız izole, yeni browser context'leri):
node design/visual-review/capture.cjs
node design/visual-review/benchmark.cjs

Onay kapısı:
Karşılaştırma kullanıcı tarafından değerlendirilmeden bu tasarım main'e alınmaz.
AdMob hesabı, Google Play dağıtımı ve incelemedeki mağaza görselleri değiştirilmez.

BÜYÜK İNCELEME GÖRSELLERİ
- comparison-large.jpg:2700×3303; aynı bölümün büyük yan yana görünümü.
- board-comparison-large.jpg:2700×1968; düğüm ve bağlantı yakın görünümü.
Tarayıcı3× piksel yoğunluğuyla tekrar yakalandı;60 durum/ölçü koruma kontrolü
geçti. Bunlar inceleme çıktılarıdır; oyundan yüklenmez ve mağazaya gönderilmedi.
Görsel CSS kodu 0d56339 ile aynıdır; yalnızca büyük inceleme çıktıları eklendi.

SON GÖRSEL İYİLEŞTİRME — 17 KASIM 2026
Öneri A kullanıcı tarafından temel olarak onaylandı. Son obsidyen/altın
iyileştirmesi final/ klasöründedir. Üçlü karşılaştırma: final/comparison.html;
büyük tahta: final/boards-large.jpg. Bu son tasarım için ayrıca onay bekleniyor.
Önceki A dosyaları referans olarak korunmuştur; oyun girişine eklenmedi.
