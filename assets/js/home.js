/* Home page: dot-matrix, project illustrations (chut, spur, Fyndee), scroll-spy, publication panels, latest posts. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 5×7 dot-matrix (font from the Ivory Tower slides) ---------------- */
  var FONT = {
    G: '01110100011000010111100011000101111',
    D: '11110100011000110001100011000111110',
    '♥': '00000010101111111111011100010000000'
  };
  var COLORS = ['r', 'k', 'b', 'g'];
  function matrix() {
    var box = document.getElementById('matrix');
    if (!box) return;
    box.innerHTML = '';
    var dots = [];
    for (var i = 0; i < 35; i++) { var d = document.createElement('i'); box.appendChild(d); dots.push(d); }
    var seq = ['G', 'D'], k = 0, timer = null, origin = null;
    function paint(fn) {
      dots.forEach(function (d, i) {
        var x = i % 5, y = (i / 5) | 0;
        var delay = origin ? Math.hypot(x - origin[0], y - origin[1]) * 55 : (x + y) * 38;
        d.style.setProperty('--dl', delay + 'ms');
        d.className = fn(i) || '';
      });
    }
    function frame() {
      if (k === seq.length) {
        paint(function () { var r = Math.random(); return r > .9 ? 'r' : r > .82 ? 'b' : r > .76 ? 'g' : r > .72 ? 'k' : ''; });
      } else {
        var bits = FONT[seq[k]], c = COLORS[k % COLORS.length];
        paint(function (i) { return bits[i] === '1' ? c : ''; });
      }
      origin = null;
      clearTimeout(timer);
      if (!reduce) timer = setTimeout(function () { k = (k + 1) % (seq.length + 1); frame(); }, k === seq.length ? 1400 : 1900);
    }
    box.addEventListener('click', function (e) {
      var i = dots.indexOf(e.target);
      origin = i >= 0 ? [i % 5, (i / 5) | 0] : [2, 3];
      k = (k + 1) % (seq.length + 1); frame();
    });
    box.addEventListener('mousemove', function (e) {
      dots.forEach(function (d) {
        var r = d.getBoundingClientRect();
        var dist = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
        d.style.setProperty('--s', (1 + .55 * Math.max(0, 1 - dist / 90)).toFixed(3));
      });
    });
    box.addEventListener('mouseleave', function () { dots.forEach(function (d) { d.style.removeProperty('--s'); }); });
    frame();
  }

  /* ---------------- Fyndee: a temple drawn in dots, being "recognised" ---------------- */
  function temple() {
    var svg = document.getElementById('temple');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg', out = [];
    function dot(x, y, r, op) { out.push('<circle cx="' + x + '" cy="' + y + '" r="' + (r || 2.1) + '" fill="currentColor" opacity="' + (op || .55) + '"/>'); }
    var cx = 150;
    for (var r = 0; r <= 4; r++) for (var x = cx - r * 20; x <= cx + r * 20; x += 10) dot(x, 52 + r * 10);          // pediment
    for (var y = 104; y <= 114; y += 10) for (x = 70; x <= 230; x += 10) dot(x, y, 2.1, .75);                       // entablature
    [80, 110, 150, 190, 220].forEach(function (cxl) { for (y = 126; y <= 176; y += 10) { dot(cxl - 4, y); dot(cxl + 4, y); } }); // columns
    for (x = 60; x <= 240; x += 10) dot(x, 188, 2.1, .75);
    for (x = 50; x <= 250; x += 10) dot(x, 198, 2.1, .9);                                                           // steps
    // keypoints (SIFT-style rings) in the three cone colours
    [[150, 52, 'var(--red)'], [70, 104, 'var(--green)'], [230, 114, 'var(--blue)'], [110, 156, 'var(--red)'], [220, 188, 'var(--green)'], [50, 198, 'var(--blue)']]
      .forEach(function (p, i) {
        out.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="none" stroke="' + p[2] + '" stroke-width="1.6"><animate attributeName="r" values="5;9;5" dur="3s" begin="' + (i * .4) + 's" repeatCount="indefinite"/></circle>');
        out.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + p[2] + '"/>');
      });
    // viewfinder corners
    var c = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"';
    out.push('<path ' + c + ' d="M32 52V30h22M268 52V30h-22M32 196v22h22M268 196v22h-22"/>');
    // scan line
    out.push('<g class="scan" style="transform-origin:150px 124px"><line x1="38" x2="262" y1="124" y2="124" stroke="var(--blue)" stroke-width="1.5"/><rect x="38" y="124" width="224" height="16" fill="var(--blue)" opacity=".08"/></g>');
    // label chip
    out.push('<g transform="translate(150 238)"><rect x="-74" y="-12" width="148" height="24" rx="12" fill="var(--bg)" stroke="currentColor" stroke-opacity=".2"/>' +
      '<circle cx="-58" cy="0" r="4" fill="var(--green)"/><text id="temple-label" class="label-chip" x="-48" y="4" fill="currentColor"></text></g>');
    svg.innerHTML = out.join('');
    function label() { var t = document.getElementById('temple-label'); if (t) t.textContent = Site.lang() === 'fr' ? 'monument reconnu' : 'monument identified'; }
    label(); document.addEventListener('langchange', label);
  }

  /* ---------------- spur: a pace chart drawn in dots ---------------- */
  function spurArt() {
    var svg = document.getElementById('spur-art');
    if (!svg) return;
    var out = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function dot(x, y, r, fill, op) { out.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + fill + '" opacity="' + op + '"/>'); }
    for (var gx = 40; gx <= 270; gx += 10) for (var gy = 40; gy <= 150; gy += 22) dot(gx, gy, 1, 'currentColor', .18);   // faint grid
    var trend = function (x) { return 140 - (x - 40) / 230 * 70 + 6 * Math.sin(x / 26); };                              // getting faster: up is faster
    for (var x = 44; x <= 266; x += 9) dot(x, trend(x) + (rnd() - .5) * 46, 2.4, 'currentColor', .55);                // each run
    for (x = 40; x <= 270; x += 5) dot(x, trend(x), 2.2, 'var(--red)', .95);                                            // smoothed trend
    for (var w = 0; w < 12; w++) {                                                                                        // weekly volume
      var h = 2 + Math.round(3 + 2 * Math.sin(w * .9) + w * .25);
      for (var k = 0; k < h; k++) dot(46 + w * 19.5, 206 - k * 7, 2.2, 'var(--green)', w === 11 ? .95 : .6);
    }
    var end = trend(270);
    out.push('<circle cx="270" cy="' + end.toFixed(1) + '" r="7" fill="none" stroke="var(--red)" stroke-width="1.6"><animate attributeName="r" values="5;9;5" dur="3s" repeatCount="indefinite"/></circle>');
    out.push('<g transform="translate(150 236)"><rect x="-74" y="-12" width="148" height="24" rx="12" fill="var(--bg)" stroke="currentColor" stroke-opacity=".2"/>' +
      '<circle cx="-58" cy="0" r="4" fill="var(--red)"/><text id="spur-label" class="label-chip" x="-48" y="4" fill="currentColor"></text></g>');
    svg.innerHTML = out.join('');
    function label() { var t = document.getElementById('spur-label'); if (t) t.textContent = Site.lang() === 'fr' ? 'tendance 5:23 /km ▲' : 'trend 5:23 /km ▲'; }
    label(); document.addEventListener('langchange', label);
  }

  /* ---------------- chut: the number space in dots, a learned spam block ---------------- */
  function chutArt() {
    var svg = document.getElementById('chut-art');
    if (!svg) return;
    var out = [], seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function dot(x, y, r, fill, op) { out.push('<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" opacity="' + op + '"/>'); }
    var cols = 24, rows = 13, inBlock = function (c, r) { return c >= 14 && c <= 19 && r >= 3 && r <= 7; };
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {                                       // every number
      var x = 40 + c * 10, y = 34 + r * 10, v = rnd();
      if (inBlock(c, r) && v < .5) dot(x, y, 2.6, 'var(--red)', .9);                                   // blocked, clustered
      else if (!inBlock(c, r) && v < .018) dot(x, y, 2.4, 'var(--red)', .5);                           // blocked, alone
      else if (!inBlock(c, r) && v > .955) dot(x, y, 2.4, 'var(--green)', .65);                           // rang
      else dot(x, y, 1.2, 'currentColor', .2);
    }
    out.push('<rect x="171" y="57" width="68" height="58" rx="10" fill="var(--blue)" fill-opacity=".06" stroke="var(--blue)" stroke-width="1.4" stroke-dasharray="3 4"/>'); // what the model learned
    out.push('<circle cx="200" cy="84" r="7" fill="none" stroke="var(--blue)" stroke-width="1.6"><animate attributeName="r" values="5;9;5" dur="3s" repeatCount="indefinite"/></circle>');
    dot(200, 84, 2.8, 'var(--blue)', 1);                                                                  // a new number, never seen
    var calls = 'gbrrgrgbrrgggrbrrgrrgbrr';                                                               // the last calls
    for (var i = 0; i < calls.length; i++) {
      var col = calls[i] === 'r' ? 'var(--red)' : calls[i] === 'b' ? 'var(--blue)' : 'var(--green)';
      dot(44 + i * 9.4, 202, 3, col, i === calls.length - 1 ? 1 : .7);
    }
    out.push('<g transform="translate(150 236)"><rect x="-74" y="-12" width="148" height="24" rx="12" fill="var(--bg)" stroke="currentColor" stroke-opacity=".2"/>' +
      '<circle cx="-58" cy="0" r="4" fill="var(--blue)"/><text id="chut-label" class="label-chip" x="-48" y="4" fill="currentColor"></text></g>');
    svg.innerHTML = out.join('');
    function label() { var t = document.getElementById('chut-label'); if (t) t.textContent = Site.lang() === 'fr' ? 'spam 58/100 · silencieux' : 'spam 58/100 · silenced'; }
    label(); document.addEventListener('langchange', label);
  }

  /* ---------------- scroll-spy for the nav ---------------- */
  function spy() {
    var links = {};
    document.querySelectorAll('.nav a[data-nav]').forEach(function (a) { links[a.dataset.nav] = a; });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (k) { var s = document.getElementById(k); if (s) io.observe(s); });
  }

  /* ---------------- publication panels + copy ---------------- */
  function pubs() {
    document.querySelectorAll('[data-panel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = document.getElementById(b.dataset.panel), open = !p.classList.contains('open');
        p.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
      });
    });
    document.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pre = document.querySelector('#' + b.dataset.copy + ' pre');
        if (!pre || !navigator.clipboard) return;
        navigator.clipboard.writeText(pre.textContent).then(function () {
          var old = b.innerHTML; b.textContent = '✓'; setTimeout(function () { b.innerHTML = old; }, 1400);
        });
      });
    });
  }

  /* ---------------- latest posts + talks ---------------- */
  function lists() {
    var ul = document.getElementById('latest'), tk = document.getElementById('talks');
    function empty() { return '<li class="empty">' + Site.t('soon') + '</li>'; }
    function draw() {
      var l = Site.lang();
      if (ul) Posts.load().then(function (all) {
        var list = Posts.forLang(all, l).slice(0, 4);
        ul.innerHTML = list.length ? list.map(function (p) { return Posts.itemHTML(p, l); }).join('') : empty();
      });
      if (tk) Posts.loadTalks().then(function (all) {
        tk.innerHTML = all.length ? all.map(function (t) { return Posts.talkHTML(t, l); }).join('') : empty();
      });
    }
    draw(); document.addEventListener('langchange', draw);
  }

  document.addEventListener('DOMContentLoaded', function () { matrix(); chutArt(); spurArt(); temple(); spy(); pubs(); lists(); });
})();
