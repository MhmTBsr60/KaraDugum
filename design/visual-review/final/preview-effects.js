/* Approval-only adapter: read-only game state; writes visual DOM attributes only.
   Not imported by production. No save, reward, rule, network or SDK calls. */
(() => {
  'use strict';
  window.kdFinalPreview?.destroy();
  const board = document.getElementById('board'), modal = document.getElementById('modal');
  if (!board || !modal) throw new Error('Preview requires the real game board and modal');
  let lastRun = '', syncs = 0, activeBefore = false, cells = [], masks = [], visible = [];
  const enabled = () => document.documentElement.hasAttribute('data-kd-final') && document.documentElement.dataset.kdTheme === 'gold';
  const put = (el, name, value) => {
    if (value == null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
    else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };
  const directions = [[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]];
  function sync(records) {
    syncs++;
    const active = enabled();
    if (!active) {
      if (activeBefore) for (const el of cells) put(el, 'data-kd-final-linked', null);
      put(board, 'data-kd-final-dense', null); put(board, 'data-kd-final-complete', null);
      activeBefore = false; return;
    }
    // Normal moves update only changed cells and their four neighbours. Full scans
    // are limited to board/theme changes or explicit preview synchronization.
    let full = !activeBefore || !Array.isArray(records), changed = new Set();
    if (!full) for (const record of records) {
      const el = record.target.closest?.('.tile[data-i]');
      const i = Number(el?.dataset.i);
      if (!el || cells[i] !== el) { full = true; break; }
      changed.add(i);
    }
    activeBefore = true;
    if (full) {
      cells = [...board.querySelectorAll(':scope > .tile[data-pipe]')];
      masks = cells.map(el => Number(el.dataset.pipe));
      visible = cells.map(el => el.firstElementChild?.matches('svg[data-pipe-mask]') || false);
      changed = new Set(cells.map((_,i) => i));
    } else for (const i of changed) {
      masks[i] = Number(cells[i].dataset.pipe);
      visible[i] = cells[i].firstElementChild?.matches('svg[data-pipe-mask]') || false;
    }
    const n = Math.sqrt(cells.length), dirty = new Set(changed);
    put(board, 'data-kd-final-dense', n >= 7 ? '' : null);
    for (const i of changed) for (const [,dr,dc] of directions) {
      const row = Math.floor(i/n)+dr, col = i%n+dc;
      if (row>=0 && col>=0 && row<n && col<n) dirty.add(row*n+col);
    }
    // Same N/E/S/W reciprocity as core countValid(); fog is never disclosed.
    // Local alignment only: tasks, keys, portals and layers stay with the core.
    for (const i of dirty) {
      let linked = Number.isInteger(n) && masks[i] > 0 && visible[i];
      for (const [bit,dr,dc,opposite] of directions) {
        if (!(masks[i] & bit)) continue;
        const row = Math.floor(i/n)+dr, col = i%n+dc, j = row*n+col;
        if (row<0 || col<0 || row>=n || col>=n || !(masks[j]&opposite) || !visible[j]) linked = false;
      }
      put(cells[i], 'data-kd-final-linked', linked ? '' : null);
    }
    if (board.hasAttribute('data-kd-final-complete') && !window.kdGetLearningState?.().locked) put(board, 'data-kd-final-complete', null);
  }
  function completed() {
    const panel = modal.querySelector('.kdWinPanel[data-run]'), run = panel?.dataset.run;
    if (!enabled() || !modal.classList.contains('show') || !window.kdGetLearningState?.().locked || !run || run===lastRun) return;
    lastRun = run; put(board, 'data-kd-final-complete', run);
  }
  const boardObserver = new MutationObserver(sync);
  boardObserver.observe(board, {subtree:true, childList:true, attributes:true, attributeFilter:['data-pipe']});
  const modalObserver = new MutationObserver(completed);
  modalObserver.observe(modal, {subtree:true, childList:true, attributes:true, attributeFilter:['class','data-run']});
  const themeObserver = new MutationObserver(() => {sync(); completed();});
  themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['data-kd-final','data-kd-theme']});
  sync(); completed();
  window.kdFinalPreview = {
    sync,
    stats: () => ({syncs,lastRun}),
    destroy() {
      boardObserver.disconnect(); modalObserver.disconnect(); themeObserver.disconnect();
      for (const el of [board,...board.querySelectorAll(':scope > .tile')])
        for (const attr of ['data-kd-final-linked','data-kd-final-dense','data-kd-final-complete']) el.removeAttribute(attr);
      delete window.kdFinalPreview;
    }
  };
})();
