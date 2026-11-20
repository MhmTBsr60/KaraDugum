/* Theme purchase dialog strings, keyed by the game's existing language codes. */
(() => {
  'use strict';
  const keys = [
    'Tema satın al', 'Fiyat', 'Mevcut bakiye', 'VAZGEÇ', 'SATIN AL', 'Kapat',
    'Bu tema için yeterli kristalin yok.',
    'Satın alma için önce bulut kaydını eşitle.',
    'Satın alma kaydı tamamlanamadı. Tekrar dene.',
  ];
  const copy = {
    en: ['Buy theme', 'Price', 'Current balance', 'CANCEL', 'BUY', 'Close', 'You do not have enough crystals for this theme.', 'Sync your cloud save before buying.', 'The purchase could not be saved. Try again.'],
    zh: ['购买主题', '价格', '当前余额', '取消', '购买', '关闭', '水晶不足，无法购买此主题。', '请先同步云端存档再购买。', '无法保存购买记录，请重试。'],
    hi: ['थीम खरीदें', 'कीमत', 'मौजूदा शेष', 'रद्द करें', 'खरीदें', 'बंद करें', 'इस थीम के लिए आपके पास पर्याप्त क्रिस्टल नहीं हैं।', 'खरीदने से पहले अपना क्लाउड सेव सिंक करें।', 'खरीद का रिकॉर्ड सेव नहीं हुआ। फिर से कोशिश करें।'],
    es: ['Comprar tema', 'Precio', 'Saldo actual', 'CANCELAR', 'COMPRAR', 'Cerrar', 'No tienes suficientes cristales para este tema.', 'Sincroniza tu partida en la nube antes de comprar.', 'No se pudo guardar la compra. Inténtalo de nuevo.'],
    ar: ['شراء السمة', 'السعر', 'الرصيد الحالي', 'إلغاء', 'شراء', 'إغلاق', 'ليس لديك ما يكفي من البلورات لهذه السمة.', 'زامن حفظك السحابي قبل الشراء.', 'تعذّر حفظ عملية الشراء. حاول مجددًا.'],
    fr: ['Acheter le thème', 'Prix', 'Solde actuel', 'ANNULER', 'ACHETER', 'Fermer', 'Tu n’as pas assez de cristaux pour ce thème.', 'Synchronise ta sauvegarde dans le cloud avant d’acheter.', 'L’achat n’a pas pu être enregistré. Réessaie.'],
    bn: ['থিম কিনুন', 'মূল্য', 'বর্তমান ব্যালেন্স', 'বাতিল করুন', 'কিনুন', 'বন্ধ করুন', 'এই থিমের জন্য আপনার কাছে যথেষ্ট ক্রিস্টাল নেই।', 'কেনার আগে ক্লাউড সেভ সিঙ্ক করুন।', 'কেনাকাটার তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'],
    pt: ['Comprar tema', 'Preço', 'Saldo atual', 'CANCELAR', 'COMPRAR', 'Fechar', 'Você não tem cristais suficientes para este tema.', 'Sincronize seu progresso na nuvem antes de comprar.', 'Não foi possível salvar a compra. Tente novamente.'],
    ru: ['Купить тему', 'Цена', 'Текущий баланс', 'ОТМЕНА', 'КУПИТЬ', 'Закрыть', 'У вас недостаточно кристаллов для этой темы.', 'Перед покупкой синхронизируйте облачное сохранение.', 'Не удалось сохранить покупку. Попробуйте ещё раз.'],
    ur: ['تھیم خریدیں', 'قیمت', 'موجودہ بیلنس', 'منسوخ کریں', 'خریدیں', 'بند کریں', 'اس تھیم کے لیے آپ کے پاس کافی کرسٹل نہیں ہیں۔', 'خریدنے سے پہلے اپنی کلاؤڈ سیو سنک کریں۔', 'خریداری محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔'],
    id: ['Beli tema', 'Harga', 'Saldo saat ini', 'BATAL', 'BELI', 'Tutup', 'Kristalmu tidak cukup untuk membeli tema ini.', 'Sinkronkan simpanan cloud sebelum membeli.', 'Pembelian tidak dapat disimpan. Coba lagi.'],
    de: ['Thema kaufen', 'Preis', 'Aktuelles Guthaben', 'ABBRECHEN', 'KAUFEN', 'Schließen', 'Du hast nicht genug Kristalle für dieses Thema.', 'Synchronisiere vor dem Kauf deinen Cloud-Spielstand.', 'Der Kauf konnte nicht gespeichert werden. Versuche es erneut.'],
    ja: ['テーマを購入', '価格', '現在の残高', 'キャンセル', '購入', '閉じる', 'このテーマを購入するにはクリスタルが足りません。', '購入前にクラウドセーブを同期してください。', '購入を保存できませんでした。もう一度お試しください。'],
    mr: ['थीम खरेदी करा', 'किंमत', 'सध्याची शिल्लक', 'रद्द करा', 'खरेदी करा', 'बंद करा', 'या थीमसाठी तुमच्याकडे पुरेसे क्रिस्टल नाहीत.', 'खरेदीपूर्वी क्लाउड सेव्ह सिंक करा.', 'खरेदीची नोंद जतन झाली नाही. पुन्हा प्रयत्न करा.'],
    vi: ['Mua chủ đề', 'Giá', 'Số dư hiện tại', 'HỦY', 'MUA', 'Đóng', 'Bạn không có đủ pha lê để mua chủ đề này.', 'Đồng bộ bản lưu trên đám mây trước khi mua.', 'Không thể lưu giao dịch mua. Hãy thử lại.'],
    te: ['థీమ్‌ను కొనండి', 'ధర', 'ప్రస్తుత నిల్వ', 'రద్దు చేయండి', 'కొనండి', 'మూసివేయండి', 'ఈ థీమ్‌కు మీ వద్ద తగినన్ని స్ఫటికాలు లేవు.', 'కొనడానికి ముందు మీ క్లౌడ్ సేవ్‌ను సమకాలీకరించండి.', 'కొనుగోలును సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.'],
    ha: ['Sayi jigo', 'Farashi', 'Ragowar yanzu', 'SOKE', 'SAYA', 'Rufe', 'Ba ka da isassun lu’ulu’u don wannan jigon.', 'Daidaita ajiyar wasanka ta intanet kafin ka saya.', 'An kasa adana sayayyar. Sake gwadawa.'],
    ta: ['தோற்றத்தை வாங்கு', 'விலை', 'தற்போதைய இருப்பு', 'ரத்துசெய்', 'வாங்கு', 'மூடு', 'இந்தத் தீமை வாங்கப் போதுமான படிகங்கள் உங்களிடம் இல்லை.', 'வாங்கும் முன் மேகச் சேமிப்பை ஒத்திசைக்கவும்.', 'வாங்கியதைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'],
    pa: ['ਥੀਮ ਖਰੀਦੋ', 'ਕੀਮਤ', 'ਮੌਜੂਦਾ ਬਕਾਇਆ', 'ਰੱਦ ਕਰੋ', 'ਖਰੀਦੋ', 'ਬੰਦ ਕਰੋ', 'ਇਸ ਥੀਮ ਲਈ ਤੁਹਾਡੇ ਕੋਲ ਕਾਫ਼ੀ ਕ੍ਰਿਸਟਲ ਨਹੀਂ ਹਨ।', 'ਖਰੀਦਣ ਤੋਂ ਪਹਿਲਾਂ ਕਲਾਊਡ ਸੇਵ ਸਿੰਕ ਕਰੋ।', 'ਖਰੀਦ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'],
    sw: ['Nunua mandhari', 'Bei', 'Salio la sasa', 'GHAIRI', 'NUNUA', 'Funga', 'Huna fuwele za kutosha kwa mandhari haya.', 'Sawazisha hifadhi ya mchezo kwenye wingu kabla ya kununua.', 'Ununuzi haukuweza kuhifadhiwa. Jaribu tena.'],
    tl: ['Bumili ng tema', 'Presyo', 'Kasalukuyang balanse', 'KANSELAHIN', 'BUMILI', 'Isara', 'Kulang ang mga kristal mo para sa temang ito.', 'I-sync muna ang cloud save bago bumili.', 'Hindi na-save ang pagbili. Subukan muli.'],
    fa: ['خرید تم', 'قیمت', 'موجودی فعلی', 'لغو', 'خرید', 'بستن', 'برای خرید این تم بلور کافی نداری.', 'پیش از خرید، ذخیرهٔ ابری را همگام‌سازی کن.', 'خرید ذخیره نشد. دوباره تلاش کن.'],
    ko: ['테마 구매', '가격', '현재 잔액', '취소', '구매', '닫기', '이 테마를 구매할 크리스탈이 부족합니다.', '구매 전에 클라우드 저장을 동기화하세요.', '구매 내역을 저장하지 못했습니다. 다시 시도하세요.'],
    jv: ['Tuku tema', 'Rega', 'Saldo saiki', 'BATAL', 'TUKU', 'Tutup', 'Kristalmu ora cukup kanggo tuku tema iki.', 'Sinkronake simpenan ing cloud sadurunge tuku.', 'Tukune ora bisa disimpen. Coba maneh.'],
  };
  for (const [language, values] of Object.entries(copy)) {
    const dictionary = window.kdLocaleData.dict[language];
    for (const [index, key] of keys.entries()) dictionary[key] ??= values[index];
  }
})();
