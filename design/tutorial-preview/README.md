# KARA DÜĞÜM — oyun ekranı ve dört adımlı öğretici önizlemesi

Temel: `6.50-ux-test3`, `778b0a027ec7ee63b2e294f85aea6c54a7fe8db8`.
Geliştirme dalı: `design/interactive-tutorial-preview-20261117`.

## Büyük görseller

Bunlar gerçek çalışan oyundan alınmış ekran görüntüleridir. Tekil ekranlar **786 × 1746 px** çözünürlüktedir; dört adımlı toplu görseli açarak büyütebilirsin.

- [Yeni oyun ekranı](game.png)
- [Dört adımın toplu önizlemesi](overview.png)
- [1 — Düğümü döndür](step-1.png)
- [2 — Bağlantıları birleştir](step-2.png)
- [3 — İpucu kullan](step-3.png)
- [4 — Geri Al](step-4.png)

## Davranış

Bölüm türü/zorluk metni ortalanır. Açıklama metninin iki yanında yardım ve yıldız düğmeleri korunur. Altın ampul, yerelleştirilmiş İPUCU yazısı ve sağ üst hak rozeti aynı ipucu düğmesini kullanır; ipucu/kupon/reklam işlemleri değişmez. Dört alt kontrol aynı sıradadır.

Öğretici, ilk oyun kaydı oluşturulmadan önceki kurulum izini kontrol eder. Önceden kayıt, ilerleme veya eski öğretici bayrağı bulunan oyuncularda otomatik açılmaz. Yeni oyuncunun ilk oyun girişinde, ana menü veya bölüm listesi yolundan otomatik açılır. İlk adımda her dokunuş örnek düğümü yeniden döndürür. İleri, o adım denenince etkinleşir; Geri ve Atla kullanılabilir. Son adım Tamamla ile kapanır.

Alıştırma **gerçek tahtanın üzerindeki geçici çizim katmanını** değiştirir. Oyun motorunun döndürme, ipucu, geri alma, reklam veya ödül komutlarını çağırmaz. Motorun taşları, çözümü, hamleleri ve geçmişi korunur. Öğretici kapandığında geçici katman kaldırılır; gerçek ipucu ve geri alma işlemleri normal biçimde devam eder. Tahta için ek bir yerleşim satırı ayrılmaz.

Ayarlar'daki **Öğreticiyi Tekrar Göster** mevcut bulmacayı açar; öğreticiden çıkınca Ayarlar'a döner. Tamamlandı/görüldü bilgisi mevcut hesap kapsamlı kayıt katmanına yazılır. Kota/izin hatasında bekleyen kayıt bildirimi görünür ve kayıt aynı hesaba sabitlenerek yeniden denenebilir. Kalıcı depolama sürekli başarısızsa, uygulama sonlandırıldıktan sonra bu işaretin kalıcılığı garanti edilemez; bu durumda kayıt başarılıymış gibi gösterilmez.

Ses/titreşim mevcut bağımsız tercihler üzerinden çalışır. Hareketi azalt durumunda öğretici geçiş/parlama animasyonları kapalıdır. Yeni metinler Türkçe ve mevcut 24 çeviri sözlüğünde bulunur. Yeni büyük oyun görseli, müzik veya parçacık motoru eklenmez.

## Doğrulama

- `npm test`: 300 bölüm, gerçek yasal ipucuyla çözüm, kayıt/bulut, ödül/reklam ve Android kaynak denetimleri.
- `npm run test:browser`: mevcut mağaza, dil, kayıt, geçiş, görev, başarı ve tahta regresyonları. İlk oyuncu öğreticisi çıkan eski testler gerçek Atla düğmesine basarak asıl regresyon senaryosuna devam eder.
- `npm run test:ux`: ses/titreşim, sekiz çark ödülü, native köprü ve TEST3 özellikleri.
- `npm run test:tutorial`: ilk kurulum, mevcut oyuncu, atlama/tamamlama/yeniden açma, kayıt/undo/ekonomi izolasyonu, ses/titreşim tercihleri, 25 dilde 204 adım görünümü ve TEST3 ile 60 tahta boyutu karşılaştırması.
- Kayıt arızası testi, öğretici tamamlandı bilgisinin bekleyen kayıtta korunmasını ve farklı hesaba uygulanmamasını denetler.
- [Android TEST derleme, lint ve imza çalışmaları](https://github.com/MhmTBsr60/KaraDugum/actions/workflows/android-tutorial-preview.yml) bu geliştirme dalında çalışır; Google örnek reklam kimlikleri kullanılır. AAB oluşturma/yükleme veya Google Play işlemi yoktur.

Fiziksel Android cihaz/emülatör erişimi yoktur. Tarayıcı ölçüleri ve JVM Android API benzetimleri gerçek cihaz sertifikasyonu değildir. Bu önizleme tüm Android sürümlerinde fiziksel olarak denenmiş veya AdMob hesabında uygunluğu doğrulanmış olarak sunulmaz.

## Değişen alanlar

Çalışma zamanı: `index.html`, `onboarding.js`, `onboarding.css`, `gameplay-ui.js`, `gameplay-layout.css`, `ux-locales.js`.
Doğrulama: öğretici testi, öğretici/kayıt arızası testi, yeni öğreticiyi atlayan mevcut tarayıcı senaryoları, altın palet testinin gerçek tahtadaki öğreticiye uyarlanması, APK varlık doğrulaması, `package.json` ve yalnızca bu dala ait Android TEST iş akışı.
Önizleme: ekran görüntüsü birleştirme betiği, bu dizindeki görseller ve telefon kontrol notları.

Oyun çekirdeği (mevcut ses adaptörleri hariç) ve korunan kayıt/ekonomi/bulut/politika dosyaları, mevcut byte/hash korumasıyla denetlenir. 300 bölümün üretimi, zorlukları ve çözüm kuralları değiştirilmez. `main`, Google Play 6.50 üretimi, AdMob hesabı ve mağaza görselleri değiştirilmez. Birleştirme için kullanıcı onayı gerekir.
