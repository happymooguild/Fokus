/*
 * Phocus content script.
 *
 * Almost all the hiding is done by phocus.css. This script's job is to keep
 * <html data-phocus="..."> in sync with storage, and to handle the handful of
 * features CSS can't express on its own:
 *
 *   - sidebar sections that can only be identified by where their links point
 *   - Shorts and Subscriptions redirects
 *   - autoplay and annotations, which live behind the player's JS API
 *
 * Everything reacts to chrome.storage changes, so a toggle in the popup lands
 * on every open YouTube tab immediately and reverses just as fast.
 */

(() => {
  const { GROUPS, ALL, DEFAULTS, STORAGE_KEY } = globalThis.PHOCUS;
  const FEATURE_IDS = ALL.map((f) => f.id);

  /** Current settings; replaced wholesale whenever storage changes. */
  let settings = structuredClone(DEFAULTS);

  const isOn = (id) => settings.master !== false && settings.features[id] === true;

  /* ---------------------------------------------------------------------- */
  /* Applying settings                                                      */
  /* ---------------------------------------------------------------------- */

  function applyAttribute() {
    const enabled = FEATURE_IDS.filter(isOn);
    const root = document.documentElement;
    const next = enabled.join(' ');
    if (root.getAttribute('data-phocus') !== next) {
      root.setAttribute('data-phocus', next);
    }
  }

  function apply() {
    applyAttribute();
    tagSidebar();
    enforceRedirects();
    enforcePlayer();
  }

  /* ---------------------------------------------------------------------- */
  /* Left sidebar sections                                                  */
  /* ---------------------------------------------------------------------- */

  /*
   * "Explore" and "More from YouTube" have no stable id or class, and their
   * headings are translated, so match them by the destinations they link to.
   * A section is classified by whichever bucket most of its links fall into.
   */
  const EXPLORE_PATHS = [
    '/feed/trending',
    '/feed/explore',
    '/feed/storefront',
    '/feed/sports',
    '/feed/courses',
    '/gaming',
    '/podcasts',
    '/playables',
    '/movies'
  ];

  // Trending, Music, Gaming, Sports, Learning, Live, Fashion, Movies & TV.
  const EXPLORE_CHANNELS = [
    'UCkYQyvc_i9hXEo4xic9Hh2g',
    'UC-9-kyTW8ZkZNDHQJ6FgpwQ',
    'UCOpNcN46UbXVtpKMrmU4Abg',
    'UCEgdi0XIXXZ-qJOFPf4JSKw',
    'UCzuqE7-t13O4NIDYJfakrhw',
    'UC4R8DWoMoI7CAwX8_LjQHig',
    'UCrpQ4p1Ql_hG8rKXIKM1MOQ',
    'UCYfdidRxbB8Qhf0Nx7ioOYw',
    'UClgRkhTL3_hImCAmdLfDE4g'
  ];

  const MORE_HOSTS = [
    'music.youtube.com',
    'studio.youtube.com',
    'tv.youtube.com',
    'artists.youtube.com',
    'www.youtubekids.com',
    'youtubekids.com'
  ];

  const MORE_PATHS = ['/premium', '/creators', '/kids', '/about', '/howyoutubeworks'];

  function classifyLink(anchor) {
    let url;
    try {
      url = new URL(anchor.href, location.origin);
    } catch {
      return null;
    }

    if (url.host !== location.host) {
      // studio.youtube.com/channel/... is the user's own "Your channel" link,
      // which lives in the You section, not in More from YouTube.
      if (url.host === 'studio.youtube.com' && url.pathname.startsWith('/channel')) return null;
      return MORE_HOSTS.includes(url.host) ? 'more' : null;
    }
    if (MORE_PATHS.some((p) => url.pathname.startsWith(p))) return 'more';
    if (EXPLORE_PATHS.some((p) => url.pathname.startsWith(p))) return 'explore';
    if (EXPLORE_CHANNELS.some((id) => url.pathname === `/channel/${id}`)) return 'explore';
    return null;
  }

  function tagSidebar() {
    for (const section of document.querySelectorAll('ytd-guide-section-renderer')) {
      const votes = { explore: 0, more: 0 };
      for (const anchor of section.querySelectorAll('a[href]')) {
        const kind = classifyLink(anchor);
        if (kind) votes[kind] += 1;
      }

      /*
       * Demand a clear majority before hiding a whole section. One stray match
       * isn't enough — the You section links out to Studio, and the personal
       * sections are full of channel links that vote for nothing at all.
       */
      const entries = section.querySelectorAll('ytd-guide-entry-renderer').length;
      const leader = votes.explore >= votes.more ? 'explore' : 'more';
      const winner =
        votes[leader] >= 2 && votes[leader] * 2 >= entries ? leader : null;

      if (winner) {
        section.setAttribute('data-phocus-guide', winner);
      } else {
        section.removeAttribute('data-phocus-guide');
      }
    }

    const subsSelector =
      'ytd-guide-entry-renderer a[href*="/feed/subscriptions"], ' +
      'ytd-mini-guide-entry-renderer a[href*="/feed/subscriptions"]';
    for (const anchor of document.querySelectorAll(subsSelector)) {
      const entry = anchor.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
      if (entry) entry.setAttribute('data-phocus-guide', 'subscriptions');
    }

    tagShortsEntries();
  }

  /*
   * The Shorts nav item is the odd one out: its anchor carries no href at all,
   * because YouTube routes it through the Polymer router instead. Those JS
   * properties are invisible from an isolated content script, so identify it by
   * what does survive into the DOM — the title (Shorts is a brand name and goes
   * untranslated), the icon glyph, and an href when one happens to be present.
   */
  const SHORTS_GLYPH = 'm13.467 1.19';

  function isShortsEntry(entry) {
    const anchor = entry.querySelector('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/shorts')) return true;
      if (anchor.getAttribute('title') === 'Shorts') return true;
    }
    const path = entry.querySelector('yt-icon path')?.getAttribute('d');
    return Boolean(path && path.startsWith(SHORTS_GLYPH));
  }

  function tagShortsEntries() {
    const selector = 'ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer';
    for (const entry of document.querySelectorAll(selector)) {
      // Don't clobber the Subscriptions tag on a non-Shorts entry.
      if (isShortsEntry(entry)) entry.setAttribute('data-phocus-guide', 'shorts');
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Redirects                                                              */
  /* ---------------------------------------------------------------------- */

  function enforceRedirects() {
    const path = location.pathname;

    // A Short is just a video: send it to the normal player rather than a dead end.
    if (isOn('shorts') && path.startsWith('/shorts/')) {
      const id = path.split('/')[2];
      if (id) {
        location.replace(`${location.origin}/watch?v=${encodeURIComponent(id)}`);
        return;
      }
    }

    if (isOn('subscriptions') && path.startsWith('/feed/subscriptions')) {
      location.replace(`${location.origin}/`);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Player behaviour (autoplay, annotations)                               */
  /* ---------------------------------------------------------------------- */

  /** Last value posted per command, so a busy MutationObserver isn't chatty. */
  const lastPosted = {};

  function toBridge(cmd, value) {
    if (lastPosted[cmd] === value) return;
    lastPosted[cmd] = value;
    window.postMessage({ __phocus: true, cmd, value }, location.origin);
  }

  /*
   * Autoplay is a one-shot, not a rule we police.
   *
   * With "disable autoplay" on we switch YouTube's autoplay off once per page
   * and then leave the control alone. If you switch it back on in the player,
   * that's you changing your mind, so our own toggle follows you off — the
   * popup should never claim something the player is visibly contradicting.
   *
   * Intent is read from aria-checked rather than from a click, because YouTube
   * drives this control from a keydown handler as well as a click one — a user
   * toggling autoplay with the keyboard fires no click event at all. Watching
   * the attribute catches every route in.
   *
   * The reading only starts once our own one-shot has run on this page, so the
   * value YouTube writes while restoring player state is never mistaken for a
   * decision. Our own nudge always writes "false", and only "true" is treated
   * as the user speaking, so we can't trip over ourselves either.
   */
  let autoplayAppliedThisPage = false;
  let watchedAutoplayToggle = null;

  function autoplayToggle() {
    return document.querySelector('.ytp-autonav-toggle-button');
  }

  function watchAutoplayToggle(el) {
    if (el === watchedAutoplayToggle) return;
    watchedAutoplayToggle = el;

    new MutationObserver(() => {
      if (!autoplayAppliedThisPage || !isOn('autoplay')) return;
      if (el.getAttribute('aria-checked') !== 'true') return;
      followUserBackToAutoplay();
    }).observe(el, { attributes: true, attributeFilter: ['aria-checked'] });
  }

  function applyAutoplayOnce() {
    if (!isOn('autoplay')) {
      // Re-arm, so switching the toggle back on acts again on this same page.
      autoplayAppliedThisPage = false;
      return;
    }

    const el = autoplayToggle();
    if (!el) return;
    watchAutoplayToggle(el);

    if (autoplayAppliedThisPage) return;

    if (el.getAttribute('aria-checked') === 'true') {
      (el.closest('button') || el).click();
    }
    autoplayAppliedThisPage = true;
  }

  /** The user turned autoplay back on: stop claiming we disabled it. */
  function followUserBackToAutoplay() {
    settings.features.autoplay = false;
    applyAttribute();

    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY] || {};
      chrome.storage.sync.set({
        [STORAGE_KEY]: {
          master: stored.master !== false,
          features: { ...(stored.features || {}), autoplay: false }
        }
      });
    });
  }

  function enforcePlayer() {
    applyAutoplayOnce();
    toBridge('annotations', isOn('annotations'));
  }

  /* ---------------------------------------------------------------------- */
  /* Wiring                                                                 */
  /* ---------------------------------------------------------------------- */

  function normalise(stored) {
    const next = {
      master: stored && typeof stored.master === 'boolean' ? stored.master : true,
      features: {}
    };
    for (const id of FEATURE_IDS) {
      next.features[id] = Boolean(stored?.features?.[id]);
    }
    return next;
  }

  chrome.storage.sync.get(STORAGE_KEY, (result) => {
    settings = result[STORAGE_KEY] ? normalise(result[STORAGE_KEY]) : structuredClone(DEFAULTS);
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[STORAGE_KEY]) return;
    settings = normalise(changes[STORAGE_KEY].newValue);
    apply();
  });

  /*
   * YouTube rebuilds large parts of the page as you navigate, and renders the
   * sidebar lazily the first time it's opened. A coalesced observer keeps the
   * tags fresh without doing work on every mutation.
   */
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      tagSidebar();
      enforcePlayer();
    });
  }

  function observe() {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    // SPA route changes fire these rather than a real page load.
    for (const event of ['yt-navigate-finish', 'yt-page-data-updated']) {
      document.addEventListener(event, () => {
        // New page, new player: let the bridge hear the settings again, and
        // re-arm the once-per-page autoplay nudge.
        for (const key of Object.keys(lastPosted)) delete lastPosted[key];
        autoplayAppliedThisPage = false;
        enforceRedirects();
        schedule();
      });
    }
  }

  if (document.documentElement) observe();
  else document.addEventListener('DOMContentLoaded', observe, { once: true });
})();
