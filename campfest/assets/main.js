(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* menú en celular */
  var nav = document.querySelector('.cf-nav');
  var toggle = document.querySelector('.cf-nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      toggle.querySelector('use').setAttribute('href', toggle.dataset.icons + (abierto ? '#i-x' : '#i-menu'));
    });
  }
  /* el submenú "Más" se cierra al hacer clic fuera */
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.cf-nav-more[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  /* aparición al hacer scroll: el contenido es visible por defecto y solo se
     oculta para animar cuando sabemos que podemos observarlo */
  var items = document.querySelectorAll('.cf-reveal, .cf-stagger');
  if ('IntersectionObserver' in window && !reduced) {
    items.forEach(function (el) { el.classList.add('cf-pending'); });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('cf-pending'); e.target.classList.add('cf-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { obs.observe(el); });
  }

  /* parallax de las figuras del hero */
  if (!reduced) {
    var hero = document.querySelector('#cf-hero');
    var shapes = document.querySelectorAll('.cf-hero-shape');
    if (hero && shapes.length) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        shapes.forEach(function (s, i) {
          var f = (i + 1) * 10;
          s.style.transform = 'translate(' + (x * f) + 'px,' + (y * f) + 'px)';
        });
      });
    }
  }

  /* confeti al tocar la fecha */
  var badge = document.querySelector('#cf-badge');
  var colors = ['#FF2E8B', '#FFD400', '#00D2C6', '#8B2FF0', '#FF6B00'];
  var fired = false;
  function burst() {
    if (reduced || !badge) return;
    var rect = badge.getBoundingClientRect();
    for (var i = 0; i < 16; i++) {
      var dot = document.createElement('span');
      dot.className = 'cf-burst';
      dot.style.background = colors[i % colors.length];
      dot.style.left = (rect.width / 2) + 'px';
      dot.style.top = (rect.height / 2) + 'px';
      badge.appendChild(dot);
      var angle = Math.random() * Math.PI * 2;
      var dist = 50 + Math.random() * 60;
      dot.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px) scale(0)', opacity: 0 }
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
      (function (d) { setTimeout(function () { d.remove(); }, 1100); })(dot);
    }
  }
  if (badge) {
    badge.addEventListener('click', burst);
    badge.addEventListener('mouseenter', function () {
      if (!fired) { fired = true; burst(); setTimeout(function () { fired = false; }, 1200); }
    });
  }

  /* pestañas de programación */
  var programTabs = document.querySelectorAll('[data-program-tab]');
  var programPanels = document.querySelectorAll('[data-program-panel]');
  function setProgramDay(day) {
    programTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-program-tab') === day;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    programPanels.forEach(function (panel) {
      var active = panel.getAttribute('data-program-panel') === day;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }
  programTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { setProgramDay(tab.getAttribute('data-program-tab')); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = programTabs[(i + (e.key === 'ArrowRight' ? 1 : programTabs.length - 1)) % programTabs.length];
      next.focus();
      setProgramDay(next.getAttribute('data-program-tab'));
    });
  });

  /* palabras secretas: premian a quien lee hasta el final. El logro se
     guarda en localStorage y se ve en el portal del campista. */
  document.querySelectorAll('.cf-secreto-sitio').forEach(function (el) {
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    function reclamar() {
      var id = 'secreto_sitio_' + el.dataset.secreto;
      var logros = [];
      try { logros = JSON.parse(localStorage.getItem('cf_logros') || '[]'); } catch (e) {}
      if (logros.indexOf(id) === -1) {
        logros.push(id);
        try { localStorage.setItem('cf_logros', JSON.stringify(logros)); } catch (e) {}
      }
      el.textContent = 'encontrada. Revisa tu portal';
    }
    el.addEventListener('click', reclamar);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reclamar(); } });
  });
})();
