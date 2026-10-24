'use strict';

/**
 * SHEETS_SHORTCUT_TREE: Nested definition of Excel-style Alt-key ribbon shortcuts.
 *
 * Each node is either:
 *   Branch: { key, label, description, children: { KEY: node, … } }
 *   Leaf:   { key, label, description, action: 'actionId' }
 *   Stub:   { key, label, description, children: {} }  ← shows "coming soon"
 *
 * All keys are uppercase single characters or digits.
 */

const SHEETS_SHORTCUT_TREE = {

  // ── H: Home tab ────────────────────────────────────────────────────────────
  H: {
    key: 'H', label: 'H', description: 'Home',
    children: {

      // ── Number / formatting keys ──────────────────────────────────────────
      1: { key: '1', label: '1', description: 'Bold',            action: 'bold' },
      2: { key: '2', label: '2', description: 'Italic',          action: 'italic' },
      3: { key: '3', label: '3', description: 'Underline',       action: 'underline' },
      4: { key: '4', label: '4', description: 'Strikethrough',   action: 'strikethrough' },
      9: { key: '9', label: '9', description: 'Less Decimals',   action: 'format.decreaseDecimal' },
      0: { key: '0', label: '0', description: 'More Decimals',   action: 'format.increaseDecimal' },

      // ── A: Alignment (+ Accounting shortcut) ──────────────────────────────
      A: {
        key: 'A', label: 'A', description: 'Alignment',
        children: {
          L: { key: 'L', label: 'L', description: 'Align Left',   action: 'align.left' },
          C: { key: 'C', label: 'C', description: 'Center',       action: 'align.center' },
          R: { key: 'R', label: 'R', description: 'Align Right',  action: 'align.right' },
          T: { key: 'T', label: 'T', description: 'Top',          action: 'align.top' },
          M: { key: 'M', label: 'M', description: 'Middle',       action: 'align.middle' },
          B: { key: 'B', label: 'B', description: 'Bottom',       action: 'align.bottom' },
          N: { key: 'N', label: 'N', description: 'Accounting',   action: 'format.accounting' },
        },
      },

      // ── B: Borders ────────────────────────────────────────────────────────
      B: {
        key: 'B', label: 'B', description: 'Borders',
        children: {
          A: { key: 'A', label: 'A', description: 'All Borders',     action: 'borders.all' },
          N: { key: 'N', label: 'N', description: 'No Border',       action: 'borders.none' },
          O: { key: 'O', label: 'O', description: 'Bottom Border',   action: 'borders.bottom' },
          P: { key: 'P', label: 'P', description: 'Top Border',      action: 'borders.top' },
          L: { key: 'L', label: 'L', description: 'Left Border',     action: 'borders.left' },
          R: { key: 'R', label: 'R', description: 'Right Border',    action: 'borders.right' },
          H: { key: 'H', label: 'H', description: 'Thick Bottom',    action: 'borders.thickBottom' },
          S: { key: 'S', label: 'S', description: 'Outside Borders', action: 'borders.outside' },
          T: { key: 'T', label: 'T', description: 'Thick Box',       action: 'borders.thickBox' },
          C: { key: 'C', label: 'C', description: 'Border Color',    action: 'borders.color' },
        },
      },

      // ── D: Delete ─────────────────────────────────────────────────────────
      D: {
        key: 'D', label: 'D', description: 'Delete',
        children: {
          D: { key: 'D', label: 'D', description: 'Delete Cells',  action: 'delete.cells' },
          R: { key: 'R', label: 'R', description: 'Delete Row',    action: 'delete.row' },
          C: { key: 'C', label: 'C', description: 'Delete Column', action: 'delete.column' },
          S: { key: 'S', label: 'S', description: 'Delete Sheet',  action: 'delete.sheet' },
        },
      },

      // ── E: Clear ──────────────────────────────────────────────────────────
      E: {
        key: 'E', label: 'E', description: 'Clear',
        children: {
          F: { key: 'F', label: 'F', description: 'Clear Formats',   action: 'clearFormats' },
          C: { key: 'C', label: 'C', description: 'Clear Contents',  action: 'clearContents' },
        },
      },

      // ── F: Font ───────────────────────────────────────────────────────────
      F: {
        key: 'F', label: 'F', description: 'Font',
        children: {
          F: { key: 'F', label: 'F', description: 'Font Name',          action: 'font.name' },
          S: { key: 'S', label: 'S', description: 'Font Size',          action: 'font.size' },
          C: { key: 'C', label: 'C', description: 'Font Color',         action: 'font.color' },
          G: { key: 'G', label: 'G', description: 'Increase Font Size', action: 'increaseFontSize' },
          K: { key: 'K', label: 'K', description: 'Decrease Font Size', action: 'decreaseFontSize' },
          P: { key: 'P', label: 'P', description: 'Format Painter',     action: 'formatPainter' },
          Q: { key: 'Q', label: 'Q', description: 'Orientation',        action: 'orientation' },
          // Find & Select submenu (Excel: Alt+H,F,D)
          D: {
            key: 'D', label: 'D', description: 'Find & Select',
            children: {
              F: { key: 'F', label: 'F', description: 'Find',    action: 'find' },
              R: { key: 'R', label: 'R', description: 'Replace', action: 'replace' },
              G: { key: 'G', label: 'G', description: 'Go To',   action: 'goto' },
            },
          },
        },
      },

      // ── H: Fill Color ─────────────────────────────────────────────────────
      H: { key: 'H', label: 'H', description: 'Fill Color', action: 'fillColor.open' },

      // ── I: Insert ─────────────────────────────────────────────────────────
      I: {
        key: 'I', label: 'I', description: 'Insert',
        children: {
          R: { key: 'R', label: 'R', description: 'Insert Row',    action: 'insert.row' },
          C: { key: 'C', label: 'C', description: 'Insert Column', action: 'insert.column' },
          I: { key: 'I', label: 'I', description: 'Insert Cells',  action: 'insert.cells' },
          S: { key: 'S', label: 'S', description: 'Insert Sheet',  action: 'insertSheet' },
        },
      },

      // ── K: Comma Style ────────────────────────────────────────────────────
      K: { key: 'K', label: 'K', description: 'Comma Style', action: 'commaStyle' },

      // ── L: Conditional Formatting ─────────────────────────────────────────
      L: { key: 'L', label: 'L', description: 'Cond. Formatting', action: 'conditionalFormatting' },

      // ── M: Merge ──────────────────────────────────────────────────────────
      M: {
        key: 'M', label: 'M', description: 'Merge',
        children: {
          C: { key: 'C', label: 'C', description: 'Merge & Center', action: 'merge.centerAlign' },
          M: { key: 'M', label: 'M', description: 'Merge All',      action: 'merge.all' },
          A: { key: 'A', label: 'A', description: 'Merge Across',   action: 'merge.across' },
          U: { key: 'U', label: 'U', description: 'Unmerge',        action: 'merge.unmerge' },
        },
      },

      // ── N: Number Format dialog ───────────────────────────────────────────
      N: { key: 'N', label: 'N', description: 'Number Format', action: 'numberFormat' },

      // ── O: Format (row/col/sheet) ─────────────────────────────────────────
      O: {
        key: 'O', label: 'O', description: 'Format',
        children: {
          H: { key: 'H', label: 'H', description: 'Row Height…',       action: 'rowHeight' },
          W: { key: 'W', label: 'W', description: 'Column Width…',     action: 'columnWidth' },
          A: { key: 'A', label: 'A', description: 'AutoFit Row Hgt',   action: 'autofit.rowHeight' },
          I: { key: 'I', label: 'I', description: 'AutoFit Col Wdt',   action: 'autofit.columnWidth' },
          // U: Hide / Unhide
          U: {
            key: 'U', label: 'U', description: 'Hide / Unhide',
            children: {
              R: { key: 'R', label: 'R', description: 'Hide Rows',      action: 'hideRows' },
              C: { key: 'C', label: 'C', description: 'Hide Columns',   action: 'hideCols' },
              L: { key: 'L', label: 'L', description: 'Unhide Rows',    action: 'unhideRows' },
              E: { key: 'E', label: 'E', description: 'Unhide Columns', action: 'unhideCols' },
            },
          },
          R: { key: 'R', label: 'R', description: 'Rename Sheet',      action: 'renameSheet' },
          M: { key: 'M', label: 'M', description: 'Move / Copy Sheet', action: 'duplicateSheet' },
          T: { key: 'T', label: 'T', description: 'Tab Color',         action: 'tabColor' },
        },
      },

      // ── P: Percent ────────────────────────────────────────────────────────
      P: { key: 'P', label: 'P', description: 'Percent', action: 'format.percent' },

      // ── S: Sort & Filter ──────────────────────────────────────────────────
      S: {
        key: 'S', label: 'S', description: 'Sort & Filter',
        children: {
          S: { key: 'S', label: 'S', description: 'Sort A → Z',    action: 'sortAsc' },
          O: { key: 'O', label: 'O', description: 'Sort Z → A',    action: 'sortDesc' },
          F: { key: 'F', label: 'F', description: 'Filter Toggle', action: 'filterToggle' },
        },
      },

      // ── V: Paste ──────────────────────────────────────────────────────────
      V: {
        key: 'V', label: 'V', description: 'Paste',
        children: {
          V: { key: 'V', label: 'V', description: 'Paste Values',      action: 'paste.values' },
          F: { key: 'F', label: 'F', description: 'Paste Formulas',    action: 'paste.formulas' },
          R: { key: 'R', label: 'R', description: 'Paste Formatting',  action: 'paste.formatting' },
          E: { key: 'E', label: 'E', description: 'Transpose',         action: 'paste.transpose' },
          W: { key: 'W', label: 'W', description: 'Paste Col Widths',  action: 'paste.columnWidths' },
        },
      },

      // ── W: Wrap Text ──────────────────────────────────────────────────────
      W: { key: 'W', label: 'W', description: 'Wrap Text', action: 'wrapText' },
    },
  },

  // ── N: Insert tab ────────────────────────────────────────────────────────
  N: {
    key: 'N', label: 'N', description: 'Insert',
    children: {
      V: { key: 'V', label: 'V', description: 'PivotTable',  action: 'insert.pivotTable' },
      R: { key: 'R', label: 'R', description: 'Chart',       action: 'insert.chart' },
      I: { key: 'I', label: 'I', description: 'Link',        action: 'insert.link' },
      L: { key: 'L', label: 'L', description: 'Comment',     action: 'insert.comment' },
      N: { key: 'N', label: 'N', description: 'Note',        action: 'insert.note' },
      C: { key: 'C', label: 'C', description: 'Checkbox',    action: 'insert.checkbox' },
      D: { key: 'D', label: 'D', description: 'Dropdown',    action: 'insert.dropdown' },
    },
  },
  P: { key: 'P', label: 'P', description: 'Page Layout', children: {} },
  // ── M: Formulas tab ──────────────────────────────────────────────────────
  M: {
    key: 'M', label: 'M', description: 'Formulas',
    children: {
      U: { key: 'U', label: 'U', description: 'AutoSum',        action: 'autosum' },
      H: { key: 'H', label: 'H', description: 'Show Formulas',  action: 'showFormulas' },
      M: { key: 'M', label: 'M', description: 'Named Ranges',   action: 'namedRanges' },
      // Formula auditing — trace-panel.js
      P: { key: 'P', label: 'P', description: 'Trace Precedents', action: 'trace.precedents' },
      D: { key: 'D', label: 'D', description: 'Trace Dependents', action: 'trace.dependents' },
      A: {
        key: 'A', label: 'A', description: 'Remove Arrows',
        children: {
          A: { key: 'A', label: 'A', description: 'Remove Arrows', action: 'trace.remove' },
        },
      },
    },
  },
  A: {
    key: 'A', label: 'A', description: 'Data',
    children: {
      // ── Sort & Filter ──────────────────────────────────────────────────
      S: {
        key: 'S', label: 'S', description: 'Sort',
        children: {
          A: { key: 'A', label: 'A', description: 'Sort A → Z',  action: 'sortAsc' },
          D: { key: 'D', label: 'D', description: 'Sort Z → A',  action: 'sortDesc' },
          S: { key: 'S', label: 'S', description: 'Sort Dialog', action: 'sortDialog' },
        },
      },
      T: { key: 'T', label: 'T', description: 'Filter Toggle',    action: 'filterToggle' },
      C: { key: 'C', label: 'C', description: 'Clear Filter',     action: 'clearFilter' },
      // ── Data Tools ────────────────────────────────────────────────────
      E: { key: 'E', label: 'E', description: 'Text to Columns',  action: 'textToColumns' },
      M: { key: 'M', label: 'M', description: 'Remove Dupes',     action: 'removeDuplicates' },
      V: {
        key: 'V', label: 'V', description: 'Data Validation',
        children: {
          V: { key: 'V', label: 'V', description: 'Data Validation', action: 'dataValidation' },
        },
      },
      // ── Outline / Group ───────────────────────────────────────────────
      G: {
        key: 'G', label: 'G', description: 'Group',
        children: {
          G: { key: 'G', label: 'G', description: 'Group Rows/Cols',   action: 'groupRows' },
        },
      },
      U: {
        key: 'U', label: 'U', description: 'Ungroup',
        children: {
          U: { key: 'U', label: 'U', description: 'Ungroup Rows/Cols', action: 'ungroupRows' },
        },
      },
      H: { key: 'H', label: 'H', description: 'Hide Detail', action: 'hideDetail' },
      J: { key: 'J', label: 'J', description: 'Show Detail', action: 'showDetail' },
    },
  },
  R: {
    key: 'R', label: 'R', description: 'Review',
    children: {
      S: { key: 'S', label: 'S', description: 'Spelling',    action: 'spellingCheck' },
      C: { key: 'C', label: 'C', description: 'New Comment', action: 'review.comment' },
      H: { key: 'H', label: 'H', description: 'Show All Comments', action: 'review.showComments' },
      N: { key: 'N', label: 'N', description: 'New Note',      action: 'review.newNote' },
      P: {
        key: 'P', label: 'P', description: 'Protect',
        children: {
          S: { key: 'S', label: 'S', description: 'Protect Sheet', action: 'protectSheet' },
        },
      },
    },
  },
  W: {
    key: 'W', label: 'W', description: 'View',
    children: {
      V: {
        key: 'V', label: 'V', description: 'Show',
        children: {
          F: { key: 'F', label: 'F', description: 'Formula Bar',  action: 'view.formulaBar' },
          G: { key: 'G', label: 'G', description: 'Gridlines',    action: 'view.gridlines' },
        },
      },
      Q: { key: 'Q', label: 'Q', description: 'Zoom',          action: 'view.zoom' },
      J: { key: 'J', label: 'J', description: 'Zoom 100%',     action: 'view.zoom100' },
      N: { key: 'N', label: 'N', description: 'New Window',     action: 'view.newWindow' },
      F: {
        key: 'F', label: 'F', description: 'Freeze',
        children: {
          F: { key: 'F', label: 'F', description: 'Freeze Panes', action: 'view.freezePanes' },
          R: { key: 'R', label: 'R', description: 'Freeze to Row', action: 'view.freezeTopRow' },
          C: { key: 'C', label: 'C', description: 'Freeze to Col', action: 'view.freezeFirstCol' },
        },
      },
      M: {
        key: 'M', label: 'M', description: 'Macros',
        children: {
          R: { key: 'R', label: 'R', description: 'Record Macro',  action: 'view.recordMacro' },
          V: { key: 'V', label: 'V', description: 'View Macros',   action: 'view.manageMacros' },
        },
      },
    },
  },
  F: {
    key: 'F', label: 'F', description: 'File',
    children: {
      N: { key: 'N', label: 'N', description: 'New',             action: 'file.new' },
      O: { key: 'O', label: 'O', description: 'Open',            action: 'file.open' },
      S: { key: 'S', label: 'S', description: 'Save',            action: 'file.save' },
      A: { key: 'A', label: 'A', description: 'Save As (Copy)',   action: 'file.saveAs' },
      P: { key: 'P', label: 'P', description: 'Print',           action: 'file.print' },
      E: { key: 'E', label: 'E', description: 'Export/Download',  action: 'file.download' },
      I: { key: 'I', label: 'I', description: 'Version History',  action: 'file.versionHistory' },
      M: { key: 'M', label: 'M', description: 'Import',           action: 'file.import' },
      // Excel's File › Options (Alt+F,T) → SheetCuts settings (QAT, custom keys)
      T: { key: 'T', label: 'T', description: 'SheetCuts Settings', action: 'sheetcuts.options' },
    },
  },
};
