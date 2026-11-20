# KARA DÜĞÜM 6.51 RC2 TEST

Paket `com.orynexa.karadugum`, sürüm `6.51-rc2-test`, sürüm kodu 112. Kaynak tabanı 6.51 RC1 teslimi `c065a4f`. RC2'nin derleme commit’i `7875d41`. Kullanılan imza RC1 TEST APK ile aynı. Google örnek reklam birimleri kullanılıyor.

[TEST APK](KaraDugum-6.51-RC2-TEST.apk) · [Bütünlük özeti](SHA256SUMS) · [Android derleme, lint ve emülatör koşusu](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44717912735)

## Satın alma davranışı

Kilitli tema kartı, tema adını, kristal fiyatını ve eldeki bakiyeyi gösteren siyah-altın onay penceresini açıyor. `SATIN AL` basıldığında bakiye ve hak yeniden kontrol ediliyor. Vazgeç, kapatma, geri tuşu ve pencere açıkken uygulamayı kapatma ücret kesmiyor. Yetersiz bakiyede açıklama gösteriliyor. Önceden satın alınmış tema doğrudan uygulanıyor. RC1'de kaydedilmiş bakiye ve sahiplik, yükseltme verisi olarak korunuyor.

Kilitli temaların fiyatları Gece Tapınağı 150, Çöl Harabeleri 200, Gece Moru 250, Zümrüt Mabedi 900 ve Yakut Ateşi 1200 kristal. Satın almanın tamamlanması için misafirde önce kurtarma kaydı yazılıyor. Hesaplı oyuncularda işlem, mevcut bulut satın alma kaydı üzerinden eşitleniyor. Geçici yazma hatasından sonra tamamlanan işlem tek hak ve tek ücret üretiyor.

[Tarayıcıda 360 px görünüm](onay-penceresi.png)

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Satın alma | Beş ücretli tema, altı harcamasız çıkış yolu, çift tıklama, yetersiz bakiye, profil yolu ve sahip olunan temayı ücret almadan yeniden uygulama geçti. |
| 25 dil ve RTL | Üç ekran boyutunda 75 yerleşim geçti. Arapça, Urduca ve Farsça dahil. |
| Kesinti ve eşitleme | Sekiz yazma kesintisi, yenilemeden sonra kurtarma, aynı oturumda yeniden deneme, hesap değiştirme ve iki cihazda aynı tema onayının bulut modelinde tek ücretle birleşmesi geçti. |
| Oyun ekonomisi ve kayıt | 300 bölüm, altı temada 1.800 tahta, yerel kayıt, bulut modeli, mağaza ve günlük ödül regresyonları geçti. |
| Android 35 WebView | Aynı imzalı RC1 üzerine kurulum, aktif kayıt ve önceki tema hakları, gerçek Android geri tuşu ile iptal, çift onay tıklamasında 1.250 → 350 kristal ve yeni süreçte Zümrüt hakkı geçti. |

Fiziksel POCO doğrulaması bu teslimin kapsamı dışında. Kayıt kesintileri kontrollü yazma hatalarıyla, eşzamanlı bulut satışı örnek hesaplarla denetlendi. Teslim bu düzeltme dalında.

[Satın alma test matrisi](browser-theme-purchase.json) · [APK içeriğinden aynı test](packaged-theme-purchase.json) · [Android satın alma](theme-purchase-webview.json) · [Android yeniden açılış](theme-purchase-restart.json) · [RC1 yükseltme kanıtı](upgrade-report.json)
