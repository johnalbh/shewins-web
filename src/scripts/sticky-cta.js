/* The "Join the waitlist" bar at the foot of the screen (StickyCta.astro). It shows on Membership
   once the reader has scrolled past the opening, and steps aside while the waitlist band itself
   is on screen. */
(function () {
  var bar = document.getElementById('sticky');
  if (!bar) return;
  var SCROLLED_PAST_OPENING = 520;

  function waitlistOnScreen() {
    var waitlist = document.getElementById('waitlist');
    if (!waitlist) return false;
    var box = waitlist.getBoundingClientRect();
    return box.top < window.innerHeight && box.bottom > 0;
  }

  function update() {
    if (document.body.getAttribute('data-route') !== 'membership') {
      bar.classList.remove('show-it');
      return;
    }
    bar.classList.toggle('show-it', window.scrollY > SCROLLED_PAST_OPENING && !waitlistOnScreen());
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
