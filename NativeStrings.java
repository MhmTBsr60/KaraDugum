package com.orynexa.karadugum;

/** Text only: no account, reward or save state is changed by a locale switch. */
public final class NativeStrings {
    private NativeStrings() {}
    public static String language(String code) {
        String value = code == null ? "en" : code.toLowerCase(java.util.Locale.ROOT).split("[-_]")[0];
        return value.equals("tr") || value.equals("ar") || value.equals("zh") ? value : "en";
    }
    private static final String[][] TEXT = {
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
