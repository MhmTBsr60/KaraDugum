# KARA DÜĞÜM · Dört katmanlı Enerji Dalgası

[14 saniyelik MP4](energy-wave-14s.mp4) · [Beş sahne](five-scenes.png) · [Dört katman ayrı ayrı ve birlikte](four-layers.png) · [Önceki ve yeni oyun, aynı ölçekte](before-after.png)

Sahneler gerçek 4×4 Bölüm 6 tahtasından alındı. Video bağlantı kurmayı, iki kıvrımdan geçen enerjiyi, sabit ışığı, bağlantının kopmasını, geri almayı ve tamamlanma dalgasını gösteriyor. Tahta, gerçek oyun tıklamalarıyla oynatıldı. Önizleme için test kaydı ve denetimli zaman kullanıldı.

| Sahne | Tam ekran |
| --- | --- |
| Işık İzi kapalı | [860×1864 PNG](01-light-off.png) |
| Enerji kanalı | [860×1864 PNG](layer-channel.png) |
| Hareketli dalga | [860×1864 PNG](02-new-connection.png) |
| Genişleyen kıvrım halkaları | [860×1864 PNG](03-bend-rings.png) |
| Tamamlanma dalgası | [860×1864 PNG](05-completion.png) |

## Kök neden ve yeni çizim

Önceki Canvas, kaplanan bölümün altın izini ve hareketli beyaz çizgiyi aynı profil içinde oluşturuyordu. İz, dalga geçtikten sonra düşen opaklığa bağlıydı. Sonuçta boru boyunca görülen beyaz-altın kanal erkenden kayboluyor, kısa ve parlak bir uç kalıyordu. Boru kıvrımı SVG ile aynı yolun ikinci bir yaklaşık hesabından geliyordu. Halka dokusunun parlak bölgesi geniş yayıldığı için kıvrımda ince ışık kenarı yerine yumuşak bir leke oluşuyordu. Kalıcı ışık her animasyon karesinde yeniden çiziliyordu.

| Katman | Çizim |
| --- | --- |
| Enerji kanalı | SVG yolunu örnekleyen, boru iç genişliğine göre kesilen bir doku. Çapraz renk geçişi sıcak altın kenardan beyaz merkeze uzanır. Kanal, dalganın eriştiği borular boyunca açılır ve dalga ucundan daha uzun görünür. |
| Hareketli dalga | Kanalın üzerinde ayrı bir şerit. Parlak tepe öne alınır. Genişlik ve opaklık, bağlantı ağı boyunca alınan mesafeye göre değişir. |
| Kıvrım halkaları | Gerçek SVG dirseğinin yarı uzunluğuna bağlı dar ışık kenarı ve yumuşak saçılma. Yalnızca iki tarafı bağlı kıvrımlar halka üretir. |
| Kalıcı aydınlatma | Karşılıklı bağlı kolların hafif ışığı ayrı bir yüzeye önceden çizilir. Kopan bağlantının sabit kalan tarafında ışık 240 ms içinde söner. |

Düz ve çok kollu parçalar yalnızca motorun eşlediği portlara kadar aydınlanır. Kıvrımlar gerçek SVG yolundan örneklenir. Katmanlar ayrı yönetilir ve aynı sunum Canvas’ında birleşir. Azaltılmış hareket ve düşük donanım yalnızca kalıcı ışığı gösterir. Kalıcı ışık yüzeyi animasyon sırasında bir kez kopyalanır. Renk dokuları ve halka fırçaları tekrar kullanılır.

## Örnek 3 ile farklar

Örnek 3’te beyaz çekirdek, doygun altın omuzlar ve birkaç ince halka birbirini tamamlıyor. Yeni çizim bu üç özelliği ayırıyor. Eski ve yeni oyun görselleri aynı tahta genişliği, aynı taş aralığı ve aynı bağlantılarla yakalandı. [Ölçek doğrulaması](scale-proof.json)

