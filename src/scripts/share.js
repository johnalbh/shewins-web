/* Article share actions (components/blog/ShareArticle.astro).
   - Copy link: clipboard API, with a textarea fallback; the label confirms for two seconds and a
     polite live region announces it to screen readers.
   - Share…: shown on touch devices that have a native share sheet. */
(function () {
  var CONFIRM_MS = 2200;
  var status = document.querySelector('.share-status');

  function announce(message) {
    if (!status) return;
    status.textContent = message;
    setTimeout(function () {
      status.textContent = '';
    }, CONFIRM_MS);
  }

  /* Browsers without the clipboard API (or without permission) copy from a hidden textarea. */
  function copyWithTextarea(text, onCopied) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      if (document.execCommand('copy')) onCopied();
    } catch {
      // Nothing copied: the label stays as it was.
    }
    area.remove();
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var label = button.querySelector('span');
    var idleText = label.textContent;
    var doneText = button.getAttribute('data-done');
    var url = button.getAttribute('data-copy');

    function confirmCopied() {
      label.textContent = doneText;
      button.classList.add('is-done');
      announce(doneText);
      setTimeout(function () {
        label.textContent = idleText;
        button.classList.remove('is-done');
      }, CONFIRM_MS);
    }

    button.addEventListener('click', function () {
      var fallback = function () {
        copyWithTextarea(url, confirmCopied);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(confirmCopied, fallback);
      else fallback();
    });
  });

  /* Touch devices only: on desktop the explicit actions are clearer than a system sheet. */
  var canShare = navigator.share && matchMedia('(pointer: coarse)').matches;
  if (!canShare) return;
  document.querySelectorAll('[data-share-native]').forEach(function (button) {
    button.closest('li').hidden = false;
    button.addEventListener('click', function () {
      navigator.share({ title: button.getAttribute('data-title'), url: button.getAttribute('data-url') }).catch(function () {
        // Cancelled by the reader.
      });
    });
  });
})();
