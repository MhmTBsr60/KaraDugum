# KARA DÜĞÜM — Play Games bağlantı kontrolü

Google Play Games `10` (`DEVELOPER_ERROR`) kodu uygulama yapılandırması hatasıdır. Hangi özel hesap ayarının yanlış olduğu, Play Console ve bağlı Google Cloud projesi incelenmeden kesinleşmez. Açılıştaki hata mesajının kaldırılması, Google bağlantısının düzeldiğini kanıtlamaz. Yerel oyun kayıtlarını veya uygulama verilerini silmeyin.

## Kimlik bilgilerini karşılaştırın

Google Play Console → **Kullanıcı sayısını artırın → Play Oyun Hizmetleri → Kurulum ve yönetim → Yapılandırma** yolunu açın. Menü adları hesap diline göre değişebilir.

- Play Games proje kimliği: **`1097423047801`**. Bu, Android paket adı veya AdMob kimliği değildir.
- Bağlı Android uygulamasının paket adı: **`com.orynexa.karadugum`**.
- Kullanıcının doğrudan GitHub'dan kurduğu imzalı APK için Android OAuth istemcisindeki SHA-1:
  **`A1:65:1D:CD:D6:56:A9:3D:E4:5C:DC:8B:CC:F0:48:1C:4F:A1:22:4A`**.

OAuth istemcisinin doğru Cloud projesinde bulunması tek başına yeterli değildir. Play Games **Yapılandırma → Kimlik bilgileri** bölümünden bu Android OAuth istemcisini oyuna bağlayın. Bağlı Google Cloud projesinde **Google Play Games Services API** etkin olmalıdır.

## Google Play'den kurulum için ayrı imzayı ekleyin

Play Console → **Uygulama bütünlüğü → Uygulama imzalama** bölümündeki **uygulama imzalama anahtarı sertifikasının SHA-1** değerini alın. Yükleme anahtarı sertifikasını bunun yerine kullanmayın.

Bu SHA-1 GitHub APK'sının yukarıdaki SHA-1 değerinden farklıysa, aynı paket adıyla ikinci bir Android OAuth istemcisi oluşturup Play Games kimlik bilgilerine bağlayın. Mevcut GitHub APK istemcisini silmeyin. Böylece iki dağıtımın gerçek imzaları ayrı ayrı tanınır.

## Yayın ve test erişimini kontrol edin

- Üretim erişimi onayı, Play Games ayarlarını otomatik olarak yayımlamaz. Play Games yapılandırma değişikliklerinin de yayımlandığını kontrol edin.
- Bağlı Google Cloud projesindeki OAuth izin ekranının hedef kullanıcılara açık olduğundan emin olun.
- Play Games henüz yayımlanmadıysa **Test kullanıcıları** bölümüne girişte kullanılan Google hesabını açıkça ekleyin veya ilgili yayın kanalına Play Games test erişimi verin. Geliştirici hesabı kendiliğinden test kullanıcısı sayılmaz.

## Ayarlardan sonra doğrulayın

Ayarların uygulanması için süre tanıyın. Uygulama verilerini silmeden oyunu yeniden açın ve profildeki Google giriş düğmesini kullanın. GitHub APK'sını ve Google Play'den kurulumu ayrı ayrı deneyin. Başarılı bağlantıda gerçek Google oyuncu profili görünmeli; bulut eşitlemesi aynı hesaba çalışmalı ve mevcut yerel ilerleme korunmalıdır. Hata sürerse kurulum kaynağını, kullanılan hesabı, ilgili OAuth istemcisinin paket/SHA-1 alanlarını ve güncel geliştirici günlüğünü karşılaştırın.

## Resmî kaynaklar

- [Google Play services hata kodları](https://developers.google.com/android/reference/com/google/android/gms/common/api/CommonStatusCodes)
- [Play Games Services kurulumu, kimlik bilgileri ve test erişimi](https://developer.android.com/games/pgs/console/setup)
- [Play Games Android sorun giderme](https://developer.android.com/games/pgs/android/troubleshooting)
- [İstemci kimlik doğrulaması ve Play App Signing sertifikaları](https://developers.google.com/android/guides/client-auth)
