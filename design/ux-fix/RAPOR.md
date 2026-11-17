# KARA DÜĞÜM 6.50-ux-test3 — işlev ve oyun ekranı düzeltmeleri

Kaynak dalı: `fix/webview-feedback-gameplay-20261117`  
Kaynak commit: `778b0a027ec7ee63b2e294f85aea6c54a7fe8db8`  
Karşılaştırma: önceki TEST2/main `0acb75b117e9cb4fee53b316dd7226f97a1e7256`.

## İşlevsel sorunlar ve düzeltmeler

| Sorun | İncelemede bulunan neden | Yapılan değişiklik / doğrulama |
|---|---|---|
| YOLCULUĞA DEVAM ET | Hedef kartındaki düğme `data-go="levels"` ile zaten açık olan bölüm listesini tekrar açıyordu. Üstteki ayrı devam düğmesi farklı, çalışan yolu kullanıyordu. | Hedef kartı mevcut `kdContinueJourney` yoluna bağlandı. TEST2 üzerinde hata yeniden üretildi; yeni düğmeye gerçek Chromium tıklaması mevcut bölüm/hamleler/geri alma geçmişi korunarak oyunu açtı. Günün Bulmacası ve Atölye dönüşleri de denendi. |
| POCO'da çok kısık efektler | Eski dokunma genliği 0,025; varsayılan %60 seviyesinde 0,015 tepe kazancıydı. Ayrıca AudioContext zamanlayıcı içinde başlatılıyor, asenkron `resume()` tamamlanmadan notalar planlanıyordu. | Dokunma 35 ms kısa tok ton; genlik 0,08 (%60'ta 0,048, yaklaşık +10 dB sayısal kazanç). Diğer efektler dengeli yükseltildi, telefonun medya seviyesi zorlanmadı. AudioContext gerçek etkileşimde açılıyor; resume tamamlanmadan nota/temizleme zamanlayıcısı başlamıyor. Gecikmeli resume ve gerçek WebAudio sinyal testleri eklendi. Bu kazanç fiziksel hoparlör ses basıncı ölçümü değildir. |
| Titreşim Dene'de hissedilir titreşim yok | Önceki native yol yalnızca `View.performHapticFeedback` çağırıyor, başarısız dönüş değerini kullanıcıya bildirmiyordu. POCO'nun sistem ayarı, sürücü/efekt desteği ve fiziksel başarısızlığın tam nedeni burada ölçülemedi. | Doğrudan native Vibrator/VibratorManager yolu: Android 10+ için cihazın ayarladığı kısa TICK/CLICK, eski sürümlerde 7/12/24/32 ms sınırlı darbe. Bu doğrudan yolun gerektirdiği normal VIBRATE izni eklendi; yeni izin penceresi yok. Eski View yönteminin VIBRATE iznine ihtiyaç duymaması nedeniyle “önceki hata yalnızca eksik izin yüzündendi” iddiası yapılmıyor. |

Titreşim testinin native sonucu JavaScript'e döner; donanım/izin/sistem ayarı engelinde görünür bildirim çıkar. Bildirimler normal sessiz oyunda sürekli gösterilmez. Ses ve titreşim ayrı tercihlerdir; mevcut tercihler korunur. Sistem dokunma titreşimi kapalıysa zorla açılmaz; sessiz mod ve arka plan korumaları sürer. API düzeyinde başarılı titreşim çağrısı motorun fiziksel olarak hissedildiğini kanıtlamaz.

## Oyun ekranı

Siyah-altın obsidyen görünüm, düğümlerin SVG şekilleri, yönleri ve oyun mantığı korunuyor. Tahtanın çevresindeki boşluklar ve çerçeve taşma payı azaltıldı. İpucu, geri al, yeniden başlat ve yenile kontrolleri tek sırada; en az 44 px dokunma hedefi var. İpucu ışık simgesi kullanır; rozet ücretsiz hak sayısını, `◆` kupon sayısını, `▶` reklam seçeneğini belirtir. Eski dinamik metin ve erişilebilir ad korunur.

Aynı 91. bölüm, aynı başlangıç düğümleri ve hamle sayısı ile son ölçüm:

| CSS ekran boyutu | TEST2 tahta | TEST3 tahta | Genişlik artışı |
|---|---:|---:|---:|
| 320 × 568 | 232,48 px | 279 px | %20,0 |
| 393 × 873 | 363,08 px | 375 px | %3,3 |
| 844 × 390 | 287,25 px | 309 px | %7,6 |

