'use strict';

/**
 * Overlay — renders and controls the key-tips UI.
 *
 * The overlay is a fixed-position panel (bottom-center of the viewport)
 * that shows the available keys at the current level of the shortcut tree.
 * It has pointer-events:none so clicks pass straight through to the sheet.
 *
 * Billing additions:
 *   show(children, keyPath, daysLeft)          — optional trial countdown footer
 *   showSignIn(onSignIn, note)                 — sign-in card (starts the trial)
 *   showLockout(info, email, handlers, note, feature) — upgrade / payment-issue card
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
   * @param {Object|null} plan     - Free plan: { free: true, kind } — Pro keys get a
   *                                 PRO tag and the footer says how to upgrade.
   */
  function show(children, keyPath = [], daysLeft = null, status = null, plan = null) {
    const free = !!(plan && plan.free);
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = '';
    el.style.pointerEvents = '';  // reset any lockout override

    // ── Breadcrumb header
    const header = document.createElement('div');
    header.className = 'alt-keys-header';
    header.textContent = keyPath.length > 0
      ? Customs.ALT_KEY + ' \u203a ' + keyPath.join(' \u203a ')   // › separator
      : Customs.ALT_NAME;
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
      const locked = free && !isStub && Customs.isLockedNode(node);
      if (locked) badge.classList.add('alt-keys-locked');

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
      if (locked) {
        const pro = document.createElement('span');
        pro.className = 'alt-keys-pro';
        pro.textContent = 'PRO';
        badge.appendChild(pro);
      }
      row.appendChild(badge);
    }

    el.appendChild(row);

    // ── Hint (root level also says where Quick Access / custom keys live)
    const hint = document.createElement('div');
    hint.className = 'alt-keys-hint';
    hint.textContent = keyPath.length === 0 && !free
      ? `Esc to cancel  ·  Customize Quick Access & shortcuts: ${Customs.ALT_KEY} › F › T`
      : 'Esc to cancel';
    el.appendChild(hint);

    // ── Trial countdown banner (only during active trial)
    if (daysLeft !== null) {
      const banner = document.createElement('div');
      banner.className = 'alt-keys-trial-banner';
      const d = Math.max(0, daysLeft);
      // Last few days: say where the upgrade lives (title-bar button / toolbar icon).
      banner.textContent = d === 0
        ? 'Your Pro trial ends today · then the free plan · Upgrade from the SheetCuts button to keep Pro'
        : `${d} day${d !== 1 ? 's' : ''} left in your Pro trial` +
          (d <= 3 ? ' · Upgrade anytime from the SheetCuts button' : '');
      el.appendChild(banner);
    } else if (free && plan.banner !== false) {
      const banner = document.createElement('div');
      banner.className = 'alt-keys-trial-banner alt-keys-free-banner';
      banner.textContent = plan.kind === 'payment_issue'
        ? 'Your last payment didn’t go through · PRO keys are paused — update your card from the SheetCuts button'
        : 'Free plan · Keys marked PRO need SheetCuts Pro — upgrade from the SheetCuts button';
      el.appendChild(banner);
    } else if (status === 'past_due') {
      // Renewal failed; still working during the grace period.
      const banner = document.createElement('div');
      banner.className = 'alt-keys-trial-banner';
      banner.textContent = 'Your last payment didn’t go through · Update your card from the SheetCuts icon';
      el.appendChild(banner);
    }

    el.style.display = 'flex';
  }

  /**
   * Show the sign-in screen when the user has not authenticated yet.
   * Blocks all shortcut usage until they sign in.
   *
   * @param {Function}    onSignIn - Async callback triggered when user clicks sign-in button
   * @param {string|null} note     - Optional line under the button (e.g. sign-in didn't finish)
   */
  function showSignIn(onSignIn, note = null) {
    const { card, btnRow } = lockoutCard(
      'Welcome to SheetCuts',
      'Sign in with your Google account to start a free 14-day trial of SheetCuts Pro. After that the everyday shortcuts stay free — no credit card needed.');

    const signInBtn = button('Sign in with Google', true, async () => {
      signInBtn.textContent = 'Signing in…';
      signInBtn.disabled = true;
      await onSignIn();
    });
    btnRow.appendChild(signInBtn);
    if (note) card.appendChild(noteLine(note));

    // Focus the primary button so the screen is keyboard-operable
    // (Enter to activate; Tab is allowed through by content.js).
    setTimeout(() => signInBtn.focus(), 50);
  }

  /**
   * Show the paywall.  `info` is License.describe(status):
   *   trial         → early upgrade (dismissable offer, from the SheetCuts menu)
   *   trial_ended   → the trial ran out
   *   canceled      → the subscription ended
   *   payment_issue → the last renewal failed: send them to the billing
   *                   portal to fix the card, NOT to a second subscription
   *
   * The lockout overlay needs pointer-events:auto so the buttons are
   * clickable.  This is set inline and cleared by hide().
   *
   * @param {Object}      info     - License.describe() result
   * @param {string|null} email    - Google email; shown, and locked into Stripe Checkout
   * @param {Object}      handlers - { onPlan(plan), onPortal(), onRecheck() }
   * @param {string|null} note     - Optional status line (e.g. after "Check again")
   */
  function showLockout(info, email, handlers, note = null, feature = null) {
    const PRO_LIST = 'paste special, Trace Precedents/Dependents, Goal Seek & Data Tables, format cycles, Auto-Color, Copy as Picture and your Quick Access Toolbar';
    const COPY = {
      trial: [
        'Upgrade to SheetCuts Pro',
        `${info.label}. Subscribe now to keep ${PRO_LIST} when the trial ends. Billing starts today; cancel anytime.`],
      trial_ended: [
        feature ? `${feature} is a SheetCuts Pro feature` : 'Upgrade to SheetCuts Pro',
        `You’re on the free plan — the everyday ribbon shortcuts keep working. Pro adds ${PRO_LIST}. Cancel anytime.`],
      canceled: [
        feature ? `${feature} is a SheetCuts Pro feature` : 'Your SheetCuts Pro subscription has ended',
        `You’re on the free plan now. Resubscribe to bring back ${PRO_LIST}. Cancel anytime.`],
      payment_issue: [
        'Your last payment didn’t go through',
        (feature ? `${feature} and the other Pro tools are paused` : 'Your Pro tools are paused') +
          ' until you update your card in the billing portal — your subscription stays the same.'],
    };
    const [titleText, subtitleText] = COPY[info.kind] || COPY.trial_ended;
    const { card, btnRow } = lockoutCard(titleText, subtitleText);

    let primary;
    if (info.kind === 'payment_issue') {
      primary = button('Update payment method', true, () => handlers.onPortal());
      btnRow.appendChild(primary);
    } else {
      btnRow.appendChild(button('$6 / month', false, () => handlers.onPlan('monthly')));
      primary = button('$49 / year  —  save 32%', true, () => handlers.onPlan('annual'));
      btnRow.appendChild(primary);
    }
    // The free plan keeps working: "Not now" just closes the card.
    if (handlers.onClose) btnRow.appendChild(button('Not now', false, () => handlers.onClose()));

    if (email) {
      const who = document.createElement('p');
      who.className = 'alt-keys-lockout-account';
      who.textContent = `Signed in as ${email}`;
      card.appendChild(who);
    }

    // Paid in another tab (or fixed the card) and we haven't noticed yet.
    if (info.kind !== 'trial') {
      const recheck = button(
        info.kind === 'payment_issue' ? 'Already updated it? Check again' : 'Already subscribed? Check again',
        false, async () => {
          recheck.textContent = 'Checking…';
          recheck.disabled = true;
          await handlers.onRecheck();
        });
      recheck.className = 'alt-keys-link';
      card.appendChild(recheck);
    }
    if (note) card.appendChild(noteLine(note));

    // Focus the highlighted button so the paywall is keyboard-operable
    // (Enter to activate; Tab moves between the buttons).
    setTimeout(() => primary.focus(), 50);
  }

  // ── Card helpers (sign-in + paywall) ─────────────────────────────────────

  function lockoutCard(titleText, subtitleText) {
    clearTimeout(noticeTimer);
    const el = getContainer();
    el.innerHTML = '';
    el.className = 'alt-keys-lockout';
    el.style.pointerEvents = 'auto';  // allow button clicks
    el.style.display = 'flex';

    const card = document.createElement('div');
    card.className = 'alt-keys-lockout-card';

    const title = document.createElement('p');
    title.className = 'alt-keys-lockout-title';
    title.textContent = titleText;

    const subtitle = document.createElement('p');
    subtitle.className = 'alt-keys-lockout-subtitle';
    subtitle.textContent = subtitleText;

    const btnRow = document.createElement('div');
    btnRow.className = 'alt-keys-lockout-btns';

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(btnRow);
    el.appendChild(card);

    const hint = document.createElement('div');
    hint.className = 'alt-keys-hint';
    hint.textContent = 'Esc to close';
    el.appendChild(hint);

    return { card, btnRow };
  }

  function button(text, isPrimary, onClick) {
    const btn = document.createElement('button');
    btn.className = 'alt-keys-btn ' + (isPrimary ? 'alt-keys-btn-primary' : 'alt-keys-btn-secondary');
    btn.textContent = text;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function noteLine(text) {
    const p = document.createElement('p');
    p.className = 'alt-keys-lockout-note';
    p.setAttribute('role', 'status');
    p.textContent = text;
    return p;
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
