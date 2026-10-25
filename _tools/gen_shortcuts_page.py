"""Regenerate the shortcut lists on sheetcuts.app from the extension itself.

Reads the extension's shortcut trees (../SheetCuts/shortcuts.js and
slides-shortcuts.js), then rewrites the block between the GENERATED markers in
shortcuts.html and the shortcut counts on index.html / alternatives.html /
shortcuts.html.  Run after adding or renaming shortcuts in the extension:

    python Site/_tools/gen_shortcuts_page.py

(The leading underscore keeps Jekyll / GitHub Pages from publishing _tools/.)
"""
import html
import io
import json
import os
import re
import sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(os.path.dirname(SITE), 'SheetCuts')

# Overlay badges use short labels; the website spells them out.
FULL_NAMES = {
    'AutoFit Col Wdt': 'AutoFit Column Width',
    'AutoFit Row Hgt': 'AutoFit Row Height',
    'Cond. Formatting': 'Conditional Formatting',
    'Less Decimals': 'Decrease Decimal',
    'More Decimals': 'Increase Decimal',
    'Paste Col Widths': 'Paste Column Widths',
    'Remove Dupes': 'Remove Duplicates',
    'Top & Dbl Bottom': 'Top & Double Bottom Border',
    'Top & Thick Btm': 'Top & Thick Bottom Border',
    'Top & Bottom': 'Top & Bottom Border',
    'Bottom Double': 'Bottom Double Border',
    'Thick Bottom': 'Thick Bottom Border',
    'Thick Box': 'Thick Box Border',
    'Horizontal Inner': 'Horizontal Inner Borders',
    'Vertical Inner': 'Vertical Inner Borders',
    'Line Color': 'Border Line Color',
    'Line Style': 'Border Line Style',
    'Freeze to Row': 'Freeze Up to Current Row',
    'Freeze to Col': 'Freeze Up to Current Column',
    'Paste w/o Formatting': 'Paste without Formatting',
}

# Generic overlay labels ("More…") named by what they open.
ACTION_NAMES = {
    'orientation': 'More rotation options…',
    'view.freezeMenu': 'More freeze options…',
    'paste.special': 'All paste special options…',
}


def js_tree_to_json(path, const_name):
    src = io.open(path, encoding='utf-8').read()
    start = src.index('const %s = {' % const_name) + len('const %s = ' % const_name)
    body = src[start:]
    end = body.rindex('};')
    body = body[:end + 1]
    body = re.sub(r'/\*[\s\S]*?\*/', '', body)
    body = re.sub(r'(?m)//.*$', '', body)
    body = re.sub(r"'((?:[^'\\]|\\.)*)'", lambda m: json.dumps(m.group(1).replace("\\'", "'")), body)
    body = re.sub(r'([{,]\s*)([A-Za-z0-9_]+)\s*:', r'\1"\2":', body)
    body = re.sub(r',(\s*[}\]])', r'\1', body)
    return json.loads(body)


def leaf_name(node, parent):
    if node.get('action') in ACTION_NAMES:
        return ACTION_NAMES[node['action']]
    d = node['description']
    return FULL_NAMES.get(d) or d


def is_stub(node):
    return 'action' not in node and not node.get('children')


def count_leaves(children):
    n = 0
    for node in children.values():
        if 'action' in node:
            n += 1
        elif node.get('children'):
            n += count_leaves(node['children'])
    return n


def esc(s):
    return html.escape(s, quote=False)


def row(keys, name):
    return ('              <div class="shortcut-row"><span class="shortcut-key">%s</span> %s</div>'
            % (esc(keys), esc(name)))


def subgroup(label, rows):
    out = ['          <div class="shortcut-subgroup">',
           '            <div class="shortcut-subgroup-label">%s</div>' % esc(label),
           '            <div class="shortcuts-grid">']
    out += rows
    out += ['            </div>', '          </div>', '']
    return out


def tab_groups(tree, order=None):
    """One .shortcut-tab-group per top-level ribbon tab; a subgroup for the
    tab's direct commands and one per branch (nested branches get 'A › B')."""
    out = []
    keys = order or list(tree.keys())
    for k in keys:
        tab = tree.get(k)
        if not tab or is_stub(tab) or 'action' in tab:
            continue
        out += ['      <!-- Alt+%s — %s -->' % (k, tab['description']),
                '      <div class="shortcut-tab-group">',
                '        <div class="shortcut-tab-header">',
                '          <span class="shortcut-tab-seq">Alt+%s</span> %s' % (k, esc(tab['description'])),
                '        </div>',
                '        <div class="shortcut-tab-body">', '']

        def walk(children, path_keys, label):
            direct = []
            branches = []
            for ck, node in children.items():
                if 'action' in node:
                    direct.append(row('Alt+' + ', '.join(path_keys + [ck]), leaf_name(node, label)))
                elif node.get('children'):
                    only = list(node['children'].items())
                    if len(only) == 1 and 'action' in only[0][1]:
                        # One-command branch (e.g. Alt+M, A, A) — list it with
                        # its parent rather than as a one-row section.
                        gk, gnode = only[0]
                        direct.append(row('Alt+' + ', '.join(path_keys + [ck, gk]), leaf_name(gnode, label)))
                    else:
                        branches.append((ck, node))
            blocks = []
            if direct:
                blocks += subgroup(label, direct)
            for ck, node in branches:
                sub_label = node['description'] if label == tab['description'] else label + ' › ' + node['description']
                blocks += walk(node['children'], path_keys + [ck], sub_label)
            return blocks

        out += walk(tab['children'], [k], tab['description'])
        out += ['        </div>', '      </div>', '']
    return out


