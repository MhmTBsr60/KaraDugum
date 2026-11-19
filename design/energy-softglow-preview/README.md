# KARA DÜĞÜM — Örnek 3 yakın planına göre enerji önizlemesi

Bu teslim yalnızca gerçek oyun motorundan görsel ve animasyon önizlemesidir. TEST APK/AAB hazırlanmadı; main, Hazine dalı, Google Play, AdMob ve mağaza görselleri değiştirilmedi.

Kaynak dal: `design/energy-wave-softglow-preview-20261119`.
Ürün çizimi: `4969544930c81f4e9b9eb7aa9eda4598f593cbb7`.
Test edilen kaynak ve native girdi doğrulaması: `bb3159336d641a4c761ee294c710645fb677965b`.
Son teslim commit'i bu dosyanın Git geçmişindedir; son commit yalnızca önizlemeleri ve kanıtları ekler.

## Büyük görseller ve video

- [12 saniyelik MP4 — 860×1864, 24 kare/sn](energy-softglow-12s.mp4)
- [Dört durumu birlikte gösteren büyük görsel](four-states.png)
- [1. Bağlantı kurulmadan önce](01-before.png)
- [2. Hareket eden geniş beyaz-altın enerji](02-wave-middle.png)
- [3. Dalga geçtikten sonra bağlı borular](03-connected.png)
- [4. Bölüm tamamlama dalgası](04-completion.png)
- [Önceki oyun / yeni oyun — aynı gerçek durum](before-after.png)
- [Kıvrım yakın planı](new-softglow-detail.png)
- [320×568 küçük ekran](small-320x568.png)
- [Android 35 WebView gerçek Surface ekranı](android-webview/wave-middle.png)

Bütün sahneler gerçek Bölüm 1 ve gerçek boru geometrisidir. Video gerçek düğüm tıklamaları, bağlantı kurulması, kopma/geri alma ve motorun doğruladığı tamamlanmayı gösterir; ipucu tüketmez. Tekrarlanabilir yakalama için test oyuncusu, zaman ve donanım profili denetlenir. Gerçek oyuncu kaydı kullanılmaz.

## Referansla karşılaştırma

Kullanıcının yakın plan özgün Örnek 3 görseli görsel olarak incelendi. Özgün ekin indirilebilir bitmap kopyası çalışma alanında bulunmadığından onu varmış gibi birleştirmedik. `before-after.png` açıkça önceki gerçek oyun sürümü ile yenisini karşılaştırır; özgün referans değildir.

| Referans özelliği | Gerçek oyun çizimi |
| --- | --- |
| Geniş, sıcak altın omuzlar ve yoğun beyaz merkez | İç kanalın %84'ünü kaplayan erişilmiş dalga; çok katmanlı altın geçiş ve parlak beyaz çekirdek. İnce hareketli çizgi yaklaşımına dönülmedi. |
| Kıvrımlarda saydam, yumuşak dış haleler | Sert hedef benzeri çemberler yerine merkez ve dış kenarı saydam, 21 alfa seviyeli halkasal radyal fırça. Küçük bağlantı noktası çemberleri kaldırıldı. |
| Işığın kıvrımı izleyerek ilerlemesi | Motorun karşılıklı bağlantı maskeleri ve gerçek boru yolları kullanılır; darbe bileşen boyunca sıralanır. Dalga sonrası hafif sabit aydınlatma kalır. |
| Metal dış hat ve siyah taşın korunması | Metal/taş çizicileri değiştirilmedi; geniş beyaz dolgu iç kanalda, yumuşak halo sınırlı dış bölgede kalır. |
| Güçlü tamamlanma dalgası | Motor kazanmayı doğrulayınca sıralı, süreyle sınırlı dalga gösterilir. |

Bu uygulama referansın enerji dilini gerçek oyunun mevcut geometrisine taşır; referanstaki S borusunu, mücevher uçlarını veya taş görsellerini oyunun mekaniklerini değiştirerek kopyalamaz.

## Test sonuçları

