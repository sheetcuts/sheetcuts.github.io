'use strict';

/**
 * custom-shortcuts.js — Quick Access Toolbar + custom shortcuts.
 *
 * Shared by the content scripts (Sheets, Slides, Docs) and options.html.
 *
 * Preferences live in chrome.storage.sync under STORAGE_KEY, per app:
 *   {
 *     version: 1,
 *     sheets: { qat: ['paste.values', …],          // Alt+1 … Alt+9, in order
 *               custom: [{ action, seq: ['Q','W'] }   // Alt › Q › W
 *                       | { action, chord: { ctrl, alt, shift, meta, code } }] },
 *     slides: { … same shape … },
 *     docs:   { … same shape … },
 *   }
 *
 * The content script builds an EFFECTIVE tree from the built-in one (the
 * Excel/PowerPoint ribbon) plus the QAT digits at the root and any custom Alt
 * sequences, and a chord map for direct key combos (Ctrl+Shift+K, …).
 */

const Customs = (() => {

  const STORAGE_KEY = 'sheetcuts_prefs';
  const QAT_SLOTS = 9;
  const OPTIONS_ACTION = 'sheetcuts.options';

  const DEFAULTS = {
    sheets: {
      qat: ['paste.values', 'fillColor.open', 'font.color', 'autofit.columnWidth', 'trace.dependents'],
      custom: [],
    },
    slides: {
      qat: ['shapeFill', 'fontColor', 'arrangeAlignCenter', 'bringToFront', 'group'],
      custom: [],
    },
    docs: {
      qat: ['docs.style.normal', 'docs.style.h1', 'docs.style.h2', 'highlightColor', 'pasteWithoutFormatting'],
      custom: [],
    },
  };
  const APPS = ['sheets', 'slides', 'docs'];
  const APP_LABELS = { sheets: 'Sheets', slides: 'Slides', docs: 'Docs' };

  // ── Free plan vs Pro (Admin Files/freemium-plan.md) ──────────────────────
  // After the 14-day trial an account keeps every command except these — the
  // analyst toolkit — plus the Quick Access Toolbar and custom shortcuts,
  // which are Pro as a whole (content.js gates those by where a key came from).
  const PRO_PREFIXES = ['paste.', 'whatif.', 'cycle.', 'autocolor.', 'swap.'];
  const PRO_ACTIONS = new Set([
    'trace.precedents', 'trace.dependents',            // formula auditing
    'copy.picture',
    'groupRows', 'ungroupRows', 'hideDetail', 'showDetail',
    'removeDuplicates', 'textToColumns', 'dataValidation',
  ]);
  function isPro(action) {
    return typeof action === 'string' && (PRO_ACTIONS.has(action) || PRO_PREFIXES.some(p => action.startsWith(p)));
  }
  // A key-tip node the free plan can't run: a Pro command, a Quick Access
  // slot or a custom sequence — or a branch holding nothing else.
  function isLockedNode(node) {
    if (!node) return false;
    if (node.action) return !!(node.qat || node.custom) || isPro(node.action);
    const kids = Object.values(node.children || {});
    return kids.length > 0 && kids.every(isLockedNode);
  }

  // Built-in direct key combos (Excel's own, no Alt needed).  A user's custom
  // combo on the same keys wins.  Ctrl (not ⌘) on every OS, like Excel.
  const ctrl = (code, shift = false) => ({ ctrl: true, alt: false, shift, meta: false, code });
  const BUILTIN_CHORDS = {
    sheets: [
      { action: 'trace.precedents', chord: ctrl('BracketLeft') },
      { action: 'trace.dependents', chord: ctrl('BracketRight') },
      // Insert / delete: whole rows or columns selected → those; else the
      // Cells ▸ shift… submenu (Excel's Insert/Delete dialog).  Ctrl+− replaces
      // the browser's zoom-out inside Sheets, exactly as in Excel.
      { action: 'insert.smart', chord: ctrl('Equal', true),   description: 'Insert Rows / Columns / Cells' },
      { action: 'insert.smart', chord: ctrl('NumpadAdd'),     description: 'Insert Rows / Columns / Cells' },
      { action: 'delete.smart', chord: ctrl('Minus'),         description: 'Delete Rows / Columns / Cells' },
      { action: 'delete.smart', chord: ctrl('NumpadSubtract'), description: 'Delete Rows / Columns / Cells' },
      // Excel/Sheets' own number-format keys, upgraded to cycles (Macabacus).
      { action: 'cycle.number',   chord: ctrl('Digit1', true) },
      { action: 'cycle.date',     chord: ctrl('Digit3', true) },
      { action: 'cycle.currency', chord: ctrl('Digit4', true) },
      { action: 'cycle.percent',  chord: ctrl('Digit5', true) },
    ],
    slides: [],
    docs: [],
  };

  const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '');
  // What to call the Alt key on screen: a Mac keyboard says Option (⌥).
  const ALT_KEY = IS_MAC ? '⌥' : 'Alt';
  const ALT_NAME = IS_MAC ? '⌥ Option' : 'Alt';

  // ── Trees & catalog ──────────────────────────────────────────────────────

  function baseTree(app) {
    if (app === 'slides') return typeof SLIDES_SHORTCUT_TREE !== 'undefined' ? SLIDES_SHORTCUT_TREE : {};
    if (app === 'docs') return typeof DOCS_SHORTCUT_TREE !== 'undefined' ? DOCS_SHORTCUT_TREE : {};
    return typeof SHEETS_SHORTCUT_TREE !== 'undefined' ? SHEETS_SHORTCUT_TREE : {};
  }

  function appForUrl(url) {
    if (/\/presentation\//.test(url || '')) return 'slides';
    if (/\/document\//.test(url || '')) return 'docs';
    return 'sheets';
  }

  /**
   * Every command reachable in an app's built-in tree, de-duplicated by action:
   *   [{ action, description, path: ['Home','Borders','All Borders'], keys: ['H','B','A'] }]
   */
  function catalog(app) {
    const out = [];
    const seen = new Set();
    (function walk(children, path, keys) {
      for (const [k, node] of Object.entries(children || {})) {
        const p = path.concat(node.description);
        const ks = keys.concat(String(k));
        if (node.action) {
          if (!seen.has(node.action)) {
            seen.add(node.action);
            const builtin = (BUILTIN_CHORDS[app] || []).find(b => b.action === node.action);
            out.push({ action: node.action, description: node.description, path: p, keys: ks, chord: builtin ? builtin.chord : null });
          }
        } else if (node.children) {
          walk(node.children, p, ks);
        }
      }
    })(baseTree(app), [], []);
    return out;
  }

  function describe(app, action) {
    return catalog(app).find(c => c.action === action) || null;
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  function normalize(raw) {
    const prefs = { version: 1 };
    // Display options: the title-bar logo button (header-button.js), on by default.
    prefs.ui = { headerButton: !(raw && raw.ui && raw.ui.headerButton === false) };
    // Format / colour cycle lists the user edited (cycles.js); others use
    // the defaults.  Loose checks: ≤ 12 non-empty strings of ≤ 120 chars.
    prefs.cycles = {};
    const rc = raw && raw.cycles;
    if (rc && typeof rc === 'object') {
      for (const [id, list] of Object.entries(rc)) {
        if (!/^[a-z]+$/.test(id) || !Array.isArray(list)) continue;
        const clean = list.filter(x => typeof x === 'string' && x.trim() && x.length <= 120)
          .map(x => x.trim()).slice(0, 12);
        if (clean.length) prefs.cycles[id] = clean;
      }
    }
    for (const app of APPS) {
      const src = raw && raw[app];
      prefs[app] = {
        qat: Array.isArray(src && src.qat) ? src.qat.filter(a => typeof a === 'string').slice(0, QAT_SLOTS)
                                            : DEFAULTS[app].qat.slice(),
        custom: Array.isArray(src && src.custom)
          ? src.custom.filter(c => c && typeof c.action === 'string' && (Array.isArray(c.seq) || (c.chord && c.chord.code)))
          : [],
      };
    }
    return prefs;
  }

  function load() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(STORAGE_KEY, (data) => resolve(normalize(data && data[STORAGE_KEY])));
      } catch (_) {
        resolve(normalize(null));
      }
    });
  }

  function save(prefs) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: normalize(prefs) }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else resolve();
      });
    });
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) cb(normalize(changes[STORAGE_KEY].newValue));
    });
  }

  // ── Effective tree (built-in + QAT + custom Alt sequences) ───────────────

  function buildTree(app, prefs) {
    const base = baseTree(app);
    const cat = new Map(catalog(app).map(c => [c.action, c]));
    const root = {};

    // QAT digits first so they lead the root overlay (Excel shows QAT tips first).
    (prefs[app].qat || []).forEach((action, i) => {
      const info = action === OPTIONS_ACTION ? { description: 'SheetCuts Settings' } : cat.get(action);
      if (!info || i >= QAT_SLOTS) return;
      const key = String(i + 1);
      root[key] = { key, label: key, description: info.description, action, qat: true };
    });
    Object.assign(root, base);

    for (const c of prefs[app].custom || []) {
      if (!Array.isArray(c.seq) || !c.seq.length) continue;
      const info = cat.get(c.action);
      if (!info || sequenceConflict(app, prefs, c.seq, c)) continue;
      let level = root;
      c.seq.forEach((k, i) => {
        const last = i === c.seq.length - 1;
        if (last) {
          level[k] = { key: k, label: k, description: info.description, action: c.action, custom: true };
          return;
        }
        const existing = level[k];
        level[k] = existing
          ? { ...existing, children: { ...(existing.children || {}) } }
          : { key: k, label: k, description: 'Custom', children: {}, custom: true };
        level = level[k].children;
      });
    }
    return root;
  }

  // Why an Alt sequence can't be used (or null).  `self` is the entry being
  // edited, ignored when checking clashes with other custom entries.
  function sequenceConflict(app, prefs, seq, self) {
    if (!seq.length || seq.length > 3) return 'Use 1 to 3 keys after Alt.';
    if (seq.some(k => !/^[A-Z0-9]$/.test(k))) return 'Use letters and digits only.';
    if (/^[0-9]$/.test(seq[0])) return 'Alt+1 – Alt+9 are your Quick Access slots — start with a letter.';

    let level = baseTree(app);
    for (let i = 0; i < seq.length; i++) {
      const node = level && level[seq[i]];
      const shown = 'Alt › ' + seq.slice(0, i + 1).join(' › ');
      if (!node) break;
      if (node.action) return `${shown} is already “${node.description}”.`;
      if (i === seq.length - 1) return `${shown} already opens “${node.description}” — add a key after it.`;
      level = node.children;
    }

    for (const other of prefs[app].custom || []) {
      if (other === self || !Array.isArray(other.seq)) continue;
      const n = Math.min(other.seq.length, seq.length);
      if (other.seq.slice(0, n).join() === seq.slice(0, n).join()) {
        return `Clashes with your Alt › ${other.seq.join(' › ')} shortcut.`;
      }
    }
    return null;
  }

  // ── Key combos ──────────────────────────────────────────────────────────

  const MODIFIER_CODES = /^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/;

  function chordFromEvent(e) {
    if (!e.code || MODIFIER_CODES.test(e.code)) return null;
    return { ctrl: !!e.ctrlKey, alt: !!e.altKey, shift: !!e.shiftKey, meta: !!e.metaKey, code: e.code };
  }

  function chordId(ch) {
    return ch ? [ch.ctrl && 'ctrl', ch.alt && 'alt', ch.shift && 'shift', ch.meta && 'meta', ch.code].filter(Boolean).join('+') : '';
  }

  const CODE_LABELS = {
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: 'Space',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Escape: 'Esc',
    Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End',
    PageUp: 'PgUp', PageDown: 'PgDn', Tab: 'Tab',
  };

  function codeLabel(code) {
    let m;
    if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
    if ((m = /^Digit(\d)$/.exec(code))) return m[1];
    if ((m = /^Numpad(\d)$/.exec(code))) return 'Num ' + m[1];
    if (/^F\d{1,2}$/.test(code)) return code;
    return CODE_LABELS[code] || code;
  }

  function chordParts(ch) {
    const parts = [];
    if (ch.ctrl) parts.push(IS_MAC ? '⌃' : 'Ctrl');
    if (ch.alt) parts.push(IS_MAC ? '⌥' : 'Alt');
    if (ch.shift) parts.push(IS_MAC ? '⇧' : 'Shift');
    if (ch.meta) parts.push(IS_MAC ? '⌘' : 'Win');
    parts.push(codeLabel(ch.code));
    return parts;
  }

  function chordLabel(ch) { return chordParts(ch).join('+'); }

  // Combos the browser keeps for itself — a page never sees them.
  const RESERVED = new Set([
    'ctrl+KeyT', 'ctrl+KeyN', 'ctrl+KeyW', 'ctrl+shift+KeyT', 'ctrl+shift+KeyN', 'ctrl+shift+KeyW',
    'ctrl+Tab', 'ctrl+shift+Tab', 'ctrl+PageUp', 'ctrl+PageDown', 'ctrl+shift+KeyQ', 'ctrl+shift+KeyJ',
    'meta+KeyT', 'meta+KeyN', 'meta+KeyW', 'meta+KeyQ', 'meta+KeyH', 'meta+KeyM', 'meta+shift+KeyT',
    'F1', 'F11', 'F12', 'ctrl+shift+KeyI',
  ]);

  // Common Sheets/Slides shortcuts a custom combo would replace on the page.
  const NATIVE = {
    'ctrl+KeyC': 'Copy', 'ctrl+KeyV': 'Paste', 'ctrl+KeyX': 'Cut', 'ctrl+KeyZ': 'Undo', 'ctrl+KeyY': 'Redo',
    'ctrl+KeyA': 'Select all', 'ctrl+KeyB': 'Bold', 'ctrl+KeyI': 'Italic', 'ctrl+KeyU': 'Underline',
    'ctrl+KeyF': 'Find', 'ctrl+KeyH': 'Find and replace', 'ctrl+KeyK': 'Insert link', 'ctrl+KeyP': 'Print',
    'ctrl+KeyS': 'Save', 'ctrl+KeyO': 'Open', 'ctrl+KeyD': 'Fill down', 'ctrl+KeyR': 'Fill right',
    'ctrl+shift+KeyV': 'Paste values only', 'ctrl+Enter': 'Fill range', 'ctrl+Space': 'Select column',
    'shift+Space': 'Select row', 'ctrl+Semicolon': 'Insert date', 'ctrl+Backquote': 'Show formulas',
  };

  // { error } — can't be used; { warning } — usable but replaces something.
  function checkChord(app, prefs, ch, self) {
    if (!ch || !ch.code) return { error: 'Press a key combination.' };
    const id = chordId(ch);
    const isFn = /^F\d{1,2}$/.test(ch.code);
    if (!ch.ctrl && !ch.alt && !ch.meta && !isFn) return { error: 'Include Ctrl' + (IS_MAC ? ', ⌘' : '') + ' or Alt (or use an F-key).' };
    if (ch.alt && !ch.ctrl && !ch.shift && !ch.meta) return { error: 'Alt + a single key drives the ribbon — add Shift/Ctrl, or use an Alt sequence instead.' };
    if (id === 'F4') return { error: 'F4 is Repeat last action.' };
    if (RESERVED.has(id)) return { error: chordLabel(ch) + ' is reserved by Chrome.' };
    for (const other of prefs[app].custom || []) {
      if (other !== self && other.chord && chordId(other.chord) === id) {
        const info = describe(app, other.action);
        return { error: `Already used for “${info ? info.description : other.action}”.` };
      }
    }
    const builtin = (BUILTIN_CHORDS[app] || []).find(b => chordId(b.chord) === id);
    if (builtin) {
      const info = describe(app, builtin.action);
      return { warning: `Replaces SheetCuts’ built-in ${chordLabel(ch)} (${info ? info.description : builtin.description || builtin.action}).` };
    }
    const native = NATIVE[id.replace(/^meta\+/, 'ctrl+')];
    if (native) return { warning: `Replaces ${APP_LABELS[app] || 'Sheets'}’ own ${chordLabel(ch)} (${native}) while SheetCuts is on.` };
    return {};
  }

  // chordId → { action, description } for the content script: built-ins
  // first, then the user's own combos (which override on the same keys).
  function chordMap(app, prefs) {
    const map = new Map();
    for (const b of BUILTIN_CHORDS[app] || []) {
      // Chord-only commands (no ribbon key) carry their own description.
      const info = describe(app, b.action) || (b.description ? { description: b.description } : null);
      if (info) map.set(chordId(b.chord), { action: b.action, description: info.description });
    }
    for (const c of prefs[app].custom || []) {
      if (!c.chord) continue;
      const info = describe(app, c.action);
      if (info && !checkChord(app, { [app]: { custom: [] } }, c.chord).error) {
        map.set(chordId(c.chord), { action: c.action, description: info.description, custom: true });
      }
    }
    return map;
  }

  return {
    STORAGE_KEY, QAT_SLOTS, OPTIONS_ACTION, DEFAULTS, BUILTIN_CHORDS, IS_MAC, ALT_KEY, ALT_NAME,
    APPS, APP_LABELS, isPro, isLockedNode,
    baseTree, appForUrl, catalog, describe,
    normalize, load, save, onChange,
    buildTree, sequenceConflict,
    chordFromEvent, chordId, chordLabel, chordParts, codeLabel, checkChord, chordMap,
  };
})();
