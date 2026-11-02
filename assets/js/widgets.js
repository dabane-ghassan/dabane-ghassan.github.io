/* Interactive figures for the course pages. No dependencies: SVG + a few lines of numerics.
   Each widget is a function(container) registered on window.Widgets; course.js calls it for
   every <div class="widget" data-widget="name">. Colours come from the page (currentColor,
   var(--red|--green|--blue)), so the figures follow the theme. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var fr = function () { return window.Site && Site.lang() === 'fr'; };
  var tr = function (en, f) { return fr() ? f : en; };

  /* ---------------- tiny plotting kit ---------------- */
  function ticks(lo, hi, n) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmt(v) { return Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01) ? v.toExponential(0) : String(+v.toFixed(2)).replace('-', '−'); }

  /* Panel(svg, box, xdom, ydom, opts): an axes area inside an SVG. */
  function Panel(svg, box, x, y, o) {
    o = o || {};
    var p = { svg: svg, box: box, x: x, y: y };
    p.sx = function (v) { return box.x + (v - x[0]) / (x[1] - x[0]) * box.w; };
    p.sy = function (v) { return box.y + box.h - (v - y[0]) / (y[1] - y[0]) * box.h; };
    p.ix = function (px) { return x[0] + (px - box.x) / box.w * (x[1] - x[0]); };
    p.iy = function (py) { return y[0] + (box.y + box.h - py) / box.h * (y[1] - y[0]); };
    var id = 'clip' + Math.random().toString(36).slice(2, 8);
    var axes = ['<defs><clipPath id="' + id + '"><rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '"/></clipPath></defs>'];
    axes.push('<g class="w-axis">');
    axes.push('<line x1="' + box.x + '" x2="' + (box.x + box.w) + '" y1="' + (box.y + box.h) + '" y2="' + (box.y + box.h) + '"/>');
    axes.push('<line x1="' + box.x + '" x2="' + box.x + '" y1="' + box.y + '" y2="' + (box.y + box.h) + '"/>');
    if (!o.noXTicks) ticks(x[0], x[1], o.xt || 5).forEach(function (v) {
      var px = p.sx(v);
      axes.push('<line x1="' + px + '" x2="' + px + '" y1="' + (box.y + box.h) + '" y2="' + (box.y + box.h + 4) + '"/>' +
        '<text x="' + px + '" y="' + (box.y + box.h + 15) + '" text-anchor="middle">' + fmt(v) + '</text>');
    });
    ticks(y[0], y[1], o.yt || 4).forEach(function (v) {
      var py = p.sy(v);
      axes.push('<line x1="' + (box.x - 4) + '" x2="' + box.x + '" y1="' + py + '" y2="' + py + '"/>' +
        '<text x="' + (box.x - 7) + '" y="' + (py + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>');
    });
    if (o.zero && y[0] < 0 && y[1] > 0) axes.push('<line class="w-zero" x1="' + box.x + '" x2="' + (box.x + box.w) + '" y1="' + p.sy(0) + '" y2="' + p.sy(0) + '"/>');
    if (o.xlabel) axes.push('<text class="w-label" x="' + (box.x + box.w) + '" y="' + (box.y + box.h + 30) + '" text-anchor="end">' + o.xlabel + '</text>');
    if (o.ylabel) axes.push('<text class="w-label" x="' + (box.x - 34) + '" y="' + (box.y - 8) + '">' + o.ylabel + '</text>');
    axes.push('</g>');
    var g = document.createElementNS(NS, 'g');
    g.innerHTML = axes.join('');
    svg.appendChild(g);
    p.layer = document.createElementNS(NS, 'g');
    p.layer.setAttribute('clip-path', 'url(#' + id + ')');
    svg.appendChild(p.layer);
    p.path = function (xs, ys) {
      var d = '', pen = false;
      for (var i = 0; i < xs.length; i++) {
        var X = p.sx(xs[i]), Y = p.sy(ys[i]);
        if (!isFinite(X) || !isFinite(Y) || Math.abs(Y) > 1e5) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1); pen = true;
      }
      return d;
    };
    return p;
  }

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function makeSVG(w, h, label) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('class', 'w-svg');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', label);
    return s;
  }
  function slider(o) {
    var id = 'w' + Math.random().toString(36).slice(2, 8);
    var wrap = document.createElement('div');
    wrap.className = 'w-control';
    wrap.innerHTML = '<label for="' + id + '">' + o.label + '</label>' +
      '<input id="' + id + '" type="range" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + o.value + '">' +
      '<output for="' + id + '" class="mono"></output>';
    var input = wrap.querySelector('input'), out = wrap.querySelector('output');
    var raf = 0;
    function update() { out.textContent = o.format(+input.value); o.onInput(+input.value); }
    input.addEventListener('input', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); });
    wrap.set = function (v) { input.value = v; update(); };
    wrap.input = input;
    setTimeout(update);
    return wrap;
  }
  function frame(container, title) {
    container.innerHTML = '';
    var head = document.createElement('div'); head.className = 'w-head';
    head.innerHTML = '<span class="w-live mono"><span class="dot b"></span>' + tr('Interactive', 'Interactif') + '</span><span class="w-title">' + title + '</span>';
    var controls = document.createElement('div'); controls.className = 'w-controls';
    var plots = document.createElement('div'); plots.className = 'w-plots';
    var readout = document.createElement('p'); readout.className = 'w-readout mono'; readout.setAttribute('aria-live', 'polite');
    container.append(head, plots, controls, readout);
    return { plots: plots, controls: controls, readout: readout };
  }
  function clear(layer) { while (layer.firstChild) layer.removeChild(layer.firstChild); }

  var W = {};

  /* ---------------- 01 · Euler step size ---------------- */
  W.euler = function (box) {
    var k = 2, A0 = 10, T = 5;
    var f = frame(box, tr('Euler’s method on first-order decay, k = 2', 'Méthode d’Euler sur une décroissance d’ordre 1, k = 2'));
    var svg = makeSVG(640, 250, 'Euler versus exact solution'); f.plots.appendChild(svg);
    var P = Panel(svg, { x: 48, y: 16, w: 576, h: 196 }, [0, T], [-12, 12], { zero: true, xlabel: tr('time', 'temps'), ylabel: 'A(t)' });
    var xs = [], ys = [];
    for (var i = 0; i <= 300; i++) { xs.push(i / 300 * T); ys.push(A0 * Math.exp(-k * xs[i])); }
    el('path', { d: P.path(xs, ys), class: 'w-line', stroke: 'currentColor' }, P.layer);
    var dyn = el('g', {}, P.layer);
    f.controls.appendChild(slider({
      label: 'dt', min: 0.02, max: 1.2, step: 0.01, value: 0.25,
      format: function (v) { return v.toFixed(2); },
      onInput: function (dt) {
        clear(dyn);
        var tx = [0], ty = [A0], err = 0;
        for (var t = dt; t <= T + 1e-9; t += dt) {
          var y = ty[ty.length - 1] * (1 - k * dt);
          tx.push(t); ty.push(y); err = Math.max(err, Math.abs(y - A0 * Math.exp(-k * t)));
        }
        el('path', { d: P.path(tx, ty), class: 'w-line thin', stroke: 'var(--red)' }, dyn);
        tx.forEach(function (t, j) { if (Math.abs(ty[j]) < 30) el('circle', { cx: P.sx(t), cy: P.sy(ty[j]), r: 3, fill: 'var(--red)' }, dyn); });
        var g = 1 - k * dt, state = g >= 0 ? tr('decays smoothly', 'décroît régulièrement')
          : Math.abs(g) < 1 ? tr('oscillates, but decays', 'oscille, mais décroît')
          : Math.abs(g) === 1 ? tr('oscillates forever', 'oscille indéfiniment') : tr('oscillates and blows up', 'oscille et diverge');
        f.readout.innerHTML = '<span class="dot r"></span> Euler: ' + state + ' · ' + tr('largest error', 'erreur max.') + ' ' + (err > 999 ? '> 999' : err.toFixed(2)) +
          ' · ' + tr('each step multiplies A by', 'chaque pas multiplie A par') + ' 1 − k·dt = ' + g.toFixed(2).replace('-', '−');
      }
    }));
  };

  /* ---------------- 03 · Hodgkin–Huxley ---------------- */
  function hhRates(V) {
    var an = Math.abs(10 - V) < 1e-7 ? 0.1 : 0.01 * (10 - V) / (Math.exp((10 - V) / 10) - 1);
    var am = Math.abs(25 - V) < 1e-7 ? 1 : 0.1 * (25 - V) / (Math.exp((25 - V) / 10) - 1);
    return [an, 0.125 * Math.exp(-V / 80), am, 4 * Math.exp(-V / 18), 0.07 * Math.exp(-V / 20), 1 / (Math.exp((30 - V) / 10) + 1)];
  }
  function hhDeriv(s, I, out) {
    var V = s[0], n = s[1], m = s[2], h = s[3], r = hhRates(V);
    out[0] = -120 * m * m * m * h * (V - 115) - 36 * n * n * n * n * (V + 12) - 0.3 * (V - 10.6) + I;
    out[1] = r[0] * (1 - n) - r[1] * n;
    out[2] = r[2] * (1 - m) - r[3] * m;
    out[3] = r[4] * (1 - h) - r[5] * h;
  }
  function rk4(deriv, s, dt, arg, k) {
    var n = s.length, tmp = new Array(n), i;
    deriv(s, arg, k[0]);
    for (i = 0; i < n; i++) tmp[i] = s[i] + dt / 2 * k[0][i];
    deriv(tmp, arg, k[1]);
    for (i = 0; i < n; i++) tmp[i] = s[i] + dt / 2 * k[1][i];
    deriv(tmp, arg, k[2]);
    for (i = 0; i < n; i++) tmp[i] = s[i] + dt * k[2][i];
    deriv(tmp, arg, k[3]);
    for (i = 0; i < n; i++) s[i] += dt / 6 * (k[0][i] + 2 * k[1][i] + 2 * k[2][i] + k[3][i]);
  }
  function scratch(n) { return [new Array(n), new Array(n), new Array(n), new Array(n)]; }

  W.hh = function (box) {
    var f = frame(box, tr('Hodgkin–Huxley membrane, constant current from rest', 'Membrane de Hodgkin–Huxley, courant constant depuis le repos'));
    var svg = makeSVG(640, 330, 'Hodgkin–Huxley simulation'); f.plots.appendChild(svg);
    var T = 100;
    var PV = Panel(svg, { x: 48, y: 16, w: 576, h: 170 }, [0, T], [-20, 115], { noXTicks: true, ylabel: 'V (mV)' });
    var PG = Panel(svg, { x: 48, y: 214, w: 576, h: 80 }, [0, T], [0, 1], { yt: 2, xlabel: 't (ms)', ylabel: tr('gates', 'portes') });
    var lv = el('path', { class: 'w-line', stroke: 'currentColor' }, PV.layer);
    var lm = el('path', { class: 'w-line thin', stroke: 'var(--red)' }, PG.layer);
    var lh = el('path', { class: 'w-line thin', stroke: 'var(--blue)' }, PG.layer);
    var ln = el('path', { class: 'w-line thin', stroke: 'var(--green)' }, PG.layer);
    var leg = el('g', { class: 'w-legend' }, svg);
    [['m', 'var(--red)'], ['h', 'var(--blue)'], ['n', 'var(--green)']].forEach(function (q, i) {
      el('circle', { cx: 540 + i * 30, cy: 206, r: 3.5, fill: q[1] }, leg);
      el('text', { x: 547 + i * 30, y: 209.5 }, leg).textContent = q[0];
    });
    // resting state
    var r0 = hhRates(1e-6);
    var rest = [0, r0[0] / (r0[0] + r0[1]), r0[2] / (r0[2] + r0[3]), r0[4] / (r0[4] + r0[5])];
    var k = scratch(4);
    f.controls.appendChild(slider({
      label: tr('I (µA/cm²)', 'I (µA/cm²)'), min: 0, max: 120, step: 0.1, value: 10,
      format: function (v) { return v.toFixed(1); },
      onInput: function (I) {
        var s = rest.slice(), dt = 0.01, every = 10, ts = [0], V = [s[0]], M = [s[2]], H = [s[3]], N = [s[1]], spikes = [];
        for (var i = 1; i <= T / dt; i++) {
          var prev = s[0];
          rk4(hhDeriv, s, dt, I, k);
          if (prev <= 50 && s[0] > 50) spikes.push(i * dt);
          if (i % every === 0) { ts.push(i * dt); V.push(s[0]); N.push(s[1]); M.push(s[2]); H.push(s[3]); }
        }
        lv.setAttribute('d', PV.path(ts, V));
        lm.setAttribute('d', PG.path(ts, M)); lh.setAttribute('d', PG.path(ts, H)); ln.setAttribute('d', PG.path(ts, N));
        var msg;
        if (!spikes.length) msg = tr('No spike: the membrane settles at ', 'Pas de potentiel d’action : la membrane se stabilise à ') + V[V.length - 1].toFixed(1) + ' mV.';
        else if (spikes.length === 1) msg = tr('A single spike, then the membrane settles.', 'Un seul potentiel d’action, puis la membrane se stabilise.');
        else {
          var late = spikes.filter(function (t) { return t > 30; });
          var rate = late.length > 1 ? 1000 * (late.length - 1) / (late[late.length - 1] - late[0]) : 0;
          msg = spikes.length + tr(' spikes in 100 ms', ' potentiels d’action en 100 ms') + (rate ? ' · ' + tr('steady rate ', 'fréquence stable ') + rate.toFixed(0) + ' Hz' : tr(', then the membrane stays depolarised (block).', ', puis la membrane reste dépolarisée (bloc).'));
        }
        f.readout.innerHTML = '<span class="dot r"></span> ' + msg;
      }
    }));
  };

  /* ---------------- 04 · I_Kir phase line and bifurcation ---------------- */
  W.kir = function (box) {
    var gL = 0.2, EL = -50, gK = 2, EK = -80, Vh = -76, kk = -12;
    var hinf = function (v) { return 1 / (1 + Math.exp((Vh - v) / kk)); };
    var Iss = function (v) { return gL * (v - EL) + gK * hinf(v) * (v - EK); };
    var F = function (v, I) { return I - Iss(v); };
    var f = frame(box, tr('I_Kir model: equilibria as the current changes', 'Modèle I_Kir : équilibres selon le courant'));
    f.plots.classList.add('two');
    var s1 = makeSVG(400, 260, 'Phase line'), s2 = makeSVG(300, 260, 'Bifurcation diagram');
    f.plots.append(s1, s2);
    var P = Panel(s1, { x: 44, y: 16, w: 340, h: 200 }, [-90, -10], [-3, 3], { zero: true, xlabel: 'V (mV)', ylabel: 'dV/dt' });
    var B = Panel(s2, { x: 40, y: 16, w: 246, h: 200 }, [4.5, 8], [-100, 0], { xlabel: 'I', ylabel: 'V*' });
    // bifurcation branches, drawn once
    var vb = [], ib = [], st = [];
    for (var v = -100; v <= 0; v += 0.1) { vb.push(v); ib.push(Iss(v)); st.push((Iss(v + 1e-4) - Iss(v - 1e-4)) > 0); }
    function branch(stable) {
      return B.path(ib.map(function (x, i) { return st[i] === stable ? x : NaN; }), vb);
    }
    el('path', { d: branch(true), class: 'w-line', stroke: 'var(--green)' }, B.layer);
    el('path', { d: branch(false), class: 'w-line', stroke: 'currentColor', 'stroke-dasharray': '4 4', opacity: .6 }, B.layer);
    var curve = el('path', { class: 'w-line', stroke: 'currentColor' }, P.layer);
    var dynP = el('g', {}, P.layer), dynB = el('g', {}, B.layer);
    var cursor = el('line', { y1: B.box.y, y2: B.box.y + B.box.h, stroke: 'var(--blue)', 'stroke-width': 1.2 }, B.layer);
    f.controls.appendChild(slider({
      label: 'I', min: 4.5, max: 8, step: 0.01, value: 6,
      format: function (v) { return v.toFixed(2); },
      onInput: function (I) {
        var xs = [], ys = [];
        for (var v = -90; v <= -10; v += 0.25) { xs.push(v); ys.push(F(v, I)); }
        curve.setAttribute('d', P.path(xs, ys));
        clear(dynP); clear(dynB);
        cursor.setAttribute('x1', B.sx(I)); cursor.setAttribute('x2', B.sx(I));
        var eqs = [];
        for (var i = 1; i < xs.length; i++) if (ys[i - 1] === 0 || ys[i - 1] * ys[i] < 0) {
          var a = xs[i - 1], b = xs[i];
          for (var j = 0; j < 40; j++) { var c = (a + b) / 2; if (F(a, I) * F(c, I) <= 0) b = c; else a = c; }
          var vstar = (a + b) / 2, slope = (F(vstar + 1e-4, I) - F(vstar - 1e-4, I)) / 2e-4;
          eqs.push([vstar, slope < 0]);
        }
        // flow arrows on the V axis between equilibria
        var edges = [-90].concat(eqs.map(function (q) { return q[0]; })).concat([-10]);
        for (var s = 0; s < edges.length - 1; s++) {
          var mid = (edges[s] + edges[s + 1]) / 2, dir = F(mid, I) > 0 ? 1 : -1;
          if (edges[s + 1] - edges[s] < 3) continue;
          var x0 = P.sx(mid), y0 = P.sy(0);
          el('path', { d: 'M' + (x0 - dir * 7) + ' ' + (y0 - 5) + 'L' + (x0 + dir * 5) + ' ' + y0 + 'L' + (x0 - dir * 7) + ' ' + (y0 + 5) + 'Z', fill: 'var(--blue)' }, dynP);
        }
        eqs.forEach(function (q) {
          var attrs = { r: 6, stroke: 'var(--red)', 'stroke-width': 1.8, fill: q[1] ? 'var(--red)' : 'var(--bg)' };
          el('circle', Object.assign({ cx: P.sx(q[0]), cy: P.sy(0) }, attrs), dynP);
          el('circle', Object.assign({ cx: B.sx(I), cy: B.sy(q[0]) }, attrs, { r: 4.5 }), dynB);
        });
        var nS = eqs.filter(function (q) { return q[1]; }).length;
        f.readout.innerHTML = '<span class="dot r"></span> ' + eqs.length + ' ' + tr('equilibri' + (eqs.length > 1 ? 'a' : 'um'), 'équilibre' + (eqs.length > 1 ? 's' : '')) +
          ' · ' + nS + ' ' + tr('stable', 'stable' + (nS > 1 ? 's' : '')) + (eqs.length === 3 ? tr(' — bistable', ' — bistable') : '') +
          ' · ' + eqs.map(function (q) { return q[0].toFixed(1).replace('-', '−'); }).join(', ') + ' mV';
      }
    }));
  };

  /* ---------------- 04 · FitzHugh–Nagumo phase plane ---------------- */
  W.fn = function (box) {
    var a = 0.7, b = 0.8, tau = 13, I = 0.5, start = [-2, -1.5];
    var f = frame(box, tr('FitzHugh–Nagumo phase plane — click to start a trajectory', 'Plan de phase de FitzHugh–Nagumo — cliquez pour lancer une trajectoire'));
    f.plots.classList.add('two');
    var s1 = makeSVG(360, 300, 'Phase plane'), s2 = makeSVG(340, 300, 'Time course');
    f.plots.append(s1, s2);
    s1.classList.add('w-click');
    var P = Panel(s1, { x: 40, y: 14, w: 306, h: 244 }, [-3, 3], [-2, 2], { xlabel: 'V', ylabel: 'w' });
    var Q = Panel(s2, { x: 34, y: 14, w: 294, h: 244 }, [0, 150], [-2.5, 2.5], { zero: true, xlabel: tr('time', 'temps') });
    var field = el('g', { opacity: .3 }, P.layer);
    var nv = el('path', { class: 'w-line thin', stroke: 'var(--red)' }, P.layer);
    var nw = el('path', { class: 'w-line thin', stroke: 'var(--green)' }, P.layer);
    var traj = el('path', { class: 'w-line', stroke: 'var(--blue)' }, P.layer);
    var dot0 = el('circle', { r: 4, fill: 'var(--blue)' }, P.layer);
    var eq = el('circle', { r: 6, stroke: 'currentColor', 'stroke-width': 1.6 }, P.layer);
    var tv = el('path', { class: 'w-line', stroke: 'var(--blue)' }, Q.layer);
    var tw = el('path', { class: 'w-line thin', stroke: 'var(--red)' }, Q.layer);
    var leg = el('g', { class: 'w-legend' }, s2);
    [['V', 'var(--blue)'], ['w', 'var(--red)']].forEach(function (q, i) {
      el('circle', { cx: 280 + i * 28, cy: 22, r: 3.5, fill: q[1] }, leg);
      el('text', { x: 287 + i * 28, y: 25.5 }, leg).textContent = q[0];
    });
    var deriv = function (s, I, out) { out[0] = s[0] - s[0] * s[0] * s[0] / 3 - s[1] + I; out[1] = (s[0] + a - b * s[1]) / tau; };
    var k = scratch(2);
    function equilibrium() {
      var lo = -2.5, hi = 2.5, g = function (v) { return v - v * v * v / 3 + I - (v + a) / b; };
      for (var j = 0; j < 60; j++) { var c = (lo + hi) / 2; if (g(lo) * g(c) <= 0) hi = c; else lo = c; }
      var v = (lo + hi) / 2, tr_ = 1 - v * v - b / tau, det = -(1 - v * v) * b / tau + 1 / tau, disc = tr_ * tr_ - 4 * det;
      return { v: v, w: (v + a) / b, stable: tr_ < 0 && det > 0, focus: disc < 0 };
    }
    function draw() {
      clear(field);
      for (var x = -2.8; x <= 2.81; x += 0.4) for (var y = -1.8; y <= 1.81; y += 0.4) {
        var dv = x - x * x * x / 3 - y + I, dw = (x + a - b * y) / tau * 3, L = Math.hypot(dv, dw) || 1;
        var px = P.sx(x), py = P.sy(y), ux = dv / L * 8, uy = -dw / L * 8 * (P.box.h / 4) / (P.box.w / 6);
        el('line', { x1: px - ux / 2, y1: py - uy / 2, x2: px + ux / 2, y2: py + uy / 2, stroke: 'currentColor', 'stroke-width': 1 }, field);
        el('circle', { cx: px + ux / 2, cy: py + uy / 2, r: 1.3, fill: 'currentColor' }, field);
      }
      var vs = [], a1 = [], a2 = [];
      for (var v = -3; v <= 3; v += 0.05) { vs.push(v); a1.push(v - v * v * v / 3 + I); a2.push((v + a) / b); }
      nv.setAttribute('d', P.path(vs, a1)); nw.setAttribute('d', P.path(vs, a2));
      var s = start.slice(), dt = 0.05, ts = [0], V = [s[0]], Wv = [s[1]];
      for (var i = 1; i <= 150 / dt; i++) { rk4(deriv, s, dt, I, k); if (i % 2 === 0) { ts.push(i * dt); V.push(s[0]); Wv.push(s[1]); } }
      traj.setAttribute('d', P.path(V, Wv));
      tv.setAttribute('d', Q.path(ts, V)); tw.setAttribute('d', Q.path(ts, Wv));
      dot0.setAttribute('cx', P.sx(start[0])); dot0.setAttribute('cy', P.sy(start[1]));
      var e = equilibrium();
      eq.setAttribute('cx', P.sx(e.v)); eq.setAttribute('cy', P.sy(e.w));
      eq.setAttribute('fill', e.stable ? 'currentColor' : 'var(--bg)');
      var late = V.slice(Math.floor(V.length * .6)), amp = Math.max.apply(null, late) - Math.min.apply(null, late);
      f.readout.innerHTML = '<span class="dot b"></span> ' + tr('Equilibrium', 'Équilibre') + ' (' + e.v.toFixed(2).replace('-', '−') + ', ' + e.w.toFixed(2).replace('-', '−') + '): ' +
        (e.stable ? tr('stable', 'stable') : tr('unstable', 'instable')) + ' ' + (e.focus ? tr('focus', 'foyer') : tr('node', 'nœud')) + ' · ' +
        (amp > 1 ? tr('the trajectory settles on a limit cycle: repetitive spiking', 'la trajectoire rejoint un cycle limite : décharge répétitive')
                 : tr('the trajectory comes to rest', 'la trajectoire s’immobilise'));
    }
    function pick(ev) {
      var pt = s1.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      var q = pt.matrixTransform(s1.getScreenCTM().inverse());
      var x = P.ix(q.x), y = P.iy(q.y);
      if (x < -3 || x > 3 || y < -2 || y > 2) return;
      start = [x, y]; draw();
    }
    s1.addEventListener('click', pick);
    f.controls.appendChild(slider({
      label: 'I', min: -0.2, max: 1.6, step: 0.01, value: I,
      format: function (v) { return v.toFixed(2); },
      onInput: function (v) { I = v; draw(); }
    }));
  };

  window.Widgets = W;
})();
