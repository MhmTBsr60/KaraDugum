# LIGHT-500 — POCO kök neden tanılaması

**Telefon doğrulaması bekleniyor. Sorun POCO'da çözülmüş olarak raporlanmaz.**

Dal: `fix/light-trace-diagnostics-20261118`. Temel: `e9d33bd` / 6.50-poco-test1. TEST: `6.50-light-trace-test1`, paket `com.orynexa.karadugum`, kod 110. Önceki TEST imzasıyla, Google test reklam kimlikleriyle üretilir. Oyunu kaldırmadan güncelleyin.

## Kanıtlananlar ve kanıtlanmayanlar

- Eski Android katmanı 140 ms değil, normal donanımda 260 ms, düşük donanım/hareketi azalt durumunda 200 ms kullanıyordu. Normal HTML katmanı 260 ms içinde sönüyordu; eski katmanın 450 ms'de yokluğu gerçek sayfa testiyle ölçüldü. Bunun POCO'daki algı sorununun nedeni olduğu kanıtlanmadı.
- **Yeniden üretilen kod kusuru:** `drawTapLight` UI iş kuyruğuna ekledikten sonra `true` döndürüyor; sonraki foreground/focus/disabled/clip reddi JavaScript'e bildirilmeden isteği düşürebiliyordu. JS bunu başarı gibi kabul edip HTML yedeğine geçmiyordu. Eski kodu gerçek oyun sayfasına yükleyen testte dokunma=1, istek=1, native kare=0 ve HTML katmanı=0 gözlendi.
- Yeni AUTO yolu native çizim/kare onayını ayrı izler. Açık ret durumunda hemen, 160 ms içinde kare onayı yoksa zaman aşımıyla WebView katmanına geçer. Geç gelen eski sıra numarası başka dokunuşu onaylayamaz. Ayar kapatılırsa, arka plana geçilirse veya sonuç ekranı açılırsa bekleyen yedek çizim iptal edilir.
- SVG/düğüm yeniden çizimi dışında iki bağımsız yol: Android Canvas ve `body` düzeyinde sabit HTML katmanı. Tanılama ANDROID / WEBVIEW seçimiyle aynı düğümü ayrı test eder. Otomatik seçim, insanın gerçekten gördüğünü belirleyemez; kare onayı bu iddiayı taşımaz.
- **Bu TEST'te her iki yol da 500 ms sabit, belirgin altın dolgu/kenar çizer.** CSS/WAAPI animasyonu, sönme, SVG filtresi ve parçacık yoktur. Düşük donanım ve hareketi azalt durumunda da hareket eklenmez. Statik test, animasyon iptali ve kısa süre varsayımlarını ayırır.

## Telefonda görülecek tanılama

İlk düğüm dokunuşunda LIGHT-500 paneli otomatik açılır; × ile kapanır, Ayarlar'daki ⓘ ile tekrar açılır. Kurulu native sürüm, telefon modeli, Android/WebView sürümü; kayıtlı ve uygulanmış ayar; dokunma/tıklama/istek; Canvas komutu/kare onayı/HTML gönderimi; pencere odağı/görünürlük ve son iptal/ret nedeni ayrı gösterilir. Veriler yalnızca bellektedir, ağ/telemetri/kayıt anahtarı eklenmez. Renderer seçimi geçicidir.

`500 ms TEST` düğmesi mevcut tahtanın ilk uygun düğümünü görsel olarak vurgular; düğümü döndürmez, hamle/geri alma/ipucu/kristal değişmez. ANDROID ve WEBVIEW seçeneklerinin hangisinin POCO'da gözle görüldüğü telefon kök nedeninin tamamlanması için gereklidir. [Telefon kontrol adımları](TELEFON-TESTI.txt).

## Doğrulama ve koruma

- Kaynak testleri: 300 bölüm, çözülebilirlik/ipucu/ilerleme, reklam/ödül/çark ve native hesap/bulut geri dönüşleri.
- Yeni test: eski sessiz kaybın tekrarı; HTTP + file-origin, dört köprü senaryosu; ayar/kuyruk/çizim ayrımı; ret/zaman aşımı yedeği; açık/kapalı, eski onay, iptal; 500 ms, dar ekran, hareketi azalt/düşük donanım; durum tüketmeyen önizleme.
- Normal oyun, kayıt/bulut, öğretici, ses/titreşim, ekonomi, çark, diller ve tema dosyaları temel sürümle birebir karşılaştırılır. MainActivity'nin ışık alanı/köprüsü dışındaki tamamı da normalize edilmiş karşılaştırmayla korunur.
- APK'dan çıkarılan gerçek varlıklar üzerinde yeni testler ve öğretici tekrar çalışır. Android build/lint/imza doğrulanır. Android 35 testinde gerçek MotionEvent, native komut/kare, açık/kapalı ve zorlanmış native ret sonrası HTML yedeği ölçülür. İlk yakalanan gerçek Surface karesinde dokunulan düğümün native ve HTML ışık pikselleri sönmüş karelerle karşılaştırılır. Native kare onayı ile temizleme arasında en az 500 ms olduğu monoton Android zamanıyla ölçülür. WebView HTML ömrü DOM RAF yerine postVisualStateCallback + root frame commit onayından sonra başlar. Ekran yakalama gecikmesi nedeniyle ardışık PNG'lere 300 ms örnek etiketi verilmez. Bu Android emülatör kanıtıdır.
- Aynı commit üzerinde tüm mevcut browser, UX ve öğretici regresyonları yeniden çalıştırılır. Son durum için Actions ve üretilen JSON raporları esas alınır; bu doküman tek başına başarı ilanı değildir.

Main, Google Play 6.50, AdMob hesabı, mevcut mağaza görselleri ve AAB değiştirilmez. Fiziksel POCO doğrulaması yapılmadan kök nedenin telefondaki son halkası ve çözüm durumu **açık** kalır.