def beyond_ribbon():
    rows = [
        row('Alt+1 … Alt+9', 'Quick Access Toolbar — your nine favourite commands'),
        row('Ctrl+[', 'Trace Precedents'),
        row('Ctrl+]', 'Trace Dependents'),
        row('F4', 'Repeat last action (even a colour you picked or a width you typed)'),
        row('Shift+Space', 'In a formula: turn the reference into its full row'),
        row('Ctrl+Space', 'In a formula: turn the reference into its full column'),
        row('F4', 'In a formula: toggle $ on full row/column references'),
        row('Your choice', 'Custom shortcuts — any key combo or Alt sequence (Alt+F, T)'),
    ]
    return (['      <!-- Beyond the ribbon -->',
             '      <div class="shortcut-tab-group">',
             '        <div class="shortcut-tab-header">',
             '          <span class="shortcut-tab-seq">More</span> Beyond the ribbon',
             '        </div>',
             '        <div class="shortcut-tab-body">', '']
            + subgroup('Power keys', rows)
            + ['        </div>', '      </div>', ''])


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sheets = js_tree_to_json(os.path.join(EXT, 'shortcuts.js'), 'SHEETS_SHORTCUT_TREE')
    slides = js_tree_to_json(os.path.join(EXT, 'slides-shortcuts.js'), 'SLIDES_SHORTCUT_TREE')
    n_sheets, n_slides = count_leaves(sheets), count_leaves(slides)
    sheet_tabs = [k for k in ['H', 'N', 'M', 'A', 'R', 'W', 'F'] if k in sheets and not is_stub(sheets[k])]

    if '--labels' in sys.argv:
        for name, tree in (('sheets', sheets), ('slides', slides)):
            def walk(ch, p):
                for k, n in ch.items():
                    if 'action' in n:
                        print(name, 'Alt+' + ','.join(p + [k]), '|', n['description'], '->', leaf_name(n, ''))
                    elif n.get('children'):
                        walk(n['children'], p + [k])
            walk(tree, [])
        return

    block = ['    <!-- ── Google Sheets ─────────────────────────────────────────── -->',
             '    <div class="shortcuts-page-section" id="sheets">', '',
             '      <div class="shortcuts-app-header">',
             '        <div class="app-icon sheets">S</div>',
             '        <div>',
             '          <h2>Google Sheets</h2>',
             '          <p>%d shortcuts across %d ribbon tabs, plus Excel 2003 Alt+E paste keys</p>' % (n_sheets, len(sheet_tabs)),
             '        </div>',
             '      </div>', '']
    block += tab_groups(sheets, sheet_tabs + ['E'])
    block += beyond_ribbon()
    block += ['    </div>', '',
              '    <!-- ── Google Slides ──────────────────────────────────────────── -->',
              '    <div class="shortcuts-page-section" id="slides">', '',
              '      <div class="shortcuts-app-header">',
              '        <div class="app-icon slides">S</div>',
              '        <div>',
              '          <h2>Google Slides</h2>',
              '          <p>%d shortcuts &mdash; Home tab (Alt+H), plus Alt+1–9 Quick Access</p>' % n_slides,
              '        </div>',
              '      </div>', '']
    block += tab_groups(slides)
    block += ['      <p class="shortcuts-coming-soon">Insert, Design, Transitions, Animations &amp; more tabs are in active development.</p>',
              '', '    </div>']
    generated = '\n'.join(block)

    page = os.path.join(SITE, 'shortcuts.html')
    s = io.open(page, encoding='utf-8').read()
    a = s.index('<!-- GENERATED:shortcuts:start')
    b = s.index('<!-- GENERATED:shortcuts:end -->')
    a_end = s.index('-->', a) + 3
    s = s[:a_end] + '\n' + generated + '\n    ' + s[b:]
    s = re.sub(r'\d+ Sheets shortcuts and \d+ Slides shortcuts', '%d Sheets shortcuts and %d Slides shortcuts' % (n_sheets, n_slides), s)
    s = re.sub(r'&mdash; \d+ for Google Sheets, \d+ for Google Slides', '&mdash; %d for Google Sheets, %d for Google Slides' % (n_sheets, n_slides), s)
    io.open(page, 'w', encoding='utf-8').write(s)

    for name in ('index.html', 'alternatives.html'):
        p = os.path.join(SITE, name)
        t = io.open(p, encoding='utf-8').read()
        t = re.sub(r'\b\d+ shortcuts across (seven|all seven|all seven Sheets) ribbon tabs', lambda m: '%d shortcuts across %s ribbon tabs' % (n_sheets, m.group(1)), t)
        t = re.sub(r'\(\d+ shortcuts\)', '(%d shortcuts)' % n_sheets, t)
        t = re.sub(r'\b\d+ in (Google )?Slides', lambda m: '%d in %sSlides' % (n_slides, m.group(1) or ''), t)
        t = re.sub(r'currently has \d+ shortcuts', 'currently has %d shortcuts' % n_slides, t)
        io.open(p, 'w', encoding='utf-8').write(t)

    print('Sheets: %d shortcuts, Slides: %d — shortcuts.html, index.html, alternatives.html updated' % (n_sheets, n_slides))


if __name__ == '__main__':
    main()