Boyut bölümün kural metnine, yazı tipine ve kullanılabilir yüksekliğe göre ayarlanır. Bunlar CSS görüntü alanlarıdır; gerçek POCO ekran ölçümü değildir. 128 yeni yerleşim, 255 mevcut kenar/güvenli alan ve 542 tablet/yatay geometri kontrolü yapıldı. RTL metin yönü fiziksel tahta koordinatlarını ve asimetrik güvenli kenarları ters çevirmiyor. Döndürme, odak modu ve ilk mekanik açıklaması da kontrol edildi.

## Test kapsamı

- `npm test`: 18 denetim; 300 bölüm, gerçek yasal ipucuyla çözümler, geçişler, kayıt/bulut modeli, ödüller ve Android kaynak kontrolleri.
- `npm run test:browser`: 43 denetim. Mağaza fiyatları/satın alımları, ipuçları, ödülün bir kez verilmesi, çarkın sekiz ödülü, görevler, başarılar, günlük bulmaca/atölye, hesap izolasyonu, çevrimdışı/bulut birleştirme, 25 dil ve ekran kontrolleri. Bunlar izole sahte kayıt ve reklam köprüleriyle çalışır; canlı reklam veya gerçek ödeme testi değildir.
- `npm run test:ux`: 8 denetim; 150 ayarlar yerleşimi, 318 yerelleştirilmiş çark durumu, sekiz ödül sonucu, ses/titreşim ayarlarının bağımsızlığı ve kalıcılığı, 25 native uygunluk koşulu ve 112 gerçek native yardımcı sınıf kontrolü. Native kontrol Android API 24/26/28/29/31/36 için JVM API benzetimleri kullanır.
- Gecikmeli/sınırlı ses başlatma, sıfır ses seviyesi, sessiz sistem, efekt kapatılırken bekleyen resume, en fazla bir AudioContext/sekiz ses ve arka plan temizleme denendi. Gerçek Chromium WebAudio grafiğinde sıfırdan farklı, kırpılmayan ses sinyali ölçüldü; fiziksel hoparlörden dinlenmedi.
- Oyun çekirdeği (mevcut ses adaptörleri dışında) ve korunan kayıt/ekonomi/bulut/politika dosyaları önceki koruma fikstürüyle karşılaştırıldı. Manifest için tek izin verilen fark VIBRATE satırıdır.
- Eski testlerde iki devam düğmesinin artık aynı çalışan niteliğe sahip olması nedeniyle seçiciler belirli üst düğmeye daraltıldı. Eski 4 px başlık boşluğu testi yeni, istenen kompakt 2 px boşluğu ölçer. Kayıt/ekonomi koşulları kaldırılmadı.

## Performans ölçümü ve kalan risk

`npm run test:performance`: **145 sahne, üç sentetik CPU/DPR profili ve 2.000 gerçek hamle gönderimi başarılı**. Ölçüm boyunca kaynak dosyaları değişmedi. Üç profilde JavaScript hatası yoktu; mağazada boşta aktif kayıt yazımı/tüm gövde taraması sıfırdı. 2.000 hamle sonunda yeniden açılış ilerlemeyi korudu; arka planda sayaç durdu. Tam GC sonrası JS yığını ilk 500 hamlede 3,94 MB, 2.000 hamlede 3,96 MB idi; bu Android uygulamasının toplam RAM ölçümü değildir.

Aynı makinede TEST2 ve TEST3, 320×568 / 6 kat CPU yavaşlatma / 51 sahne karşılaştırması:

| Ölçüm | TEST2 | TEST3 |
|---|---:|---:|
| Sahne medyanlarının hamle işleyicisi medyanı | 17,9 ms | 17,3 ms |
| İkinci kareye kadar sahne medyanlarının medyanı | 46,9 ms | 47,3 ms |
| Bölüme giriş medyanı | 163,2 ms | 160,8 ms |
| En uzun ölçülen görev | 340 ms | 325 ms |
| 50 ms üzeri görev sayısı | 180 | 254 |
| En yavaş hamle işleyicisi | 73,7 ms | 142,4 ms |

Bu tek koşum çiftidir, istatistiksel eşdeğerlik veya fiziksel FPS kanıtı değildir. Tipik tepki süreleri yakın; kuyrukta takılmalar ve uzun görev sayısında artış var. Daha büyük tahtanın çizim alanı arttı. **ORTA öncelikli kalan risk:** düşük donanımda yoğun sahneler kusursuz 60 FPS garantisi vermez. Bu teslim “performans gerilemesi kesin yok” iddiasında bulunmaz. Hareketi azalt, mevcut düşük donanım/dense-board efekt korumaları, tek ses bağlamı/sekiz ses üst sınırı korunur; yeni parçacık motoru veya büyük görsel eklenmedi.

