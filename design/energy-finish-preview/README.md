# KARA DÜĞÜM · Enerji Dalgası son görsel önizlemesi

[14 saniyelik MP4](energy-wave-14s.mp4) · [Dört sahne](four-scenes.png) · [Önceki ve yeni Bölüm 6 yan yana](before-after.png)

Görseller aynı gerçek 4×4 Bölüm 6, aynı bağlantılar ve aynı görünüm ölçeğiyle alındı. Karşılaştırmanın üst sırasında metal yüzeyler görülür. Alt sırada enerji dalgası ve taş yansıması karşılaştırılır. Video gerçek motor hamlelerini, ışığın sönmesini, geri almayı ve tamamlanmayı gösterir.

| Sahne | Tam ekran |
| --- | --- |
| Işık İzi kapalı ve yeni metal | [860×1864 PNG](01-light-off.png) |
| Dalga, sıcak kıvrım halkaları ve taş yansıması | [860×1864 PNG](02-bend-rings.png) |
| Dalga sonrasında hafif sabit ışık | [860×1864 PNG](03-settled.png) |
| Tamamlanma dalgası | [860×1864 PNG](04-completion.png) |

Altın borularda koyu yan yüzey, ince üst yansıma, ışıklı manşet kenarı ve gölgeli bağlantı göbeği kullanıldı. Metal çizimi mevcut boru yollarını izler. Diğer temalar kendi renklerini korur.

Kıvrım halkalarının süresi gerçek dalga geçişiyle başlar. Sıcak kenar ve yumuşak dış geçiş okunurluğu artırır. Taş ışığı dört enerji katmanından hareketli dalgayla birlikte yürür. Taşların içindeki alanlar alıcı olarak maskelenir. Borular, manşetler ve ızgara aralıkları maskeden çıkarılır. Büyük tahtada en çok bir yansıma damgası kullanılır. Işık izini kapatma ve hareketi azaltma ayarları hareketli yansımayı kaldırır.

## Test sonuçları

- 18 kaynak test grubu ve 300 yasal çözüm geçti. Enerji denetiminde 7.566 bağlantı motorla eşleşti. Altı temada bağlantı kurulması, kopma, açma/kapatma, geri alma ve azaltılmış hareket kontrolleri geçti. [Enerji denetimi](tests/wave-audit.json) · [Tema piksel ölçümleri](tests/pixel-proof.json)
- Aynı Bölüm 6 karesini yansımalı ve yansımasız karşılaştırdım. 4.119 pikselde ölçülen sıcak ışık koyu taş üzerinde kaldı. Kullanılan eşiğin üzerinde ızgara pikseli değişmedi. [Taş piksel kanıtı](stone-pixel-proof.json)
- Öğretici, kayıt ve Hazine ödülü denetimleri geçti. Mevcut birleşik TEST’in Hazine dosyaları ve günlük tekrar alma koruması aynen alındı. [Öğretici](tests/tutorial.log) · [Hazine](tests/treasure.log)
- Chromium 7×7 ve 8×8, 1×/4× CPU ölçümünde çizim p95 en fazla 9,3 ms oldu. En uzun tek çağrı 34,2 ms. Düşük donanım profili sabit ışıkta kaldı. Eşzamanlı video yakalama altında ilk ölçüm 8×8 bütçesini aşmıştı. Video işleri bitince aynı eşikle yapılan yalıtılmış koşu geçti. [Chromium ölçümü](tests/chromium-performance.json)
- Android 35 WebView işlev ve görünürlük kontrolleri geçti. Ekran çıktısında dört katman ayrı ayrı ölçüldü. Hareketli katman, 3.175 sıcak taş pikseli üretti. Bu eşikte yansıma alanı dışında piksel bulunmadı. [Android ekranı](tests/android/wave-middle.png) · [Taş ölçümü](tests/android/stone-surface-proof.json)
- Android performans adımı geçmedi. Emülatör 4×4, 7×7 ve 8×8 tahtalarında sırasıyla 4, 6 ve 7 ölçüm aldı. En uzun gözlenen Canvas çağrısı 11,5 ms oldu. Her senaryoda en az 10 ölçüm beklendiğinden Android akıcılığı doğrulanmadı. [Android ölçümleri](tests/android/webview-performance.json) · [CI sonucu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44547850591)

## İmzalı TEST APK

[6.50-energy-finish-test1 APK](../../test-builds/energy-finish-test1-20261119/KaraDugum-6.50-ENERGY-FINISH-TEST1.apk)

Paket `com.orynexa.karadugum`, sürüm kodu 110. APK ve önceki 6.50-treasure-energy-test1 aynı sertifikayla imzalı. Android 35 emülatöründe önceki TEST kaldırılmadan üzerine kuruldu. Aktif bulmaca, hamle sayısı, ilerleme, envanter, tercihler ve günlük ödül kaydı karşılaştırıldı. Lint ve paketli öğretici testi geçti. Reklamlar Google test kimliklerini kullanır. [Üzerine kurulum kanıtı](../../test-builds/energy-finish-test1-20261119/upgrade-report.json) · [Sürüm ve SHA-256](../../test-builds/energy-finish-test1-20261119/build-info.json) · [APK CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44547851496)

Fiziksel POCO testi yapılmadı. Çalışma `design/energy-wave-metal-finish-test-20261119` dalındadır.
