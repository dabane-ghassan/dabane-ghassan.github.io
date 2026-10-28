/* Shared behaviour for every page: theme, language, header, reveal-on-scroll. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------------- language ---------------- */
  var STRINGS = {
    en: { soon: 'Soon.', search: 'Search posts…', all: 'All', min: 'min read', noPosts: 'Soon.', noMatch: 'Nothing matches that search.', readIn: 'Lire en français', prev: 'Previous', next: 'Next', back: 'All writing', notFound: 'This post could not be found.', themeDark: 'Switch to dark theme', themeLight: 'Switch to light theme' },
    fr: { soon: 'Bientôt.', search: 'Rechercher…', all: 'Tous', min: 'min de lecture', noPosts: 'Bientôt.', noMatch: 'Aucun résultat pour cette recherche.', readIn: 'Read in English', prev: 'Précédent', next: 'Suivant', back: 'Tous les articles', notFound: 'Cet article est introuvable.', themeDark: 'Passer au thème sombre', themeLight: 'Passer au thème clair' }
  };
  function lang() { return root.dataset.lang === 'fr' ? 'fr' : 'en'; }
  function t(key) { return (STRINGS[lang()] || STRINGS.en)[key] || key; }

  function applyLang() {
    var l = lang();
    root.lang = l;
    document.querySelectorAll('#lang-toggle [data-l]').forEach(function (s) {
      s.classList.toggle('off', s.dataset.l !== l);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    var tt = document.querySelector('[data-title-' + l + ']');
    if (tt) document.title = tt.getAttribute('data-title-' + l);
  }
  function setLang(l) {
    root.dataset.lang = l;
    try { localStorage.setItem('lang', l); } catch (e) {}
    applyLang();
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }

  /* ---------------- theme ---------------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function theme() { return root.dataset.theme || (mq.matches ? 'dark' : 'light'); }
  function applyTheme() {
    var th = theme();
    root.dataset.theme = th;
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-label', th === 'dark' ? t('themeLight') : t('themeDark'));
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute('content', th === 'dark' ? '#0b0b0c' : '#ffffff');
    });
  }
  mq.addEventListener && mq.addEventListener('change', function () {
    var saved = null; try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (!saved) { delete root.dataset.theme; applyTheme(); }
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme();
    applyLang();

    var lt = document.getElementById('lang-toggle');
    if (lt) lt.addEventListener('click', function () { setLang(lang() === 'en' ? 'fr' : 'en'); });

    var tt = document.getElementById('theme-toggle');
    if (tt) tt.addEventListener('click', function () {
      var next = theme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      applyTheme();
    });

    /* mark Blog as current on blog and post pages */
    var pg = document.body.dataset.page;
    if (pg === 'blog' || pg === 'post') {
      var bl = document.querySelector('.nav a[data-nav="blog"]'); if (bl) bl.classList.add('active');
    }

    /* header border once scrolled */
    var header = document.querySelector('.site-header');
    var onScroll = function () { header && header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    /* reveal on scroll */
    var els = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add('in'); }); }

    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });

  window.Site = { lang: lang, t: t, setLang: setLang };
})();
