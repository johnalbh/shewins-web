/* Form placeholders and select options carry both languages (data-ph-en / data-ph-es and
   data-en / data-es, from the original pages, where the language switched in place). They are
   set to the language of the page. */
(function () {
  var lang = document.documentElement.lang === 'es' ? 'es' : 'en';

  document.querySelectorAll('[data-ph-en]').forEach(function (field) {
    field.placeholder = field.getAttribute('data-ph-' + lang);
  });

  document.querySelectorAll('option[data-en]').forEach(function (option) {
    option.textContent = option.getAttribute('data-' + lang);
  });
})();
