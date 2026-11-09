/* Closing form blocks: the drawn arrow by the email field (FieldArrow.astro) stays unwritten
   ("arm") until the field is half on screen, then writes itself in and nudges toward it
   (motion.css). Without this script, or with reduced motion, it simply shows. */
(function () {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) return;

  document.querySelectorAll('.formband .nudge').forEach(function (arrow) {
    var band = arrow.closest('.formband');
    var field = arrow.parentNode;
    band.classList.add('arm');
    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        band.classList.add('seen');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(field);
  });
})();
