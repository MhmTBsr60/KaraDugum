# KARA DÜĞÜM 6.51 RC1

- Üretim referansı 6.50 (110), aday AAB 6.51 (111), TEST APK `6.51-rc1-test` (111).
- Uygulama kimliği `com.orynexa.karadugum`. Android en düşük API 24, hedef API 36.
- Derleme kaynak commit’i `686fc0b`. [GitHub Actions doğrulaması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44707287039)
- [İmzalı TEST APK](KaraDugum-6.51-RC1-TEST.apk) · [SHA-256](SHA256SUMS)

## Birleştirme ve sürüm farkı

| Kaynak | Sonuç |
| --- | --- |
| `main` `0acb75b` → onaylanan dil dalı `9811357` | Aday dalında çakışmasız ileri sarma. TEST3’ün boru içi enerji sistemi, ödül kurtarma kaydı ve oyun değişiklikleri bu geçmişte. |
| Hazine dalı `10d5c86` | `3473195` birleştirmesinde `index.html` ve `tests/daily-treasure-audit.cjs` çakıştı. Oyun girişinde TEST3’ün kayıt defteri üzerinden tek ödeme ve yalnızca yeni ödeme sonrası gösterim akışı, testte ise güncel kayıt koruma denetimleri tutuldu. |
| Hazine görseli ve sunumu | `daily-treasure.js`, `daily-treasure.css` ve sandık görseli Hazine dalıyla birebir eşleşiyor. Yedi ödülün miktarları ve türleri korundu. |
| TEST3 → RC1 | 25 dil, 586 referans anahtar, canlı dil değiştirme ve RTL’de sabit tahta/kontrol sırası; paketleme doğrulaması, sürüm kodu 111, kaynakta karşılığı bulunmayan eski stil bağlantısının temizlenmesi. |

## AAB hazırlık raporu

Adayın üretim modundaki AAB’si CI’da derlendi ve doğrulandı. Teslimde Google örnek reklam birimleri kullanan TEST APK ve AAB kanıtları bulunuyor. AAB manifesti mevcut uygulama kimliğini, 111 sürüm kodunu, API seviyelerini ve reklam kimliği iznini doğruluyor. APK ve AAB’deki oyun dosyaları kaynakla bayt düzeyinde karşılaştırıldı.

Yükleme sertifikasının SHA-256 parmak izi `351b49b72bfc09ebb317769832319eadca9ded6dae709daeb8314719a53dee9e`. Aday AAB, saklanan 6.50 üretim AAB’si ve TEST3 üzerine kurulan TEST APK bu parmak iziyle eşleşti. Google Play’in cihazlara dağıttığı uygulama imzalama sertifikası ayrı bir Play Console değeri. Üretim AAB’sindeki yükleme sertifikası ve TEST3 üzerine güncelleme bu teslimde doğrulanan iki yol.

`bundletool` doğrulaması, `jarsigner`, manifest, lint ve sabit Android SDK bağımlılık denetimleri geçti. Aday AAB SHA-256 değeri manifest raporunda kayıtlı. [Manifest ve AAB SHA-256](aab-readiness/manifest-verification.json) · [Paketlenen dosyalar](aab-readiness/aab-assets.json) · [Çözümlenen SDK’lar](aab-readiness/release-sdk-dependencies.json)

## Regresyonlar

| Denetim | Sonuç |
| --- | --- |
| 300 bölüm | Gerçek ipucu hamleleriyle 300 çözüm. Altı temada 1.800 tahta. |
| 25 dil ve altı tema | 150 canlı dil/tema karşılaştırması, 25 yeniden açılış, 586 anahtar ve yer tutucu denetimi. |
| Kayıtlar ve satın alma hakları | Yerel kayıt, bulut modeli, altı tema sahipliği, kristal ve kuponlar geçti. Emülatörde TEST3, veri temizlenmeden önce ayrı süreçte açıldı ve üstüne aday kuruldu. |
| Hazine ve günlük ödül | Yedi ödül, 25 dilde 300 yerleşim, çevrimdışı/tarih senaryoları. Paketlenmiş oyun dosyalarında 14 yazma kesintisi ve iki örnek eşzamanlı hesap senaryosu geçti. |
| Öğretici ve ses/titreşim | 204 öğretici yerleşimi, APK içindeki gerçek dört adım ve kayıt koruması, bağımsız ses/titreşim ayarları ve native yardımcı testleri geçti. |
| Android 35 WebView | İmzalı TEST3 üzerine kurulum, ilerleme ve sahip olunan altı tema. Türkçe, İngilizce, Arapça ve Japoncada aynı tahta üzerinde canlı dil geçişi. |

Kapsam Android 35 emülatörü ve otomatik tarayıcı testleri. Fiziksel telefon testi ve gerçek Google Play Games hesabıyla bağlantı bu kapsamın dışında. Canlı bulut aşaması örnek hesap ve yerel modelle denetlendi. Üretimdeki 6.50 (110) dosyası referans olarak okundu. Teslim yayın adayı dalında.
