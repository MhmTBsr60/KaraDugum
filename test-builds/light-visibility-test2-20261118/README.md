# GOLD-500 / visibility-test2

**Fiziksel POCO doğrulaması bekleniyor. Sorun telefonda çözülmüş olarak kapatılmaz.**

Dal: `fix/light-visible-webview-20261118`. Temel: `618a8f1` (önceki 500 ms paketi). TEST sürümü: `6.50-light-visibility-test2`, paket `com.orynexa.karadugum`, sürüm kodu 110. Önceki TEST imzası korunur; yalnızca Google test reklam kimlikleri kullanılır.

## Telefon bulgusunun anlamı

`AÇIK · Android ✓ · ↓25 ↳24 ✦24 / 24` eski `6.50-poco-test1` gösterimidir; mevcut 500 ms tanılamasının `LIGHT-500 / Canvas / frame / HTML` alanları yoktur. Bu nedenle telefondaki satır son 500 ms paketin denendiğini kanıtlamaz. Sayaçlar, görünen altın pikselin kanıtı değildir. POCO'daki kesin neden hâlâ açık tutulur.

## Değişen çizim yolu

- Varsayılan artık **WEBVIEW**. Native Android kardeş View başarı cevabı verse bile varsayılan parlamanın görüntülenmesi ona bağlı değildir; native ışık katmanı bu modda kapatılır. Android/AUTO seçenekleri yalnızca ayrıntılı karşılaştırma için korunur.
- SVG, düğüm alt öğesi ve body katmanı dışında, doğrudan HTML köküne eklenen küçük **Canvas2D** kullanılır. Desteklenen WebView'de manuel popover ile tarayıcının **üst katmanına** alınır. Böylece body/game/SVG transform, opacity, filter, stacking ve overflow kırpılmalarından bağımsız olur. Popover desteklemeyen sürümlerde kök Canvas kullanılır; bu eski sürümler için fiziksel doğrulama iddiası yoktur.
- 500 ms sabit sıcak altın dolgu (%60), opak altın ve açık renk iç çerçeve. CSS/SVG animasyonu, blend, filtre ve parçacık yoktur. Canvas yalnızca düğüm büyüklüğündedir, DPR en fazla 2'dir. Hareketi azalt durumunda da statik kalır.
- WebView süresi, mevcut `postVisualStateCallback + frame commit` onayından sonra başlar. Ayar kapalıyken katman kaldırılır. Canvas dokunmaları yakalamaz ve düğümü döndürmez.
- Tanılamada `GOLD-500 / visibility-test2`, gerçek native sürüm, `BUFFER:GOLD`, `TOP:YES/NO`, ayrı native/WEB sayaçları ve CSS/görüntü geometrisi kaydedilir. Buffer rengi ve kare onayı hâlâ insan gözüyle telefon doğrulaması sayılmaz.

## Görünürlük testi

1. Düğüm döndürülmeden aynı bulmacanın **önce / parlama sırasında / sonra** ekran görüntüleri alınır.
2. Yalnız RGB değişimi yeterli değildir: hedef düğümde önceden bulunmayan **altın renkli piksel artışı**, yeterli kontrast ve eski görüntüye dönüş aranır.
3. Negatif kontrolde sayaç pozitif bırakılıp Canvas boşaltılır. Piksel testi bunun görünmez olduğunu belirtmek zorundadır.
4. Body opacity/brightness/transform/overflow/isolation testleri, üç ekran boyutu, kapalı durum, aynı puzzle/undo/ilerleme/ipuçları/kristal durumu kontrol edilir.
5. İmzalı APK'nın gerçek Android 35 WebView'inde aynı-state Surface PNG testi çalışır; normal Android dokunmasıyla `500 ms TEST` seçilir. Native katman kapalı, üst katman Canvas altın buffer ve görünür Surface pikselleri ayrı doğrulanır. Bu emülatör kanıtıdır.

Oyun, 300 bölüm, kayıtlar, ses/titreşim, öğretici, ekonomi, reklam kodları ve Android paket/manifest/MainActivity/TapLightOverlay kaynakları değiştirilmez. Main, Google Play, AdMob hesabı, mağaza görselleri ve AAB'ye dokunulmaz. Son test durumu için Actions ve üretilen JSON raporları esas alınır.
