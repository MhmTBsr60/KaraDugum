# KARA DÜĞÜM 6.52 (115) üretim kontrolü

`KaraDugum-6.52-115-LIVE.aab` onaylanan `6d87a3b` kaynağından derlendi. Paket `com.orynexa.karadugum`, sürüm `6.52`, sürüm kodu `115`, hedef API 36. Derleme commit’i `9a7dcfd`. [İmzalı AAB ve kontroller](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44921363338/artifacts/14712814753)

- **İmza ve üretim yapılandırması.** 114 ve 115 AAB’lerinin gerçek yükleme sertifikası aynı. Her iki arşivin 280 imzalı girdisi doğrulandı. Manifest yalnızca sürüm adı ve kodunda değişti. İki üretim reklam birimi ve AdMob uygulama kimliği 114 ile eşleşti. Google test kimlikleri bulunmadı. [Paket karşılaştırması](production-comparison.json)
- **İçerik ve kayıtlar.** Fiziksel telefonda onaylanan TEST APK’daki 62 oyun dosyası üretim paketiyle bayt düzeyinde eşleşti. 114’ten bu yana değişen oyun dosyaları `onboarding.js` ve `onboarding.css`. Kayıt ve reklam makbuzu kodu ile tema hakları korundu. 300 bölüm, öğretici, kayıt kurtarma ve satın alma regresyonları geçti.
- **Android.** Release derlemesi, bundletool, manifest, bağımlılık ve imza kontrolleri geçti. Lint 0 hata ve 7 uyarı verdi. Android 16’da temiz kurulum ve 114 → 115 yükseltme testleri, aynı oyun dosyalarını kullanan TEST APK ile daha önce geçti. Fiziksel telefon onayı TEST APK’ya ait. [Android 16 doğrulaması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44916778639/attempts/2)

| SHA-256 | Değer |
| --- | --- |
| 115 AAB | `a4b503795197927c209174ca2014ff7293ce3d33474a6d0a23742f5093e7e67b` |
| Yükleme sertifikası | `351b49b72bfc09ebb317769832319eadca9ded6dae709daeb8314719a53dee9e` |

Teslim `release/6.52-115-production` dalında. `main` ve Google Play yayını değişmedi.
