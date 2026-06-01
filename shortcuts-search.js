'use strict';

// Client-side filter for the shortcuts reference. External file because the
// page's CSP is script-src 'self' (no inline scripts).

const input = document.getElementById('shortcutSearch');
const noResults = document.getElementById('searchNoResults');

if (input) {
  const rows = Array.from(document.querySelectorAll('.shortcut-row'));
  const containers = [
    ...document.querySelectorAll('.shortcut-subgroup'),
    ...document.querySelectorAll('.shortcut-tab-group'),
    ...document.querySelectorAll('.shortcuts-page-section'),
  ];

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let anyVisible = false;

    rows.forEach(row => {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });

    // Collapse any group/section that has no visible rows so the page isn't
    // full of empty headers while searching. (Process subgroups → tab-groups →
    // sections; the array order above already runs inner-most first.)
    containers.forEach(c => {
      const hasVisibleRow = Array.from(c.querySelectorAll('.shortcut-row'))
        .some(r => r.style.display !== 'none');
      c.style.display = (!q || hasVisibleRow) ? '' : 'none';
    });

    if (noResults) noResults.style.display = (q && !anyVisible) ? 'block' : 'none';
  });
}
