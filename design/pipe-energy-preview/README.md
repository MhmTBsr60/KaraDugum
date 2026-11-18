# KARA DÜĞÜM — boru içi enerji tasarım önizlemesi

Dal: `design/pipe-energy-preview-20261118`. Çalışan tasarım kaynak commit'i: `25b2aa0`. Temel: `f4e9427`. **Main'e birleştirilmedi. Fiziksel POCO testi yapılmadı.**

- [Üç büyük tahta görüntüsü](three-states.png) — aynı gerçek bölümde normal hamleler: 3 → 4 → 11 karşılıklı bağlantı. İlk görsel tüm bağlantıların olmadığı bir başlangıcı değil, yeni üst-sol bağlantıdan önceki durumu gösterir.
- Tam ekranlar: [önce](01-before.png), [enerji akışı](02-flow.png), [çoklu bağlantı](03-connected.png).
- [12 saniyelik animasyon](energy-flow.mp4) · [kısa GIF](energy-flow.gif) · [görsel karşılaştırma sayfası](comparison.html).

## Davranış

Düğüm kutusunu aydınlatan eski dokunma parlaması devre dışı. Mevcut motorun `kdFastBoard.render` çağrısındaki güncel boru maskeleri ve `kdLessonPreview()` içindeki gizli düğüm bayrakları okunur. Karşılıklı port kuralı motorun `countValid()` kuralıyla 300 bölümde karşılaştırılır. `.good` sabit düğümü belirtir; bağlantı kaynağı olarak kullanılmaz. Ekrandaki geometrik yakınlık bağlantı oluşturmaz, çözüm maskesi okunmaz.

Yeni bağlantıda 900 ms kısa enerji geçişi, port birleşiminde küçük ışık ve eşleşen kolların içinde hafif sürekli aydınlatma vardır. T kavşağının açıkta kalan kolu parlamaz. Boru koparsa yeni enerji üretmez; değişmeyen komşu borudaki ışık 180 ms söner. Dönen parçanın eski çizgisi hemen kaldırılır. Gerçek `kdLastWin.id` ve kilit durumu bildirildiğinde bağlı grafikte BFS sırasıyla en fazla 2,2 saniyelik tamamlama enerjisi geçer. Ödül ve sonuç panelinin zamanlaması değiştirilmez; panelin kapattığı borular bu sırada kısmen örtülü kalabilir.

Altı temada mevcut renk ailesi korunur: sıcak altın, buz mavisi, kehribar, mor, zümrüt ve yakut vurgusu. Işık İzi kapalıyken Canvas kaldırılır. Hareketi azalt ve düşük donanımda yalnız sabit hafif ışık vardır; hareketli tamamlanma dalgası da çalışmaz.

## Teknik ve performans

Tek HTML-kök Canvas2D, boruların mevcut SVG merkez çizgilerine hizalanır. Boru şekilleri ve SVG metal malzemesi değiştirilmez. Canvas dokunmaları yakalamaz; modal ve öğretici panelinin üstüne çıkmaz. Son yerleşimden sonraki karede hizalanır; açıklama yüksekliği, ekran yönü ve boyut değişiklikleri izlenir. Yeni parçacık motoru, büyük görsel, animasyonlu blur veya SVG filtre eklenmez. DPR en fazla 1,5; hareketli çizim üst sınırı normal tahtada 30, 7×7–8×8'de 20 kare/saniye. Durgun durumda devamlı çizim yoktur.

[Sentetik performans raporu](performance.json): gerçek motorla çözülen 7×7 ve 8×8 tahtalarda, Chromium 1×/4× CPU yavaşlatması. Canvas çizim p95: 0,8–15 ms; en yüksek örnek 20,1 ms. Bu değerler telefon FPS'i değildir; son cihaz yükü ve GPU davranışı ayrıca doğrulanmalıdır.

[Android raporu](android-webview/pipe-flow-report.json): Android 35 emülatöründe gerçek MainActivity/file:///android_asset WebView, altı tema, normal Android MotionEvent, ışık aç/kapat, envanterin korunması ve 7×7–8×8 denetimi geçti. Emülatör düşük donanım yolunu kullandı; sabit çizim p95 0,5 ms ve durgun durumda sürekli kare yok. Hareketli enerjiye ait sentetik sonuç ayrı raporlanır; fiziksel POCO performansı ölçülmedi.

## Test kanıtları

- [Bağlantı testi](report.json): 300 bölüm/7.566 görünür fiziksel kenar, bağlanma/kopma/geri alma, gerçek ayar anahtarı, altı tema, 9 tahta-ekran eşleşmesi, son yerleşim + gerçek SVG merkez hizası, azaltılmış hareket, sonlu gerçek tamamlanma dalgası.
- Görünürlük: aynı bulmaca durumunda ışık açık/kapalı ekran görüntüleri; değişen 6.391 pikselin tamamı eşleşen boru yolları içinde. Negatif kontrolde aynı pozitif grafik verisiyle görünmez çizim görünür sayılmaz. [Kontrol görüntüsü](02-without-overlay.png).
- Android Surface on/off/restored görüntülerinde tahta piksellerinin %0,91'i değişti; %0,77 yeni altın piksel, geri açmada fark %0,0076. Sayaç/çizim tamponu tek başına başarı kanıtı değildir.
- Android debug APK derleme/lint ve AndroidX testi: [Actions 44289156184](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44289156184) başarılı. Yalnız izole emülatörde geçici debug APK kuruldu; telefona dağıtılacak yeni TEST APK veya AAB üretilip yayımlanmadı.

`npm test`, `npm run test:ux`, `npm run test:tutorial` ve kapsamlı tarayıcı regresyonları yerel çalışma alanında ayrıca çalıştırılır; son toplu durum TEST-SONUCLARI.json dosyasındadır. Önceki dokunma parlaması tanılamaları eski tasarıma aittir. Obsidyen testindeki yalnız eski dokunma/border animasyonu beklentileri yeni bağlantı ışığı beklentileriyle değiştirildi; oyun, kayıt, tıklama, geometri ve ödül kontrolleri korunur.

MainActivity, AndroidManifest, ses/titreşim, bulut/kayıt, ekonomi, öğretici, temaların boru çizimi, üretim derleme iş akışları, AdMob kimlikleri ve mağaza varlıkları değiştirilmedi. Main, Google Play 6.50 ve mağaza yayınlarına dokunulmadı.
