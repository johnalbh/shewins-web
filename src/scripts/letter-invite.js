/* Letter invitation card (src/components/chrome/LetterInvite.astro), team request, November 2026.
   It never shows at the same time as the cookie banner: it waits for the cookie choice, then for
   a sign of interest, 40% of the page read or 20 seconds on it. It does not take focus, and it
   waits while the menu or a dialog is open. Closing it or following its link keeps it away for
   30 days. A Letter signup on any page (the "sw-form-sent" event from forms.js), from the Letter
   form or the waitlist (its consent covers the Letter too), keeps it away for good. The choice is
   kept in localStorage "sw-letter", listed in the cookie policy. */
(function () {
  var card = document.getElementById('letter-invite');
  var KEY = 'sw-letter';
  var QUIET_MS = 30 * 24 * 60 * 60 * 1000;
  var WAIT_MS = 20000;
  var BUSY_RETRY_MS = 5000;
  var READ_FRACTION = 0.4;
  var shown = false;
  var timer = null;

  function storedState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  }

  /* state: 'sub' (subscribed), 'closed' or 'go' (followed the link). */
  function remember(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ s: state, t: Date.now() }));
    } catch {
      // Blocked storage: the card may show again on another page.
    }
  }

  function keepsQuiet() {
    var state = storedState();
    return Boolean(state) && (state.s === 'sub' || Date.now() - state.t < QUIET_MS);
  }

  function hide() {
    if (!card || card.hidden) return;
    card.hidden = true;
    document.removeEventListener('keydown', closeOnEscape);
  }

  /* The menu or a dialog is open: the card would cover what she is doing. */
  function pageBusy() {
    var menu = document.getElementById('menu');
    return (menu && !menu.hidden) || Boolean(document.querySelector('dialog[open]'));
  }

  function closeOnEscape(event) {
    if (event.key !== 'Escape' || pageBusy()) return;
    remember('closed');
    hide();
  }

  function show() {
    if (shown || keepsQuiet()) return;
    clearTimeout(timer);
    if (pageBusy()) {
      timer = setTimeout(show, BUSY_RETRY_MS);
      return;
    }
    shown = true;
    card.hidden = false;
    window.removeEventListener('scroll', showAfterReading);
    document.addEventListener('keydown', closeOnEscape);
  }

  function showAfterReading() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable > 0 && window.scrollY / scrollable >= READ_FRACTION) show();
  }

  function waitForInterest() {
    if (keepsQuiet()) return;
    timer = setTimeout(show, WAIT_MS);
    window.addEventListener('scroll', showAfterReading, { passive: true });
  }

  document.addEventListener('sw-form-sent', function (event) {
    var detail = event.detail || {};
    if (detail.form !== 'letter' && detail.form !== 'waitlist') return;
    remember('sub');
    hide();
  });

  if (!card) return;
  card.addEventListener('click', function (event) {
    if (event.target.closest('[data-invite-close]')) {
      remember('closed');
      hide();
    } else if (event.target.closest('[data-invite-go]')) remember('go');
  });

  if (window.swConsent) waitForInterest();
  else document.addEventListener('sw-consent', waitForInterest, { once: true });
})();
