/* Post page: post.html?p=<slug> renders posts/<slug>.md */
(function () {
  'use strict';
  var slug = new URLSearchParams(location.search).get('p') || '';
  var headEl = document.getElementById('post-head');
  var bodyEl = document.getElementById('post-body');
  var navEl = document.getElementById('post-nav');
  var all = [], post = null, rendered = false;

  function labels() {
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = Site.t(el.dataset.t); });
  }

  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  function fixContent(root) {
    var seen = {};
    root.querySelectorAll('h2, h3, h4').forEach(function (h) {
      var id = slugify(h.textContent) || 'section'; if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
      h.id = id;
    });
    root.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (!/^(https?:|data:|\/)/.test(src)) img.setAttribute('src', 'posts/' + src.replace(/^\.\//, ''));
      img.loading = 'lazy';
    });
    root.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      var md = /^(?:\.\/)?([\w.-]+)\.md(#.*)?$/.exec(href);
      if (md) { a.setAttribute('href', 'post.html?p=' + encodeURIComponent(md[1]) + (md[2] || '')); return; }
      if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    if (window.hljs) root.querySelectorAll('pre code').forEach(function (c) { window.hljs.highlightElement(c); });
  }

  function head(meta, minutes) {
    var l = Site.lang(), e = Posts.esc;
    var tr = Posts.translation(all, meta);
    var tags = (meta.tags || []).map(function (t) { return '<a class="tag" href="blog.html?tag=' + encodeURIComponent(t) + '">' + e(t) + '</a>'; }).join(' ');
    headEl.innerHTML =
      '<div class="article-meta mono"><span>' + Posts.fmtDate(meta.date, l, true) + '</span><span aria-hidden="true">·</span>' +
      '<span>' + minutes + ' ' + Site.t('min') + '</span>' + (tags ? '<span aria-hidden="true">·</span>' + tags : '') + '</div>' +
      '<h1>' + e(meta.title) + '</h1>' +
      (meta.summary ? '<p class="dek">' + e(meta.summary) + '</p>' : '') +
      (tr ? '<a class="alt-lang more mono" href="post.html?p=' + encodeURIComponent(tr.slug) + '">' + (tr.lang === 'fr' ? 'Lire en français' : 'Read in English') + ' <span aria-hidden="true">→</span></a>' : '') +
      '<hr class="rule">';
    document.title = meta.title + ' — Ghassan Dabane';
  }

  function nav(meta) {
    var l = Site.lang(), list = Posts.forLang(all, meta.lang || l);
    var i = -1;
    list.forEach(function (p, k) { if ((p.ref || p.slug) === (meta.ref || meta.slug)) i = k; });
    var newer = i > 0 ? list[i - 1] : null, older = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
    var e = Posts.esc;
    navEl.innerHTML =
      (older ? '<a href="post.html?p=' + encodeURIComponent(older.slug) + '"><span class="mono">← ' + Site.t('prev') + '</span><b>' + e(older.title) + '</b></a>' : '') +
      (newer ? '<a class="next" href="post.html?p=' + encodeURIComponent(newer.slug) + '"><span class="mono">' + Site.t('next') + ' →</span><b>' + e(newer.title) + '</b></a>' : '');
  }

  function notFound() {
    headEl.innerHTML = '<h1>404</h1><p class="dek">' + Site.t('notFound') + '</p>';
    document.getElementById('article').removeAttribute('aria-busy');
  }

  function load() {
    labels();
    if (!/^[\w.-]+$/.test(slug)) return notFound();
    Promise.all([Posts.load(), fetch('posts/' + slug + '.md', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.text(); })])
      .then(function (res) {
        all = res[0];
        var fm = Posts.frontMatter(res[1]);
        var fromIndex = all.filter(function (p) { return p.slug === slug; })[0] || {};
        post = Object.assign({ slug: slug, lang: 'en' }, fromIndex, fm.data);
        if (typeof post.date === 'string') post.date = post.date.slice(0, 10);
        if (typeof post.tags === 'string') post.tags = post.tags.split(',').map(function (s) { return s.trim(); });
        if (!all.some(function (p) { return p.slug === slug; })) all.push(post);
        head(post, Posts.readingTime(fm.body));
        bodyEl.innerHTML = Posts.render(fm.body);
        fixContent(bodyEl);
        nav(post);
        rendered = true;
        document.getElementById('article').removeAttribute('aria-busy');
        if (location.hash) { var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }
      })
      .catch(notFound);
  }

  /* switching language on a post jumps to its translation when there is one */
  document.addEventListener('langchange', function (ev) {
    labels();
    if (!rendered) return;
    var tr = Posts.translation(all, post);
    if (tr && tr.lang === ev.detail) { location.href = 'post.html?p=' + encodeURIComponent(tr.slug); return; }
    head(post, Posts.readingTime(bodyEl.textContent)); nav(post);
  });

  /* reading progress */
  var bar = document.getElementById('progress');
  function progress() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h) : 0);
  }
  addEventListener('scroll', progress, { passive: true }); addEventListener('resize', progress);

  document.addEventListener('DOMContentLoaded', load);
})();
