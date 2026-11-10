# KARA DÜĞÜM — Android

KARA DÜĞÜM, 300 bölümlük HTML/WebView tabanlı Android bulmaca oyunudur.

## Android APK ve AAB derlemesi

- GitHub Actions > **KaraDugum Android APK** > **Run workflow** ile derleme başlatılır. `main` dalına gönderilen değişiklikler de derlemeyi tetikler.
- Aktif iş akışı: `.github/workflows/android-apk.yml`.
- Paket adı: `com.orynexa.karadugum`.
- Paket sürümü: `6.44` (versionCode `104`).
- Başarılı ana dal derlemesi **Artifacts** bölümüne `KaraDugum-v6.44-TEST-APK-AAB` ve `KaraDugum-v6.44-LIVE-APK-AAB` arşivlerini yükler. **TEST** APK Google test reklamlarını, **LIVE** AAB gerçek reklam birimlerini kullanır. Dosya adlarında da TEST/LIVE yazılıdır. Elle çalıştırmada `ads_mode: both`, `test` veya `live` seçilebilir.
- Derleme için GitHub Secrets içinde `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` gereklidir. Gizli anahtarları depoya eklemeyin.

Kök dizindeki `android-apk.yml` ve iç içe `.github/workflows/.github/workflows/android-apk.yml` aktif iş akışı değildir; derlemeler için yalnızca yukarıdaki aktif dosyayı düzenleyin.

Not: Başarılı derleme, oyun içi bütün işlevlerin cihazda hatasız çalıştığını tek başına kanıtlamaz.

## Kaynak doğrulama

