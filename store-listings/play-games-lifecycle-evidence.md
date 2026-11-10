# Play Games başlangıç sırası — 22.1.0 inceleme kanıtı

## Bulgu ve sınırı

6.48'de Play Games sağlayıcısı yaş ekranından önce hesap hizmeti başlamaması için kaldırılmıştır. Bunun yerine `PlayGamesSdk.initialize()` WebView `onPageFinished`/yaş ekranı kapandıktan sonra çağrılır. Bu sırada Activity'nin `super.onCreate()`, `super.onStart()` ve `super.onResume()` olayları zaten gerçekleşmiş olabilir.

Resmî 22.1.0 SDK'sının aşağıdaki bytecode zinciri, otomatik kimlik doğrulaması henüz başlatılmadığında `isAuthenticated()` çağrısının **yerel olarak 10 kodu üretebildiğini** gösterir. Bu nedenle görülen her 10 kodunu yalnız OAuth/SHA-1 panel hatasına bağlamak doğru değildir. Paket ve imza bağlantısı ayrıca kontrol edilmelidir; bu inceleme Google hesabındaki ayarların doğruluğunu kanıtlamaz.

## İncelenen gerçek kütüphane

- Kaynak: [Google Maven — play-services-games-v2 22.1.0 AAR](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-games-v2/22.1.0/play-services-games-v2-22.1.0.aar)
- Boyut: **436825 bayt**
- AAR SHA-256: `da31b7a5a8682a0b00428999de1a26fc537b06db755c0d15e57e0eac1f000043`
- İnceleme: AAR içindeki `classes.jar`, JDK `javap -c -p` ile açılmıştır. Aşağıdaki obfuscation adları bu sürüme özeldir; üretim kodunda bunlara başvurulmamalıdır.

## Çağrı zinciri

1. `PlayGamesSdk.initialize(Context)` → `games_v2.zzbw.zza(Context)`.
2. Bu yöntem SDK'nın tekil Application nesnelerini oluşturur; `games_v2.zzas.zzb()` otomatik doğrulama dinleyicisini, `games.internal.zzf.zzb()` ön plandaki Activity dinleyicisini Application'a kaydeder.
3. `games_v2.zzar.onActivityCreated(Activity, Bundle)` normal Activity için otomatik bağlantıyı `zzaw.zzd()` ile başlatır. Sonradan kayıt olduğunda geçmiş `onActivityCreated` olayı tekrarlanmaz.
4. `games.internal.zze.onActivityStarted` ve `onActivityResumed`, `zzf.zzf(Activity)` üzerinden ön plandaki Activity'yi kaydeder. Geç başlatma bu olayları da kaçırırsa çözümleme arayüzü ön plandaki Activity'yi bulamaz.
5. `GamesSignInClient.isAuthenticated()` uygulaması `games_v2.zzdg.isAuthenticated()` → `zzaw.zzc()` → `zzbq.zzc()` → `zzbq.zzs(...)` yolunu kullanır.
6. `zzbq` oluşturucusu durumu `zzba.zza` ile başlatır. `zzba` enum'unda bunun adı **`UNINITIALIZED`**, ordinal değeri **0**'dır.
7. `zzbq.zzs` içindeki `lookupswitch` ordinal **0** dalı `new ApiException(new Status(10))` üretir. Bu dal Google paneliyle eşleşme yapılmadan da çalışabilir.
8. Otomatik bağlantı ana iş parçacığında başlatıldığında `zzbq.zzi()` → `zzm(1)` durumu eşzamanlı olarak kimlik doğrulama aşamasına taşır. Daha sonraki `isAuthenticated()` sonucu devam eden doğrulama görevini bekleyebilir. `initialize()` ile hemen peşinden `isAuthenticated()` çağırmak, yaşam döngüsünün başladığı anlamına gelmez.

Android'in resmî tanımı önemlidir: `onActivityCreated` **Activity `super.onCreate()` çağırırken** çalışır; alt sınıfın `onCreate()` yönteminin bitmesini beklemez. Bu nedenle `initialize()` çağrısını yalnız WebView'den alıp `super.onCreate()` sonrasına koymak, otomatik doğrulamanın ilk olayı görmesini garanti etmez.

## Düzeltmenin doğrulanacak sırası

