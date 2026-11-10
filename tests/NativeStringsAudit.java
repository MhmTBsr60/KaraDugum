package com.orynexa.karadugum;

public final class NativeStringsAudit {
    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
    public static void main(String[] args) {
        check(NativeStrings.language("ar-EG").equals("ar"), "Arabic region");
        check(NativeStrings.language("zh_CN").equals("zh"), "Simplified Chinese region");
        check(NativeStrings.language("TR").equals("tr"), "Case normalization");
        check(NativeStrings.language(null).equals("en"), "Missing locale");
        check(NativeStrings.language("de").equals("en"), "Other native locales fall back to English");
        String prompt = "Oyundan çıkmak istiyor musun?";
        check(NativeStrings.text(prompt, "tr").equals(prompt), "Turkish stays intact");
        check(NativeStrings.text(prompt, "en").equals("Exit the game?"), "English dialog");
        check(NativeStrings.text(prompt, "ar").equals("هل تريد الخروج من اللعبة؟"), "Arabic dialog");
        check(NativeStrings.text(prompt, "zh").equals("要退出游戏吗？"), "Chinese dialog");
        for (String code : new String[]{"en", "ar", "zh"}) {
            check(!NativeStrings.text("Vazgeç", code).equals("Vazgeç"), "Translated cancel: " + code);
            check(!NativeStrings.text("Sayfayı kapat", code).equals("Sayfayı kapat"), "Translated accessibility: " + code);
            String translated = NativeStrings.text("Bulut kayıt açılamadı: external-status-42", code);
            check(!translated.startsWith("Bulut"), "Translated native error: " + code);
            check(translated.endsWith(": external-status-42"), "Preserved SDK details: " + code);
        }
        for (String code : new String[]{"en", "ar", "zh"}) {
            String connection = "Google Play Oyunlar'a bağlanılamadı. Yerel kayıtların korunuyor; daha sonra yeniden deneyebilirsin.";
            check(!NativeStrings.text(connection, code).equals(connection), "Translated manual sign-in message: " + code);
            check(!NativeStrings.text("Yaş aralığın nedir?", code).equals("Yaş aralığın nedir?"), "Translated neutral age screen: " + code);
            check(!NativeStrings.text("Belirtmek istemiyorum", code).equals("Belirtmek istemiyorum"), "Translated opt-out: " + code);
        }
        check(NativeStrings.text(null, "zh") == null, "Null passthrough");
        check(NativeStrings.text("SDK-specific detail", "ar").equals("SDK-specific detail"), "Unknown SDK text preserved");
        System.out.println("PASS: native TR/EN/AR/ZH dialogs, locale normalization, accessibility and SDK error details");
    }
}
