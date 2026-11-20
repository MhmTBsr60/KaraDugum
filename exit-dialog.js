(() => {
  'use strict';
  const maximumFrames = 120;
  const maximumCharacters = 1024 * 1024;
  const checkpointKey = saved => {
    const owner = window.kdEconomy?.owner();
    return (saved.daily ? 'daily:' : 'campaign:') + (owner ? 'account:' + owner : 'guest');
  };
  const canonical = saved => window.KdCloudModel.canon(saved);

  function saveUndo(saved, frames) {
    const key = checkpointKey(saved);
    try {
      const record = frames.length ? JSON.stringify({board: canonical(saved), frames}) : '';
      if (record.length > maximumCharacters) return false;
      if (typeof window.KaraNative?.saveExitUndo === 'function') return window.KaraNative.saveExitUndo(key, record);
      if (record) localStorage.setItem('kdExitUndo:' + key, record);
      else localStorage.removeItem('kdExitUndo:' + key);
      return true;
    } catch {
      return false;
    }
  }

  function takeUndo(saved) {
    const key = checkpointKey(saved);
    try {
      let raw;
      if (typeof window.KaraNative?.takeExitUndo === 'function') raw = window.KaraNative.takeExitUndo(key);
      else {
        raw = localStorage.getItem('kdExitUndo:' + key);
        if (raw !== null) localStorage.removeItem('kdExitUndo:' + key);
      }
      if (!raw || raw.length > maximumCharacters) return [];
      const record = JSON.parse(raw);
      if (record.board !== canonical(saved) || !Array.isArray(record.frames) ||
        record.frames.length > maximumFrames) return [];
      const count = saved.tiles.length;
      const arrays = ['tiles', 'sealed', 'keys', 'fog', 'rotCount', 'targetDone', 'ice'];
      return record.frames.filter(frame => frame && arrays.every(k => Array.isArray(frame[k]) && frame[k].length === count) &&
        frame.tiles.every(value => Number.isInteger(value) && value >= 0 && value <= 15) &&
        Number.isSafeInteger(frame.moves) && frame.moves >= 0 && frame.moves <= saved.moves &&
        frame.extra && typeof frame.extra === 'object' && frame.extra.initialExtra);
    } catch {
      return [];
    }
  }

  let current = null;

  function close() {
    if (!current) return false;
    const {dialog, focus} = current;
    current = null;
    dialog.close();
    dialog.remove();
    if (focus?.isConnected) focus.focus({preventScroll: true});
    return true;
  }

  const cancelIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5l-7 7 7 7M3 12h12a6 6 0 0 1 6 6"/></svg>';
  const powerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10m-5.7-7a8.5 8.5 0 1 0 11.4 0"/></svg>';

  function open() {
    if (current) return true;
    const dialog = document.createElement('dialog');
    dialog.className = 'kdExitDialog';
    dialog.setAttribute('aria-labelledby', 'kdExitTitle');
    dialog.setAttribute('aria-describedby', 'kdExitMessage');
    dialog.innerHTML = `<div class="kdExitCard">
      <div class="kdExitHero" aria-hidden="true"></div>
      <button type="button" class="kdExitClose" aria-label="Kapat">×</button>
      <div class="kdExitCopy">
        <h2 id="kdExitTitle" data-no-translate>KARA DÜĞÜM</h2>
        <p id="kdExitMessage">Oyundan çıkmak istiyor musun?</p>
        <div class="kdExitActions">
          <button type="button" data-exit-cancel autofocus>${cancelIcon}<span>VAZGEÇ</span></button>
          <button type="button" data-exit-confirm>${powerIcon}<span>ÇIKIŞ</span></button>
        </div>
        <p class="kdExitSaveStatus" role="status" hidden></p>
      </div>
    </div>`;
    const confirm = dialog.querySelector('[data-exit-confirm]');
    const status = dialog.querySelector('.kdExitSaveStatus');
    dialog.querySelector('.kdExitClose').onclick = close;
    dialog.querySelector('[data-exit-cancel]').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    confirm.onclick = () => {
      if (current?.dialog !== dialog || confirm.disabled) return;
      confirm.disabled = true;
      if (typeof window.KaraNative?.finishGame !== 'function') {
        close();
        return;
      }
      if (!window.kdPrepareExit?.()) {
        status.textContent = 'Oyun kaydedilemedi. Tekrar dene.';
        status.hidden = false;
        confirm.disabled = false;
        return;
      }
      window.KaraNative.finishGame();
    };
    current = {dialog, focus: document.activeElement};
    document.body.append(dialog);
    dialog.showModal();
    return true;
  }

  window.kdExitDialog = {open, close};
  window.kdExitUndo = {save: saveUndo, take: takeUndo};
})();
