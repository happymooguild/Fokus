/*
 * Popup logic.
 *
 * The popup owns no state of its own: every interaction writes the whole
 * settings object back to chrome.storage.sync, and open YouTube tabs pick the
 * change up through their storage listener. Re-render is driven from the same
 * `settings` object, so what you see is always what was saved.
 */

const { GROUPS, ALL, DEFAULTS, STORAGE_KEY, SPONSOR_URL } = globalThis.PHOCUS;

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const summaryEl = document.getElementById('summary');
const masterEl = document.getElementById('master');
const filterEl = document.getElementById('filter');
const sponsorEl = document.getElementById('sponsor');

let settings = structuredClone(DEFAULTS);

/** Parent id -> whether its children are expanded. Session-only, not persisted. */
const expanded = new Map();

/* ------------------------------------------------------------------------ */
/* Storage                                                                   */
/* ------------------------------------------------------------------------ */

function load() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY];
      settings = {
        master: typeof stored?.master === 'boolean' ? stored.master : DEFAULTS.master,
        features: { ...(stored ? {} : DEFAULTS.features), ...(stored?.features || {}) }
      };
      resolve();
    });
  });
}

function save() {
  chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

const isChecked = (id) => settings.features[id] === true;

/* ------------------------------------------------------------------------ */
/* Rendering                                                                 */
/* ------------------------------------------------------------------------ */

const CHEVRON = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
  <path d="M6 9.5 12 15l6-5.5" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function displayLabel(feature) {
  return feature.verb ? `${feature.verb} ${feature.label.toLowerCase()}` : feature.label;
}

function buildRow(feature, isChild) {
  const row = document.createElement('div');
  row.className = isChild ? 'row child' : 'row';
  row.dataset.id = feature.id;
  row.setAttribute('role', 'switch');
  row.setAttribute('tabindex', '0');
  row.dataset.search = `${displayLabel(feature)} ${feature.hint}`.toLowerCase();

  const body = document.createElement('div');
  body.className = 'row-body';

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = displayLabel(feature);

  const hint = document.createElement('span');
  hint.className = 'row-hint';
  hint.textContent = feature.hint;

  body.append(label, hint);
  row.append(body);

  if (feature.children?.length) {
    const chevron = document.createElement('button');
    chevron.className = 'chevron';
    chevron.type = 'button';
    chevron.innerHTML = CHEVRON;
    chevron.dataset.toggles = feature.id;
    chevron.setAttribute(
      'aria-label',
      `Show the ${feature.children.length} parts of ${feature.label.toLowerCase()}`
    );
    row.append(chevron);
  }

  const knob = document.createElement('span');
  knob.className = 'switch';
  row.append(knob);

  return row;
}

function render() {
  listEl.textContent = '';

  for (const group of GROUPS) {
    const groupEl = document.createElement('section');
    groupEl.className = 'group';
    groupEl.dataset.group = group.id;

    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = group.label;
    groupEl.append(title);

    for (const feature of group.features) {
      groupEl.append(buildRow(feature, false));

      if (feature.children?.length) {
        const wrap = document.createElement('div');
        wrap.className = 'children';
        wrap.dataset.parent = feature.id;

        const inner = document.createElement('div');
        for (const child of feature.children) {
          inner.append(buildRow(child, true));
        }
        wrap.append(inner);
        groupEl.append(wrap);
      }
    }

    listEl.append(groupEl);
  }

  syncDom();
}

/** Push `settings` onto the already-rendered DOM. Cheap enough to call freely. */
function syncDom() {
  for (const row of listEl.querySelectorAll('.row')) {
    row.setAttribute('aria-checked', String(isChecked(row.dataset.id)));
  }

  // A child is pointless while its parent hides the whole container: say so.
  for (const group of GROUPS) {
    for (const feature of group.features) {
      if (!feature.children?.length) continue;
      const parentOn = isChecked(feature.id);
      const wrap = listEl.querySelector(`.children[data-parent="${feature.id}"]`);
      for (const child of wrap.querySelectorAll('.row')) {
        child.classList.toggle('superseded', parentOn);
        child.title = parentOn
          ? `Already hidden by "${displayLabel(feature)}"`
          : '';
      }

      const open = expanded.get(feature.id) === true;
      wrap.classList.toggle('open', open);
      const chevron = listEl.querySelector(`.chevron[data-toggles="${feature.id}"]`);
      chevron.setAttribute('aria-expanded', String(open));
    }
  }

  const total = ALL.length;
  const on = ALL.filter((f) => isChecked(f.id)).length;

  masterEl.setAttribute('aria-checked', String(settings.master));
  masterEl.querySelector('.master-label').textContent = settings.master ? 'on' : 'off';
  document.body.classList.toggle('paused', !settings.master);

  summaryEl.textContent = !settings.master
    ? 'Paused — YouTube is untouched'
    : on === 0
      ? `Nothing hidden yet · ${total} options`
      : `${on} of ${total} hidden`;
}

/* ------------------------------------------------------------------------ */
/* Filtering                                                                 */
/* ------------------------------------------------------------------------ */

function applyFilter() {
  const query = filterEl.value.trim().toLowerCase();
  let anyVisible = false;

  for (const group of GROUPS) {
    const groupEl = listEl.querySelector(`.group[data-group="${group.id}"]`);
    let groupVisible = false;

    for (const feature of group.features) {
      const row = listEl.querySelector(`.row[data-id="${feature.id}"]`);
      const wrap = listEl.querySelector(`.children[data-parent="${feature.id}"]`);
      const parentHit = !query || row.dataset.search.includes(query);

      let childHit = false;
      if (wrap) {
        for (const childRow of wrap.querySelectorAll('.row')) {
          const hit = !query || parentHit || childRow.dataset.search.includes(query);
          childRow.hidden = !hit;
          childHit ||= hit;
        }
        // While searching, open anything that has a hit inside it.
        wrap.classList.toggle(
          'open',
          query ? childHit : expanded.get(feature.id) === true
        );
      }

      const visible = parentHit || childHit;
      row.hidden = !visible;
      if (wrap) wrap.hidden = !visible;
      groupVisible ||= visible;
    }

    groupEl.hidden = !groupVisible;
    anyVisible ||= groupVisible;
  }

  emptyEl.hidden = anyVisible;
}

/* ------------------------------------------------------------------------ */
/* Events                                                                    */
/* ------------------------------------------------------------------------ */

function toggleFeature(id) {
  settings.features[id] = !isChecked(id);

  // Turning a parent on collapses its children — they're all covered now.
  const parent = GROUPS.flatMap((g) => g.features).find((f) => f.id === id);
  if (parent?.children?.length && settings.features[id]) {
    expanded.set(id, false);
  }

  save();
  syncDom();
  // syncDom restores expand state from `expanded`; re-assert the filter's view.
  if (filterEl.value.trim()) applyFilter();
}

listEl.addEventListener('click', (event) => {
  const chevron = event.target.closest('.chevron');
  if (chevron) {
    const id = chevron.dataset.toggles;
    expanded.set(id, expanded.get(id) !== true);
    syncDom();
    return;
  }

  const row = event.target.closest('.row');
  if (row) toggleFeature(row.dataset.id);
});

listEl.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = event.target.closest('.row');
  if (!row || event.target.closest('.chevron')) return;
  event.preventDefault();
  toggleFeature(row.dataset.id);
});

masterEl.addEventListener('click', () => {
  settings.master = !settings.master;
  save();
  syncDom();
});

filterEl.addEventListener('input', applyFilter);

filterEl.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && filterEl.value) {
    event.stopPropagation();
    filterEl.value = '';
    applyFilter();
  }
});

sponsorEl.href = SPONSOR_URL;

/* Keep in step if another popup or a synced device changes things underneath us. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[STORAGE_KEY]) return;
  const value = changes[STORAGE_KEY].newValue;
  if (!value) return;
  settings = { master: value.master !== false, features: value.features || {} };
  syncDom();
});

load().then(render);
