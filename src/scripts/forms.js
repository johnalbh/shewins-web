/* The site forms (form[data-form]): the Letter, the waitlist and the contact form.
   - Every form checks its required fields the same way and says under each one what is missing
     (team request, November 2026). The email check is the same pattern as api/form.ts. A field
     can carry its own words in data-err-en / data-err-es; the others get the words for their type.
   - The signup forms (Letter, waitlist) start with the email only: their first submit opens the
     dialog (dialog.ask) with the other questions, the form is sent from the dialog and the
     thank-you shows there. When the dialog closes after a successful send, the form switches to
     its thank-you state (.done); a display:none form would also hide its open dialog.
   - The contact form sends straight away. On Partners it opens in a dialog of its own.
   - The JSON sent has the page's language and address, and every field by id (a radio group by
     name). window.SW_FORMS (public/config.js) gives the endpoint of each form. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MESSAGES = {
    empty: ['Fill in this field.', 'Rellena este campo.'],
    mail: ['Enter your email.', 'Escribe tu email.'],
    badmail: ['Enter a valid email, like name@example.com.', 'Escribe un email válido, como nombre@ejemplo.com.'],
    box: ['Tick the box to continue.', 'Marca la casilla para continuar.'],
  };
  /* The endpoint turns away an email whose domain takes no mail (a typo such as gmail.con), so the
     person gets a message of its own instead of the general error. */
  var UNKNOWN_DOMAIN =
    '<span class="en">That email address does not seem to exist. Please check it.</span>' +
    '<span class="es">Esa dirección de email no parece existir. Revísala, por favor.</span>';

  /* What opens each form from a call to action: a signup form's dialog, or the contact dialog of
     a section. */
  var signupDialogs = new Map();
  var contactDialogs = new Map();

  // ---------- Validation ----------

  /* What is wrong with a field: '' when it is fine, otherwise a key of MESSAGES. */
  function problemOf(field, form) {
    if (field.type === 'checkbox') return field.checked ? '' : 'box';
    if (field.type === 'radio') return form.querySelector('input[name="' + field.name + '"]:checked') ? '' : 'empty';
    var value = field.value.trim();
    if (field.type === 'email') {
      if (!value) return 'mail';
      return EMAIL.test(value) ? '' : 'badmail';
    }
    return value ? '' : 'empty';
  }

  /* The message line of a field goes inside its .fld, or right after its .chk. In a band's
     .inline-form it goes under the email: inside the row when the button has wrapped below the
     field (phones), after the row when both share a line. */
  function placeMessage(field, line) {
    var host = field.closest('.fld,.inline-form,.chk') || field;
    var button = host.classList.contains('inline-form') && host.querySelector('button');
    if (host.classList.contains('fld')) host.appendChild(line);
    else if (button && button.offsetTop > field.offsetTop) host.insertBefore(line, button);
    else host.parentNode.insertBefore(line, host.nextSibling);
  }

  /* Marks a field and shows or hides its message line; the field points to the line with
     aria-describedby. A malformed email always gets the general words, which show an example. */
  function showProblem(field, problem) {
    var id = (field.id || field.name) + '-err';
    var line = document.getElementById(id);
    field.setAttribute('aria-invalid', problem ? 'true' : 'false');
    if (!problem) {
      if (line) line.hidden = true;
      field.removeAttribute('aria-describedby');
      return;
    }
    if (!line) {
      line = document.createElement('p');
      line.className = 'fmsg';
      line.id = id;
    }
    placeMessage(field, line);
    var ownWords = problem !== 'badmail';
    var words = {
      en: (ownWords && field.getAttribute('data-err-en')) || MESSAGES[problem][0],
      es: (ownWords && field.getAttribute('data-err-es')) || MESSAGES[problem][1],
    };
    line.textContent = '';
    ['en', 'es'].forEach(function (lang) {
      var span = document.createElement('span');
      span.className = lang;
      span.textContent = words[lang];
      line.appendChild(span);
    });
    line.hidden = false;
    field.setAttribute('aria-describedby', id);
  }

  // ---------- One form ----------

  function setUpForm(form) {
    var kind = form.getAttribute('data-form');
    var dialog = form.querySelector('dialog.ask');
    var email = form.querySelector('input[type=email]');
    /* Opened from a button, the waitlist dialog asks for the email itself and copies it to the
       form's email field. */
    var dialogEmailRow = dialog && dialog.querySelector('.ask-mail');
    var dialogEmail = dialogEmailRow && dialogEmailRow.querySelector('input');
    var sent = false;

    function sibling(selector) {
      return form.parentNode.querySelector(':scope > ' + selector);
    }
    /* The error line under the form, and its general text, kept before askToFixEmail() replaces it. */
    var errorLine = sibling('.ferr');
    var generalError = errorLine ? errorLine.innerHTML : '';

    /* A marked field is checked again as the person fixes it, so its line goes as soon as it is right. */
    form.querySelectorAll('input,textarea').forEach(function (field) {
      field.addEventListener(field.type === 'checkbox' ? 'change' : 'input', function () {
        if (field.getAttribute('aria-invalid') === 'true') showProblem(field, problemOf(field, form));
      });
    });

    function askForEmailInDialog() {
      dialogEmailRow.hidden = false;
      dialogEmail.required = true;
      dialogEmail.value = email ? email.value : '';
    }

    /* Opens the signup dialog. From a call to action ("Join the waitlist") without an email typed
       in the band, the dialog asks for the email; from the band's own button it shows the email
       it will write to. */
    function openSignupDialog(fromButton) {
      if (sent || dialog.open) return;
      var hasEmail = email && email.value.indexOf('@') > 0;
      var askEmail = Boolean(fromButton && dialogEmailRow && !hasEmail);
      if (dialogEmailRow) {
        dialogEmailRow.hidden = !askEmail;
        dialogEmail.required = askEmail;
        if (askEmail) dialogEmail.value = email ? email.value : '';
      }
      var writeTo = dialog.querySelector('.ask-to');
      if (writeTo) writeTo.hidden = askEmail;
      var shownEmail = dialog.querySelector('[data-mail]');
      if (shownEmail && email) shownEmail.textContent = email.value.trim();
      dialog.showModal();
      var first = askEmail ? dialogEmail : dialog.querySelector('.ask-q input[type=text],.ask-q select');
      if (first) first.focus();
    }

    if (dialog) {
      dialog.querySelectorAll('[data-close]').forEach(function (button) {
        button.addEventListener('click', function () {
          dialog.close();
        });
      });
      dialog.addEventListener('close', function () {
        if (sent) form.classList.add('done');
      });
      if (dialogEmail && email) {
        dialogEmail.addEventListener('input', function () {
          email.value = dialogEmail.value;
        });
      }
      signupDialogs.set(form, openSignupDialog);
    }

    /* After a successful send. The event lets letter-invite.js stop inviting someone who has just
       subscribed, from the Letter form or from the waitlist, whose consent covers the Letter. */
    function showThanks(data) {
      try {
        document.dispatchEvent(new CustomEvent('sw-form-sent', { detail: { form: kind, data: data || {} } }));
      } catch {
        // Very old browsers without CustomEvent: nothing listens there anyway.
      }
      if (!dialog) {
        /* Sent from the contact dialog: the thank-you shows there and the close button takes the focus. */
        form.classList.add('done');
        var contactDialog = form.closest('dialog');
        var close = contactDialog && contactDialog.querySelector('.x');
        if (close) close.focus();
        return;
      }
      sent = true;
      var thanks = sibling('.sent');
      var thanksSpot = dialog.querySelector('.ask-done');
      if (thanks && thanksSpot) {
        var copy = thanks.cloneNode(true);
        copy.removeAttribute('role');
        thanksSpot.appendChild(copy);
      }
      dialog.querySelector('.ask-q').hidden = true;
      var end = dialog.querySelector('.ask-end');
      end.hidden = false;
      end.querySelector('button').focus();
    }

    /* The email to fix, marked and focused next to its message. The waitlist dialog has an email
       field of its own; the Letter dialog does not, so it closes and the field in the band is fixed. */
    function askToFixEmail() {
      var line = dialog ? dialog.querySelector('.ferr') : errorLine;
      var field = email;
      if (dialog && dialogEmailRow) {
        askForEmailInDialog();
        var writeTo = dialog.querySelector('.ask-to');
        if (writeTo) writeTo.hidden = true;
        field = dialogEmail;
      } else if (dialog) {
        dialog.close();
        line = errorLine;
      }
      if (line) {
        line.innerHTML = UNKNOWN_DOMAIN;
        line.hidden = false;
      }
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    }

    /* Checks every required field that is on screen (fields in a closed dialog wait for it) and
       focuses the first one that is wrong. */
    function validate() {
      var valid = true;
      form.querySelectorAll('input[required],textarea[required]').forEach(function (field) {
        var inDialog = field.closest('dialog');
        if (inDialog && !inDialog.open) return;
        /* The dialog asks for the email itself and copies it here. */
        if (field === email && dialogEmail && dialogEmail.required) return;
        var problem = problemOf(field, form);
        showProblem(field, problem);
        if (problem && valid) {
          valid = false;
          field.focus();
        }
      });
      return valid;
    }

    /* Every field by id; a radio group as {name: checked value}. */
    function collectFields() {
      var data = { form: kind, lang: document.documentElement.lang, page: location.href, sent: new Date().toISOString() };
      form.querySelectorAll('input,select,textarea').forEach(function (field) {
        if (field.type === 'radio') {
          if (field.checked) data[field.name] = field.value;
          return;
        }
        if (!field.id) return;
        data[field.id] = field.type === 'checkbox' ? field.checked : field.value;
      });
      return data;
    }

    /* Posts the form. The submit button waits while it is sent; an answer of {invalid: 'email'}
       asks for the email again, any other failure shows the general error line. */
    function send(url) {
      var data = collectFields();
      var button = dialog ? dialog.querySelector('.ask-q button[type=submit]') : form.querySelector('button[type=submit]');
      if (button) button.disabled = true;
      var failureLine = dialog ? dialog.querySelector('.ferr') : form.parentNode.querySelector('.ferr');
      if (failureLine) failureLine.hidden = true;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (response) {
          if (response.ok) {
            showThanks(data);
            return;
          }
          return response.json().then(
            function (answer) {
              throw answer;
            },
            function () {
              throw 0;
            },
          );
        })
        .catch(function (answer) {
          if (answer && answer.invalid === 'email') {
            askToFixEmail();
            return;
          }
          if (!failureLine) return;
          failureLine.innerHTML = generalError;
          failureLine.hidden = false;
        })
        .then(function () {
          if (button) button.disabled = false;
        });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      /* A new try clears the line under the form (the email message, or a past error). */
      if (errorLine) errorLine.hidden = true;
      if (!validate()) return;
      if (dialog && !dialog.open) {
        openSignupDialog(false);
        return;
      }
      if (sent) return;
      var url = (window.SW_FORMS || {})[kind];
      if (!url) {
        showThanks();
        return;
      }
      send(url);
    });
  }

  // ---------- The contact dialog (Partners) ----------

  /* "Start a conversation" opens the contact form in a dialog instead of sending her to the end of
     the page (team request, November 2026). The form's column moves into the dialog and back into
     the band when the dialog closes, so there is one form, with the ids api/form.ts reads,
     wherever it is filled in, and a sent form shows its thank-you in both places. */
  function setUpContactDialog(dialog) {
    var section = dialog.parentNode;
    var form = section.querySelector('form[data-form]');
    var column = form && form.parentNode;
    var body = dialog.querySelector('.ask-body');
    var placeholder = document.createComment('form');
    if (!column || !body) return;

    dialog.querySelectorAll('[data-close]').forEach(function (button) {
      button.addEventListener('click', function () {
        dialog.close();
      });
    });
    dialog.addEventListener('close', function () {
      if (!placeholder.parentNode) return;
      placeholder.parentNode.insertBefore(column, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    });

    contactDialogs.set(section, function openContactDialog() {
      if (dialog.open) return;
      column.parentNode.insertBefore(placeholder, column);
      body.appendChild(column);
      dialog.showModal();
      var first = form.classList.contains('done')
        ? dialog.querySelector('.x')
        : form.querySelector('select,textarea,input:not([tabindex="-1"])');
      if (first) first.focus();
    });
  }

  document.querySelectorAll('form[data-form]').forEach(setUpForm);
  document.querySelectorAll('dialog.ask-form').forEach(setUpContactDialog);

  // ---------- Calls to action ----------

  /* A button with data-scroll, or a link to #waitlist, brings the form to her: a section that holds
     a signup dialog (the waitlist) or the contact dialog opens it straight away; any other section
     is scrolled to. A link to #waitlist on a page without one goes to Membership as usual. */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function openFormIn(section) {
    var form = section.querySelector('form[data-form]');
    var open = (form && signupDialogs.get(form)) || contactDialogs.get(section);
    if (!open) return false;
    open(true);
    return true;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-scroll],a[href$="#waitlist"]');
    if (!trigger) return;
    var section = document.getElementById(trigger.getAttribute('data-scroll') || 'waitlist');
    if (!section) return;
    if (openFormIn(section)) {
      event.preventDefault();
      return;
    }
    if (trigger.hasAttribute('data-scroll')) section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* /membership#waitlist, from a "Join the waitlist" link on another page, opens the dialog on
     arrival, with the page at its top and the hash taken out of the address. */
  if (location.hash === '#waitlist') {
    var waitlist = document.querySelector('#waitlist form[data-form]');
    var openWaitlist = waitlist && signupDialogs.get(waitlist);
    if (openWaitlist) {
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch {
        // Without history access the hash simply stays.
      }
      window.scrollTo(0, 0);
      openWaitlist(true);
    }
  }
})();
