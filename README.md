# KARA DÜĞÜM — Android

KARA DÜĞÜM, 300 bölümlük HTML/WebView tabanlı Android bulmaca oyunudur.

## Android APK ve AAB derlemesi

- GitHub Actions > **KaraDugum Android APK** > **Run workflow** ile derleme başlatılır. `main` dalına gönderilen değişiklikler de derlemeyi tetikler.
- Aktif iş akışı: `.github/workflows/android-apk.yml`.
- Paket adı: `com.orynexa.karadugum`.
- Sürüm: `6.20` (versionCode `80`).
- Başarılı çalışmanın **Artifacts** bölümünden `KaraDugum-v6.20-APK-AAB` arşivi indirilir. Arşiv imzalı release APK ve Google Play için AAB içerir.
- Derleme için GitHub Secrets içinde `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` gereklidir. Gizli anahtarları depoya eklemeyin.

Kök dizindeki `android-apk.yml` ve iç içe `.github/workflows/.github/workflows/android-apk.yml` aktif iş akışı değildir; derlemeler için yalnızca yukarıdaki aktif dosyayı düzenleyin.

Not: Başarılı derleme, oyun içi bütün işlevlerin cihazda hatasız çalıştığını tek başına kanıtlamaz.

## Kaynak doğrulama

