# KARA DÜĞÜM 6.51 (113) üretim AAB raporu

| Paket bilgisi | Değer |
| --- | --- |
| Dosya | `KaraDugum-6.51-113-LIVE.aab` |
| Uygulama kimliği | `com.orynexa.karadugum` |
| Sürüm | `6.51` · sürüm kodu `113` |
| Android | Minimum SDK 24 · hedef SDK 36 |
| Dosya boyutu | 14.805.481 bayt |
| AAB SHA-256 | `42f1b7b6c11a5c8ffe998de2cf5ba92a9182c38ace9298ae9a55d97c49db14c9` |
| Yükleme sertifikası SHA-256 | `351b49b72bfc09ebb317769832319eadca9ded6dae709daeb8314719a53dee9e` |
| Onaylanan oyun kaynağı | `eff10987f4e4a72409fa5db1ec25dd9f505b05ce` |
| Derleme commit’i | `3b96ad5ed8a019de2f690ed9d9f22d9a85ef2352` |
| Teslim dalı | `release/6.51-113-production` |

[İmzalı AAB ve Android doğrulama dosyaları](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44725182546/artifacts/14622534508) · [Derleme koşusu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44725182546) · [6.50 ve 6.51 paket karşılaştırması](production-comparison.json)

## Derleme ve paket güvenliği

- `bundleRelease`, `lintRelease`, `checkReleaseAarMetadata` ve çözülmüş SDK bağımlılık doğrulaması geçti. 84 çözülmüş modül doğrulandı. Google Mobile Ads 25.5.0, UMP 4.0.0, Play Games v2 22.1.0 ve Fragment 1.9.1 beklenen sürümlerle eşleşti.
- Bundletool 1.18.3 doğrulaması ve manifest incelemesi geçti. Derlemenin birleştirilmiş manifesti ve imzalı AAB’nin base manifesti paket kimliği, 6.51 (113), SDK değerleri, AdMob uygulama kimliği ve `AD_ID` izni açısından eşleşti.
- Derleme `LIVE` kipinde ve `ADS_TEST_MODE=false`. AAB’nin DEX dosyalarında iki üretim reklam birimi bulundu. İkisi de mevcut 6.50 AAB’nin birimleriyle aynı. Google test reklam kimliği bulunmadı. Reklam isteği ve reklam gösterimi denenmedi.
- Mevcut 6.50 (110) AAB’nin SHA-256 özeti `9c43bd047dee9f305fc1d0897a3353c773ffa1b4a11ee2cca2519726bca017cf`. İki AAB’deki gerçek sertifikalar karşılaştırıldı ve Google Play yükleme sertifikası eşleşti. Jarsigner ve bağımsız CMS/SHA-256 kontrolü geçti. 6.50’nin 258 ve 6.51’in 280 paket girdisinin tamamı imzalı manifestteki özetlerle eşleşti. Bu kontrol dağıtım APK’larını Google’ın imzaladığı Play App Signing sertifikasını kapsamaz.
- 6.51 paketi hata ayıklama ve `testOnly` kipleri kapalı ve şifresiz ağ trafiği kapalı olarak derlendi. Dışarı açılan bileşenler 6.50 ile eşleşti. Tek izin farkı, RC3’te onaylanan titreşim için eklenen `android.permission.VIBRATE`. AAB’de imzalama anahtarı, sembolik bağlantı veya yinelenmiş ZIP girdisi bulunmadı.
- Oyun, arayüz ve varlık dosyalarının 62’si, kullanıcının gerçek POCO’da onayladığı RC3 TEST APK ile bayt düzeyinde eşleşti. Android’in derleme profilleri AAB’de paket meta verisi olarak yer alıyor. Oyun kaynakları onaylanan commit’ten alındı.

## Oyun regresyonları

| Kontrol | Sonuç |
| --- | --- |
| Bölümler ve temalar | 300 bölüm yasal ipucu hamleleriyle tamamlandı. Altı temada 1.800 oyun tahtası, farklı tahta boyutları, boru maskeleri ve enerji renkleri geçti. |
| Dil ve yerleşim | AAB’den çıkarılan içerikle 25 dilde 125 çıkış yerleşimi, 150 dil/tema karşılaştırması ve 25 yerelleştirilmiş yeniden açılış geçti. Arapça, Urduca ve Farsçada RTL doğrulandı. Yerleşik 25 dilin dışında 17 cihaz dili İngilizceye döndü. |
| Tema satın alma | AAB’den çıkarılan içerikle beş ücretli tema, 75 yerleşim, harcamasız iptal, yetersiz bakiye, sekiz yazma kesintisi ve bulut makbuzu tekrarları geçti. |
| Hazine Günlük Ödülü | Çevrimdışı kayıt kesintisi, yeniden açılış ve aynı bulut verisinin yeniden alınması regresyonları geçti. Çevrimdışı ileri tarih değişimi güvenilir sunucu saati olmadan doğrulanamaz. |
| Kayıt ve bulut | Yerel kayıt, ilerleme, satın alma hakları, hesap ayrımı ve eşitleme senaryoları geçti. Bulut regresyonları beş bağımsız tarayıcı bağlamı ve örnek hesaplarla çalıştırıldı. |
| Işık İzi, öğretici, ses ve titreşim | 62 paket varlığının eşleşmesiyle Işık İzi, öğretici ve ses/titreşim bileşenleri doğrulandı. 25 dil ve 204 öğretici yerleşimi, bağımsız ses/titreşim tercihleri ve native titreşim köprüsü testleri geçti. |
| Sinematik çıkış | AAB’den çıkarılan içerikle iptal, kaydetme hatasından sonra yeniden deneme, yeniden açılış ve Geri Al geçmişi geçti. Android geri tuşu ve kenar hareketi daha önce aynı kaynaklı TEST APK’da API 35 emülatöründe doğrulanmıştı. Kullanıcı gerçek POCO’da RC3 çıkış ekranını ve geri tuşunu onayladı. |

[RC3 Android WebView kanıtları](https://github.com/MhmTBsr60/KaraDugum/blob/14231a5d34164e57c0d650eed5713f0c3acb496a/test-builds/cinematic-exit-6.51/README.md)

## Uyarılar ve doğrulama sınırları

Lint 0 hata ve 8 uyarı ile tamamlandı. Bunlar iki WebView API uyumluluk uyarısı, senkron tercih yazımı, eski Android sürümlerinde geri hareketi manifest özniteliği, WebView JavaScript, çizim sırasında nesne ayırma ve iki görsel/View uyarısından oluşuyor. JavaScript, paket içi oyun sayfasına gereken işlevleri sağlıyor. Oyun WebView’ının gezinme kuralı paket içi `index.html` ile sınırlı. Dosya URL’lerinden evrensel erişim kapalı.

Jarsigner kendinden imzalı sertifika, zaman damgası ve JAR akış okuma düzeni uyarılarını raporladı. Aynı uyarı türleri 6.50 AAB’de de görüldü. İki pakette de CMS imzası ve her paket girdisinin SHA-256 özeti ayrıca doğrulandı.

Gerçek POCO doğrulaması RC3 TEST APK’ya ait. Bu AAB’nin Google Play dağıtımı, üretim reklam gösterimi ve canlı Google Play Games hesabıyla eşitleme bu teslimde denenmedi. Teslim üretim dalı ve derleme arşiviyle sınırlı.
