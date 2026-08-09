/*
 * Runs in the page's own JS world so it can reach the YouTube player object,
 * which the isolated content-script world can't see.
 *
 * Rule of the file: only ever suppress, and only ever undo a suppression this
 * script performed. If a setting is off, the player is left completely alone —
 * turning "disable autoplay" off must not switch autoplay *on* for someone who
 * had it off to begin with.
 */

(() => {
  const wanted = { autoplay: false, annotations: false };
  const suppressedByUs = { autoplay: false, annotations: false };

  function player() {
    const el = document.getElementById('movie_player');
    return el && typeof el.getPlayerState === 'function' ? el : null;
  }

  function sync() {
    const p = player();
    if (!p) return;

    // 1 disables the up-next queue. The visible toggle is driven by the content
    // script clicking it; this is the belt to that pair of braces.
    if (wanted.autoplay && typeof p.setAutonavState === 'function') {
      try {
        p.setAutonavState(1);
        suppressedByUs.autoplay = true;
      } catch {
        /* player not ready; a later sync will catch it */
      }
    }

    if (wanted.annotations) {
      try {
        p.unloadModule('annotations_module');
        suppressedByUs.annotations = true;
      } catch {
        /* module absent on this video, nothing to do */
      }
    } else if (suppressedByUs.annotations) {
      try {
        p.loadModule('annotations_module');
      } catch {
        /* ignore */
      }
      suppressedByUs.annotations = false;
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__phocus !== true) return;
    if (!(data.cmd in wanted)) return;

    wanted[data.cmd] = Boolean(data.value);
    sync();
  });

  // The player is created well after document_start, and again on SPA nav.
  document.addEventListener('yt-navigate-finish', sync);
  document.addEventListener('yt-player-updated', sync);
})();
