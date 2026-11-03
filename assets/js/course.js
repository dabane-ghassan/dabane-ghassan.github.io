/* Course pages.
   course.html?c=<course>             → overview, from teaching/<course>/course.json
   course.html?c=<course>/<chapter>   → chapter, from teaching/<course>/<chapter>.md

   Chapters are Markdown, rendered like blog posts (Posts.render), plus:
     <figure class="fig" data-svg="fig/x.svg">…</figure>   inlined so it follows the theme
     <div class="widget" data-widget="name"></div>         interactive figure (widgets.js)
     ```output                                             printed result of the code above
     <details class="fold"><summary>…</summary> … </details> folded code
*/
(function () {
  'use strict';
  var root = document.getElementById('course');
  var param = new URLSearchParams(location.search).get('c') || 'modneuro';
  var parts = param.split('/');
  var courseSlug = parts[0], chapterSlug = parts[1] || '';
  var base = 'teaching/' + courseSlug + '/';
  var course = null, rendered = false;
  var e = function (s) { return Posts.esc(s); };
  var L = function (o) { return o && typeof o === 'object' ? (o[Site.lang()] || o.en) : (o || ''); };

  var T = {
    en: { chapters: 'Chapters', chapter: 'Chapter', start: 'Start with chapter 1', notebook: 'Notebook', colab: 'Open in Colab', all: 'All chapters',
          onPage: 'On this page', inEnglish: '', about: 'About this course', run: 'Run it yourself',
          runText: 'Every chapter is also a Jupyter notebook. Download it, or open it in Google Colab and run it in your browser. Locally you need Python 3 and:',
          revised: 'revised', license: 'License', notFound: 'This page could not be found.', prev: 'Previous', next: 'Next', back: 'Course overview',
          code: 'Show code', hide: 'Hide code', loading: 'Loading figure…' },
    fr: { chapters: 'Chapitres', chapter: 'Chapitre', start: 'Commencer par le chapitre 1', notebook: 'Notebook', colab: 'Ouvrir dans Colab', all: 'Tous les chapitres',
          onPage: 'Sur cette page', inEnglish: 'Ce cours est rédigé en anglais.', about: 'À propos du cours', run: 'L’exécuter soi-même',
          runText: 'Chaque chapitre existe aussi en notebook Jupyter. Téléchargez-le, ou ouvrez-le dans Google Colab pour l’exécuter dans le navigateur. En local, il faut Python 3 et :',
          revised: 'révisé en', license: 'Licence', notFound: 'Cette page est introuvable.', prev: 'Précédent', next: 'Suivant', back: 'Présentation du cours',
          code: 'Voir le code', hide: 'Masquer le code', loading: 'Chargement de la figure…' }
  };
  function t(k) { return (T[Site.lang()] || T.en)[k]; }
  function num(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function chapterURL(slug) { return 'course.html?c=' + encodeURIComponent(courseSlug) + '/' + encodeURIComponent(slug); }
  function colab(slug) {
    return 'https://colab.research.google.com/github/' + course.repo + '/blob/' + course.branch + '/teaching/' + courseSlug + '/notebooks/' + slug + '.ipynb';
  }

  /* ---------------- overview ---------------- */
  function overview() {
    document.title = course.title + ' — ' + L(course.subtitle);
    var list = course.chapters.map(function (c, i) {
      return '<li><a href="' + chapterURL(c.slug) + '">' +
        '<span class="date mono">' + num(i) + '</span>' +
        '<span><span class="title">' + e(c.title) + '</span><span class="sub">' + e(c.topics) + '</span></span>' +
        '<span class="side"><span class="arrow" aria-hidden="true">→</span></span></a></li>';
    }).join('');
    root.innerHTML =
      '<header class="course-hero">' +
        '<div class="course-hero-text">' +
          '<a class="back mono" href="./#teaching"><span aria-hidden="true">←</span> ' + (Site.lang() === 'fr' ? 'Enseignement' : 'Teaching') + '</a>' +
          '<h1>' + e(course.title) + '</h1>' +
          '<p class="lead">' + e(L(course.subtitle)) + '</p>' +
          '<p class="course-summary">' + e(L(course.summary)) + '</p>' +
          '<p class="affil mono">' + course.year + ', ' + t('revised') + ' ' + course.revised + (t('inEnglish') ? ' · ' + t('inEnglish') : '') + '</p>' +
          '<div class="pub-actions"><a class="chip chip-solid" href="' + chapterURL(course.chapters[0].slug) + '">' + t('start') + '</a></div>' +
        '</div>' +
        '<div class="course-art" aria-hidden="true"><svg id="course-art" viewBox="0 0 320 220"></svg></div>' +
      '</header>' +
      '<section class="section"><div class="section-grid">' +
        '<div class="section-head"><div class="num mono"><span class="dot b"></span></div><h2>' + t('chapters') + '</h2></div>' +
        '<ul class="lines">' + list + '</ul>' +
      '</div></section>' +
      '<section class="section"><div class="section-grid">' +
        '<div class="section-head"><div class="num mono"><span class="dot r"></span></div><h2>' + t('about') + '</h2></div>' +
        '<div class="course-about"><p>' + e(L(course.about)) + '</p></div>' +
      '</div></section>' +
      '<section class="section"><div class="section-grid">' +
        '<div class="section-head"><div class="num mono"><span class="dot g"></span></div><h2>' + t('run') + '</h2></div>' +
        '<div class="course-about"><p>' + t('runText') + '</p>' +
          '<pre class="install"><code>pip install ' + e(course.requirements) + '</code></pre>' +
          '<div class="pub-actions">' +
            course.chapters.map(function (c, i) { return '<a class="chip" href="' + base + 'notebooks/' + c.slug + '.ipynb" download>' + num(i) + ' .ipynb</a>'; }).join('') +
          '</div>' +
          '<p class="course-fine mono">' + t('license') +
          ' <a href="' + course.license.url + '" target="_blank" rel="noopener">' + course.license.name + '</a></p>' +
        '</div>' +
      '</div></section>';
    drawArt();
  }

  function drawArt() { Site.spikeArt(document.getElementById('course-art')); }

  /* ---------------- chapter ---------------- */
  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }
  function plain(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('.katex-mathml').forEach(function (m) { m.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function fixContent(body) {
    var seen = {};
    body.querySelectorAll('h2, h3').forEach(function (h) {
      var id = slugify(plain(h)) || 'section';
      if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
      h.id = id;
    });
    body.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      var md = /^(?:\.\/)?(\d\d-[\w-]+)\.md(#.*)?$/.exec(href);
      if (md) { a.setAttribute('href', chapterURL(md[1]) + (md[2] || '')); return; }
      if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    body.querySelectorAll('pre > code').forEach(function (c) {
      if (c.classList.contains('language-output')) {
        c.parentNode.classList.add('out');
        c.parentNode.setAttribute('aria-label', 'Output');
        return;
      }
      if (window.hljs) window.hljs.highlightElement(c);
    });
    body.querySelectorAll('details.fold > summary').forEach(function (s) {
      s.innerHTML = '<span class="fold-open">' + t('code') + '</span><span class="fold-close">' + t('hide') + '</span>';
    });
    body.querySelectorAll('table').forEach(function (tb) {
      var w = document.createElement('div'); w.className = 'table-wrap';
      tb.parentNode.insertBefore(w, tb); w.appendChild(tb);
    });
    // figures: inline the SVG so it uses currentColor and the theme's colours
    body.querySelectorAll('figure.fig[data-svg]').forEach(function (fig) {
      var holder = document.createElement('div');
      holder.className = 'fig-svg';
      holder.setAttribute('role', 'img');
      var cap = fig.querySelector('figcaption');
      if (cap) holder.setAttribute('aria-label', plain(cap));
      holder.innerHTML = '<span class="fig-loading mono">' + t('loading') + '</span>';
      fig.insertBefore(holder, fig.firstChild);
      fetch(base + fig.dataset.svg).then(function (r) { if (!r.ok) throw 0; return r.text(); })
        .then(function (svg) { holder.innerHTML = svg; })
        .catch(function () { holder.innerHTML = '<span class="fig-loading mono">' + e(fig.dataset.svg) + '</span>'; });
    });
    body.querySelectorAll('.widget[data-widget]').forEach(function (w) {
      if (window.Widgets && Widgets[w.dataset.widget]) Widgets[w.dataset.widget](w);
    });
  }

  function chapter(md) {
    var idx = -1;
    course.chapters.forEach(function (c, i) { if (c.slug === chapterSlug) idx = i; });
    if (idx < 0) return notFound();
    var ch = course.chapters[idx];
    var fm = Posts.frontMatter(md);
    var title = fm.data.title || ch.title;
    document.title = title + ' — ' + course.title;

    var nav = course.chapters.map(function (c, i) {
      return '<li><a href="' + chapterURL(c.slug) + '"' + (i === idx ? ' aria-current="page"' : '') + '>' +
        '<span class="mono">' + num(i) + '</span><span>' + e(c.title) + '</span></a></li>';
    }).join('');
    var prev = course.chapters[idx - 1], next = course.chapters[idx + 1];

    root.innerHTML =
      '<div class="chapter-grid">' +
        '<aside class="rail" aria-label="' + t('chapters') + '">' +
          '<a class="rail-course" href="course.html?c=' + courseSlug + '"><span class="rgb" aria-hidden="true"><i></i><i></i><i></i></span>' + e(course.title) + '</a>' +
          '<ol class="rail-chapters">' + nav + '</ol>' +
          '<div class="rail-toc"><div class="label mono">' + t('onPage') + '</div><ol id="toc"></ol></div>' +
        '</aside>' +
        '<article class="chapter">' +
          '<header class="chapter-head">' +
            '<div class="article-meta mono"><span>' + t('chapter') + ' ' + num(idx) + ' / ' + num(course.chapters.length - 1) + '</span>' +
              (t('inEnglish') ? '<span class="lang-badge">en</span>' : '') + '</div>' +
            '<h1>' + e(title) + '</h1>' +
            (fm.data.summary ? '<p class="dek">' + e(fm.data.summary) + '</p>' : '') +
            '<div class="pub-actions">' +
              '<a class="chip" href="' + colab(ch.slug) + '" target="_blank" rel="noopener">' + t('colab') + ' ↗</a>' +
              '<a class="chip" href="' + base + 'notebooks/' + ch.slug + '.ipynb" download>' + t('notebook') + ' .ipynb</a>' +
            '</div>' +
            '<hr class="rule">' +
          '</header>' +
          '<div class="prose" id="chapter-body">' + Posts.render(fm.body) + '</div>' +
          '<nav class="post-nav" aria-label="' + t('chapters') + '">' +
            (prev ? '<a href="' + chapterURL(prev.slug) + '"><span class="mono">← ' + t('prev') + '</span><b>' + e(prev.title) + '</b></a>'
                  : '<a href="course.html?c=' + courseSlug + '"><span class="mono">← ' + t('back') + '</span><b>' + e(course.title) + '</b></a>') +
            (next ? '<a class="next" href="' + chapterURL(next.slug) + '"><span class="mono">' + t('next') + ' →</span><b>' + e(next.title) + '</b></a>' : '') +
          '</nav>' +
        '</article>' +
      '</div>';

    var body = document.getElementById('chapter-body');
    fixContent(body);
    toc(body);
    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) setTimeout(function () { target.scrollIntoView(); }, 50);
    }
  }

  function toc(body) {
    var ol = document.getElementById('toc');
    var hs = body.querySelectorAll('h2');
    ol.innerHTML = Array.prototype.map.call(hs, function (h) {
      return '<li><a href="#' + h.id + '">' + e(plain(h)) + '</a></li>';
    }).join('');
    if (!('IntersectionObserver' in window)) return;
    var links = ol.querySelectorAll('a');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    hs.forEach(function (h) { io.observe(h); });
  }

  function notFound() {
    root.innerHTML = '<div class="article"><h1>404</h1><p class="dek">' + t('notFound') + '</p></div>';
    root.removeAttribute('aria-busy');
  }

  var source = '';
  function render() {
    if (!course) return;
    var y = scrollY;
    if (chapterSlug) chapter(source); else overview();
    root.removeAttribute('aria-busy');
    rendered = true;
    return y;
  }

  function load() {
    var nt = document.querySelector('.nav a[data-nav="teaching"]'); if (nt) nt.classList.add('active');
    if (!/^[\w-]+$/.test(courseSlug) || (chapterSlug && !/^[\w-]+$/.test(chapterSlug))) return notFound();
    var jobs = [fetch(base + 'course.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })];
    if (chapterSlug) jobs.push(fetch(base + chapterSlug + '.md', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }));
    Promise.all(jobs).then(function (res) { course = res[0]; source = res[1] || ''; render(); }).catch(notFound);
  }

  document.addEventListener('langchange', function () {
    if (!rendered) return;
    var y = render();
    scrollTo(0, y);
  });

  var bar = document.getElementById('progress');
  function progress() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', chapterSlug && h > 0 ? Math.min(1, scrollY / h) : 0);
  }
  addEventListener('scroll', progress, { passive: true }); addEventListener('resize', progress);

  document.addEventListener('DOMContentLoaded', load);
})();
