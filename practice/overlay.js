'use strict';

/**
 * Overlay — renders and controls the key-tips UI.
 *
 * The overlay is a fixed-position panel (bottom-center of the viewport)
 * that shows the available keys at the current level of the shortcut tree.
 * It has pointer-events:none so clicks pass straight through to the sheet.
 *
 * Billing additions:
 *   show(children, keyPath, daysLeft)  — optional trial countdown footer
 *   showLockout(status, email)         — full-screen upgrade prompt
 */

const Overlay = (() => {
  let container = null;
  let noticeTimer = null;


  // ── DOM bootstrap ────────────────────────────────────────────────────────

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'alt-keys-overlay';
      document.body.appendChild(container);
    }
    return container;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Render the overlay for the given set of child nodes.
   * @param {Object}      children  - The children of the current tree node.
   * @param {string[]}    keyPath   - Keys pressed so far, e.g. ['H'].
   * @param {number|null} daysLeft  - Trial days remaining; null hides the banner.
   * @param {string|null} status   - License status; 'needs_auth' shows sign-in banner.
   */
  function show(children, keyPath = [], daysLeft = null, status = null) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = '';
    el.style.pointerEvents = '';  // reset any lockout override

    // ── Breadcrumb header
    const header = document.createElement('div');
    header.className = 'alt-keys-header';
    header.textContent = keyPath.length > 0
      ? 'Alt \u203a ' + keyPath.join(' \u203a ')   // › separator
      : 'Alt';
    el.appendChild(header);

    // ── Badge row
    const row = document.createElement('div');
    row.className = 'alt-keys-badge-row';

    // Sort order: Quick Access slots, leaf actions, then branches, then stubs
    const entries = Object.entries(children).sort(([, a], [, b]) => {
      const score = (node) => {
        if (node.qat) return -1;
        if (node.action) return 0;
        if (node.children && Object.keys(node.children).length > 0) return 1;
        return 2;
      };
      return score(a) - score(b);
    });

    for (const [, node] of entries) {
      const isStub   = !node.action && (!node.children || Object.keys(node.children).length === 0);
      const isBranch = !node.action && node.children && Object.keys(node.children).length > 0;

      const badge = document.createElement('div');
      badge.className = 'alt-keys-badge';
      if (isStub)   badge.classList.add('alt-keys-stub');
      if (isBranch) badge.classList.add('alt-keys-branch');
      if (node.qat)    badge.classList.add('alt-keys-qat');      // Quick Access (Alt+1…9)
      if (node.custom) badge.classList.add('alt-keys-custom');   // user-defined sequence

      if (isBranch) {
        const arrow = document.createElement('span');
        arrow.className = 'alt-keys-arrow';
        arrow.textContent = '\u25B8';  // ▸
        badge.appendChild(arrow);
      }

      const keyEl = document.createElement('span');
      keyEl.className = 'alt-keys-key';
      keyEl.textContent = node.label || node.key;

      const descEl = document.createElement('span');
      descEl.className = 'alt-keys-desc';
      descEl.textContent = node.description;

      badge.appendChild(keyEl);
      badge.appendChild(descEl);
      row.appendChild(badge);
    }

    el.appendChild(row);

    // ── Hint (root level also says where Quick Access / custom keys live)
    const hint = document.createElement('div');
    hint.className = 'alt-keys-hint';
    hint.textContent = keyPath.length === 0
      ? 'Esc to cancel  ·  Customize Quick Access & shortcuts: Alt › F › T'
      : 'Esc to cancel';
    el.appendChild(hint);

    // ── Trial countdown banner (only during active trial)
    if (daysLeft !== null) {
      const banner = document.createElement('div');
      banner.className = 'alt-keys-trial-banner';
      const d = Math.max(0, daysLeft);
      banner.textContent = d === 0
        ? 'Trial expires today — upgrade to keep your shortcuts'
        : `${d} day${d !== 1 ? 's' : ''} left in your free trial`;
      el.appendChild(banner);
    }

    el.style.display = 'flex';
  }

  /**
   * Show the sign-in screen when the user has not authenticated yet.
   * Blocks all shortcut usage until they sign in.
   *
   * @param {Function} onSignIn - Async callback triggered when user clicks sign-in button
   */
  function showSignIn(onSignIn) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-lockout';
    el.style.pointerEvents = 'auto';
    el.style.display = 'flex';

    const card = document.createElement('div');
    card.className = 'alt-keys-lockout-card';

    const title = document.createElement('p');
    title.className = 'alt-keys-lockout-title';
    title.textContent = 'Welcome to SheetCuts';

    const subtitle = document.createElement('p');
    subtitle.className = 'alt-keys-lockout-subtitle';
    subtitle.textContent = 'Sign in with your Google account to start your free 14-day trial. Get full access to Excel-style ribbon shortcuts in Google Sheets and Slides.';

    const btnRow = document.createElement('div');
    btnRow.className = 'alt-keys-lockout-btns';

    const signInBtn = document.createElement('button');
    signInBtn.className = 'alt-keys-btn alt-keys-btn-primary';
    signInBtn.textContent = 'Sign in with Google';
    signInBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('[Alt Keys] Sign-in button clicked');
      signInBtn.textContent = 'Signing in…';
      signInBtn.disabled = true;
      await onSignIn();
    });

    btnRow.appendChild(signInBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(btnRow);
    el.appendChild(card);

    const hint = document.createElement('div');
    hint.className = 'alt-keys-hint';
    hint.textContent = 'Esc to close';
    el.appendChild(hint);

    // Focus the primary button so the screen is keyboard-operable
    // (Enter to activate; Tab is allowed through by content.js).
    setTimeout(() => signInBtn.focus(), 50);
  }

  /**
   * Show the lockout / upgrade prompt when the trial has expired or the
   * subscription is canceled/suspended.
   *
   * The lockout overlay needs pointer-events:auto so the Upgrade buttons
   * are clickable.  This is set inline and cleared by hide().
   *
   * @param {string}      status  - Supabase user status (e.g. 'trialing', 'canceled')
   * @param {string|null} email   - User's Google email; used to prefill Stripe Checkout
   */
  function showLockout(status, email) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-lockout';
    el.style.pointerEvents = 'auto';  // allow button clicks
    el.style.display = 'flex';

    // ── Message card
    const card = document.createElement('div');
    card.className = 'alt-keys-lockout-card';

    const title = document.createElement('p');
    title.className = 'alt-keys-lockout-title';
    title.textContent = (status === 'trialing' || status === 'lapsed')
      ? 'Your free trial has ended'
      : 'Upgrade to keep your shortcuts';

    const subtitle = document.createElement('p');
    subtitle.className = 'alt-keys-lockout-subtitle';
    subtitle.textContent = 'Subscribe to SheetCuts Pro to continue using Excel-style ribbon shortcuts in Google Sheets and Slides.';

    // ── Upgrade buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'alt-keys-lockout-btns';

    const monthlyBtn = document.createElement('button');
    monthlyBtn.className = 'alt-keys-btn alt-keys-btn-secondary';
    monthlyBtn.textContent = '$6 / month';
    monthlyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'open_url', url: License.upgradeUrl('monthly', email) });
      hide();
    });

    const annualBtn = document.createElement('button');
    annualBtn.className = 'alt-keys-btn alt-keys-btn-primary';
    annualBtn.textContent = '$49 / year  —  save 32%';
    annualBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'open_url', url: License.upgradeUrl('annual', email) });
      hide();
    });

    btnRow.appendChild(monthlyBtn);
    btnRow.appendChild(annualBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(btnRow);
    el.appendChild(card);

    // ── Dismiss hint
    const hint = document.createElement('div');
    hint.className = 'alt-keys-hint';
    hint.textContent = 'Esc to close';
    el.appendChild(hint);

    // Focus the highlighted (annual) button so the paywall is keyboard-operable
    // (Enter to activate; Tab moves to the monthly button).
    setTimeout(() => annualBtn.focus(), 50);
  }

  /**
   * Show a brief "✓ Action Name" confirmation, then hide.
   */
  function showExecuting(description) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-executing';
    el.style.pointerEvents = '';

    const msg = document.createElement('div');
    msg.className = 'alt-keys-notice';
    msg.textContent = '\u2713 ' + description;   // ✓
    el.appendChild(msg);
    el.style.display = 'flex';

    noticeTimer = setTimeout(hide, 500);
  }

  /**
   * Show a longer-lived informational notice (e.g. "Button hidden — …").
   */
  function showMessage(text, ms = 3500) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-executing';
    el.style.pointerEvents = '';

    const msg = document.createElement('div');
    msg.className = 'alt-keys-notice';
    msg.textContent = text;
    el.appendChild(msg);
    el.style.display = 'flex';

    noticeTimer = setTimeout(hide, ms);
  }

  /**
   * Show a "coming soon" notice for unimplemented stub nodes.
   */
  function showNotImplemented(description) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-stub-notice';
    el.style.pointerEvents = '';

    const msg = document.createElement('div');
    msg.className = 'alt-keys-notice';
    msg.textContent = description + ' \u2014 coming soon';   // —
    el.appendChild(msg);
    el.style.display = 'flex';

    noticeTimer = setTimeout(hide, 1000);
  }

  /**
   * Briefly flash the badges red to indicate an invalid key was pressed.
   */
  function flashInvalid() {
    const el = getContainer();
    el.classList.add('alt-keys-flash-invalid');
    setTimeout(() => el.classList.remove('alt-keys-flash-invalid'), 350);
  }

  /**
   * Hide and reset the overlay.
   */
  function hide() {
    clearTimeout(noticeTimer);
    if (container) {
      container.style.display      = 'none';
      container.style.pointerEvents = '';
      container.innerHTML           = '';
      container.className           = '';
    }
  }

  return { show, showSignIn, showLockout, showExecuting, showMessage, showNotImplemented, flashInvalid, hide };
})();