- `npm test`: 300 bölüm üretimi, gerçek ipucu hamleleriyle 300 bölümün tamamlanması ve arayüz/paketleme kontrolleri.
- `npm ci && npx playwright install chromium && npm run test:browser`: gerçek tarayıcıda menü, mağaza, kayıt, bulut birleştirme, reklam olayları, ayarlar ve ekran boyutu kontrolleri.
- Sistem Chromium kullanmak için `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.

Bulut kayıtları bölüm, yıldız ve en iyi puanları birleştirir. Jetonlar, temalar, ayarlar ve yarım kalan tahta cihazda saklanır; cihazlar arasında aktarılmaz. Reklam birimleri halen Google test kimlikleridir. Play Games ve reklamların gerçek cihaz/account doğrulaması ayrıca yapılmalıdır.

## v6.11

- Titreşim önizlemesi ve oyun dokunuşları Android VibratorManager/uyumlu Vibrator yolunu kullanır.
- Menü müziği telefon hoparlörü için daha duyulur tonlar kullanır; Ayarlar > Müzik sesi ile 0–100 ayarlanır.
- Şans çarkı 8 eşit olasılıklı dilim içerir: 10, 15, 20, 25, 30, 50 jeton, 1 ipucu, boş.
- Her yerel takvim gününde 1 ücretsiz çevirme ve 3 tamamlanan ödüllü reklamla 1 ek çevirme vardır. Ek hak ve reklam ilerlemesi ertesi güne taşınmaz. İptal edilen reklam sayılmaz.
- Çark sonucu animasyon bitince uygulanır; uygulama yeniden açılsa da bekleyen ödül yalnızca bir kez verilir.
- `npm run test:browser`, reklam iptali/tekrar bildirimi, günlük sınır, ödülün yeniden yüklemede korunması, ses seviyesi ve titreşim köprüsü kontrollerini içerir. Fiziksel ses/titreşim ve gerçek reklam SDK davranışı ayrıca cihazda doğrulanmalıdır.

## v6.12

- Her başarılı bitiriş jeton verir; tekrar oynama ve buluttan gelen tamamlanma kaydı ödülü engellemez. Kilitli bitişin tekrar bildirilmesi ek jeton vermez. İki kat reklam ödülü her bitiriş için en fazla bir kez alınabilir.
- Titreşim yeni kurulumda açıktır; kullanıcının kapalı tercihi korunur. Her yasal düğüm çevirme hamlesi iki kısa darbe gönderir. Ayarlar > Titreşimi Dene titreşimi açıp önizleme yapar. Android dalga biçimi doğrudan Vibrator API üzerinden uygulanır. Fiziksel cihazda hissedilen sonuç uzaktan doğrulanmamıştır.
- Alt menü: Bölümler, Görevler, Sandık, Mağaza. İstatistikler ve başarımlar sağ üstteki profilde kalır. Ana sahne resmi değişmez; alt menü gerçek arayüz düğmeleriyle çizilir.
- Günlük görevler: 3 galibiyet (+15 jeton), çözülen bulmacalarda toplam 40 hamle (+10 jeton), 1 kusursuz çözüm (+15 jeton). Her görev günde bir kez ödüllendirilir.
- Günlük sandık +20 jeton verir; 7 ardışık açılışta ayrıca +1 ipucu verir. Sandık günde bir kez açılır.
- `tests/rewards-menu-audit.cjs`, Bölüm 16 eski/bulut kayıt senaryosu, tekrar oynama, ödül tekrarı, çift ödül, yasal hamle titreşimi, yeni menü, günlük görevler ve 7 günlük sandık serisini denetler.

## v6.13

- Titreşim ve titreşim deneme kontrolleri tamamen kaldırıldı; oyun çağrıları, Android Vibrator köprüsü ve VIBRATE izni de kaldırıldı. Eski kayıtlar ve diğer ayarlar korunur.
- Mağaza: bu çalışma için üretilmiş yerel hazine görseli, bakiye kartları, ipucu paketleri, kalıcı tema önizlemeleri, kategori kısayolları ve günlük ödül alanı. Fiyatlar aynı: 1/3/10 ipucu için 50/135/400 jeton, temalar için 0/150/200/250 jeton.
- Bölümler: 300 bölüm altı 50 bölümlük bölgeye ayrılır; yıldızlar, ilerleme, bölge kısayolları ve Tümü/Açık/Tamamlanan/Eksik yıldız filtreleri gösterilir. Kaldığın yerden devam et, yarım kalan bulmacanın hamlelerini korur. Kilitler mevcut ilerlemeye göre çalışır; ücretli bölüm açma yoktur.
- `assets/kara-dugum-treasury.webp` çevrimdışı paketlenir; görsel yaklaşık 319 KiB WebP olarak hazırlanmıştır. `screens.css` mağaza ve bölüm ekranlarını düzenler, ana menüyü ve oyun tahtasını değiştirmez.
- `tests/collections-audit.cjs`, titreşimin kaldırılmasını, 300 bölüm/6 bölgeyi, filtreleri, kilitleri, kaldığı yerden devamı, mağaza işlemlerini ve 3 ekran boyutunu denetler.

## v6.14

- Mağaza, onaylanan referans görselin değiştirilmemiş `assets/kara-dugum-reference.png` dosyasındaki gerçek sandık, mavi kristal ve taş tema çizimleriyle oluşturulur. Görseller CSS ile uygun bölgeleri göstererek kullanılır; kullanıcı verileri ve butonlar gerçek arayüz elemanlarıdır.
- Referanstaki paketler: Küçük 5 ipucu/225 jeton, Orta 15 ipucu/600 jeton, Büyük 30 ipucu/1050 jeton. Ücretler satın almadan önce butonlarda görünür; gerçek para yoktur. Eski jeton/kupon bakiyeleri korunur.
- Ana temalar Kadim Taş (gold), Gece Tapınağı (ice), Çöl Harabeleri (fire) olarak adlandırılır; eski tema sahiplik anahtarları ve 0/150/200 jeton ücretleri korunur. Gece Moru (shadow/250) da koleksiyonda korunur. Tahta renk ve yüzeyleri seçilen tema ile eşleşir.
- Ayarlar modern kartlar ve anahtarlarla düzenlendi. Oyuncu merkezi İstatistikler/Temalar/Başarımlar sekmeleri içerir. Sandık ekranı yedi günlük seriyi, görev ekranı gerçek ilerleme çubuklarını gösterir. Eski görev, sandık ve başarım ödülleri ile kayıt anahtarları korunur. Titreşim geri eklenmedi.
- `tests/reference-panels-audit.cjs`, referans resmin bütünlüğünü, paket içerik/ücretlerini, ayarları, profil sekmelerini, sahip olunan temaların ücretsiz tekrar uygulanmasını, gerçek tahta paletini ve tekrar eden/eski görev tıklamalarının ödül vermemesini denetler.

## v6.15

- Görünen para birimi Kristal olarak adlandırılır. Bakiye, ücret ve ödül miktarları dönüştürülmez; `kd64_coins` kayıt anahtarı ve yerel reklam payload'ları uyumluluk için korunur. Görünen etiket ve simgeler kristalle değiştirilir.
- Mağaza başlığı ekran merkezine sabitlenir; büyük bakiye metinleri başlığın üzerine taşmaz. Günlük Ödül ve görselli Şans Çarkı kartları ipucu paketlerinden sonra, temalardan önce gelir. Oyuna Dön ve Diğer Koleksiyonun alanları kaldırılır.
- Altı tema tek koleksiyondadır: Kadim Taş, Gece Tapınağı, Çöl Harabeleri, Gece Moru, Zümrüt Mabedi, Yakut Ateşi. Önceki sahiplikler korunur. Yeni Zümrüt Mabedi 300 kristal, Yakut Ateşi 350 kristaldir; çizimleri ve oyun tahtası paletleri farklıdır.
- Yeni görseller bu çalışma için üretilmiş `assets/kara-dugum-expansion.webp` dosyasında çevrimdışı paketlenir. Şans çarkının 1 ücretsiz + 3 tamamlanan reklamla 1 ek hak kuralı değişmez.
- `tests/crystal-shop-audit.cjs`, başlık merkezini, 3 ekran boyutunda 4 farklı bakiyeyi, birim adı değişirken bakiyenin korunmasını, kart sırasını, altı temayı, yeni tema alışverişlerini ve oyun paletlerini, eski çark sonuçlarının yeniden ödül vermeden yeni adla gösterilmesini denetler.

## v6.16
- Üç tamamlanmış reklamla açılan günlük ek çarkın kristal ve ipucu ödülleri 2×; ücretsiz hak ve boş dilim değişmez. Çarpan çevirmeyle birlikte saklanır, eski bekleyen çevirmeler 1× ödenir.
- Altı tema önizlemesi oyunla aynı SVG boru çizimini ve taş renklerini kullanır. Zümrüt Mabedi/Yakut Ateşi 20 birim, diğerleri 13 birim boru kalınlığı; çok renkli oyun kuralının renkleri korunur.
- Zümrüt Mabedi 900, Yakut Ateşi 1200 kristal. Önceki satın alımlar ve bakiyeler korunur.
- Çevrimdışı 25 dil: Türkçe, İngilizce, Çince, Hintçe, İspanyolca, Arapça, Fransızca, Bengalce, Portekizce, Rusça, Urduca, Endonezce, Almanca, Japonca, Marathi, Vietnamca, Telugu, Hausa, Tamilce, Pencapça, Svahili, Filipince, Farsça, Korece, Cava dili. Çok konuşulan dillerden geniş bir seçimdir; sıralama toplam/ana dili konuşurları ve lehçe sınıflandırmasına göre değişir.
- Dil seçimi kalıcıdır; telefon dili desteklenmiyorsa İngilizce kullanılır. Arapça/Urduca/Farsça RTL, bulmaca koordinatları her dilde LTR. Güncellenen metin düğümleri ve erişilebilir etiketler yeniden çevrilir.
- `npm test` 300 bölüm, gerçek ipuçları ve çözüm denetimi; `npm run test:browser` yedi gerçek tarayıcı paketi içerir. Yeni paket tüm dilleri, altı tema SVG uyumunu, sekiz ödülün çift değerlerini ve kayıtlı çark geçişini denetler.

## v6.17
- Altı referans tema gerçek oyun ekranına uygulandı: ayrı sahne/taş atlasları, işlemeli SVG çerçeveler, değerli taşlar, silindirik borular, yuvarlak dirsekler ve metal bilezikler.
- 4×4, 5×5, 6×6, 7×7 ve 8×8 tahtalarda aynı oyun maskeleri ve dokunma hedefleri kullanılır. Anahtarlar, hedefler, sis, buz, engel, portal ve çift enerji renkleri korunur. Görsel yenileme hamle veya kayıt değiştirmez.
- Önizlemeler aynı boru çizimini kullanır; seçili tema tüm bölümlerde ve yeniden açılışta uygulanır. Yatay ekran için iki sütunlu oyun düzeni; dar telefonlarda kontroller görünür kalır.
- Sekiz tarayıcı paketi: yeni denetim altı temanın her birinde 300 bölüm (1800 tahta), boru açıklıkları, sis/enerji renkleri, üç ekran boyutu, dokunma hedefleri ve tema kalıcılığını kontrol eder.

## v6.18
- Çift katmanlı bir bölümde menüye gidip dönünce başlıktan Katman 2 bilgisinin kaybolması düzeltildi. Bölüm başlığı artık tek bir oyun durumu işlevinden güncellenir.
- Katman etiketleri 25 dilde tamamlandı; dar ekranlarda uzun başlıklar geri ve duraklat düğmelerinin arasına sığar.
- Tema aynı kaldığında boru ve çerçeve DOM öğeleri korunur; menü dönüşünde gereksiz çerçeve çizimi kaldırıldı.
- Teste gerçek ikinci katmanda altı temaya geçiş, ilerlemenin birebir korunması, menü dönüşü, 25 dilde yeniden yükleme ve küçük ekran kontrolleri eklendi.

## v6.19
- Ana menünün dört alt düğmesine koyu taş ve işlenmiş altın çerçeveli kabartmalı simgeler: bağlantılı taşlar, mühürlü görev parşömeni, ışıklı sandık, mavi kristalli tüccar kesesi. Sinematik ana menü görseli ve yedi dokunma alanı korunur.
- Görseller tek şeffaf WebP atlasından gösterilir; yükleme hatasında mevcut dört SVG simge görünür kalır. Yazılar ve erişilebilir düğme adları 25 dilde HTML olarak çevrilir.
- Basılma geri bildirimi ve klavye odağı eklendi. Yalnızca alınabilir görev/sandık ödülünde üç kısa ışık geçişi; ödül alındığında kapanır. Hareket azaltma tercihinde animasyon kullanılmaz.
- Dokuz tarayıcı paketi: yeni ana menü denetimi üç ekran boyutu, dört hedef, gerçek ödül alımı, rozet/ışık durumu, 25 dil, hareket azaltma ve eksik görsel durumunu kontrol eder.

## v6.20
- Oyuncu merkezi: yeni kimlik/XP kartları, kaynak göstergeleri, bölüm kısayolu ve gerçek ilerlemeli başarım kartları. Ayarlar: ayrı dil kartı ve kayıt yedekleme kısayolu. Sandık/görevler: parşömen/sandık görselleri, günlük durum özeti, ödül rozetleri ve daha okunaklı kartlar.
- Fiziksel reklam düğmesi tıklamasının sonuç panelindeki `data-level` bilgisini bölüm seçimi olarak tetiklemesi düzeltildi; bölüm seçimi yalnızca gerçek düğmelere uygulanır.
- 2× ödül: istek/bölüm tamamlayış kimliğiyle kalıcı kayıt, Native tarafta onaylanana kadar saklanan kazanılmış ödüller, WebView yenilemesinden sonra teslim ve tekrar ödeme koruması. Sonuç ekranı XP/puan/kristal değerlerini anında günceller; önceki yüksek puanda da reklam bonusu eklenir.
- Tahtada sadece değişen hücrelerin içeriği güncellenir; dokunma hedefleri korunur. Gizli/duraklatılmış oyunun zamanlayıcısı kayıt yazmaz. Hamle ve arka plana geçiş kayıtları anlıktır; boşta geçen süre 5 saniyede bir saklanır.
- Çeviri yalnızca değişen metin/öğelerde çalışır; Türkçe arayüzde tüm gövde taraması yapılmaz. Ekran dışındaki tema kartlarının çizimi ertelenir; yoğun 8×8 tahtalarda pahalı bulanıklık yüzeyleri azaltılır.
- On tarayıcı paketi; yeni denetimde 17. bölüm gerçek yasal hamlelerle 3 yıldızla bitirilir, 100→200 XP ve 2× puan/kristal, eski yüksek puan, fiziksel tıklama, tekrar callback, iptal, WebView yenileme, yarım kalan yazma, gizli kayıtlar ve DOM hücre sürekliliği sınanır.

### v6.20 performans ölçümü
Aynı makinede Chromium, 390×844 ekran, 4× CPU yavaşlatması; v6.19 (`d571c8b`) ve v6.20 karşılaştırması. Mağaza için 8 açılış, 8×8 oyun için 20 hamle ortalaması. Bunlar tarayıcı işlem süreleridir; cihazdaki kare hızı ayrıca cihaz donanımına bağlıdır.

| Ölçüm | v6.19 | v6.20 |
|---|---:|---:|
| Mağaza açılışı ortalama | 50,8 ms | 20,5 ms |
| Hamle işleme ortalama | 24,9 ms | 6,6 ms |
| Mağazada 1,6 saniyede gereksiz aktif oyun kaydı | 3 | 0 |
| Mağazada 1,6 saniyede tüm gövde çeviri taraması | 3 | 0 |
| 20 hamlede yeniden oluşturulan dokunma düğmesi | 1280 | 0 |

Yeniden ölçmek için `CHROMIUM_PATH=/usr/bin/chromium node tests/performance-benchmark.cjs current`; başka bir temiz sürüm için `BENCH_ROOT` yolunu belirt. Zaman ölçümleri test paketinin geçme koşulu yapılmaz; yapısal iyileştirmeler normal tarayıcı testinde doğrulanır.
