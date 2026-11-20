# KARA DÜĞÜM 6.51 (114) güvenli üretim raporu

| Paket bilgisi | Değer |
| --- | --- |
| Dosya | `KaraDugum-6.51-114-LIVE.aab` |
| Uygulama kimliği | `com.orynexa.karadugum` |
| Sürüm | `6.51` · sürüm kodu `114` |
| Android | Minimum SDK 24 · hedef SDK 36 |
| Boyut | 14.806.564 bayt |
| AAB SHA-256 | `e253770e2424858a8066db27660f27a6e0abb21be521516acd9d5018c22f2efe` |
| Yükleme sertifikası SHA-256 | `351b49b72bfc09ebb317769832319eadca9ded6dae709daeb8314719a53dee9e` |
| Onaylı kaynak | `64cf4681b39c4a5c3ac1fcef8ba52cd6874e139b` |
| Derleme commit’i | `434ed30211fc7c28f34bccfbb5a9a78e78d86954` |
| Teslim dalı | `release/6.51-114-production` |

[İmzalı AAB ve Android doğrulama dosyaları](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44730919930/artifacts/14626087877) · [Üretim derlemesi](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44730919930) · [113 ve 114 paket karşılaştırması](production-comparison.json)

## Üretim paketi ve güvenlik

- AAB onaylanan `64cf468` kaynağından yeniden derlendi. 113, sertifika, reklam yapılandırması ve paket içeriğini karşılaştırmak için okundu. Mevcut 113 dosyasının SHA-256 özeti `42f1b7b6c11a5c8ffe998de2cf5ba92a9182c38ace9298ae9a55d97c49db14c9` olarak doğrulandı.
- Google Play yükleme sertifikası 113 AAB ile eşleşti. Jarsigner ve bağımsız CMS/SHA-256 doğrulamasında iki paketin 280’er imzalı girdisi kontrol edildi. Play’in dağıtım APK’larını imzaladığı uygulama sertifikası farklı bir kontroldür.
- Derleme `LIVE` ve `ADS_TEST_MODE=false`. İki üretim reklam birimi ve AdMob uygulama kimliği 113 ile aynı. DEX’te Google örnek reklam kimliği bulunmadı. Üretim reklam isteği veya gösterimi denenmedi.
- `bundleRelease`, `lintRelease`, `checkReleaseAarMetadata`, bundletool 1.18.3 ve imzalı AAB manifesti geçti. Çözülmüş 84 SDK modülü kontrol edildi. Hedef API 36, paket kimliği, sürüm kodu, `AD_ID`, `VIBRATE` ve dışarı açılan bileşenler doğrulandı. 113 ve 114 paket manifestleri yalnızca sürüm kodunda farklı. Hata ayıklama, `testOnly` ve şifresiz ağ trafiği kapalı. Pakette imzalama anahtarı bulunmadı.
- RC3 ile karşılaştırılan 62 oyun dosyasının 61’i bayt düzeyinde eşleşti. Tek değişen web dosyası hesaplı günlük ödül kurtarmasını içeren `cloud-sync.js`. DEX’te `RewardReceiptQueue` doğrulandı. Kuyruk, Android makbuzunu başarılı yazmadan sonra WebView’a iletiyor. Sinematik çıkış, Hazine ekranı, tema satın alma onayı, Işık İzi ve öğretici dosyaları RC3 ile eşleşti.

## Oyun ve kayıt regresyonları

| Kontrol | Sonuç |
| --- | --- |
| 300 bölüm ve altı tema | 300 bölüm yasal hamlelerle tamamlandı. Altı temada 1.800 tahtanın boru maskeleri, renkleri ve farklı tahta boyutları doğrulandı. |
| 25 dil | Üretim AAB’sinden çıkarılan dosyalarla 150 dil/tema karşılaştırması, 25 yerelleştirilmiş yeniden açılış ve 125 çıkış yerleşimi geçti. Arapça, Urduca ve Farsça RTL kontrol edildi. |
| Günlük ve reklam ödülleri | Yedi hesaplı yazma kesintisi, iki misafir kurtarma senaryosu ve aynı bulut işleminin yeniden alınması geçti. Kristal ve kupon tekrar eklenmedi. Reklam makbuzlarında hesap sahipliği, çift işlem ve bölüm ödülü regresyonları geçti. [Üretim dosyalarıyla günlük ödül testi](packaged-login.json) |
| Tema satın alma | Üretim dosyalarıyla beş ücretli tema, 75 yerleşim, sekiz yazma kesintisi, harcamasız iptal, yeniden uygulama ve bulut makbuzu tekrarı geçti. |
| Yerel kayıt ve bulut | Tahta, hamleler, kristaller, kuponlar, tema hakları ve tercihler test edildi. Örnek hesaplarla yerel kayıt, çevrimdışı işlemler ve bulut birleştirmesi geçti. |
| RC3 arayüzü | Sinematik çıkışta iptal, kaydetme hatası, yeniden açılış ve Geri Al kontrolleri geçti. Öğretici, bağımsız ses/titreşim tercihleri, çark ve kontrol yerleşimi regresyonları geçti. |
| Android 16 | `64cf468` kaynaklı TEST APK ile API 36 emülatöründe 110’dan 114’e aynı TEST imzasıyla veri silmeden yükseltme geçti. Yeni hamle, çıkıştan sonra geri alındı. Android makbuzunda başarısız kayıt simülasyonu, WebView kurtarması ve ikinci ödeme kontrolü geçti. [Tekrarlanan Android 16 koşusu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44729520429/attempts/2) · [Test kanıtları](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44729520429/artifacts/14625664521) |

## Doğrulama kapsamı

Release lint **0 hata ve 7 uyarı** verdi. Önceki Android makbuz yazma uyarısı kalktı. Kalan uyarılar WebView API/JavaScript, eski Android manifest özniteliği, çizim, simge ve View oluşturucusuyla ilgili. Jarsigner, 113’te de görülen kendinden imzalı sertifika, zaman damgası ve JAR akış okuma düzeni uyarılarını raporladı. İki paketin imzası ve girdi özetleri ayrıca doğrulandı.

Fiziksel Android 16 veya POCO, Play’den kurulu 6.50 üzerine gerçek üretim yükseltmesi ve canlı Play Games eşitlemesi bu teslimde denenmedi. Android 16 testi emülatörde ve sentetik kayıtlarla yürütüldü. 6.50’nin bellekte tuttuğu eski Geri Al adımları yükseltmeye taşınamaz. Çevrimdışı ileri tarih ve hiç başarılı kalıcı yazma olmadan kapanılan disk arızası sınırları önceki güvenlik raporunda açıklandı. [Kayıt güvenliği raporu](https://github.com/MhmTBsr60/KaraDugum/blob/d14aa498a6d7302f2d8804543dfbf35638efc29f/release-reports/6.51-reward-safety/README.md)
