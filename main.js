'use strict';

// FAQ accordion (moved out of an inline <script> so the page can use a strict
// Content-Security-Policy of script-src 'self' — no 'unsafe-inline' needed).
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});
