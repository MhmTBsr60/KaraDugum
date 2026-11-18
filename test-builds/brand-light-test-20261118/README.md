# VORYNEXA ve Işık İzi TEST APK

Dal: `fix/vorynexa-light-trail-20261118`.
Temel: öğreticili `21b8c01` / `441d3f7`.
Sürüm: `6.50-brand-light-test1`, paket `com.orynexa.karadugum`, kod 110.

Kapsam yalnızca görünür marka adları ve dokunma ışığıdır. Kayıt, mekanik, ses, titreşim, reklam veya öğretici kaynakları değiştirilmez. Main birleştirmesi, AAB veya Play yüklemesi yapılmaz. Önceki TEST APK imzasıyla derlenir; Google örnek reklam kimlikleri kullanılır.

Eski marka tarandı: uygulamanın iki açılış metni, erişilebilirlik açıklamaları, Ayarlar altlığı, profil ve 25 dildeki metinler, uygulama içi gizlilik/veri silme belgeleri güncellendi. Eski paket/URL/e-posta/kayıt kimlikleri korunur. Tarihî tasarım dosyaları, yayımlanmış mağaza görselleri ve `scripts/capture-store-media.cjs` değiştirilmez.

Eski ışık geri bildirimi parlak SVG filamentinin saydamlığını yalnızca .82/.97 seviyesinden 1'e taşıyordu; özellikle yoğun/düşük performans statik yolunda az fark ediliyordu. Yeni tek HTML katmanı SVG yeniden çizildikten sonra eklenir: altın kenar ve hafif merkez, 140 ms saydamlık sönmesi. 7×7/8×8, düşük donanım, hareketi azalt ve animasyon API'si olmayan WebView yolunda kısa sabit vurgu vardır. Kapalı ayarda çizilmez ve aktif katman hemen temizlenir. Yeni motor, bitmap, ses/titreşim çağrısı veya kalıcı kayıt yazımı yoktur.

`tests/brand-light-trail-audit.cjs`: gerçek dokunma olayları, ekran görüntüsü piksel farkı, açık/kapalı/yeniden yükleme, 20 görünüm/cihaz profili, API fallback, marka ve kaynak koruması. CI aynı testi APK'dan çıkarılan gerçek dosyalarda ve öğretici akışını gerçek APK varlıklarında çalıştırır. Android WebView/POCO fiziksel doğrulaması yapılmış sayılmaz.

Başarılı CI sonrasında APK ve SHA256/test raporları bu klasöre kaydedilir.
