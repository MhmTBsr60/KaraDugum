(() => {
  'use strict';
  const keys = ['Oyundan çıkmak istiyor musun?', 'ÇIKIŞ', 'Oyun kaydedilemedi. Tekrar dene.'];
  const locales = {
    en: ['Do you want to exit the game?', 'EXIT', 'The game could not be saved. Try again.'],
    zh: ['确定退出游戏吗？', '退出', '无法保存游戏，请重试。'],
    hi: ['क्या आप खेल से बाहर निकलना चाहते हैं?', 'बाहर निकलें', 'खेल सेव नहीं हुआ। फिर से कोशिश करें।'],
    es: ['¿Quieres salir del juego?', 'SALIR', 'No se pudo guardar la partida. Inténtalo de nuevo.'],
    ar: ['هل تريد الخروج من اللعبة؟', 'خروج', 'تعذّر حفظ اللعبة. حاول مجددًا.'],
    fr: ['Veux-tu quitter le jeu ?', 'QUITTER', 'La partie n’a pas pu être sauvegardée. Réessaie.'],
    bn: ['আপনি কি গেম থেকে বের হতে চান?', 'বের হন', 'গেমটি সেভ করা যায়নি। আবার চেষ্টা করুন।'],
    pt: ['Você quer sair do jogo?', 'SAIR', 'Não foi possível salvar o jogo. Tente novamente.'],
    ru: ['Вы хотите выйти из игры?', 'ВЫЙТИ', 'Не удалось сохранить игру. Попробуйте ещё раз.'],
    ur: ['کیا آپ کھیل سے باہر نکلنا چاہتے ہیں؟', 'باہر نکلیں', 'کھیل محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔'],
    id: ['Apakah kamu ingin keluar dari permainan?', 'KELUAR', 'Permainan tidak dapat disimpan. Coba lagi.'],
    de: ['Möchtest du das Spiel verlassen?', 'BEENDEN', 'Das Spiel konnte nicht gespeichert werden. Versuche es erneut.'],
    ja: ['ゲームを終了しますか？', '終了', 'ゲームを保存できませんでした。もう一度お試しください。'],
    mr: ['तुम्हाला खेळातून बाहेर पडायचे आहे का?', 'बाहेर पडा', 'खेळ जतन करता आला नाही. पुन्हा प्रयत्न करा.'],
    vi: ['Bạn có muốn thoát trò chơi không?', 'THOÁT', 'Không thể lưu trò chơi. Hãy thử lại.'],
    te: ['మీరు ఆట నుంచి నిష్క్రమించాలనుకుంటున్నారా?', 'నిష్క్రమించు', 'ఆటను సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.'],
    ha: ['Kana so ka fita daga wasan?', 'FITA', 'An kasa adana wasan. Sake gwadawa.'],
    ta: ['விளையாட்டிலிருந்து வெளியேற விரும்புகிறீர்களா?', 'வெளியேறு', 'விளையாட்டைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'],
    pa: ['ਕੀ ਤੁਸੀਂ ਖੇਡ ਤੋਂ ਬਾਹਰ ਜਾਣਾ ਚਾਹੁੰਦੇ ਹੋ?', 'ਬਾਹਰ ਜਾਓ', 'ਖੇਡ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'],
    sw: ['Unataka kuondoka kwenye mchezo?', 'TOKA', 'Mchezo haukuweza kuhifadhiwa. Jaribu tena.'],
    tl: ['Gusto mo bang lumabas sa laro?', 'LUMABAS', 'Hindi na-save ang laro. Subukan muli.'],
    fa: ['می‌خواهی از بازی خارج شوی؟', 'خروج', 'بازی ذخیره نشد. دوباره تلاش کن.'],
    ko: ['게임을 종료할까요?', '종료', '게임을 저장하지 못했습니다. 다시 시도하세요.'],
    jv: ['Kowe arep metu saka dolanan?', 'METU', 'Dolanane ora bisa disimpen. Coba maneh.'],
  };
  for (const [code, values] of Object.entries(locales)) {
    const dictionary = window.kdLocaleData.dict[code];
    for (const [index, key] of keys.entries()) dictionary[key] ??= values[index];
  }
})();
