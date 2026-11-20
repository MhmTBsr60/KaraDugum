# KARA DÜĞÜM 6.51 yayın güvenliği kontrolü

**Sonuç** · `113` paketinde hesaplı günlük ödülün bir sonraki gününü etkileyen veri tutarsızlığı yeniden üretildi. Android’in tamamlanan reklam makbuzunu, kayıt sonucu başarısızken WebView’a gönderebildiği de doğrulandı. Düzeltmeler `fix/6.51-reward-durability-audit` dalında. Derlenen test kaynağı `64cf468`.

[Android 16 emülatör koşusu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44729520429) · [Android kanıt arşivi](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44729520429/artifacts/14625124164) · [Fiziksel Play yükseltme planı](play-yukseltme.md)

## Bulgular ve düzeltme

- **Hesaplı günlük giriş ödülü.** Ödül işlemi, bakiye, gün, seri ve son ödül ayrıntıları ayrı yazılıyordu. Üretim AAB’sinden çıkarılan 113 kodunda seri yazımı kesildiğinde aynı WebView oturumunda bir sonraki günün bakiyesi beklenen 135 yerine 130 kristal oldu. Ödül tutarları ve bulut işlem kimlikleri korundu. Hesaba özel hazırlık kaydı, eksik yazıları sonraki günlük hesaplamadan önce yeniden tamamlıyor. Aynı günün işlemi yeniden işlendiğinde ikinci ödeme oluşmadı.
- **Android reklam makbuzu.** Lint’teki senkron `commit()` hatası Hazine Günlük Ödülü’ne ait değildi. `coins:`, `hint:` ve `double:` reklam makbuzlarının kayıt sonucu göz ardı ediliyordu. Android yazması başarısızken makbuzun WebView’a iletilmesi ve WebView da kaydetmeden süreç kapanırsa kazanılan reklam ödülünün kaybolması mümkündü. Yazma artık arka plan kuyruğunda gerçekleşiyor. `commit()` başarı bildirmeden makbuz iletilmiyor. Geçici başarısızlıkta makbuz aynı sahibiyle yeniden deneniyor. Daha önce kalıcı olarak yazılmış, onayı gelmemiş makbuzlar yeniden açılışta iletiliyor. Kalıcı disk arızasında süreç herhangi bir kalıcı yazma olmadan kapanırsa bellekteki yeni makbuz kurtarılamaz.
- **Misafir günlük ödülü.** Var olan mutlak bakiye hedefli hazırlık kaydı korundu. Kesinti, yeniden açılış, tarih geri alma ve aynı günlük ödülü tekrar alma denemelerinde kristal ve ipucu kuponu bir kez işlendi. Çevrimdışı ileri tarih değişiminde güvenilir sunucu saati sınırı sürüyor.

## Test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| Üretim 113 hata kanıtı | Aynı gün ödül işlemi ile seri yazımı arasındaki kesinti, sonraki günlük tutarı 5 kristal düşürdü. Düzeltme aynı senaryoda beklenen 135 bakiyeyi üretti. |
| Tarayıcı hata enjeksiyonu | Yedi hesaplı yazma noktası, iki misafir kesintisi ve bir bulut tekrarı geçti. Test saati sabitlendi, ağ erişimi yerel test sunucusuyla sınırlandı. İzole ve iki eşzamanlı koşu başarılı. [Tarayıcı test kanıtı](browser-recovery.json) |
| Android 16, API 36 | Arşivdeki `6.50 (110) TEST` → yeni `6.51 (114) TEST` aynı imzayla, uygulamayı kaldırmadan ve veri temizlemeden kuruldu. Aktif tahta, hamleler, tamamlanan bölümler, kristaller, kuponlar, altı tema hakkı ve dil tercihi eşleşti. [Kurulum](upgrade-report.json) · [WebView](candidate-webview-report.json) |
| Geri Al | 6.50’nin eski süreci yeniden başlatılınca aktif tahta kaldı, bellekteki eski Geri Al adımları geri gelmedi. 114 TEST’te yeni bir hamle yapıldı, onaylı çıkıştan sonra yeniden açıldı ve hamle geri alındı. [Çıkış ve yeniden açılış](exit-restart-report.json) |
| Android makbuzları | Android testinde başarısız `commit()` ve bellekte görünen ama diske yazılmamış makbuz taklit edildi. İletim engellendi. Kayıt başarılı olunca makbuz aynı sahip ile yeniden okunabildi. [Android makbuz testi](receipt-native-android.json) |
| Android WebView yeniden açılış | Hesap işleminin yazıldığı, son ödül bilgisinin eksik olduğu durum oluşturuldu. Uygulama süreci durdurulup yeniden açılınca kayıt tamamlandı ve bakiye ikinci kez artmadı. [WebView kurtarma](receipt-webview-android.json) |
| Regresyonlar | `npm test`, 300 bölüm, bulut modeli ve örnek hesap akışları, reklam makbuzu sahipliği, bölüm ödülleri, günlük mağaza, günlük bulmaca, tema satın alma ve sinematik çıkış geçti. Android TEST derlemesi, lint ve iki TEST imzası geçti. |

## Yayın kararı ve kalan test

Düzeltmeyi yayınlamak için **yeni bir üretim AAB** gerekir. Mevcut 6.51 (113) AAB’nin SHA-256 özeti `42f1b7b6c11a5c8ffe998de2cf5ba92a9182c38ace9298ae9a55d97c49db14c9` olarak doğrulandı. Bu çalışmada yalnızca emülatör için TEST APK derlendi. Google Play’de 113 herhangi bir kanala yüklenmişse aynı kod yeni AAB’de kullanılamaz. 114 kullanılabilir durumdaysa aday için seçilebilir. 113 Play’e hiç yüklenmediyse sırf yerel 113 dosyası mevcut diye artırma zorunluluğu yoktur.

Fiziksel Android 16 veya POCO testi yapılmadı. Google Play’in dağıttığı 6.50’den 6.51’e gerçek yükseltme ve canlı Play Games eşitlemesi bekliyor. Emülatör testi yükleme anahtarıyla imzalanmış arşiv TEST paketlerinden yapıldı. Onaydan sonra gerçek test için Play’in uygulama imzalama sertifikası karşılaştırılarak aynı uygulama kaydındaki dahili test kanalı kullanılmalıdır. [Fiziksel test adımları](play-yukseltme.md)
