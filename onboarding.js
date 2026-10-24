'use strict';

/**
 * onboarding.js — sheetcuts.app/onboarding, the web twin of the extension's
 * first-run page (SheetCuts/welcome.html).
 *
 * A normal web page has no chrome.* APIs, so the extension's self-ticking
 * checks (pin detection, sign-in, permission, first real shortcut) become
 * buttons the visitor ticks; progress is kept in localStorage.  The practice
 * sheet is the SAME code as in the extension (practice/practice-sheet.js +
 * the real overlay and shortcut tree, copied in by practice/_sync-practice.sh)
 * and still ticks its tasks automatically.  The Quick Access picker here only
 * drives the practice sheet — visitors set their real layout in SheetCuts
 * Settings (Alt › F › T).
 *
 * External file because the site's CSP is script-src 'self'.
 */

(() => {
  const STEPS = ['pin', 'signin', 'practice', 'qat', 'trace', 'real'];
  const REQUIRED = ['pin', 'signin', 'practice', 'qat', 'real'];
  const STORE_KEY = 'sheetcuts_onboarding_web';

  const $ = (sel) => document.querySelector(sel);

  // localStorage can be blocked (private windows, strict settings) — the page
  // must still work, it just won't remember progress.
  function readState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; }
  }
  function writeState(patch) {
    const next = { ...readState(), ...patch };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (_) { /* not persisted */ }
    return next;
  }

  let state = readState();
  const done = new Set(STEPS.filter(s => state[s]));

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function setDone(step, isDone) {
    if (isDone) done.add(step); else done.delete(step);
    state = writeState({ [step]: isDone });
    render();
  }

  function render() {
    const n = STEPS.filter(s => done.has(s)).length;
    $('#progressText').textContent = `${n} of ${STEPS.length} done`;
    $('#progressBar').style.width = (n / STEPS.length * 100) + '%';
    const current = STEPS.find(s => !done.has(s));
    for (const s of STEPS) {
      const li = document.querySelector(`.ob-step[data-step="${s}"]`);
      li.classList.toggle('done', done.has(s));
      li.classList.toggle('current', s === current);
    }
    document.querySelectorAll('.ob-check').forEach(b => b.setAttribute('aria-pressed', String(done.has(b.dataset.check))));
    $('#doneCard').hidden = !REQUIRED.every(s => done.has(s));
  }

  document.querySelectorAll('.ob-check').forEach(btn => {
    btn.addEventListener('click', () => setDone(btn.dataset.check, !done.has(btn.dataset.check)));
  });

  // ── Practice sheet ─────────────────────────────────────────────────────

  const QAT_CHOICES = [
    'paste.values', 'fillColor.open', 'font.color', 'autofit.columnWidth', 'trace.dependents',
    'trace.precedents', 'borders.all', 'borders.bottom', 'borders.thickBox', 'merge.centerAlign',
    'wrapText', 'commaStyle', 'format.percent', 'format.increaseDecimal', 'format.decreaseDecimal',
    'paste.formatting', 'formatPainter', 'sortAsc', 'filterToggle', 'view.freezePanes',
    'insert.row', 'delete.row', 'groupRows', 'hideRows',
  ];

  // Start from the extension's defaults; a layout tried here is remembered locally.
  const prefs = Customs.normalize(null);
  if (Array.isArray(state.qatLayout)) {
    prefs.sheets.qat = state.qatLayout.filter(a => Customs.describe('sheets', a)).slice(0, Customs.QAT_SLOTS);
  }
  let tree = Customs.buildTree('sheets', prefs);

  const tasks = new Set();
  function completeTask(t) {
    if (tasks.has(t)) return;
    tasks.add(t);
    const li = document.querySelector(`.ob-tasks li[data-task="${t}"]`);
    if (li) li.classList.add('done');
    if (['bold', 'fill', 'repeat', 'qat'].every(x => tasks.has(x))) {
      $('#practiceStatus').textContent = 'Nailed it. That’s the whole idea — the same keys work in your real sheets.';
      setDone('practice', true);
    }
  }

  PracticeSheet.mount($('#sandbox'), { getTree: () => tree, onTask: completeTask, toast });

  if (done.has('practice')) {
    document.querySelectorAll('.ob-tasks li').forEach(li => li.classList.add('done'));
  }

  // ── Quick Access "try a layout" picker ─────────────────────────────────

  function renderQat() {
    const qat = prefs.sheets.qat;
    const preview = $('#qatPreview');
    preview.innerHTML = '';
    for (let i = 0; i < Customs.QAT_SLOTS; i++) {
      const c = qat[i] && Customs.describe('sheets', qat[i]);
      const slot = document.createElement('span');
      slot.className = 'slot' + (c ? '' : ' empty');
      const k = document.createElement('kbd');
      k.textContent = 'Alt+' + (i + 1);
      slot.append(k, c ? c.description : 'empty');
      preview.append(slot);
    }

    const chips = $('#qatChips');
    chips.innerHTML = '';
    for (const action of QAT_CHOICES) {
      const c = Customs.describe('sheets', action);
      if (!c) continue;
      const idx = qat.indexOf(action);
      const chip = document.createElement('button');
      chip.className = 'ob-chip';
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(idx >= 0));
      if (idx >= 0) {
        const n = document.createElement('span');
        n.className = 'n';
        n.textContent = String(idx + 1);
        chip.append(n);
      }
      chip.append(c.description);
      chip.title = c.path.join(' › ');
      chip.addEventListener('click', () => toggleQat(action));
      chips.append(chip);
    }
  }

  function toggleQat(action) {
    const qat = prefs.sheets.qat;
    const idx = qat.indexOf(action);
    if (idx >= 0) qat.splice(idx, 1);
    else if (qat.length >= Customs.QAT_SLOTS) { toast('Quick Access holds 9 commands — remove one first.'); return; }
    else qat.push(action);
    tree = Customs.buildTree('sheets', prefs);
    state = writeState({ qatLayout: qat.slice() });
    renderQat();
    toast('Try Alt › ' + (qat.length || 1) + ' in the practice sheet — set it for real with Alt › F › T in any sheet.');
  }

  renderQat();
  render();
})();
