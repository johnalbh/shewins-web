/* SheWins website configuration.
   Form endpoints: all three forms post JSON to the site's own endpoint (src/pages/api/form.ts),
   which hands them to Brevo. Leave a value empty and that form just shows its success message
   without sending anything (prototype mode). */
window.SW_FORMS = {
  waitlist: '/api/form',   // membership waitlist
  contact:  '/api/form',   // partners / contact form
  letter:   '/api/form'    // newsletter signup
};
