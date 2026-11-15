/* Dachwerk Bavaria: site behaviour. Progressive enhancement; everything works without GSAP. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = !reduce && hasGsap;
  if (!motion) root.classList.add('no-motion');

  /* ---- header ---- */
  var header = $('.site-header'), nav = $('#nav'), burger = $('.burger');
  function onScroll() { header && header.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setNav(open) {
    nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open);
    if (open) { var f = nav.querySelector('a'); if (f) setTimeout(function () { f.focus(); }, 30); } else if (document.activeElement && nav.contains(document.activeElement)) burger.focus();
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen'); document.body.classList.toggle('nav-open', open);
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    window.matchMedia('(min-width:1101px)').addEventListener('change', function () { setNav(false); });
  }
  $$('.sub-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var sub = b.parentElement.querySelector('.sub'); var open = !sub.classList.contains('is-open');
      sub.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
    });
  });

  /* ---- before/after slider ---- */
  $$('[data-ba]').forEach(function (el) {
    var r = $('.ba__range', el);
    r.addEventListener('input', function () { el.style.setProperty('--pos', r.value + '%'); });
  });

  /* ---- story: highlight roof layer for the step in view (works without GSAP) ---- */
  var steps = $$('.story__steps .step');
  if (steps.length && 'IntersectionObserver' in window) {
    var art = $('.story__art svg');
    var setLayer = function (n) {
      steps.forEach(function (s) { s.classList.toggle('is-active', s.getAttribute('data-layer') === n); });
      $$('.layer, .callout', art).forEach(function (g) { g.classList.toggle('is-active', g.getAttribute('data-layer') === n); });
    };
    setLayer('1');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setLayer(en.target.getAttribute('data-layer')); });
    }, { rootMargin: '-42% 0px -48% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ---- lazy-load feature scripts ---- */
  function load(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb || null; document.body.appendChild(s); }
  var v = (window.DW && window.DW.v) || {};
  if ($('form[data-form], [data-dachcheck]')) load('/js/forms.js?v=' + v.forms, function () { if ($('[data-dachcheck]')) load('/js/dachcheck.js?v=' + v.dc); });

  /* ---- GSAP choreography ---- */
  if (!motion) return;
  function boot() {
  var gsap = window.gsap, ST = window.ScrollTrigger; gsap.registerPlugin(ST);
  gsap.defaults({ ease: 'power3.out' });

  // headline word reveal
  $$('[data-split]:not(.is-split)').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/); el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true"><span>' + w + '</span></span>'; }).join(' ');
    el.classList.add('is-split');
    var spans = $$('.w > span', el);
    gsap.set(spans, { yPercent: 108 });
    var inHero = !!el.closest('.hero, .phero');
    gsap.to(spans, { yPercent: 0, duration: 1, stagger: 0.06, scrollTrigger: inHero ? null : { trigger: el, start: 'top 88%', once: true }, delay: inHero ? 0.15 : 0 });
  });

  // generic reveal
  if ($('[data-reveal]')) { gsap.set('[data-reveal]', { opacity: 0, y: 26 });
  ST.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, overwrite: true }); } }); }

  // line drawing for roof sections / motifs
  $$('.roof-svg, .motif').forEach(function (svg) {
    var draws = $$('.draw', svg), fills = $$('.layer-fill', svg), isHero = svg.classList.contains('is-hero');
    gsap.set(draws, { strokeDasharray: 1, strokeDashoffset: 1 });
    var tl = gsap.timeline({ paused: true, delay: isHero ? 0.35 : 0 });
    tl.to(draws, { strokeDashoffset: 0, duration: 1.4, stagger: 0.07, ease: 'power2.inOut' }).from(fills, { opacity: 0, duration: 0.8, stagger: 0.06, clearProps: 'opacity' }, '-=0.7');
    if (isHero) tl.play(); else ST.create({ trigger: svg, start: 'top 85%', once: true, onEnter: function () { tl.play(); } });
  });

  // subtle hero parallax
  var heroParallax = $('.hero__art, .hero__frame');
  if (heroParallax && window.matchMedia('(min-width:901px)').matches) {
    gsap.to(heroParallax, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // process timeline line
  var flow = $('.flow');
  if (flow) {
    gsap.fromTo(flow, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: flow, start: 'top 78%', end: 'bottom 62%', scrub: 0.4 } });
  }

  if (document.readyState === 'complete') ST.refresh(); else window.addEventListener('load', function () { ST.refresh(); });
  }
  // keep the first paint and input handlers free: choreography starts when the main thread is idle
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 900 }); else setTimeout(boot, 250);
})();
