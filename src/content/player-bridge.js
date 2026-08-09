/*
 * Runs in the page's own JS world so it can reach the YouTube player object,
 * which the isolated content-script world can't see.
 *
 * Annotations only. Autoplay is handled entirely by the content script clicking
 * the visible toggle — the player's setAutonavState leaves that toggle's state
 * untouched, so driving both would have meant two sources of truth disagreeing.
 *
 * Rule of the file: only ever suppress, and only ever undo a suppression this
 * script performed.
 */

(() => {
  let wantAnnotationsHidden = false;
  let suppressedByUs = false;

  function player() {
    const el = document.getElementById('movie_player');
    return el && typeof el.unloadModule === 'function' ? el : null;
  }

  function sync() {
    const p = player();
    if (!p) return;

    if (wantAnnotationsHidden) {
      try {
        p.unloadModule('annotations_module');
        suppressedByUs = true;
      } catch {
        /* module absent on this video, nothing to do */
      }
    } else if (suppressedByUs) {
      try {
        p.loadModule('annotations_module');
      } catch {
        /* ignore */
      }
      suppressedByUs = false;
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__fokus !== true || data.cmd !== 'annotations') return;

    wantAnnotationsHidden = Boolean(data.value);
    sync();
  });

  // The player is created well after document_start, and again on SPA nav.
  document.addEventListener('yt-navigate-finish', sync);
  document.addEventListener('yt-player-updated', sync);
})();