- Yalnız geçerli yetişkin seçimi varsa SDK'yı Activity'nin `super.onCreate()` olayından önce veya uygun Application başlangıcında hazırla. Yaş seçimi henüz yapılmamışsa ve kısıtlı gruplarda hesap SDK'sını başlatma.
- İlk yetişkin seçiminde ya da kısıtlı seçimden yetişkine geçişte açık seçimi sakla. Yaş ekranından sonra başlatılan SDK'nın yeni bir gerçek Activity yaşam döngüsü görmesini sağla; eski Activity'de erken `isAuthenticated()` çağrısı yapılmasın.
- Ana WebView ve geri alma geçmişini bellekte koruyan yol: yetişkin seçimi kabul edildikten sonra SDK'yı başlat; dışarıya açık olmayan, saydam temalı küçük bir `GamesStartupActivity`'yi `startActivityForResult` ile aç. Yardımcı Activity'nin `super.onCreate()` olayı otomatik doğrulamayı, `super.onStart()`/`super.onResume()` olayları ön plan Activity kaydını sağlar. Yardımcı Activity başarı sonucu verip kapanır; ana Activity kendi `super.onResume()` olayında yeniden ön plan olarak kaydedildikten sonra kimlik durumunu sorgular. Yardımcı başlatılamaz veya iptal edilirse hazır sayılmamalıdır.
- Alternatif olarak ana Activity yeniden oluşturulabilir; ancak bu yolun oyun tahtası, duraklama, deneme ve geri alma geçmişini kayıpsız taşıdığı ayrıca doğrulanmalıdır.
- `PlayGamesInitProvider`'ı koşulsuz geri ekleme; bu, yaş sınırını aşarak süreç başlangıcında hesap SDK'sını başlatır.
- Eski Activity'ye ait kimlik, profil ve bulut geri çağrılarını nesil/yaşam döngüsü sınırlarıyla reddet. Yerel kayıtları silme.
- Gerçek cihazda ilk seçim, uygulamayı tamamen kapatıp yeniden açma, yaş seçimini düzeltme ve elle Google girişi denenmelidir. Daha sonra devam eden 10 kodunda [paket/SHA-1 ve PGS bağlantı adımları](play-games-setup.md) uygulanmalıdır.

Yardımcı Activity yolu için SDK incelemesi: `zzar.onActivityCreated` yalnız Unreal Engine'in Splash/Game sınıf adlarını özel işler; normal uygulamanın özel Activity sınıfı otomatik doğrulamayı başlatmaya uygundur. SDK'nın `games.internal.v2.resolution.zzb.zzb(Activity, PendingIntent)` yöntemi gerektiğinde kendi `GamesResolutionActivity` ekranını `startActivity` ile açar ve sonucu bir `ResultReceiver`/Application kapsamlı görev üzerinden alır. Bu görev yardımcı Activity'nin `onActivityResult` yöntemine bağlı değildir. Uygulama yine SDK arayüzü kapanıp ana ekran geri geldikten sonra gerçek kimlik sonucunu doğrulamalıdır.

## Paket kimliklerinin ayrıca doğrulanması

6.48 / 108 LIVE AAB için `bundletool dump resources --resource=string/game_services_project_id --values` çıktısı **1097423047801**'dir. Nihai manifest `com.google.android.gms.games.APP_ID` için bu string'i kullanır; paket `com.orynexa.karadugum`'dur. Üç başarım ve sıralama kimliği base64url olarak açıldığında ortak protobuf varint değeri de **1097423047801** çıkar. Bu kimliklerin iç biçimi yayımlanmış bir API sözleşmesi olarak kullanılmaz; yalnız kaynak içi tutarlılık için ek kanıttır. Kaynak ve paket arasında farklı proje kimliği saptanmamıştır.

İncelenen AAB SHA-256: `73350bb27df68b9332e8e255293d2b4cbf997d86da5d8da2dd30d21caeff66a6`.

## Yeniden üretme

```bash
PGS_DIAG_DIR=$(mktemp -d)
curl --fail --location https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-games-v2/22.1.0/play-services-games-v2-22.1.0.aar --output "$PGS_DIAG_DIR/games.aar"
sha256sum "$PGS_DIAG_DIR/games.aar"
unzip -p "$PGS_DIAG_DIR/games.aar" classes.jar > "$PGS_DIAG_DIR/classes.jar"
java -m jdk.jdeps/com.sun.tools.javap.Main -classpath "$PGS_DIAG_DIR/classes.jar" -c -p com.google.android.gms.internal.games_v2.zzbq
java -m jdk.jdeps/com.sun.tools.javap.Main -classpath "$PGS_DIAG_DIR/classes.jar" -c -p com.google.android.gms.internal.games_v2.zzba
java -m jdk.jdeps/com.sun.tools.javap.Main -classpath "$PGS_DIAG_DIR/classes.jar" -c -p com.google.android.gms.internal.games_v2.zzar
java -m jdk.jdeps/com.sun.tools.javap.Main -classpath "$PGS_DIAG_DIR/classes.jar" -c -p com.google.android.gms.games.internal.zze
```

## Resmî belgeler

- [SDK'nın isteğe bağlı elle başlatılması](https://developers.google.com/android/reference/com/google/android/gms/games/PlayGamesSdk)
- [Platform kimlik doğrulaması ve SDK başlangıcı](https://developer.android.com/games/pgs/android/android-signin)
- [ActivityLifecycleCallbacks olaylarının tam zamanı](https://developer.android.com/reference/android/app/Application.ActivityLifecycleCallbacks)
- [Play Games yapılandırma sorunlarının kontrolü](https://developer.android.com/games/pgs/android/troubleshooting)