360×800 / 4 kat CPU profilinde hamle işleyicisi sahne medyanlarının medyanı 11,7 ms; 412×915 / normal CPU profilinde 2,4 ms idi. Açılışın splash kaybolmasına kadar geçen 2,51–3,13 saniyesi mevcut planlı splash süresini de içerir. Bu değerler gerçek POCO açılış süresi değildir.

44 px dokunma hedefi güvencesi dört alt kontrol içindir. 320 px genişlikte 8×8 düğümler yaklaşık 32 px'e inebilir; mevcut yakın komşu/gap dokunma desteği korunur. Tüm düğümlerin 44 px olduğu iddia edilmez.

## APK ve sınırlar

Android CI: [44140420311 — başarılı](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44140420311). Kaynak, tarayıcı/UX, Java bulut denetimleri ve `assembleRelease :app:lintRelease` geçti. `apksigner verify` başarılı; AAB görevi çalıştırılmadı.

- Dosya: `KaraDugum-6.50-UX-FIX-TEST.apk`, 14.869.541 bayt.
- Sürüm adı: `6.50-ux-test3`; sürüm kodu: **110**; paket: `com.orynexa.karadugum`.
- Gerçek APK SHA-256: `f939a51aad1813ec0a2e33b3891b3e9d64087847701b9a556051291db27e1ee5`.
- Önceki TEST2 ve yeni TEST3 sertifikaları aynı. SHA-1: `A1:65:1D:CD:D6:56:A9:3D:E4:5C:DC:8B:CC:F0:48:1C:4F:A1:22:4A`; sertifika SHA-256: `351b49b72bfc09ebb317769832319eadca9ded6dae709daeb8314719a53dee9e`.
- Önceki GitHub TEST APK üstüne güncelleme için paket, kod ve imza uyumlu. Google Play'in yönettiği kurulum imzası ayrıca bu teslimde telefondan alınmadı. İmza uyuşmazsa uygulamayı silmek/veri temizlemek önerilmiyor.
- APK içinde doğrudan incelenen çalışma dosyaları kaynak commit ile aynı; yeni native haptic yardımcı sınıfı mevcut. Gerçek APK izin kontrolünde VIBRATE ve AD_ID bulundu.
- Reklamlar yalnızca Google örnek rewarded `ca-app-pub-3940256099942544/5224354917` ve interstitial `ca-app-pub-3940256099942544/1033173712` kimliklerini kullanır; LIVE birim dizeleri bulunmadı. Bu testler canlı reklam uygunluğu veya AdMob hesabının G ayarı kanıtı değildir.

[TEST APK indir](https://raw.githubusercontent.com/MhmTBsr60/KaraDugum/refs/heads/builds/ux-fix-test-20261117/test-builds/ux-fix-20261117/KaraDugum-6.50-UX-FIX-TEST.apk)

[393 px önce/sonra görseli](comparison-393.png) · [320 px önce/sonra görseli](comparison-320.png) · [yerleşim sonuçları](layout-results.json) · [performans ham sonuçları](performance-after.json) · [TEST2 performans karşılaştırması](performance-before.json)

Fiziksel Android cihaz veya emülatör bu çalışma alanında yoktu. POCO X7 Pro üzerindeki titreşim hissi, hoparlör seviyesi, HyperOS güç tasarrufu ve gerçek reklam/Google Play Games ağ oturumu bu teslimde fiziksel olarak doğrulanmadı. Telefonda kontrol adımları `TELEFON-TESTI.txt` dosyasındadır. Sessiz mod/medya seviyesi/sistem dokunma geri bildirimi engelleri bilerek aşılmaz.

`main` dalı birleştirilmedi: uzak main hâlâ `0acb75b117e9cb4fee53b316dd7226f97a1e7256`. Google Play üretim 6.50, AdMob hesabı, mağaza görselleri ve diğer uygulamalar değiştirilmedi. Yeni AAB oluşturulmadı veya yayımlanmadı. Mevcut üretim AAB SHA-256 değeri `9c43bd047dee9f305fc1d0897a3353c773ffa1b4a11ee2cca2519726bca017cf` olarak aynı kaldı.
