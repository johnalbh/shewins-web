/* The menu (phones and tablets) and the EN / ES buttons. */
(function () {
  var menu = document.getElementById('menu');
  var burger = document.querySelector('.burger');
  if (!menu || !burger) return;
  var closeButton = menu.querySelector('.x');

  /* While the menu is open the page under it does not scroll, and focus starts on its close
     button. Closing gives focus back to the button that opened it. */
  function openMenu() {
    menu.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (closeButton) closeButton.focus();
  }

  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    burger.focus();
  }

  burger.addEventListener('click', openMenu);
  if (closeButton) closeButton.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  /* A language button remembers the choice (localStorage "sw-lang", listed in the cookie policy)
     and opens the same page in the other language. */
  function rememberLanguage(lang) {
    try {
      localStorage.setItem('sw-lang', lang);
    } catch {
      // Storage blocked: the page still changes language.
    }
  }

  document.querySelectorAll('.lang button').forEach(function (button) {
    button.addEventListener('click', function () {
      var lang = button.getAttribute('data-lang');
      var href = button.getAttribute('data-href');
      rememberLanguage(lang);
      if (href && lang !== document.documentElement.lang) location.href = href;
    });
  });
})();
