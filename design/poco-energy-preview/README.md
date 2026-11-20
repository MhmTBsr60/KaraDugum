# KARA DÜĞÜM · POCO Işık İzi ve günlük ödül TEST3

[TEST2 ve TEST3 · Aynı Bölüm 6 hamlesi](before-after.png)

## Işık İzi

TEST2’de WebView dört veya daha az çekirdek ya da 4 GB ve altı bellek bildirirse hareketli katman tamamen duruyordu. Yalnızca altın metalden ayrışması zayıf sabit ışık kalıyordu. Bu davranış tarayıcıya 2 çekirdek ve 2 GB bildiren testte yeniden üretildi. TEST3 aynı boru maskeleri ve bağlantılarla geniş beyaz merkezli, sıcak kenarlı hareketli kanal çizdi. Aynı kare karşılaştırmasında 9.149 ek beyaz piksel ölçüldü. [Karşılaştırma kanıtı](low-mode-pixel-proof.json)

Enerji Canvas’ı SVG boruların üzerinde. Testlerde kanalın metalin altında kalması gözlenmedi. Profil tahmininin POCO’da gerçekten tetiklenip tetiklenmediği ve ekrana özgü parlaklık etkisi doğrulanmadı. Yeni POCO ekran kaydına çalışma alanından erişilemedi.

Hafif profil daha seyrek çiziyor, tek kıvrım halkası kullanıyor ve hareketli taş yansımasını atlıyor. Azaltılmış hareket veya yavaş ekran tercihinde daha belirgin sabit ışık kullanılıyor. Tam profilde kanalın beyaz bölümü genişletildi ve hareketli tepe daha opak çiziliyor. Dalga saati, geometri hazır olduğunda başlıyor. Kapanma, bağlantı kopması, metalin dış sınırları ve altı tema doğrulandı. Metal, manşet ve Hazine görsel dosyaları TEST2 ile birebir aynı.

## Günlük ödül

Önceki ana menü her açıldığında kayıtlı son ödülü göstermeyi deniyordu. Ödül zaten verilmiş olsa bile o günün görülme işareti eksikse pencere açılabiliyordu. TEST2’de aynı gün ödenmiş, görülme işareti olmayan sentetik kayıtla bu pencere gerçekten yeniden açıldı. İlk telefon vakasında bu koşulun oluştuğu doğrulanmadı. Yeni pencere yalnızca yeni ve başarılı ödeme sonucuyla açılıyor. Eski ya da buluttan gelen kayıt pencereyi tekrar açmıyor.

Misafir ödemesi, hedef kristal ve kupon değerleriyle birlikte tarih kaydı olarak önce cihaza yazılıyor. Kesinti sonrası aynı hedefler tekrar uygulanıyor. Cüzdana ikinci kez ekleme yapılmıyor. Hesap ödemesi aynı gün için mevcut `login:YYYY-MM-DD` kimliğini kullanıyor. Miktarlar ve geri tarih engeli korundu. Çevrimdışı ileri tarih ayarı güvenilir sunucu saati olmadan doğrulanamaz.

## Testler

- 18 kaynak test grubu geçti. 300 bölümün tamamı yasal ipucu hamleleriyle çözüldü. Altı temada 7.566 bağlantı, hareketli ve sabit profil, aç/kapat, kopma ve geri alma denetlendi. [Kaynak](tests/source.log) · [Enerji](tests/wave-audit.json)
- 7 günlük ödül, 25 dilde 300 Hazine düzeni, çevrimdışı çalışma ve ileri/geri tarih kontrolü geçti. Kristal ve kupon ödemelerinde tarih yazma kesintisi canlandırıldı. Uygulama yeniden açıldığında her ödül bir kez tamamlandı. Aynı hesap kaydı üç kez eşitlendi ve yeniden açıldı. [Ödül güvenliği](tests/login-recovery.json) · [Hazine](tests/treasure.log)
- Bulut kayıt birleştirme, Android yedeğinden geri yükleme ve yeniden bağlanma testleri geçti. Testler 5 yalıtılmış cihaz ve 4 hesap senaryosunu kapsadı. Gerçek Play Games hesabıyla canlı eşitleme yapılmadı. [Bulut regresyonları](tests/cloud.log)
- Öğretici, kayda dönüş, ses ve titreşim otomatik regresyonları geçti. [Öğretici](tests/tutorial.log) · [UX](tests/ux.log)
- Yalıtılmış Chromium 7×7 ve 8×8 testinde çizim p95 en fazla 10,1 ms, en uzun tek çağrı 34,4 ms oldu. Hafif profil durgun tahtada çizim döngüsünü kapattı. [Chromium ölçümü](tests/chromium-performance.json)
- Android 35 WebView donanım değeri değiştirilmeden 2 çekirdek ve 2 GB bildirdi. Hafif profil seçildi. Beyaz ışık ve halka görünürlüğü, altı tema ve aç/kapat kontrolleri geçti. Beyaz ışık merkezi iki kare arasında yaklaşık 66 piksel ilerledi. Bu görünürlük testi denetimli zaman kullanır. [Android karesi](tests/android/wave-middle.png) · [Piksel ölçümü](tests/android/layer-surface-proof.json)
- Android performans adımı geçmedi. 4×4, 7×7 ve 8×8 için 4, 7 ve 7 örnek alındı. En uzun çağrı 10,4 ms idi. Senaryo başına en az 10 örneğe ulaşılamadığı için gerçek cihaz akıcılığı hakkında sonuç çıkarılmadı. [Ölçümler](tests/android/webview-performance.json) · [CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44680934245)

## İmzalı TEST3

[6.50-poco-energy-test3 APK](../../test-builds/poco-energy-test3-20261120/KaraDugum-6.50-POCO-ENERGY-TEST3.apk)

Paket `com.orynexa.karadugum`, sürüm kodu 110. TEST2 ile aynı imza sertifikası doğrulandı. Android 35 emülatöründe TEST2 kaldırılmadan güncellendi. Aktif bulmaca, hamleler, ilerleme, envanter, tercihler ve ödül kaydı eşleşti. Güncellemeden sonra ana menüye iki kez dönmek ödül penceresini veya ikinci ödemeyi tetiklemedi. İlk CI koşusu TEST2’nin WebView cevabını beklerken zaman aşımına uğradı. Daha düşük emülatör çözünürlüğü ve genişletilmiş bekleme ile ikinci koşu geçti.

APK lint, imza ve paketli öğretici geçti. İmzalı paketten çıkarılan gerçek oyunda kesinti, çevrimdışı yeniden açma, tarih ve bulut tekrar testleri geçti. APK Google test reklam kimliklerini kullanır. [APK ödül testi](tests/apk-login-recovery.json) · [Üzerine kurulum](../../test-builds/poco-energy-test3-20261120/upgrade-report.json) · [APK CI](https://github.com/MhmTBsr60/KaraDugum/actions/runs/44681454759)

Fiziksel POCO testi yapılmadı. Dal `fix/poco-energy-daily-test-20261120`.