Referansın özgün dosyası çalışma alanına aktarılmadı. Sohbetteki görsel üzerinden değerlendirme yaptım. Özgün yakın planı yerel olarak seçip komşu taş merkezlerinin aralığını girdiğinde iki görüntüyü eşit taş ölçeğinde gösteren bir sayfa hazırladım. [Karşılaştırma sayfasını indir](reference-scale.zip)

Referanstaki metal daha koyu ve hacimli. Kristal uçlar, metal manşetlerdeki yansımalar ve taş üzerindeki turuncu ışık daha güçlü. Oyunda mevcut SVG boru, uç ve taş çizimleri kullanılıyor. Bazı bağlantı eklerinde kanalın sınırı daha keskin. Bu nedenle görsel eşleşme tamamlandı sayılmıyor. Kullanıcı bu önizlemede akışı, kanal genişliğini ve halka karakterini ayrı ayrı değerlendirebilir.

## Doğrulama

- 18 kaynak test grubu geçti. 300 bölüm yasal ipucu hamleleriyle tamamlandı. Çizicinin kullandığı 7.566 bağlantı motorun karşılıklı bağlantılarıyla eşleşti. [Kaynak sonuçları](tests/source.log) · [Enerji denetimi](tests/wave-audit.json)
- Altı temada bağlantı, kopma, geri alma ve Işık İzi açma/kapatma geçti. Piksel karşılaştırmasında parlak kesit iç kanal genişliğinin yaklaşık %80–84'ünü kapladı. Beyaz ışık borunun dışına taşmadı. Aynı oyuna ait izole katmanların her biri görünür piksel değişimi üretti. [Tema pikselleri](tests/pixel-proof.json) · [Katman pikselleri](layer-pixel-proof.json)
- Kayıt, öğretici ve ses/titreşim regresyonları geçti. Öğretici matrisi 25 dilde 204 adımı ve 60 tahta boyutu karşılaştırmasını kapsadı. Ses ve titreşim için otomatik testler çalıştı. [Öğretici](tests/tutorial.log) · [UX ve geri bildirim](tests/ux.log)
- Chromium 7×7 ve 8×8 sentetik CPU ölçümünde Canvas çizim p95 değeri en çok 13,6 ms, en uzun tek örnek 32,5 ms oldu. Düşük donanım profili boşta animasyon döngüsünü durdurdu. [Ölçümler](tests/chromium-performance.json)
- Android 35 sistem WebView görünürlüğü doğrulandı. Android’in gerçek ekran görüntülerinde dört katman ayrı ayrı fark üretti. Beyaz ışık merkezi iki kare arasında yaklaşık 96 piksel ilerledi. İzole halka, çevresindeki 24 açısal dilimin 22’sinde ölçüldü. Eski geniş halo ölçümü bu ince çizimde 20 yüksek eşikli dış piksel beklerken 10 buldu. Halka şekline dayanan ölçüm ve ekran görüntüsü görünürlüğü doğruluyor. [Android ekranı](tests/android/wave-middle.png) · [Katman ölçümleri](tests/android/layer-surface-proof.json)
- Android performans adımı geçmedi. Emülatör 4×4, 7×7 ve 8×8 için 4, 8 ve 9 çizim örneği topladı. Gözlenen en uzun Canvas çağrı süresi 9,7 ms oldu. Örnekler, senaryo başına en az 10 ölçüm eşiğinin altında kaldı. Bu yüzden Android kare hızı veya telefon akıcılığı doğrulanmış sayılmıyor. [Android ölçümü](tests/android/webview-performance.json) · [CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44544485353)

Fiziksel POCO testi yapılmadı. Bu teslim, `design/energy-wave-layered-preview-20261119` dalındaki görsel önizlemedir. Ürün tarafında `pipe-flow.js` ve enerjiye ait `pipe-flow.css` değişti.