- `npm test`: 300 bölüm üretimi, gerçek ipucu hamleleriyle 300 bölümün tamamlanması ve arayüz/paketleme kontrolleri.
- `npm ci && npx playwright install chromium && npm run test:browser`: gerçek tarayıcıda menü, mağaza, kayıt, bulut birleştirme, reklam olayları, ayarlar ve ekran boyutu kontrolleri.
- Sistem Chromium kullanmak için `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.

Bulut kaydı hesaba bağlı bölüm/yıldız/puan ilerlemesini, kristal/XP/ipuçlarını, tema sahipliğini, görevleri ve yarım kalan tahtayı mevcut işlem/sayaç modeliyle birleştirir. Desteklenen kayıt alanları ve sınırlar aşağıdaki sürüm notlarında açıklanır. Gerçek reklam birimleri canlı moda bağlıdır; test derlemelerinde Google test birimleri kullanılır. Play Games ve reklamların gerçek cihaz/account doğrulaması ayrıca yapılmalıdır.

## v6.44 — Dört dil ve dünya geneli yayın hazırlığı

- Türkçe, İngilizce, Arapça ve Basitleştirilmiş Çince gerçek ekranlarda denetlenir. Günlük bulmaca, hedefler, bölüm adları, eşitleme ve reklam düğmelerindeki eksikler tamamlanır. Native hata/çıkış metinleri seçilen dili izler. Arapça metin sağdan sola; oyun tahtasının koordinatları soldan sağa kalır. Diğer mevcut dil seçenekleri korunur.
- Gizlilik ve hesap/veri silme belgeleri çevrimdışı, JavaScript gerektirmeyen dört dilde paketlenir. Ayarlardaki mevcut yasal bağlantılara hesap/veri silme erişimi eklenir; silme işleminin e-posta ve Google Play Oyunlar tarafındaki operasyonel takibi yayıncı tarafından doğrulanmalıdır.
- `store-listings/` altında tr-TR, en-US, ar ve zh-CN için başlık, kısa/tam açıklama ve sürüm notları; `release-checklist.json` içinde ülke, yaş kitlesi, veri güvenliği, AdMob ve app-ads.txt için tamamlanması gereken hesap adımları bulunur. Bu dosyalar Console'a otomatik gönderilmez.
- 300 bölüm üretimi, kayıt anahtarları/biçimi, ekonomi ve ipucu hesabı değişmez. Tasarım ve mağaza yapısı korunur. Kaynak testlerine mağaza limit denetimi; tarayıcı testlerine dört dilde gerçek gezinme/kayıt koruma ve yasal belge kontrolü eklenir.

### Reklam yükleme düzeltmesi

- İlk yüklemede hata alan ödüllü/geçiş reklamları, uygulamaya dönüşte ve normal bölüm geçişlerinde yeniden hazırlanır. Hatalı istekler 30 saniyeden başlayıp en fazla 5 dakikaya çıkan bekleme ile sınırlanır; arka planda sürekli sorgulama yapılmaz. Gösterim sıklığı ve ödül hak ediş kuralları değişmez.
- `AdLoadGateAudit` bekleme sınırlarını, tekrarlı olayları, iki reklam türünün bağımsızlığını ve başarı sonrası sıfırlamayı denetler. Bu düzeltme 6.44/104 paketine dahildir.
- `app-ads.txt` doğru yayıncı satırını içerir. AdMob doğrulaması için bu dosya Google Play mağaza girişinde yazan geliştirici web sitesinin kökünde sunulmalıdır. Proje altındaki bir GitHub Pages URL'sine koymak tek başına kök alan adı doğrulamasını sağlamaz. Hesaptaki uygulama hazırlık/onay ve app-ads.txt doğrulama durumu ayrıca kontrol edilmelidir.

## v6.43 — AD_ID doğrulaması ve imzalı paket

- Sürüm kodu 103. Kaynak manifestteki açık AD_ID izni, birleştirilmiş manifestte ve imzalı AAB içinde doğrulanır. Ham manifest birleştirme raporu da paket arşivine eklenir.
- R8 mevcut yapılandırmada kapalıdır. Etkinleştirildiğinde oluşan mapping.txt dosyası paket raporlarıyla birlikte alınır.
- Oyun, kayıt ve reklam ödülü mantığı korunur. Yeni paket, eski etkin kanallardaki izin eksikliğinin giderildiğini tek başına kanıtlamaz.

## v6.42 — Reklam kimliği izni ve paket denetimi

- Android manifestinde `com.google.android.gms.permission.AD_ID` izni açıkça tanımlanır. İzin, TEST ve LIVE derlemelerinde yalnızca geçişli SDK bildirimine bırakılmaz; birleşmiş manifest ve üretilen APK/AAB içeriği üzerinden denetlenir.
- Aktif derleme kökteki `AndroidManifest.xml` dosyasını kullanır; aynı manifestin iş akışında ayrı bir kopyası üretilmez. Birleşmiş manifest, Google bundletool ile AAB'den çıkarılan manifest ve AAB SHA-256 değerini içeren doğrulama raporu paket arşivine eklenir.
- SDK sürümleri ve Android API desteği 6.41 ile aynı kalır. Paket kimliği 6.42/102 olarak güncellenir; bölümler, yerel/bulut kayıtları ve kazanılmış ödüller korunur.
- Bu değişiklik Play Console hatasının giderildiğini tek başına doğrulamaz. Yeni AAB yüklendikten sonra reklam kimliği beyanıyla birlikte Console'un paket denetimi ayrıca kontrol edilmelidir.

## v6.41 — Android SDK yenilemesi

- Google Mobile Ads **25.5.0** ve Play Games v2 **22.1.0** kullanılır; UMP **4.0.0** korunur. Geçişli AndroidX Fragment bağımlılığı **1.9.1** kısıtıyla güncellenir. Sürüm pinleri ve kısıt `android-dependencies.gradle` içindedir; aktif iş akışının ürettiği uygulama Gradle dosyası bunu uygular. Resmî sürüm notları: [Mobile Ads](https://developers.google.com/admob/android/rel-notes), [AndroidX Fragment](https://developer.android.com/jetpack/androidx/releases/fragment).
- Önceki bağımlılık yolları UMP 4.0.0 → Play Services Basement 18.9.0 → Fragment 1.1.0 ve Games 21.0.0 → Play Services Base 18.5.0 → Fragment 1.0.0 idi. Yalnızca doğrudan SDK sürümünü değiştirmek yerine derlemede gerçekten seçilen Fragment sürümü de denetlenir; eski sürüm seçilirse CI durur.
- Araç zinciri AGP **8.13.2**, Gradle **8.13** ve JDK **17** olarak güncellenir. `compileSdk`/`targetSdk` **36**, `minSdk` **24** (Android 7) olarak korunur.
- CI, çözümlenen bağımlılık grafiğini, `dependencyInsight` çıktısını ve SDK doğrulama raporunu `KaraDugum-v6.41-SDK-REPORTS` artifact'ında saklar. TEST/LIVE paket arşivlerinde de `*-sdk-dependencies.json` raporu bulunur; bu raporlar AAB'nin içine eklenmez. Play Console'daki 6.36/96 paketine ait uyarı, etkin paket yenisiyle değiştirildiğinde Console tarafından yeniden değerlendirilir.
- Oyun kaynağında üç görünür sürüm metni dışında değişiklik yapılmaz; bölümler, yerel/bulut kayıt biçimi ve kazanılmış ödüller korunur. Native SDK API kullanımı incelenmiştir; Android derlemesi ve SDK güncellemesinin gerçek reklam sunumu, Google hesabı ve mevcut kurulumun üzerine güncelleme davranışı ayrıca doğrulanmalıdır.

## v6.40 — Ekrana uyarlanan tahta ve Kadim Taş kontrastı

- Oyun alanı kullanılabilir ekran genişliğine uyarlanır. Güvenli alanlar, üst bilgiler ve alt eylemler için yer ayrılır; 4×4–8×8 tahtalar kalan alanda kare biçimini koruyarak büyür. Kısa yatay ekranlarda da düğmeler tahtanın altında erişilebilir tutulur.
- Kadim Taş temasının taş zemini daha koyu ve nötr görünür; altın borular ve çerçeve kendi renklerini korur. Ortak taş çizimi oyun, mekanik gösterimi, başlangıç örneği, atölye ve tema önizlemelerine aynı zemini taşır. Diğer beş temanın renkleri korunur.
- Bölüm üretimi, kazanılmış ödüller, oyun kayıtları ve reklam birimleri bu görünüm değişikliğiyle değişmez. Ekran boyutu/güvenli alan ve kontrast kontrolleri tarayıcıda yapılır; bütün fiziksel telefonlarda aynı sonucu garanti etmez. Android WebView, ekran çentiği ve cihazın sistem çubukları ayrıca gerçek cihazda kontrol edilmelidir.

## v6.39 — Alınabilir ödül göstergeleri

- Mağazanın günlük ödülü, ücretsiz çark hakkı ve tamamlanmış reklamlarla zaten kazanılmış ek çark hakkı görünür sayaçlarla belirtilir. Ana menüdeki mağaza girişi de hazır ödül sayısını gösterir.
- Günlük/haftalık görevler ve son hazineleri, alınabilir başarımlar ve yolculuk ödülleri ilgili giriş ve ekranlarda sayılır. Yalnızca gerçekten alınabilir, henüz alınmamış ödüller gösterilir; ücretli ürünler ve tamamlanmamış reklam teklifleri hazır ödül sayılmaz. Ödül miktarları ve kayıt biçimi korunur.
- Göstergeler ödül alımı, hesap/kayıt değişimi ve ekran dönüşlerinde yenilenir. Gün değişimi için sonraki yerel gece yarısına tek zamanlayıcı kurulur; sürekli sorgulama eklenmez. Yeni rozet metinleri mevcut 25 dilin tamamında karşılık bulur.

## v6.38 — Uzun oturum ve telefon uyumluluğu kontrolü

- Hareketli engeli takip eden dokunuşlar da diğer hamleler gibi en fazla 120 geri alma kaydı tutar. Önceden bu dalda sınır yoktu; uzun oturumda bellek gereksiz büyüyebiliyordu. Bölüm 22 ve 292 için 500 engel takibi, 500 normal dönüş ve iki farklı geri alma yolu regresyon testine alındı. Bölüm üretimi ve kayıt biçimi değişmez.
- Yatay tabletlerde tahtanın alt düğmeleri gerçek kalan alana göre yerleştirilir. Çok kısa yatay ekranlarda ayarlar/görevler ve günlük giriş ödülü erişilebilir kalır; metin ve eylemler korunur. Tablet regresyonu dokuz boyutta, üç dil ve üç yazı tipiyle 542 geometri kontrolü yapar.
- `npm run test:performance`: 320×568 / DPR 1 / 6×, 360×800 / DPR 2 / 4× ve 412×915 / DPR 3 / 1× sentetik işlemci profilleri; altı tema, 4×4–8×8 tahtalar, 15 mekanik, efekt tercihleri, menü geçişleri ve 2000 dokunuş sonrası kayıt/bellek kontrolleri. `PERF_PROFILES=standard-mid` tek profili seçer. Çıktı varsayılan `/tmp/kd-mobile-performance/report.json`; `PERF_OUT` ile değişir. Süre ölçümleri sabit bir CI geçme eşiği değildir.
- `npm run test:mobile-layout`: dokuz ekran boyutu, Türkçe/İngilizce/Arapça ve dört ışık/hareket tercihiyle 108 yerleşim kombinasyonu. Farklı yazı tipleri, dokunma hedefleri, ekran döndürme, ayarlar/görevlerin ekrana sığması ve mağaza/profilde kaydırarak erişim denetlenir.
- `npm run test:workshop-performance`: 5×5 çift enerji/yönlü akış atölyelerinin gerçek dokunuş maliyetini üç işlemci/DPR profilinde ayrı ölçer.
- Bu kontroller resmi Playwright Chromium üzerinde yapılır. CPU yavaşlatması gerçek telefon, Android WebView, RAM/GPU, ısınma veya ANR ölçümü değildir. En az Android 7 gerekir; eski veya güncellenmemiş WebView sürümleri modern JavaScript/CSS özelliklerini desteklemeyebilir. Gerçek reklam/Google hesabı ve fiziksel cihaz doğrulaması ayrıca yapılmalıdır.

## v6.37 — Oynanış düzeltmeleri ve yeni hedefler

- Cihaz saati geriye kaydığında oyun süresi sıfırın altına düşmez; günlük sonuç ve ilk zafer ödülü geçerli kalır. Gerçek saat geri çekme regresyonları bulunur.
- Anahtar etkinleştirmesi artık tamamlanma kontrolünü de çalıştırır. Bağlantıları son anahtardan önce biten 156/201 gibi bölümler aynı dokunuşta sonuçlanır; ödül bir kez verilir. Mevcut 300 bölümün üretim tohumları, çözüm düzenleri ve kayıt biçimi korunur.
- İlk oyuncu için oyunu engellemeyen GÖSTER/ATLA daveti ve bağımsız, üç hamlelik 2×2 uygulama eklenir. Ayarlar başlığındaki yardım düğmesi örneği yeniden açar. Tamamlanmış veya yarım oynanmış kaydı olan oyuncuya zorla gösterilmez.
- Günün Bulmacası, bugünkü ilk zafer için 10 kristal ve 25 XP verir. Tarih ve hesap başına immutable `dailyfirst` makbuzu kullanılır; tekrar, eski tarih veya mevcut geçmiş kayıtları geriye dönük ödül üretmez. Günlük kayıt/cüzdan kesintileri sahipli journal ile onarılır. Normal bölüm ilerlemesi ve günlük/haftalık normal galibiyet sayaçları değişmez. Son 30 gün takvimi ve 7/30 farklı tamamlanan gün rozetleri vardır.
- Uygun yeni günlerde, yalnızca erişilebilir mekaniklerle iki farklı tür çözme ve mevcut eksik yıldızını geliştirme görevleri seçilebilir. Gün içinde mevcut görev değiştirilmez. Yeni ilerleme sıfır kaynaklı, tekil kazanım makbuzlarıyla bulutta birleştirilir; öğretici yıldız gelişimi tür çeşitliliğine sayılmaz.
- Mevcut XP ile 5/10/20/35 seviyelerinde kalıcı unvan/çerçeve seçenekleri açılır. Açılımlar mevcut XP'den türetilir; envanter veya bulut şeması değişmez. Görünüm seçimi, başlangıç örneği tercihi ve atölye ilerlemesi bu cihazda hesap başına ayrıdır; normal oyun ilerlemesi gibi bulutla taşınmaz.
- Bölümler içindeki Mekanik Atölyesi, iki ayrı enerji kaynağını doğru hedeflere bağlama ve tek yönlü akış için toplam altı ayrı 3×3–5×5 bulmaca sunar. Kampanya kayıtlarını, kristal/XP'yi veya sıralamayı değiştirmez; reklam içermez. Mevcut ana bölümlerdeki kurallar korunur.
- 7×7/8×8 tahtalarda isteğe bağlı odak görünümü tahtaya daha çok yer ayırır. Hücreler, hamle/geri alma geçmişi, süre ve kaynaklar korunur; görünüm değişikliği ilerlemeye yazılmaz. Bağlantı/süre etiketleri ve ayar dokunma alanları iyileştirilir; öğretim ve yeni arayüz metinleri 25 dilde sağlanır.
- UI kayıt yazması başarısızsa görünür Kayıt bekliyor durumu, sınırlı bellek kuyruğu ve tekrar kaydetme sunulur. Kuyruk yalnız aynı sahibin anahtarlarına yazılır; daha yeni kayıt ezilmez. Bekleyen bellek yazısı uygulama kapanınca kalıcı sayılmaz; kullanıcıya tekrar denemesi bildirilir. Kritik bulut işlem journal'ları, kalıcı yazma başarısızken işlemi durduran sözleşmesini korur. Kişisel veri içermeyen tanı raporu yalnız cihazda oluşturulur.
- Reklamla kazanılan mevcut puan/XP/kristal davranışı korunur. Dünya sıralaması puanının yalnız beceriyi ölçmesi, ayrı bir puan geçişi ve mevcut skorlar için ürün kararı gerektirir.

Yeni kontroller: `key-completion`, `daily-growth`, `onboarding-save`, `learning-focus`, `workshop` ve `mechanic-quests` testleri. Kaynak testleri, tarayıcı senaryoları ve native Java karşılaştırmaları GitHub Actions'ta çalışır. Gerçek telefon, gerçek Google hesabı/reklam sunumu ve Google Play yayını ayrıca doğrulanır.

## v6.36 — Mekanik ustalığı ve yayın paketleri

Mekanik ustalığı geliştirmesi bu sürüme alınmıştır. Son doğrulama, `npm test`, 24 tarayıcı paketi, 641 Java/JavaScript bulut örneği ve yerel Java kimlik/onay/reklam sıklığı kontrollerini kapsar.

- Bölümler ekranındaki açılır Mekanik Ustalığı kartı, 15 özel kural ailesinde tamamlanan ve üç yıldızla bitirilen bölümleri gösterir. Bir türdeki tüm bölümler üç yıldızlıysa o türde ustalık tamamlanır. İlk 10 öğretici ayrıdır; özel türler toplam 290 bölüm içerir.
- `mechanic-progress.js` normal bölüm kayıtlarından salt okunur ilerleme çıkarır. Yeni sayaç, ödül, para hareketi veya bulut şeması eklenmez. Adlar ve açıklamalar mevcut oyun motorunun kendi mekanik tanımlarından alınır.
- Bulmaca türü seçimi mevcut Tümü/Açık/Tamamlanan/Eksik yıldız filtreleriyle birlikte çalışır. Karttan seçim listeyi filtreler; bölüm başlatmaz veya yarım kalan tahtayı değiştirmez. Bölge kısayolu ve Filtreleri temizle, iki filtreyi de sıfırlar. Hesap değişince önceki mekanik seçimi taşınmaz.
- Yeni etiketler 25 dilde hazırlanmıştır; seçenekler de açıkça yerelleştirilir. Kartlar varsayılan olarak kapalıdır ve yalnızca Bölümler ekranında hesaplanır; oyun sırasında zamanlayıcı/sorgulama çalışmaz.
- Mekanik kontrolleri `tests/mechanic-progress-audit.cjs` ve `tests/mechanic-progress-browser-audit.cjs` içindedir. Filtreler, kilitler, yarım kalan tahta/kaynaklara dokunmama, hesap değişimi ve 25 dilde yerleşim denetlenir.
- Otomatik ana dal derlemesinde test paketi önce hazırlanır ve yüklenir; ardından canlı yapılandırmayla temiz Android derlemesi yapılır. Her iki APK aynı mevcut sertifikayla ayrı ayrı doğrulanır. `scripts/stage-release.cjs`, üretilen BuildConfig içindeki paket adı, sürüm, sürüm kodu, reklam modu ve birim kimliklerini kontrol eder; farklı mod veya eski derleme yanlış etiketle paketlenmez. Arşivdeki build-info.json, kaynak commitini ve dosya SHA-256 değerlerini içerir. `tests/release-package-audit.cjs` iki modun ayrılığını ve hatalı yapılandırmaların reddini denetler.
- Gerçek telefon, gerçek Google Play Oyunlar/AdMob sunumu ve AdMob panelindeki mesaj yayını bu otomatik kontrollerle doğrulanmaz. Google Play yayını panel üzerinden ayrıca yapılır.

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

### v6.21
Ayarlar tanıtım metni ve yedekleme bağlantısı kaldırıldı, dikey/yatay ekrana sığan düzen eklendi. Mağazaya görünür +15 kristal reklam kartı geri eklendi. Tüm tahta boyutlarında boruların pahalı SVG gölge filtreleri kaldırıldı ve hücre boyamaları sınırlandı; tema dokuları ve metal borular korundu.

### v6.22
Bölüm 18 / Gece Tapınağı ekran kaydında görülen beyaz taş flaşı kaldırıldı. Dokulu arka planı her karede değiştiren animasyon ve basılı taş filtresi yerine sabit kenar vurgusu kullanılır; ışık izi ayarı korunur. Hamle sesleri bittikten sonra Web Audio düğümleri bağlantılarını bırakır.

### v6.23 — İlerleme ve ödül dengesi
- Çözülebilirlik ve kayıt uyumluluğu için 300 bölümün taş dizilimi/özel kuralları korunur. Hamle sınırlı bölümlerde pay ilk 30 bölümde %50 (en az 12), 31–75 arası %40, devamında %30 (en az 10) olur; hedef hamle sayısı değişmez.
- Bölüm 1–15 / 16–30 / 31–75 / 76–150 / 151–300 için taban kristal 2 / 3 / 6 / 8 / 10. İki yıldız +1, üç yıldız +3 verir. Reklam yalnızca o çözümün normal ödülünü ikiye katlar.
- Her ardışık 50 bölüm için bir defa: 50=150 kristal+2 ipucu, 100=200+2, 150=250+2, 200=300+2, 250=350+2, 300=400+5. Alt bölümler eksikse ödül açılmaz. Eski kayıtlarda hak edilmiş ödüller sonraki bölüm çözümünde teslim edilir. Kayıt kesilirse hazırlanmış ödül işlemi sonraki açılışta tamamlanır.
- Dört günlük görev grubu: 3 çözüm/40 hamle/1 kusursuz; 2 çözüm/30 hamle/3 dakika; 4 çözüm/60 hamle/5 dakika; 2 çözüm/1 kusursuz/25 hamle. Süre yalnızca tamamlanan bulmacalardan sayılır; görevler 40–55 kristal kazandırır. O gün başlamış eski görevler korunur; yeni günde grup ve başlangıç sayaçları yenilenir.
- Altı tema fiyatı ve 5/15/30 ipucu paketlerinin 225/600/1050 kristal fiyatları değişmez. Üç yıldızla 300 ilk çözümün toplam normal kazancı 3345 (önce 2580), altı yolculuk ödülü 1650 kristal: toplam 4995; günlük/reklam/tekrar kazançları hariç. Bu hesap oyuncu davranışı ölçümü değildir; kapalı test geri bildirimleriyle yeniden değerlendirilmeli.
- Yeni tarayıcı denetimi: `tests/progression-audit.cjs`; 50'lik ödüller, tekrar/yeniden açılış/yarım kayıt, dört görev grubu, eski tarihli ve yinelenen talepler.

### v6.24 — Sıradaki hedef ve günün zaferi
Oyuncu merkezi ve bölümler ekranında sıradaki 50 bölüm ödülü, gerçek tamamlanan bölüm sayısı ve kalan ilerleme gösterilir. Eksik önceki bölümler ödülü açmaz; hak edilmiş ödül karttan teslim alınabilir. Altı ödül alındığında ustalık kartı gösterilir.
Günün üç görev ödülü toplandıktan sonra, ayrı karttan tek seferlik +20 kristal ve +1 ipucu alınabilir. Ana menü rozeti bu hazır ödülü de sayar. Sadece görev hedeflerinin tamamlanması bonusu açmaz; üç ödülün de alınması gerekir. Gün değişimi, tekrar tıklama, yeniden açılış ve yarım kalan kayıt için kontroller vardır. Ana görevlerin 40–55 kristal ödülüne ek olarak günlük toplam 60–75 kristal ve 1 ipucu elde edilebilir.
Yeni test: `tests/goals-finale-audit.cjs`.

### v6.25 — Tek başarımlar merkezi
Oyuncu merkezi ve ödül penceresi aynı 12 hedefi, ilerlemeyi ve alınma durumunu kullanır. Eski `first/ten/fifty/hundred/threehundred/perfect` ödül anahtarları ve 5/15/40/80/300/25 kristal tutarları korunur. Yeni hedefler: 25/150/200/250 bölüm (25/100/125/150 kristal), 25 kusursuz çözüm (60 kristal) ve 7 günlük seri (50 kristal).
Ödüller profil kartlarından da alınır; hazır ödül sayısı ve alınmış/kilitli durumları görünür. Kaydedilen en yüksek ilerleme, kazanılmış başarımın seri bozulunca kaybolmasını önler. Aynı ödülü farklı ekranlardan isteme, tekrar tıklama, yeniden açılış ve yarım kalan kayıt için ortak işlem kaydı kullanılır.
Test: `tests/achievements-audit.cjs`.

### v6.26 — Mekanik gösterimleri ve yıldız hedefleri
Yeni bir mekanik ilk kez açıldığında küçük, geçilebilir bir gösterim daveti görünür; doğrudan oynamak da daveti kapatır. Önceden o türden bölüm tamamlamış oyunculara tekrar gösterilmez. Soru işareti ile gösterim, ★★★ düğmesi ile gerçek hamle/süre hedefleri tekrar açılabilir. Örnekler tahtanın kopyasında çalışır; hamle, ipucu, kaynak ve kayıtlı bulmaca değişmez. Gösterim penceresinde süre durur; arka plan, geri ve Escape ile kapanışlar korunur.
Yıldız hesaplama kuralları değişmez: 2 yıldız için hedef hamlenin en fazla %135'i, ipucusuz ve geri almasız çözüm; 3 yıldız için en fazla %108 ve `max(35, hedef×3+10)` saniye. Gösterilen tam sayı sınırları bu hesaplardan üretilir. Bölüm sonu bu dört üç-yıldız koşulunun karşılanıp karşılanmadığını gösterir. Yeni test `tests/learning-audit.cjs`.

### v6.27 — Günün Bulmacası
Ana menüde ve bölümlerde ayrı günlük meydan okuma girişi bulunur. Yerel takvim gününe göre `daily-v1|YYYY-MM-DD` tohumuyla herkes için aynı 5×5 tahta üretilir; 15 mekanik sırayla dönüşür. Gün değişiminden önce başlanan deneme, bitirildiği gün değişmiş olsa da başladığı tarihe yazılır.
Günlük kayıt, devam eden ana bulmacadan ve 300 bölüm ilerlemesinden ayrıdır. Ana tahtaya dönüş taşları, süreyi, ipuçlarını ve açık oturumdaki geri alma geçmişini geri getirir. Günlük deneme yeniden açılabilir; tekrar oynamak aynı tahtayı üretir. Her denemede 3 ücretsiz ipucu vardır; ana ipucu kuponları ve kristaller harcanmaz. Günlük çözüm normal puan/XP/kristal/başarım/görev kazancına veya bölüm açılmasına dönüşmez; ödül reklamı sunulmaz.
Günlük en az hamle ve en iyi süre ayrı ayrı saklanır; ilgili çözümde yardım kullanıldıysa gösterilir. Yıldız, çözüm/deneme sayısı ve son 7 günlük başarı da görünür. Bunlar cihazdaki kişisel kayıtlardır; çevrim içi sıralama veya sunucu saat doğrulaması kullanılmaz.
Test: `tests/daily-challenge-audit.cjs`; 45 günün gerçek kurallarla çözülmesi, aynı tohumun yeni hesapta eşleşmesi, ana kayıt/ekonomi/geri alma, ipuçları, yeniden açılış, gün değişimi ve ekran boyutları.

### v6.28 — Hesaba bağlı tam bulut kayıt
- `cloud-model.js` ve Android `CloudMerge.java`, aynı işlem kimliklerini ve büyüyen cihaz sayaçlarını birleştirir. Kristal/XP/ipuçlarının toplamını veya en yüksek ham bakiyeyi seçmez. Normal kazanımlar, paket/tema alımları, kullanılan kuponlar, reklam makbuzları ve günlük/başarım/yolculuk ödülleri işlem günlüğündedir.
- Her gerçek Google Play Oyunlar oyuncu kimliği için ayrı yerel model ve kayıt kullanılır. İlk yeni kayıt mevcut yerel veriyi bir kez içeri alır; mevcut bir bulut hesabı varsa onun başlangıç bakiyesi esas alınır, ikinci telefonun başlangıç parası eklenmez. İlk geçişin yerel yedeği saklanır. **İlk eşitlemeyi mevcut ilerlemenin bulunduğu telefondan yapın ve diğer cihazları da v6.28 veya üstüne güncelleyin.** Eski, işlemlere ayrılmamış iki farklı bakiyenin geçmişini sonradan güvenilir biçimde çıkarmak mümkün değildir.
- Yeni tam kayıt ayrı `karadugum_full_v1` Saved Games yuvasındadır. İlk açılışta eski `karadugum_progress_v1` ilerlemesi okunup içeri alınır; eski uygulama sürümleri yeni ekonomik işlem günlüğünü silemez.
- Aynı harcanabilir parayla iki çevrimdışı cihazda yapılan çakışan satın almalardan yalnızca birleşik bakiyenin karşılayabildikleri geçerli olur; sahiplik ve bakiye birlikte düzeltilir, geçersiz tema seçimi altına döner. Cihazda önceden kullanılmış bir ipucunun etkisi geri alınamaz; cüzdan negatif yapılmaz. Bu istemci günlüğü, sunucuda doğrulanan hile koruması veya gerçek para satın alma sistemi değildir.
- XP, tema sahipliği/seçimi, kuponlar, başarımlar, alınmış ödüller, tarih bazlı görev ilerlemesi, günlük rekorlar, en hızlı/en az hamle değerleri ve mekanik öğreticisi kayıtları eşitlenir. Açık normal/günlük bulmaca da taşları, hamleleri ve kalan ipuçlarıyla kaydedilir. Oynanan tahta gelen kayıtla aniden değiştirilmez; menüdeyken uygun devam kaydı uygulanır. Oturum içindeki geri alma geçmişi önceki kayıt biçimindeki gibi bellektedir.
- Kaynak işlemi küçük, kalıcı bir yerel günlükle önce kaydedilir; yarım kalan görünüm güncellemesi yeniden açılışta veya tekrar bildirimiyle onarılır. Gecikmiş reklam, doğru hesaba yazılmadan Android makbuzu silinmez. Misafir reklam makbuzları ilk bağlandıkları hesaba sabitlenir.
- Profilde bulut durumu ve manuel eşitleme bulunur; ayarlar ekranı değişmez. Tahta otomatik kayıtları en fazla 30 saniyede bir bulut gönderimi planlar, menü/arka plan ve tamamlanan ödüller de eşitleme başlatır. Eşitleme tamamlanmadan uygulama verilerini silmek yerel, gönderilmemiş değişiklikleri kaybettirebilir. Google Saved Games kapasitesi aşılırsa bulut yazımı durur ve yerel kayıt korunur; işlem geçmişi sessizce kesilmez.
- Testler: 640 Java/JavaScript karşılaştırma örneği; 100 rastgele birleştirme sırası; beş tarayıcı cihazı/dört hesap; tekrarlanan talepler, çevrimdışı harcama, kısmi yazma, hesap değişimi, gecikmiş reklam, görev/çark/başarım/yolculuk ödülü ve açık tahta. Gerçek Google Play Oyunlar hesabında iki fiziksel cihazla uçtan uca kontrol ayrıca yapılmalıdır.

### v6.29 — Telefon yedeğinden dönüşte ayrı cihaz kimliği
- Android kurulum kimliği rastgele oluşturulur ve `getNoBackupFilesDir()` altında tutulur. Telefon yedeği yeni cihaza aktarıldığında WebView kayıtları kopyalansa bile yeni kurulum kendi kimliğini kullanır. Aynı kurulumda yeniden açılış ve uygulama güncellemesi kimliği değiştirmez; donanım kimliği okunmaz.
- Eski cihazın galibiyet/hamle/süre ve günlük deneme sayaçları korunur; iki telefondaki yeni ilerleme ayrı sayaçlara yazılır. 6.28'de kopyalanan aynı sayaç kimliği, örneğin toplam 6 galibiyeti 5 olarak birleştirebiliyordu.
- Hazırlanmış sayaç günlükleri kaynak cihaz kimliğini içerir. 6.28 biçimindeki günlükler, cihaz kimliği değiştirilmeden önce kaynaklarıyla etiketlenir. Eski kaynak kurtarıldığında yeni cihazın ilk kaydı eski hazırlanmış ilerlemeyi ezmeden önce kalıcı modele yazılır. Kristal/XP işlemleri ve mevcut bölüm ilerlemesi korunur.
- Yeni denetimler: `tests/InstallationIdentityAudit.java` (kimlik sürekliliği, farklı kurulumlar, eşzamanlı erişim, bozuk kimlik ve yazma hatası) ve `tests/installation-restore-audit.cjs` (gerçek oyun sayfasında kopyalanmış WebView kaydı, eşzamanlı sayaçlar, günlük denemeler, eski günlük ve anında yeniden açılış). Toplam 17 tarayıcı test paketi çalışır. İki fiziksel telefon/Google Play Oyunlar ile uçtan uca doğrulama ayrıca gereklidir.

### v6.30 — Bağlantı geri geldiğinde otomatik eşitleme
- Bağlı Google hesabıyla çevrimdışı oynarken kazanımlar ve kayıtlar cihazda korunur; `navigator.onLine` bağlantı olmadığını bildirdiğinde kayıt gönderimi yapılmaz. Profilde çevrimdışı durum görünür ve eşitleme düğmesi bağlantı gelene kadar kapalıdır.
- `online` bildirimi geldiğinde 350 ms beklenerek art arda gelen ağ bildirimleri birleştirilir. Güncel Android köprüsünde Play Games hesabı sessizce yeniden kontrol edilir; gerçek oyuncu kimliği gelmeden bekleyen kayıt gönderilmez. Bu sırada kazanılan yeni ödüller de yerelde tutulur. Hesap değişmişse her hesaba yalnızca kendi kaydı gönderilir; önceki hesabın bekleyen kazanımı onun arşivinde korunur.
- Oyun arka plandayken bağlantı gelirse kontrol görünür olana kadar bekler. Periyodik sorgulama yapılmaz; uygulamanın normal arka plana geçiş kaydı korunur. `state()` bulunmayan eski köprülerde yalnızca daha önce doğrulanmış bağlı hesapla eşitleme denenir. Misafir kaydı ağ bildirimi nedeniyle kendiliğinden bir hesaba bağlanmaz. Ağ bildirimi, sunucunun erişilebilirliğini garanti etmez; SDK hatasında yerel kayıt korunur ve profilden tekrar eşitlenebilir.
- Yeni test `tests/cloud-reconnect-audit.cjs`: çevrimdışı kazanım, bağlantıda otomatik gönderim, yinelenmeyen ödül, sorgulama döngüsü olmaması, arka plan/çoklu ağ bildirimi, geciken Google kimlik kontrolü, hesap değişimi ve eski köprü. Toplam 18 tarayıcı test paketi vardır. Gerçek ağ/Google Play Oyunlar ile fiziksel cihaz doğrulaması ayrıca gerekir.

### v6.31 — Gösterim tahtası, yıldız düğmesi ve tam ekran görevler
- Mekaniği keşfet tahtası altı temada gerçek oyunla aynı taş atlasını, boru kalınlığını/renklerini ve çerçeveyi kullanır. Etkilenen kare işareti taş dokusunu düz arka planla örtmez. 4×4–8×8 örneklerinde ve ilk/ikinci katman gösteriminde ana oyun taşlarını, hamleleri veya kaynakları değiştirmez.
- Üç yıldız hedefi düğmesi üç simgenin genişliğini ayırır; yardım düğmesinin tek simgelik genişlik kuralından ayrılmıştır. Simgeler düğmenin veya ekranın dışına taşmaz.
- Günlük görevler ekranı tam yüksekliğe yerleşir. Üç görev, son ödül ve dönüş düğmesi kaydırmadan görünür. Küçük dikey ekranda kompakt, yatay ekranda iki sütunlu düzen kullanılır; ödül hesapları ve alma koşulları korunur.
- `tests/lesson-quest-layout-audit.cjs`: altı temada doku/boru eşitliği, beş tahta boyutu ve iki gösterim aşaması, oyun verisine dokunmama, altı ekran boyutunda yıldız düğmesi ve dört görev grubu, 25 dil/RTL yerleşimi, gerçek görev/son ödül butonları. Toplam 19 tarayıcı test paketi vardır.

### v6.32 — Açık gösterimde tema güncellemesi
- Mekanik gösterimi açıkken bulut kaydı seçili temayı değiştirirse gösterim de ana tahta ile birlikte güncellenir. Aynı tema çizim yolu yalnızca oyun tahtasını ve açık gösterimi yeniler; mağazadaki altı bağımsız tema önizlemesi kendi renklerini korur.
- Gösterimin seçilmiş aşaması, kopyalanmış bağlantıları ve kare işaretleri korunur. Tema yenilemesi hamle, ipucu, puan/XP veya kristal değiştirmez ve gösterimi başa almaz.
- Yeni test `tests/lesson-transition-audit.cjs`: mağazadan seçilen temanın yeniden açılışta korunması, açık gösterime gerçek `cloudSave` geri bildirimiyle altı tema uygulama, kopya taşlar/aşama/oyun verisinin korunması, bağımsız mağaza önizlemeleri, mobil dokunmatik ekran benzetiminde açık gösterim ve görev penceresiyle yatay/dikey geçiş, duraklatılmış süre ve geri hareketi. Toplam 20 tarayıcı test paketi vardır.

### v6.33 — Haftalık görevler
- Günlük görevlerle aynı tam ekran görünümde Günlük/Haftalık sekmeleri bulunur. Haftalık hedefler 15 normal bulmaca (40 kristal), tamamlanan bulmacalarda 400 hamle (30 kristal) ve 5 kusursuz çözüm (40 kristal). Üç görev ödülü alındığında son hazine 50 kristal ve 2 ipucu verir; toplam 160 kristal ve 2 ipucu.
- Hafta cihazın yerel takviminde pazartesi 00.00'da yenilenir. Yenileme tarihi ekranda gösterilir; önceki haftanın açık kalmış düğmesi yeni haftada ödül vermez. Sunucu saati doğrulaması yapılmaz. Normal bölüm tekrarları sayılır; günlük meydan okuma ve geçmiş toplam istatistikleri haftalık ilerlemeye eklenmez.
- Tamamlanan her normal oyun, mevcut bulut işlem günlüğünde kaynak değiştirmeyen ve oyun kimliğiyle tekilleştirilen bir kayıt oluşturur. İki cihazın haftalık ilerlemesi birleşir, aynı görev/son hazine yalnızca bir kez ödenir. Bulut şeması değişmez; önceki sürümler bu işlem kayıtlarını korur, yeni haftalık ilerleme için 6.33 gerekir. Misafir ilerlemesi hesaba bağlanınca sıfır kaynaklı kayıtlarla taşınır; başka hesabın haftalık ilerlemesi karışmaz.
- Misafir ödülü hazırlık günlüğü, yarım kalan kaynak yazımını yeniden açılışta tamamlar. Alınmış ödülün kalan hazırlık kaydı bakiyeyi yeniden yükseltmez. Taş döndürürken yeni sorgulama veya zamanlayıcı çalışmaz; kayıt yalnızca normal bulmaca tamamlandığında eklenir.
- Yeni denetimler: `tests/weekly-calendar-audit.cjs` (hafta/yıl sınırı, artık gün, yaz saati takvimi, kayıt tekilleştirme ve ödül bütçesi), `tests/weekly-quests-audit.cjs` (gerçek tahta çözümü, günlük ayrımı, yinelenmeyen ödeme, pazartesi yenilenmesi, yarım yazma, iki çevrimdışı cihaz, hesap değişimi/misafir aktarımı, 25 dilde üç ekran boyutu ve klavye sekmeleri). Toplam 21 tarayıcı test paketi ve 641 Java/JavaScript bulut karşılaştırma örneği vardır. Fiziksel telefonlar ve gerçek Google Play Oyunlar hesabıyla doğrulama burada yapılmamıştır.

### v6.34 — Reklam onayı ve oyun içi gizlilik
- Android, her açılışta Google UMP 4.0.0 ile onay bilgisini günceller ve gerektiğinde form gösterir. Mobile Ads başlatma, ödüllü/geçiş reklamı yükleme ve gösterme yolları SDK'nın `canRequestAds()` sonucuna bağlıdır. İlk açılışta bilgi alınamazsa reklam istenmez; geçerli önceki SDK izni varsa hata sonrasında yalnızca SDK'nın izin verdiği akış devam eder. Özel bir yerel “onay verildi” bayrağı yoktur. UMP formu oyun başladıktan sonra açılırsa bölüm saati durur; kapanınca yalnızca görünür oyun devam eder. Bilgi güncellemesinin ağda beklemesi tek başına oyunu durdurmaz.
- Ayarlarda Gizlilik Politikası bağlantısı bulunur. Reklam tercihleri düğmesi yalnızca UMP gerekli olduğunu bildirdiğinde görünür; form açıkken kapalıdır. Tercihler açılırken önceden yüklenen reklamlar temizlenir. Eski yükleme geri bildirimleri, etkinlik kapanışı ve önceki formdan geciken bildirimler yeni durumu değiştiremez. Var olan ödül makbuzları, cüzdan ve bölüm ilerlemesi korunur.
- Gizlilik politikası APK içine paketlenir ve internet olmadan ayrı, JavaScript ve oyun köprüsü içermeyen bir Android penceresinde açılır. Politikadaki HTTPS/e-posta bağlantıları kullanıcının dokunuşuyla uygun dış uygulamaya yönlendirilir. Tarayıcı önizlemesinde aynı HTML ayrı sekmede açılır. Yeni ayar etiketleri 25 dilde bulunur; altı ekran boyutunda, iki gizlilik kontrolü görünürken de ayarlar kaydırmadan sığar.
- Reklam birimleri `BuildConfig` üzerinden alınır. `scripts/configure-ads.cjs` test ve canlı derlemeyi ayırır. Otomatik push derlemesi **TEST** paketidir; dosya adı da bunu belirtir. Kullanıcının sağladığı gerçek ödüllü (`…/9717078965`) ve geçiş (`…/7624294320`) birimleri `admob-units.json` içinde bulunur. İstenirse GitHub Actions değişkenleri `ADMOB_REWARDED_AD_UNIT_ID` ve `ADMOB_INTERSTITIAL_AD_UNIT_ID` ile değiştirilebilir. Canlı derleme için Actions → KaraDugum Android APK → Run workflow → `ads_mode: live` seçilir. İki alan da `ca-app-pub-6340528165840202/…` biçiminde bu uygulamanın yayıncısına ait farklı reklam birimi kimlikleri olmalıdır. Uygulama kimliği (`~` içeren değer), boş/hatalı değer, farklı yayıncı, Google örneği ve aynı iki birim reddedilir. Canlı mod test kimliklerine sessizce dönmez.
- Gerçek birimler canlı derleme yapılandırmasına bağlandı; otomatik test derlemesi Google test birimlerini kullanır. AdMob → Gizlilik ve mesajlaşma bölümünde uygulamaya uygun mesajların oluşturulup yayımlanması da hesap sahibi tarafından yapılmalıdır. SDK entegrasyonu bu konsol ayarını kendiliğinden oluşturmaz. Gerçek cihazda/bölgede UMP formu ve gerçek reklam sunumu burada doğrulanmamıştır; Google Play yüklemesi yapılmamıştır.
- Geçiş reklamı çözüm sırasında/sonuç ekranı açılırken istenmez; normal bölüm sonucundaki Sonraki Bölüm eyleminde değerlendirilir. En az üç uygun normal geçiş ve iki dakika bekleme gerekir; ilk iki bölüm/ilk iki dakika, tekrar oyna ve günlük meydan okuma bu gösterimi başlatmaz. Ödüllü video gösterimi/kapanışı da beklemeyi sıfırlar. Süre, cihaz saatini değiştirmekle hızlanmayan monotonik saatle ölçülür. İpucu videosunun geçerli tamamlanma makbuzu tam bir kupon verir; iptal/başarısızlık vermez, aynı makbuz harcanmış kuponu geri getirmez.
- Yeni testler: `tests/InterstitialCadenceAudit.java` (geçiş sayısı, iki dakika aralığı, ilk bölümler ve ödüllü video sonrası bekleme), `tests/AdConsentGateAudit.java` (izin/form/hata/önbellek/tekrar/gecikme/etkinlik kapanışı), `tests/ad-config-audit.cjs` (canlı birim doğrulaması ve paketleme), `tests/privacy-settings-audit.cjs` (yerel köprü, görünürlük, bekleyen form, hata, politika, oyun kaydına dokunmama, 25 dil ve altı ekran boyutu). Toplam 22 tarayıcı paketi vardır; 300 bölüm ve 641 Java/JavaScript bulut örneği korunur.

### v6.35 — Reklam ödülünün doğru hesaba bağlanması
- Play Games kimlik kontrolü yeni sonuç beklerken Android'deki oyuncu kimliği boşaltılır. Bu arada başlayan kristal/ipucu videosu eski yolda boş sahipli bir makbuz üretebiliyor; video sonrasında hesap değişmişse ödül o anda açık olan hesaba yazılabiliyordu. Oyun ekranındaki hesap artık istek anında, benzersiz istek kimliğiyle yeni `rewardedAccountRequest` Android köprüsüne geçirilir. SDK kimliği boş veya eski olsa da tamamlanma makbuzu isteği başlatan hesabı taşır.
- Aynı kalıcı makbuz ve bulut işlem biçimi kullanılır. Geciken ödül kendi hesabının arşivine yazılır; açık diğer hesabın cüzdanı değişmez. Yinelenen makbuz, yeniden açılış ve misafir kaydının ilk hesaba taşınması mevcut tek-ödeme kurallarını korur. Hesap değişince önceki ipucu videosunun arayüzdeki bekleme işareti temizlenir. Ödül miktarı, reklam kimlikleri, onay/sıklık kuralları, bölümler ve ana menü tasarımı değişmez.
- Eski Android köprüleri için önceki metotlar desteklenir; yeni hesap bağlama düzeltmesi güncel JavaScript ve Android köprüsünü birlikte içeren 6.35 APK'sında çalışır. Yerel yöntem çağrısı başarısızsa kupon/kristal verilmez ve ipucu düğmesi beklemede kalmaz.
- `tests/ad-owner-audit.cjs`, düzeltmeden önce boş SDK kimliğiyle başlayan Alice videosunun Bob'a 15 kristal verdiği hatayı yeniden üretmiştir. Düzeltmeden sonra gerçek mağaza/ipucu düğmeleri, boş/eski SDK kimliği, hesap değişimi, ters sırada gelen makbuzlar, bir kupon, tekrar/yeniden açılış, yeni köprünün tek başına bulunması, eski köprü, misafir aktarımı ve köprü hataları denetlenir. Toplam 23 tarayıcı paketi vardır. Google Play'e yükleme ve fiziksel cihazda gerçek AdMob testi bu adımda yapılmaz.
