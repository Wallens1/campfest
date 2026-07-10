(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* scroll reveal */
  var items = document.querySelectorAll('.cf-reveal');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('cf-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { obs.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('cf-in'); });
  }

  /* mouse parallax on hero shapes (home page only) */
  if (!reduced) {
    var hero = document.querySelector('#cf-hero');
    var shapes = document.querySelectorAll('.cf-hero-shape');
    if (hero && shapes.length) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        shapes.forEach(function (s, i) {
          var f = (i + 1) * 8;
          s.style.transform = 'translate(' + (x * f) + 'px,' + (y * f) + 'px)';
        });
      });
    }
  }

  /* confetti burst on date badge click/hover (home page only) */
  var badge = document.querySelector('#cf-badge');
  var colors = ['#FF2E8B', '#FFD400', '#00D2C6', '#8B2FF0', '#FF6B00'];
  var fired = false;
  function burst() {
    if (reduced || !badge) return;
    var rect = badge.getBoundingClientRect();
    for (var i = 0; i < 14; i++) {
      var dot = document.createElement('span');
      dot.className = 'cf-burst';
      dot.style.background = colors[i % colors.length];
      dot.style.left = (rect.width / 2) + 'px';
      dot.style.top = (rect.height / 2) + 'px';
      badge.appendChild(dot);
      var angle = Math.random() * Math.PI * 2;
      var dist = 40 + Math.random() * 50;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      dot.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0)', opacity: 0 }
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
      (function (d) { setTimeout(function () { d.remove(); }, 1100); })(dot);
    }
  }
  if (badge) {
    badge.style.position = 'relative';
    badge.style.overflow = 'visible';
    badge.addEventListener('click', burst);
    badge.addEventListener('mouseenter', function () {
      if (!fired) { fired = true; burst(); setTimeout(function () { fired = false; }, 1200); }
    });
  }
})();