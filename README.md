# KARA DÜĞÜM — Android

KARA DÜĞÜM, 300 bölümlük HTML/WebView tabanlı Android bulmaca oyunudur.

## Android APK ve AAB derlemesi

- GitHub Actions > **KaraDugum Android APK** > **Run workflow** ile derleme başlatılır. `main` dalına gönderilen değişiklikler de derlemeyi tetikler.
- Aktif iş akışı: `.github/workflows/android-apk.yml`.
- Paket adı: `com.orynexa.karadugum`.
- Sürüm: `6.14` (versionCode `74`).
- Başarılı çalışmanın **Artifacts** bölümünden `KaraDugum-v6.14-APK-AAB` arşivi indirilir. Arşiv imzalı release APK ve Google Play için AAB içerir.
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
