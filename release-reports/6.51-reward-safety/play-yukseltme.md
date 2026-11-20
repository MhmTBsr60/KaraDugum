# Google Play üzerinden veri kaybetmeden yükseltme testi

Bu plan, Android 16 (API 36) cihazında Google Play’in kurduğu KARA DÜĞÜM 6.50 (110) üzerinden test içindir. Cihaz test hesabına ait olmalıdır. Google Play’e paket gönderimi yayın sahibinin ayrı onayına bağlıdır.

## Kurulum öncesi

1. 6.50 uygulamasını yerinde bırakın. Uygulamanın paketinin `com.orynexa.karadugum`, sürüm kodunun `110` ve kurulum kaynağının Google Play (`com.android.vending`) olduğunu doğrulayın. Android sürümünü, cihaz modelini ve Play Games eşitleme durumunu kaydedin.
2. Uygulamadan çıkmadan aktif bölümde iki ayırt edilebilir hamle yapın. Bölüm numarasını, tahtayı, hamle sayısını, ilerlemeyi, kristal bakiyesini, ipucu kuponlarını, satın alınan temaları, seçili temayı ve dili ekran görüntüleriyle kaydedin. Varsa oyun içi yedekleme seçeneğiyle cihazda bir yedek tutun. Yedeği testin başlangıcında içeri aktarmayın. Aynı günün ödülünün alındığını kaydedin ve testi aynı yerel gün içinde tamamlayın.
3. Bağlı hesabı test ediyorsanız aynı Play Games test hesabında eşitlemenin tamamlanmasını bekleyin. Misafir ve hesaplı senaryoları ayrı kurulumlarda veya ayrı cihazlarda yürütün. Ana kayıtla riskli saat, veri veya hesap değişikliği yapmayın.
4. İsteğe bağlı imza ön kontrolünde `adb shell pm path com.orynexa.karadugum` çıktısındaki `base.apk` yolunu `adb pull` ile yalnızca okuyun. SDK Build Tools ile `apksigner verify --print-certs 6.50-base.apk` çalıştırın. Bu SHA-256 değerini Play Console’daki uygulama imzalama sertifikasıyla veya Play’in dağıttığı aday APK’nın imzasıyla karşılaştırın. AAB yükleme sertifikası ile Play’in cihaz APK’sını imzaladığı sertifika farklı olabilir. Sürüm, paket veya imza uyuşmazlığında test durur.

## Yükseltme ve doğrulama

1. Yayın sahibi ayrıca yetki verdikten sonra adayı Google Play’in aynı uygulama kaydındaki dahili test kanalından **Güncelle** ile yükleyin. Test hesabı kanala kayıtlı olmalıdır. 6.50 uygulamasını kaldırmayın, veri temizlemeyin ve imza uyuşmazlığını aşmak için APK kurulumunu zorlamayın. Yalnızca yükleme sertifikasıyla imzalanan yerel TEST APK’sını Play’den gelen mevcut kuruluma uygulamayın.
2. Adayın sürümünü doğrulayın. İlk açılışta hesap değiştirmeden tahtayı, hamle sayısını, tamamlanan bölümleri, kristalleri, ipuçlarını, tema haklarını ve dil tercihini ilk kayıtla karşılaştırın. Mevcut temayı yeniden uygulayın. Bakiye aynı kalmalı. Aynı gün Hazine penceresi veya bakiyede ikinci günlük artış görülmemeli.
3. 6.50 Geri Al yığınını RAM’de tutar. Android güncelleme sırasında eski süreci kapattığında eski hamlelerin geri alma adımları yeniden kurulamaz. Aktif tahta, hamle sayısı ve varsa kayıtlı Geri Al sayacı korunması gereken ayrı verilerdir. Adayda yeni bir hamle yapın, sinematik pencereden **ÇIKIŞ** seçin ve yeniden açın. **Geri Al** ile adayda yapılan hamleyi gerçekten geri alın.
4. Çıkış ve yeniden açılış kontrollerini aynı gün önce bağlantı kapalıyken, sonra bağlantı açıkken tekrarlayın. Aynı Play Games hesabını kullanın. Çevrimiçi eşitleme tamamlandığında ilerleme veya bakiye eskiye dönmemeli, aynı günlük ödül tekrar eklenmemeli. Bulut kaydı için yeni hamleyi eşitleyip aynı test hesabında mevcut ikinci test cihazı varsa orada da karşılaştırın.
5. İlk farkta ilerlemeyi durdurun, sürüm/kurulum kaynağı ve önce/sonra görüntülerini saklayın. Kayıtları temizlemeden veya yedek içeri almadan raporlayın. Sonuçta Android sürümü, cihaz modeli, Play dağıtım sürümü, imza eşleşmesi ve her kayıt alanı ayrı belirtilmelidir.

Arşivdeki yükleme anahtarı imzalı TEST APK’larıyla `adb install -r` testi bu yöntemin laboratuvar eşdeğeridir. Fiziksel Play yükseltme sonucu, yalnızca Play’in dağıttığı APK’lar kullanıldığında kayda geçirilir.