| Kontrol | Sonuç ve sınır |
| --- | --- |
| `npm test` | 18 test grubu geçti. Bölümler/çözümler, ipucu, arayüz sözleşmeleri, kayıt/bulut modeli, ödül, reklam yapılandırması, native hesap/bulut geri çağrıları denetlendi. Bu testler canlı Google hizmetlerine giriş doğrulaması değildir. |
| Öğretici regresyonu | İlk kurulum/mevcut oyuncu, atlama/tamamlama/yeniden açma, kayıt/geri alma/ekonomi; 25 dilde 204 adım yerleşimi ve TEST3’e karşı 60 tahta boyutu karşılaştırması geçti. |
| Yeni enerji denetimi | 300 bölüm ve 7.566 gerçek bağlantı; motor/çizici eşleşmesi geçti. Altı temada bağlanma, kopma, geri alma, kapat/aç ve kaynak tüketmeme doğrulandı. |
| Altı tema piksel testi | Hepsinde geniş beyaz dolgu ve kıvrım dışı halo görünür. Altın temada 4.416 ek beyaz piksel, 328 dış halo pikseli; izin verilen halo dışındaki değişim %0. |
| Gerçek fırça | Çizimde kullanılan 96×96 fırça yakalandı: saydam merkez/dış kenar, 21 farklı alfa seviyesi, tepe alfa 185/255. Altı temada geçti. |
| Android 35 / WebView 124 | Gerçek ADB dokunuşlarıyla altı tema, aç/kapat, kopma, geri alma ve motor tamamlanması geçti. Bağımsız Surface görüntü testinde 2.927 ek beyaz piksel, 205 dış halo pikseli ve dalga merkezinde 70,35 piksel ilerleme ölçüldü. |
| Hareketi azalt / düşük donanım | Sabit hafif ışık; halka/dalga ve boşta sürekli animasyon döngüsü yok. |
| 7×7 / 8×8 performans | Chromium sentetik 1×/4× CPU testinde çizim p95 en çok 5,1 ms; en yüksek örnek 5,6 ms. Fiziksel telefon FPS sonucu değildir. |
| Küçük ekran | 320×568 kontrolde taşma yok; erişilmiş kanal en az 7,56 CSS piksel. |
| Önce/sonra tutarlılığı | Aynı Bölüm 1, aynı hamle, aynı motor maskeleri, aynı test zamanı kullanıldı. |

[Android CI çalıştırması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44514030905), [Surface piksel kanıtı](android-webview/surface-proof.json), [enerji denetimi](wave-audit.json), [tema piksel kanıtları](pixel-proof.json), [performans ölçümleri](performance.json), [kaynak ve medya kanıtları](delivery-proof.json).

Tam 43 grupluk tarayıcı paketi bu küçük çizim revizyonunda yeniden çalıştırılmadı; başarılı sayılmıyor. Güncel kaynak testleri ve yukarıdaki hedefli kontroller yeniden çalıştırıldı.

## Performans ve koruma sınırları

Tek ürün dosyası `pipe-flow.js` değişti. Önceki `21575de` çizim sürümüne göre diğer takipli çalışma zamanı dosyaları birebir aynı: motor, kayıt/bulut, ses/titreşim, öğretici, ödül/reklam ekonomisi, tema/tahta çizicileri ve native uygulama değiştirilmedi.

Yeni parçacık motoru, büyük görsel veya pahalı shadowBlur yok. En çok altı adet 96×96 prosedürel fırça, toplam en fazla 216 KiB RGBA önbellek kullanır. Yoğun tahtalarda iki ek renk omuzu atlanır. Sonlu animasyon mevcut hız/süre sınırlarını korur.

**Fiziksel POCO testi yapılmadı.** Android doğrulaması sistem WebView test uygulamasında kaynak sayfa ve gerçek Surface çıktısıyla yapıldı; oyunun yeni APK'sı oluşturulmadı. Native ses/titreşim, canlı reklam, satın alma ve gerçek Google bulut servisleri bu önizlemede uçtan uca yeniden denenmedi. Telefon üzerinde görsel beğeni ve akıcılık ayrıca onaylanmalıdır.
