/* Cookie banner, as on the original pages (html/*.html): the choice is stored in localStorage
   "sw-consent" for 12 months, exposed as window.swConsent and announced with the "sw-consent"
   event, so analytics can be loaded only after consent (see html/README.md §6). */
(function () {
  var banner = document.getElementById('cb');
  if (!banner) return;
  var KEY = 'sw-consent';
  var TWELVE_MONTHS = 365 * 24 * 60 * 60 * 1000;
  var analyticsBox = document.getElementById('cb-an');
  var marketingBox = document.getElementById('cb-mk');
  var settings = banner.querySelector('.cb-set');
  var saveButton = banner.querySelector('[data-cb=save]');
  var settingsButton = banner.querySelector('[data-cb=cfg]');

  /* The stored choice, or null when there is none, it is older than 12 months or storage is blocked. */
  function storedChoice() {
    try {
      var choice = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (choice && Date.now() - choice.t < TWELVE_MONTHS) return choice;
    } catch {
      // Blocked or broken storage: ask again.
    }
    return null;
  }

  function expose(analytics, marketing) {
    window.swConsent = { analytics: analytics, marketing: marketing };
  }

  function saveChoice(analytics, marketing) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ an: analytics, mk: marketing, t: Date.now() }));
    } catch {
      // Blocked storage: the choice holds for this page only.
    }
    banner.hidden = true;
    expose(analytics, marketing);
    try {
      document.dispatchEvent(new CustomEvent('sw-consent', { detail: window.swConsent }));
    } catch {
      // Very old browsers without CustomEvent: nothing listens there anyway.
    }
  }

  function showSettings(shown) {
    settings.hidden = !shown;
    saveButton.hidden = !shown;
    settingsButton.hidden = shown;
  }

  /* Reopened from the footer's "Cookie settings": the boxes show the stored choice. */
  function reopen() {
    var choice = storedChoice();
    analyticsBox.checked = Boolean(choice && choice.an);
    marketingBox.checked = Boolean(choice && choice.mk);
    banner.hidden = false;
  }

  banner.addEventListener('click', function (event) {
    var button = event.target.closest('[data-cb]');
    if (!button) return;
    var action = button.getAttribute('data-cb');
    if (action === 'all') saveChoice(true, true);
    else if (action === 'none') saveChoice(false, false);
    else if (action === 'cfg') showSettings(true);
    else if (action === 'save') saveChoice(analyticsBox.checked, marketingBox.checked);
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('[data-cookie-open]')) return;
    event.preventDefault();
    showSettings(false);
    reopen();
  });

  var choice = storedChoice();
  if (choice) expose(choice.an, choice.mk);
  else banner.hidden = false;
})();
