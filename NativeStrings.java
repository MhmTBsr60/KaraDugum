package com.orynexa.karadugum;

/** Text only: no account, reward or save state is changed by a locale switch. */
public final class NativeStrings {
    private NativeStrings() {}
    public static final String ACCOUNT_HELP = "Hesap seçimini Google Play Oyunlar yönetir.\n\nTelefon Ayarları → Google → Tüm hizmetler → Google uygulamaları için ayarlar → Play Games → Oturum açılan hesap yolunu izle. Oyuna göre hesap değiştirme bölümünden KARA DÜĞÜM için hesabı seç.\n\nDeğişiklik sonrasında oyunu yeniden aç. Yerel kayıtların silinmez; her hesabın bulut ilerlemesi kendisine aittir.";
    public static String language(String code) {
        String value = code == null ? "en" : code.toLowerCase(java.util.Locale.ROOT).split("[-_]")[0];
        return value.equals("tr") || value.equals("ar") || value.equals("zh") ? value : "en";
    }
    private static final String[][] TEXT = {
        {"Hesap değiştirme yardımı", "Account switching help", "مساعدة تغيير الحساب", "账号切换帮助"},
        {"Kapat", "Close", "إغلاق", "关闭"},
        {"Google yardımını aç", "Open Google Help", "فتح مساعدة Google", "打开 Google 帮助"},
        {ACCOUNT_HELP, "Google Play Games manages account selection.\n\nOpen phone Settings → Google → All services → Settings for Google apps → Play Games → Sign-in account. Under change account by game, select the account for KARA DÜĞÜM.\n\nReopen the game after changing the account. Local saves are not deleted; each account keeps its own cloud progress.", "تدير ألعاب Google Play اختيار الحساب.\n\nافتح إعدادات الهاتف ← Google ← كل الخدمات ← إعدادات تطبيقات Google ← ألعاب Play ← حساب تسجيل الدخول. من قسم تغيير الحساب حسب اللعبة، اختر حساب KARA DÜĞÜM.\n\nأعد فتح اللعبة بعد تغيير الحساب. لا تُحذف ملفات الحفظ المحلية؛ لكل حساب تقدّمه السحابي الخاص.", "Google Play 游戏负责管理账号选择。\n\n打开手机设置 → Google → 所有服务 → Google 应用设置 → Play 游戏 → 登录账号。在按游戏更改账号部分，为 KARA DÜĞÜM 选择账号。\n\n更改账号后重新打开游戏。本地存档不会被删除；每个账号保留自己的云端进度。"},
        {"Yaş seçimi bu cihazda kaydedilemedi. Bu oturumda seçimin uygulanacak.", "Your age choice could not be saved on this device. It will apply for this session.", "تعذر حفظ اختيار الفئة العمرية على هذا الجهاز. سيُطبَّق في هذه الجلسة.", "无法在此设备上保存年龄选择。本次会话仍会采用此选择。"},
        {"Google Play Oyunlar'a bağlanılamadı. Yerel kayıtların korunuyor; daha sonra yeniden deneyebilirsin.", "Could not connect to Google Play Games. Your local saves are safe; you can try again later.", "تعذر الاتصال بألعاب Google Play. ملفات الحفظ المحلية محفوظة؛ يمكنك المحاولة لاحقًا.", "无法连接 Google Play 游戏。本地存档已保留，你可以稍后重试。"},
        {"Bu oturum yerel oyun modunda. Kayıtların cihazında korunur.", "This session uses local play. Your saves stay on this device.", "هذه الجلسة في وضع اللعب المحلي. تبقى ملفات الحفظ على هذا الجهاز.", "本次会话使用本地游玩模式，存档会保留在此设备上。"},
        {"Yaş aralığın nedir?", "What is your age range?", "ما فئتك العمرية؟", "你的年龄范围是？"},
        {"13 yaşından küçüğüm", "Under 13", "أقل من 13 عامًا", "未满 13 岁"},
        {"13–17 yaşındayım", "13–17", "من 13 إلى 17 عامًا", "13–17 岁"},
        {"18 yaş ve üzerindeyim", "18 or older", "18 عامًا أو أكثر", "18 岁及以上"},
        {"Belirtmek istemiyorum", "Prefer not to say", "أفضل عدم الإفصاح", "不愿透露"},
        {"Play Games girişini tamamlayamadı. Test kullanıcısı ve Play Oyunlar hesabını kontrol edin.", "Play Games sign-in did not complete. Check the account and its access to this release.", "لم يكتمل تسجيل الدخول إلى ألعاب Play. تحقّق من الحساب وإمكانية وصوله إلى هذا الإصدار.", "未能完成 Play 游戏登录。请检查账号及其对此版本的访问权限。"},
        {"Play Games hesabını Google Play Oyunlar ayarlarından değiştirebilirsin.", "You can change your account in Google Play Games settings.", "يمكنك تغيير حسابك من إعدادات ألعاب Google Play.", "你可以在 Google Play 游戏设置中切换账号。"},
        {"Bulut kayıt çakışması çözülemedi. Tekrar giriş yaparak eşitle.", "Could not resolve cloud save conflict. Sign in again to sync.", "تعذر حل تعارض الحفظ السحابي. سجّل الدخول مجددًا للمزامنة.", "无法解决云存档冲突。请重新登录以同步。"},
        {"Play Games kimlik kontrolü başarısız", "Play Games authentication check failed", "تعذر التحقق من هوية ألعاب Play", "Play 游戏身份验证检查失败"},
        {"Önce Play Games hesabına giriş yap.", "Sign in to Play Games first.", "سجّل الدخول إلى ألعاب Play أولًا.", "请先登录 Play 游戏。"},
        {"Oyundan çıkmak istiyor musun?", "Exit the game?", "هل تريد الخروج من اللعبة؟", "要退出游戏吗？"},
        {"Play Games profili alınamadı", "Could not load Play Games profile", "تعذر تحميل ملف ألعاب Play", "无法加载 Play 游戏资料"},
        {"Bulut kayıt birleştirilemedi", "Could not merge cloud saves", "تعذر دمج الحفظ السحابي", "无法合并云存档"},
        {"Dünya sıralaması açılamadı", "Could not open the world leaderboard", "تعذر فتح لوحة الصدارة العالمية", "无法打开全球排行榜"},
        {"Oyuncu profili okunamadı", "Could not read player profile", "تعذرت قراءة ملف اللاعب", "无法读取玩家资料"},
        {"Bulut kayda erişilemedi", "Could not access cloud save", "تعذر الوصول إلى الحفظ السحابي", "无法访问云存档"},
        {"Play Games giriş hatası", "Play Games sign-in error", "خطأ في تسجيل الدخول إلى ألعاب Play", "Play 游戏登录错误"},
        {"Bulut kayıt yazılamadı", "Could not write cloud save", "تعذرت كتابة الحفظ السحابي", "无法写入云存档"},
        {"Kayıt boyutu geçersiz", "Invalid save size", "حجم الحفظ غير صالح", "存档大小无效"},
        {"Kayıt verisi geçersiz", "Invalid save data", "بيانات الحفظ غير صالحة", "存档数据无效"},
        {"Bulut kayıt çakışması", "Cloud save conflict", "تعارض في الحفظ السحابي", "云存档冲突"},
        {"Bulut kayıt açılamadı", "Could not open cloud save", "تعذر فتح الحفظ السحابي", "无法打开云存档"},
        {"Bulut kayıt okunamadı", "Could not read cloud save", "تعذرت قراءة الحفظ السحابي", "无法读取云存档"},
        {"Sayfayı kapat", "Close page", "إغلاق الصفحة", "关闭页面"},
        {"bilinmeyen", "unknown", "غير معروف", "未知"},
        {"Vazgeç", "Cancel", "إلغاء", "取消"},
        {"Çıkış", "Exit", "خروج", "退出"},
    };
    public static String text(String source, String code) {
        String lang = language(code);
        if (source == null || lang.equals("tr")) return source;
        int column = lang.equals("ar") ? 2 : lang.equals("zh") ? 3 : 1;
        for (String[] row : TEXT) {
            if (source.equals(row[0])) return row[column];
            if (source.startsWith(row[0] + ": ")) return row[column] + ": " + text(source.substring(row[0].length() + 2), code);
        }
        return source;
    }
}
