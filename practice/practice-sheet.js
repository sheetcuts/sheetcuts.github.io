'use strict';

/**
 * practice-sheet.js — the hands-on mini spreadsheet used to teach the Alt
 * gesture.  Shared by the extension's onboarding page (welcome.html) and the
 * website's hosted copy (sheetcuts.app/onboarding — Site/practice/ holds an
 * identical copy, refreshed by Site/practice/sync-from-extension.sh).
 *
 * It drives the REAL overlay (overlay.js) over the REAL Sheets tree
 * (shortcuts.js) plus whatever Quick Access layout the caller passes, and
 * really performs the common formatting commands on its little grid —
 * including a keyboard colour palette and F4 repeat of the exact colour.
 * No chrome.* APIs: everything here also runs on a plain web page.
 *
 *   PracticeSheet.mount(container, {
 *     getTree: () => tree,          // effective tree (Customs.buildTree)
 *     onTask:  (name) => {},        // 'bold' | 'fill' | 'repeat' | 'qat'
 *     toast:   (message) => {},
 *   })
 */

const PracticeSheet = (() => {

  const COLS = ['A', 'B', 'C', 'D', 'E'];
  const DATA = [
    ['',             'Q1',  'Q2',  'Q3',  'Total'],
    ['Revenue',      1200,  1350,  1500,  4050],
    ['COGS',         480,   520,   610,   1610],
    ['Gross profit', 720,   830,   890,   2440],
    ['Margin',       0.6,   0.615, 0.593, 0.602],
    ['',             '',    '',    '',    ''],
  ];
  const PALETTE = [
    ['light red 3', '#f4cccc'], ['light orange 3', '#fce5cd'], ['light yellow 3', '#fff2cc'], ['light green 3', '#d9ead3'],
    ['light cyan 3', '#d0e0e3'], ['light blue 3', '#cfe2f3'], ['light purple 3', '#d9d2e9'], ['light magenta 3', '#ead1dc'],
    ['light red 1', '#e06666'], ['light orange 1', '#f6b26b'], ['light yellow 1', '#ffd966'], ['light green 1', '#93c47d'],
    ['light cyan 1', '#76a5af'], ['light blue 1', '#6fa8dc'], ['light purple 1', '#8e7cc3'], ['light magenta 1', '#c27ba0'],
    ['red', '#ff0000'], ['orange', '#ff9900'], ['yellow', '#ffff00'], ['green', '#00ff00'],
    ['cyan', '#00ffff'], ['blue', '#0000ff'], ['purple', '#9900ff'], ['black', '#000000'],
  ];

  function mount(container, opts = {}) {
    const getTree = opts.getTree || (() => ({}));
    const onTask = opts.onTask || (() => {});
    const toast = opts.toast || (() => {});

    container.classList.add('sandbox');
    container.tabIndex = 0;
    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', 'Practice spreadsheet. Click, then press Alt.');
    container.innerHTML =
      '<div class="sb-bar"><span class="sb-namebox"></span><span class="sb-fx">fx</span><span class="sb-formula"></span></div>' +
      '<div class="sb-gridwrap"><table class="sb-grid"></table></div>' +
      '<div class="sb-palette" hidden></div>' +
      '<div class="sb-focus-hint">Click here, then press <kbd>Alt</kbd></div>';
    const grid = container.querySelector('.sb-grid');
    const paletteEl = container.querySelector('.sb-palette');
    const nameBox = container.querySelector('.sb-namebox');
    const formulaEl = container.querySelector('.sb-formula');

    const cells = DATA.map((row, r) => row.map((v) => ({
      v, bold: false, italic: false, underline: false, strike: false, fill: null, color: null,
      align: null, borders: { t: false, b: false, l: false, r: false }, fmt: r === 4 ? 'pct' : null, dec: 0, size: 0, wrap: false,
    })));
    const sel = { r: 1, c: 1 };
    let mode = 'idle';            // idle | ribbon | palette
    let node = null;
    let path = [];
    let pal = null;               // { prop, label, idx }
    let repeat = null;            // { label, run }

    function fmtValue(cell) {
      const v = cell.v;
      if (typeof v !== 'number') return v;
      if (cell.fmt === 'pct') return (v * 100).toFixed(Math.max(0, 1 + cell.dec)) + '%';
      if (cell.fmt === 'comma') return v.toLocaleString('en-US', { minimumFractionDigits: Math.max(0, 2 + cell.dec), maximumFractionDigits: Math.max(0, 2 + cell.dec) });
      return cell.dec > 0 ? v.toFixed(cell.dec) : String(v);
    }

    function renderGrid() {
      grid.innerHTML = '';
      const head = grid.insertRow();
      const corner = document.createElement('th');
      corner.className = 'row-h';
      head.append(corner);
      COLS.forEach((c, i) => {
        const th = document.createElement('th');
        th.textContent = c;
        if (i === sel.c) th.className = 'sel';
        head.append(th);
      });
      cells.forEach((row, r) => {
        const tr = grid.insertRow();
        const th = document.createElement('th');
        th.className = 'row-h' + (r === sel.r ? ' sel' : '');
        th.textContent = String(r + 1);
        tr.append(th);
        row.forEach((cell, c) => {
          const td = tr.insertCell();
          td.textContent = fmtValue(cell);
          const cls = [];
          if (typeof cell.v === 'number') cls.push('num');
          if (r === sel.r && c === sel.c) cls.push('active');
          if (cell.borders.t) cls.push('bt');
          if (cell.borders.b) cls.push('bb');
          if (cell.borders.l) cls.push('bl');
          if (cell.borders.r) cls.push('br');
          td.className = cls.join(' ');
          td.style.fontWeight = cell.bold ? '700' : '';
          td.style.fontStyle = cell.italic ? 'italic' : '';
          td.style.textDecoration = [cell.underline && 'underline', cell.strike && 'line-through'].filter(Boolean).join(' ');
          td.style.background = cell.fill || '';
          td.style.color = cell.color || '';
          td.style.textAlign = cell.align || '';
          td.style.fontSize = cell.size ? (13 + cell.size) + 'px' : '';
          td.style.whiteSpace = cell.wrap ? 'normal' : '';
          td.addEventListener('mousedown', (e) => {
            e.preventDefault();
            sel.r = r; sel.c = c;
            closeAll();
            renderGrid();
            container.focus();
          });
        });
      });
      nameBox.textContent = COLS[sel.c] + (sel.r + 1);
      const cur = cells[sel.r][sel.c];
      formulaEl.textContent = typeof cur.v === 'number' ? String(cur.v) : cur.v;
    }

    const active = () => cells[sel.r][sel.c];

    // Commands the sandbox can really perform on the selected cell.
    const SIM = {
      'bold':            (c) => { c.bold = !c.bold; },
      'italic':          (c) => { c.italic = !c.italic; },
      'underline':       (c) => { c.underline = !c.underline; },
      'strikethrough':   (c) => { c.strike = !c.strike; },
      'align.left':      (c) => { c.align = 'left'; },
      'align.center':    (c) => { c.align = 'center'; },
      'align.right':     (c) => { c.align = 'right'; },
      'merge.centerAlign': (c) => { c.align = 'center'; },
      'borders.all':     (c) => { c.borders = { t: true, b: true, l: true, r: true }; },
      'borders.outside': (c) => { c.borders = { t: true, b: true, l: true, r: true }; },
      'borders.thickBox': (c) => { c.borders = { t: true, b: true, l: true, r: true }; },
      'borders.none':    (c) => { c.borders = { t: false, b: false, l: false, r: false }; },
      'borders.bottom':  (c) => { c.borders.b = true; },
      'borders.thickBottom': (c) => { c.borders.b = true; },
      'borders.top':     (c) => { c.borders.t = true; },
      'borders.left':    (c) => { c.borders.l = true; },
      'borders.right':   (c) => { c.borders.r = true; },
      'format.percent':  (c) => { c.fmt = 'pct'; c.dec = 0; },
      'commaStyle':      (c) => { c.fmt = 'comma'; c.dec = 0; },
      'format.increaseDecimal': (c) => { c.dec++; },
      'format.decreaseDecimal': (c) => { c.dec = Math.max(c.fmt ? -2 : 0, c.dec - 1); },
      'increaseFontSize': (c) => { c.size = Math.min(8, c.size + 2); },
      'decreaseFontSize': (c) => { c.size = Math.max(-4, c.size - 2); },
      'wrapText':        (c) => { c.wrap = !c.wrap; },
      'clearContents':   (c) => { c.v = ''; },
      'clearFormats':    (c) => { Object.assign(c, { bold: false, italic: false, underline: false, strike: false, fill: null, color: null, align: null, fmt: null, dec: 0, size: 0, wrap: false, borders: { t: false, b: false, l: false, r: false } }); },
    };

    function run(action, label, fromQat) {
      if (fromQat) onTask('qat');
      if (action === 'fillColor.open') return openPalette('fill', 'Fill color');
      if (action === 'font.color') return openPalette('color', 'Font color');
      const fn = SIM[action];
      Overlay.showExecuting(label);
      if (!fn) {
        toast(`✓ ${label} — this one runs for real in Google Sheets.`);
        return;
      }
      const apply = () => { fn(active()); renderGrid(); };
      apply();
      repeat = { label, run: apply };
      if (action === 'bold') onTask('bold');
    }

    function openPalette(prop, label) {
      mode = 'palette';
      pal = { prop, label, idx: PALETTE.findIndex(p => p[0] === 'light green 3') };
      renderPalette();
    }

    function renderPalette() {
      paletteEl.innerHTML = '';
      PALETTE.forEach(([name, hex], i) => {
        const sw = document.createElement('span');
        sw.className = 'sw' + (i === pal.idx ? ' on' : '');
        sw.style.background = hex;
        sw.title = name;
        sw.addEventListener('mousedown', (e) => { e.preventDefault(); pal.idx = i; applyPalette(false); });
        paletteEl.append(sw);
      });
      const hint = document.createElement('div');
      hint.className = 'pal-hint';
      hint.textContent = '←↑→↓ pick · Enter apply · N none · Esc cancel';
      paletteEl.append(hint);
      // Anchor under the active cell
      const td = grid.rows[sel.r + 1].cells[sel.c + 1];
      const sb = container.getBoundingClientRect();
      const r = td.getBoundingClientRect();
      paletteEl.style.left = Math.max(0, Math.min(r.left - sb.left, sb.width - 230)) + 'px';
      paletteEl.style.top = (r.bottom - sb.top + 4) + 'px';
      paletteEl.hidden = false;
    }

    function applyPalette(none) {
      const { prop, label } = pal;
      const [name, hex] = none ? ['none', null] : PALETTE[pal.idx];
      closeAll();
      const apply = () => { active()[prop] = hex; renderGrid(); };
      apply();
      repeat = { label: `${label}: ${name}`, run: apply };
      Overlay.showExecuting(`${label}: ${name}`);
      if (prop === 'fill' && hex) onTask('fill');
    }

    function closeAll() {
      if (mode === 'ribbon') Overlay.hide();
      mode = 'idle';
      node = null;
      path = [];
      pal = null;
      paletteEl.hidden = true;
    }

    // Same rule as content.js: the typed character, or the physical key when
    // a modifier turned it into a symbol (Option+H → "˙" on a Mac).
    function ribbonKey(e) {
      const k = (e.key || '').toUpperCase();
      if (/^[A-Z0-9]$/.test(k)) return k;
      const m = /^(?:Key([A-Z])|Digit(\d)|Numpad(\d))$/.exec(e.code || '');
      return m ? (m[1] || m[2] || m[3]) : k;
    }

    function move(dr, dc) {
      sel.r = Math.max(0, Math.min(cells.length - 1, sel.r + dr));
      sel.c = Math.max(0, Math.min(COLS.length - 1, sel.c + dc));
      renderGrid();
    }

    const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

    container.addEventListener('keydown', (e) => {
      const isAlt = e.key === 'Alt';
      if (isAlt) e.preventDefault();      // keep the browser menu from grabbing focus

      if (mode === 'palette') {
        e.preventDefault();
        if (e.key === 'Escape') return closeAll();
        if (e.key === 'Enter') return applyPalette(false);
        if (e.key === 'n' || e.key === 'N') return applyPalette(true);
        const d = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (d) {
          const next = pal.idx + d;
          if (next >= 0 && next < PALETTE.length) { pal.idx = next; renderPalette(); }
        }
        return;
      }

      if (mode === 'ribbon') {
        if (isAlt || /^(Shift|Control|Meta)$/.test(e.key)) return;
        e.preventDefault();
        if (e.key === 'Escape') return closeAll();
        if (ARROWS[e.key]) { closeAll(); return move(...ARROWS[e.key]); }
        const key = ribbonKey(e);
        const children = node ? node.children : getTree();
        const next = children && children[key];
        if (!next) return Overlay.flashInvalid();
        path = path.concat(key);
        if (next.action) {
          closeAll();
          return run(next.action, next.description, !!next.qat);
        }
        if (next.children && Object.keys(next.children).length) {
          node = next;
          return Overlay.show(next.children, path, null);
        }
        closeAll();
        return Overlay.showNotImplemented(next.description);
      }

      // idle
      if (isAlt && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        mode = 'ribbon';
        node = null;
        path = [];
        return Overlay.show(getTree(), [], null, null);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (!repeat) return toast('Nothing to repeat yet — run a shortcut first.');
        repeat.run();
        Overlay.showExecuting('Repeat: ' + repeat.label);
        return onTask('repeat');
      }
      if (ARROWS[e.key]) { e.preventDefault(); return move(...ARROWS[e.key]); }
      if (e.key === 'Enter') { e.preventDefault(); return move(1, 0); }
      if (e.key === 'Tab') { e.preventDefault(); return move(0, e.shiftKey ? -1 : 1); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); active().v = ''; return renderGrid(); }
    });

    container.addEventListener('keyup', (e) => { if (e.key === 'Alt') e.preventDefault(); });
    container.addEventListener('blur', () => { if (mode === 'ribbon') closeAll(); });

    renderGrid();
  }

  return { mount };
})();
