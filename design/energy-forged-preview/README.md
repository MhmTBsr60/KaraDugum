# KARA DÜĞÜM · TEST2 metal ve enerji karşılaştırması

[TEST1 ve TEST2 yan yana](before-after.png) · [Kıvrım ve manşet yakın planı](metal-detail.png) · [Dört Bölüm 6 sahnesi](four-scenes.png) · [14 saniyelik MP4](energy-wave-14s.mp4)

Bu revizyonun başlangıcı TEST1 teslimi `dd29df6`. Karşılaştırma iki sürümde de gerçek Bölüm 6 tahtasını, aynı hamleleri, aynı bağlantıları ve aynı kamera ölçeğini kullanıyor. SVG boru yolları ve manşetlerin dış ölçüleri de eşleşti. [Karşılaştırma kanıtı](comparison-proof.json)

- Borunun kesitine koyu metal omuz ve kavis boyunca devam eden açık saten bant eklendi. Üstteki dar yansıma, düz ve kıvrımlı parçaları izliyor.
- Manşetlerin iç yüzeyi dış kenardan ayrıldı. İnce oluk, iki perçin ve ayrı ışık alan dudak manşetin derinliğini belirginleştiriyor.
- Gerçek kıvrım geçişi önce ana halkayı, ardından gecikmeli iç halkayı başlatıyor. İnce sıcak kenarın çevresinde yumuşak bir geçiş bulunuyor.
- Hareketli katmandaki taş yansıması borunun o andaki yönüne göre dönüyor. Taş sınırları ve metal maskesi çizgileri koruyor. Sahne durduğunda, Işık İzi kapatıldığında ve hareketi azaltma açıkken hareketli yansıma görünmüyor.

Sadece yansımayı ayıran aynı an karşılaştırmasında 5.267 ölçülebilir sıcak pikselin tamamı koyu taş üzerindeydi. Izgara üzerinde değişim eşiğini aşan piksel yoktu. [Piksel ölçümü](stone-pixel-proof.json)

| Bölüm 6 sahnesi | Tam ekran |
| --- | --- |
| Işık İzi kapalı | [PNG](01-light-off.png) |
| Akış, halkalar ve taş yansıması | [PNG](02-bend-rings.png) |
| Dalga sonrası sabit ışık | [PNG](03-settled.png) |
| Tamamlanma dalgası | [PNG](04-completion.png) |

## Testler

- Sekiz UX testi geçti. Oynanış ve kayıt testi, görsel SVG ayrıntıları yerine aynı boru yolunu karşılaştırdı. 128 ekran yerleşimi denetlendi. [UX sonuçları](tests/ux.log)

- 18 kaynak test grubu ve 300 yasal çözüm geçti. Altı tema ve 7.566 bağlantının motorla eşleşmesi doğrulandı. Açma/kapatma, kopma, geri alma, azaltılmış hareket ve düşük donanım senaryoları geçti. [Kaynak](tests/source.log) · [Enerji ve bağlantılar](tests/wave-audit.json) · [Tema pikselleri](tests/pixel-proof.json)
- Yalıtılmış Chromium ölçümünde 7×7 ve 8×8 Canvas çizim p95 değeri en fazla 9,3 ms, en uzun tek çağrı 31,5 ms oldu. Düşük donanım profili sabit ışıkta kaldı. [Performans](tests/chromium-performance.json)
- Öğretici testi 25 dilde 204 adımı ve 60 tahta boyutu karşılaştırmasını geçti. [Öğretici](tests/tutorial.log)
- TEST1 ve TEST2’nin Hazine tekrar koşuları 7 ödülü ve 25 dilde 300 yerleşimi geçti. İlk TEST2 koşusunda bir kez yeniden açılan ödül penceresi gözlendi. Bu koşuda ödül ve kayıt değerleri eşleşti. Tekrar koşusunda pencere yeniden açılmadı. [TEST1](tests/treasure-test1.log) · [TEST2](tests/treasure-test2.log) · [İlk koşu](tests/treasure-first-run.log)
- Android 35 WebView’de dört katman ve altı tema işlev kontrolleri geçti. Ekran çıktısında yansıma alanı içinde 3.877 sıcak taş pikseli, dışarıda sıfır ölçüldü. [Android görüntüsü](tests/android/wave-middle.png) · [Taş ölçümü](tests/android/stone-surface-proof.json)
- Android performans adımı geçmedi. Emülatör 4×4, 7×7 ve 8×8 için 4, 6 ve 6 örnek topladı. En uzun gözlenen çağrı 13,2 ms idi. Her senaryo için 10 ölçüm eşiğine ulaşılamadı. Bu ölçüm fiziksel telefonda kare hızı sonucu vermez. [Android ölçümü](tests/android/webview-performance.json) · [Android CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44627423825)

## İmzalı TEST2

[6.50-energy-finish-test2 APK](../../test-builds/energy-finish-test2-20261119/KaraDugum-6.50-ENERGY-FINISH-TEST2.apk)

APK kaynak commit’i `97d03ba`. Paket `com.orynexa.karadugum`, sürüm kodu 110. TEST1 ile aynı imza sertifikası doğrulandı. Android 35 emülatöründe TEST1 kaldırılmadan güncellendi. Önceki bulmaca, hamle, ilerleme, envanter, tercihler ve günlük ödül bilgileri eşleşti. Lint, imza ve paketteki öğretici kontrolleri geçti. APK Google test reklam kimliklerini kullanır. İlk CI denemesinde Maven JUnit isteği 429 döndürdü. Aynı kaynakla ikinci deneme geçti. [Üzerine kurulum kanıtı](../../test-builds/energy-finish-test2-20261119/upgrade-report.json) · [Sürüm ve SHA-256](../../test-builds/energy-finish-test2-20261119/build-info.json) · [APK CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44627423854)

Fiziksel POCO testi yapılmadı. Yeni geliştirme dalı `design/energy-wave-forged-metal-test-20261119`.
