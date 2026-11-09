/* Status pills of the event tiles (.show[data-date]): Past, Today or Upcoming, worked out in the
   browser so they stay right between the nightly rebuilds. Past keeps the tile's own pill style
   and dims the tile; the other two get the filled pill. */
(function () {
  var LABELS = {
    past: '<span class="en">Past</span><span class="es">Pasado</span>',
    today: '<span class="en">Today</span><span class="es">Hoy</span>',
    upcoming: '<span class="en">Upcoming</span><span class="es">Próximo</span>',
  };
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  document.querySelectorAll('.show').forEach(function (tile) {
    var date = new Date(tile.getAttribute('data-date') + 'T00:00:00');
    var status = tile.querySelector('.status');
    if (!status) return;
    status.hidden = false;
    if (date < today) {
      tile.classList.add('past');
      status.innerHTML = LABELS.past;
    } else {
      status.innerHTML = date.getTime() === today.getTime() ? LABELS.today : LABELS.upcoming;
      status.className = 'pill f status';
    }
  });
})();
