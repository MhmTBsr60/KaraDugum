# KARA DÜĞÜM · Enerji Dalgası önizlemesi

Beş sahne gerçek 4×4 Bölüm 6 tahtasından alındı. Bu bölüm, tek hamlede birbirini izleyen iki kıvrıma enerji veren altı düğümlük bir bağlantı gösteriyor. Video, oyun motorunu gerçek düğme tıklamalarıyla çalıştırıyor. Yakalama ortamı deneme kaydı ve denetimli zaman kullanıyor.

- [14 saniyelik MP4, 860×1864 ve 24 kare/sn](energy-wave-14s.mp4)
- [Beş sahne tek görselde](five-states.png)
- [Işık İzi kapalı](01-light-off.png)
- [Yeni bağlantı](02-new-connection.png)
- [Kıvrımlarda genişleyen halkalar](03-bend-rings.png)
- [Birden fazla bağlantıda sabit altın ışık](04-settled.png)
- [Bölüm tamamlanma dalgası](05-completion.png)
- [Önceki ve yeni çizim, aynı tahta ve aynı an](before-after.png)

Paylaşılan Örnek 3 görseli sohbet içinde incelendi. Çalışma alanında özgün dosyanın kopyasına erişilemedi. İndirilebilir [karşılaştırma sayfası](reference-comparison.zip), özgün resmi cihazdan seçince gerçek oyun karesiyle yan yana yerleştirir. Görsel cihazda işlenir.

| Örnek 3 özelliği | Yeni oyun önizlemesi |
| --- | --- |
| Geniş beyaz-altın iç kanal | Beyaz uç mevcut borunun içini genişçe doldurur. Parlak kesit altı temanın ekran ölçümünde iç genişliğin yaklaşık %80–88'ini kapladı. |
| Yönü izlenebilen enerji akışı | Dalga ucu doğrulanmış boru yolunu izler. Ardındaki sıcak altın iz sönerek sabit ışığa geçer. 14 saniyelik video bu geçişi ve kopma sonrası geri almayı gösterir. |
| Kıvrımlarda büyük saydam halkalar | Aynı Bölüm 6 hamlesinin 1.390 ms sonrasında iki dış yarıçap önceki çizime göre yaklaşık %51 ve %38 büyüdü. Halkalar kısa sürede yayılır ve sönerek taş dokusunu görünür bırakır. |
| Sıcak parıltı ve metal hatlar | Oyun mevcut boru ve taş geometrisini kullanır. Referansın daha turuncu, fırça dokulu ışığıyla oyundaki daha açık altın tonu arasındaki fark sürüyor. |

## Test sonuçları

- npm test içindeki 18 grup geçti. 300 bölüm yasal ipucu hamleleriyle tamamlandı. Motor ve çizici bağlantıları da karşılaştırıldı. 7.566 bağlantıda fark bulunmadı.
- Altı temada bağlantı, kopma, geri alma ve Işık İzi açma/kapatma geçti. Piksel kontrolünde beyaz enerji iç kanal dışına çıkmadı. Ölçülen görünür kıvrım ışığı sınırlandırılmış bölgede kaldı. [Piksel sonuçları](tests/pixel-proof.json) · [Enerji regresyonu](tests/wave-audit.json)
- Hareketi azalt ve düşük donanım senaryoları yalnızca sabit ışık gösterdi. 7×7 ve 8×8 tahtalarda çizim katmanları sınırlandı. Chromium 1×/4× sentetik CPU testinde çizim p95 en çok 8 ms, tek örnek en çok 12,3 ms oldu. [Performans](tests/chromium-performance.json)
- Öğretici testinde ilk kurulum, atlama, tekrar gösterme, kayıt ve ekonomi akışları geçti. 25 dilde 204 yerleşim ve 60 tahta boyutu karşılaştırıldı. Ses/titreşim testleri bağımsız tercihleri, WebAudio sinyalini ve native titreşim yardımcılarını doğruladı. Fiziksel duyulabilirlik ve motor hissi ölçülmedi. [Öğretici](tests/tutorial.log) · [Ses/titreşim ve UX](tests/ux.log)
- Android 35 sistem WebView görünürlük ve işlev kontrolleri geçti. Emülatörün ekran çıktısında 691 ek beyaz piksel, 142 dış halka pikseli ve dalga merkezinde 144 piksel hareket ölçüldü. Altı tema, bağlantı/kopma, aç/kapat, geri alma ve azaltılmış hareket doğrulandı. [Ekran görüntüsü](tests/android/wave-middle.png) · [Piksel kanıtı](tests/android/surface-proof.json)
- Android performans sonucu sınırlı. 4×4, 7×7 ve 8×8 tamamlanma dalgalarında sırasıyla 4, 8 ve 8 çizim örneği ölçüldü. En uzun ölçüm 3,6 ms oldu. Emülatör beklenen en az 10 örneğe ulaşmadığından performans adımı geçmedi ve genel CI sonucu başarısız görünüyor. Ölçüm Canvas çizim çağrılarını kapsar. Kare hızı ve fiziksel cihaz akıcılığı için yeterli kanıt sağlamaz. [Ölçümler](tests/android/webview-performance.json) · [CI çalıştırması](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44535311743)

Fiziksel POCO testi yapılmadı. Önizleme kaydında üretim hesabı veya gerçek oyuncu verisi kullanılmadı.

Dal `design/energy-wave-bend-rings-preview-20261119`. Kaynak `d6c83b3`. Çalışan oyun tarafında yalnızca `pipe-flow.js` değişti. Main, Hazine dalı ve üretim AAB özeti doğrulandı. Bu çalışma görsel önizleme aşamasındadır.
