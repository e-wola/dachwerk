/* Dach-Check: 4-step guided assessment with real, transparent range logic (prices from DW.prices). */
(function () {
  'use strict';
  var D = window.DW || {}, P = D.prices || {};
  var root = document.querySelector('[data-dachcheck]'); if (!root) return;
  var form = root.querySelector('.dc__form');
  var stepsEl = [].slice.call(root.querySelectorAll('.dc__step'));
  var tabs = [].slice.call(root.querySelectorAll('.dc__tabs li'));
  var bar = root.querySelector('[data-bar]'), next = root.querySelector('[data-next]'), back = root.querySelector('[data-back]');
  var cur = 1, AREA = ['sanierung', 'neueindeckung', 'flachdach', 'daemmung'];
  var fmt = function (n) { return n.toLocaleString('de-DE'); };
  var val = function (n) { var e = form.querySelector('[name="' + n + '"]:checked'); return e ? e.value : ''; };
  var num = function (n) { var v = parseFloat((form.elements[n] || {}).value); return isFinite(v) ? v : 0; };
  var checked = function (n) { return [].slice.call(form.querySelectorAll('[name="' + n + '"]:checked')).map(function (e) { return e.value; }); };
  var err = function (step, msg) { var e = stepsEl[step - 1].querySelector(':scope > [data-err]') || stepsEl[step - 1].querySelector('[data-err]'); e.textContent = msg || ''; };

  function kind(l) { return AREA.indexOf(l) > -1 ? 'area' : l === 'rinne' ? 'length' : l === 'fenster' ? 'count' : 'none'; }
  function configStep2() {
    var l = val('leistung'), k = kind(l);
    [].forEach.call(root.querySelectorAll('[data-show]'), function (b) {
      var w = b.getAttribute('data-show'), show = w === k || (w === 'dachform' && (k === 'area' && l !== 'flachdach' || l === 'reparatur' || l === 'unklar'));
      b.hidden = !show;
    });
    if (l === 'flachdach') { var f = form.querySelector('[name=dachform][value=flach]'); if (f) f.checked = true; }
  }
  function show(n, quiet) {
    cur = n;
    stepsEl.forEach(function (s, i) { s.hidden = i !== n - 1; });
    tabs.forEach(function (t, i) { t.classList.toggle('is-on', i === n - 1); t.classList.toggle('is-done', i < n - 1); });
    bar.style.width = (n * 25) + '%'; back.hidden = n === 1; next.hidden = n === 4;
    next.textContent = n === 3 ? 'Ergebnis anzeigen' : 'Weiter';
    if (quiet) return;
    var leg = stepsEl[n - 1].querySelector('legend'); if (leg) { leg.tabIndex = -1; leg.focus({ preventScroll: true }); }
    var top = root.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function validStep(n) {
    err(n, '');
    if (n === 1) { if (!val('leistung')) { err(1, 'Bitte wählen Sie ein Anliegen.'); return false; } return true; }
    if (n === 2) {
      var l = val('leistung'), k = kind(l);
      if (k === 'area') {
        var a = num('flaeche'); if (a < 5 || a > 2000) { err(2, 'Bitte eine Dachfläche zwischen 5 und 2.000 m² angeben.'); return false; }
        if (l !== 'flachdach' && !val('dachform')) { err(2, 'Bitte die Dachform wählen (oder „Weiß ich nicht“).'); return false; }
      }
      if (k === 'length') { var m = num('laenge'); if (m < 2 || m > 500) { err(2, 'Bitte eine Länge zwischen 2 und 500 m angeben.'); return false; } }
      if (k === 'count') { var c = num('anzahl'); if (c < 1 || c > 30 || c % 1) { err(2, 'Bitte eine Anzahl zwischen 1 und 30 angeben.'); return false; } }
      return true;
    }
    if (n === 3) { if (!val('alter')) { err(3, 'Bitte das ungefähre Alter wählen.'); return false; } return true; }
    return true;
  }

  // Helper: estimate roof area from footprint and pitch (+ ~10 % for eaves/overhang)
  var grund = root.querySelector('#dc-grund'), neig = root.querySelector('#dc-neig'), hout = root.querySelector('[data-helper-out]'), use = root.querySelector('[data-use-area]');
  function helper() {
    var g = parseFloat(grund.value), f = parseFloat(neig.value);
    if (!g || g < 10) { use.hidden = true; hout.textContent = 'Geben Sie die Grundfläche ein. Dachüberstand ist grob mitgerechnet.'; return; }
    var est = Math.round(g * f * 1.1); hout.textContent = 'Geschätzte Dachfläche: ca. ' + fmt(est) + ' m². Bei Walmdach oder Gauben kann es mehr sein.'; use.hidden = false; use.dataset.v = est;
  }
  grund.addEventListener('input', helper); neig.addEventListener('change', helper);
  use.addEventListener('click', function () { form.elements.flaeche.value = use.dataset.v; });

  function round(n) { var s = n < 2000 ? 50 : 100; return Math.round(n / s) * s; }
  function calc() {
    var l = val('leistung'), p = P[l], aff = checked('auffaellig'), alter = val('alter'), form_ = val('dachform');
    var out = { l: l, aff: aff, alter: alter, dachform: form_ };
    if (!p) return out;
    var qty = p.unit === 'm2' ? num('flaeche') : p.unit === 'm' ? num('laenge') : num('anzahl');
    var lo = 1, hi = 1, ass = ['Basis: ' + fmt(p.low) + ' bis ' + fmt(p.high) + ' € ' + (p.unit === 'm2' ? 'je m²' : p.unit === 'm' ? 'je Meter' : 'je Fenster') + ' (allgemeine Orientierungswerte)'];
    if (form_ === 'walmdach') { lo *= 1.05; hi *= 1.12; ass.push('Walm- bzw. Krüppelwalmdach: Aufschlag für Grate und Kehlen'); }
    if (p.unit === 'm2' && qty < 40) { lo *= 1.15; hi *= 1.25; ass.push('Kleine Flächen sind je m² teurer (Fixkosten wie Anfahrt und Gerüst)'); }
    if (alter === 'alt' || aff.indexOf('feuchte') > -1) { hi *= 1.15; ass.push('Hohes Alter oder Feuchtigkeit: Unterbau kann zusätzliche Arbeiten erfordern (nur obere Grenze)'); }
    out.qty = qty; out.unit = p.unit; out.low = round(p.low * qty * lo); out.high = round(p.high * qty * hi); out.ass = ass; out.label = p.label; return out;
  }
  var NAMES = { reparatur: 'Reparatur / undichte Stelle', sanierung: 'Dachsanierung', neueindeckung: 'Neueindeckung', flachdach: 'Flachdach', daemmung: 'Dachdämmung', rinne: 'Dachrinne / Spenglerei', fenster: 'Dachfenster', unklar: 'Noch unklar' };
  var PAGES = { reparatur: 'dachreparatur', sanierung: 'dachsanierung', neueindeckung: 'dacheindeckung', flachdach: 'flachdach', daemmung: 'dachdaemmung', rinne: 'spenglerei', fenster: 'dachfenster-gauben', unklar: '' };
  var FLAGS = { feuchte: 'Feuchtigkeit innen', ziegel: 'Ziegel defekt', moos: 'Moos/Algen', rinne: 'Rinne undicht', daemmung: 'Dämmung mangelhaft', sturm: 'Sturm-/Hagelschaden' };

  function recommend(r) {
    var t = [];
    if (r.aff.indexOf('sturm') > -1) t.push('Bei Sturm- oder Hagelschäden: Schaden mit Fotos dokumentieren und die Gebäudeversicherung informieren.');
    if (r.aff.indexOf('feuchte') > -1) t.push('Feuchtigkeit innen sollten Sie nicht aufschieben: Eindringendes Wasser schädigt Dämmung und Holz. Eine zeitnahe Besichtigung ist ratsam.');
    if (r.l === 'sanierung' && r.alter === 'alt' && (r.aff.indexOf('feuchte') > -1 || r.aff.indexOf('ziegel') > -1)) t.push('Bei hohem Alter und sichtbaren Schäden reicht eine Teilsanierung eventuell nicht. Der Unterbau sollte geprüft werden.');
    if (r.l === 'reparatur') t.push('Reparaturen werden nach Aufwand kalkuliert (Höhe, Zugang, Schadensbild). Ein seriöser Preis ist erst nach Sichtung möglich.');
    if (r.l === 'unklar') t.push('Wir ordnen Ihr Anliegen bei der Besichtigung ein und sagen Ihnen, ob eine Reparatur genügt oder saniert werden sollte.');
    if (r.l === 'rinne' && r.aff.indexOf('rinne') > -1) t.push('Gleich mit prüfen lassen: Zustand des Dachrands und der Befestigung.');
    if (r.l === 'daemmung') t.push('Fragen Sie vor der Beauftragung nach aktuellen Fördermöglichkeiten für energetische Maßnahmen.');
    if (!t.length) t.push('Eine Besichtigung zeigt, welche Arbeiten tatsächlich nötig sind. Erst dann gibt es ein verbindliches Angebot.');
    return t;
  }
  function describe(r) {
    var parts = ['Dach-Check: ' + NAMES[r.l]];
    if (r.unit === 'm2') parts.push('Fläche: ' + fmt(r.qty) + ' m²'); if (r.unit === 'm') parts.push('Länge: ' + fmt(r.qty) + ' m'); if (r.unit === 'piece') parts.push('Fenster: ' + r.qty);
    if (r.dachform) parts.push('Dachform: ' + r.dachform);
    if (r.alter) parts.push('Alter: ' + { jung: 'unter 20 Jahre', mittel: '20 bis 40 Jahre', alt: 'über 40 Jahre', unklar: 'unbekannt' }[r.alter]);
    if (r.aff.length) parts.push('Auffälligkeiten: ' + r.aff.map(function (a) { return FLAGS[a]; }).join(', '));
    if (r.low) parts.push('Orientierung laut Dach-Check: ' + fmt(r.low) + ' bis ' + fmt(r.high) + ' €');
    return parts.join('\n');
  }
  function render() {
    var r = calc(), box = root.querySelector('[data-result]'), unitTxt = r.unit === 'm2' ? fmt(r.qty) + ' m² Dachfläche' : r.unit === 'm' ? fmt(r.qty) + ' m Rinne' : r.qty + ' Dachfenster';
    var page = PAGES[r.l], h = '';
    if (r.low) {
      h += '<div class="result__range"><div class="result__label">Orientierung · ' + NAMES[r.l] + '</div><div class="result__num">' + fmt(r.low) + ' bis ' + fmt(r.high) + ' €</div><div class="result__sub">für ' + unitTxt + ', brutto, ohne Gerüst und Entsorgung. Allgemeine Marktorientierung, kein Angebot.</div></div>';
    } else {
      h += '<div class="result__range"><div class="result__label">Einschätzung · ' + NAMES[r.l] + '</div><div class="result__num">Preis nach Sichtung</div><div class="result__sub">Ohne Besichtigung wäre jede Zahl geraten. Wir schauen es uns an.</div></div>';
    }
    h += '<div class="result__rec"><b>Unsere Einordnung</b>' + recommend(r).map(function (t) { return '<p>' + t + '</p>'; }).join('') + (page ? '<p><a href="/leistungen/' + page + '/">Mehr zu ' + NAMES[r.l] + '</a></p>' : '') + '</div>';
    if (r.ass) h += '<details class="result__ass"><summary>Wie wurde gerechnet?</summary><ul>' + r.ass.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '<li>Nicht enthalten: Gerüst, Entsorgung, Zusatzarbeiten am Holz, Sonderdetails</li></ul></details>';
    box.innerHTML = h;
    form.elements.anliegen.value = NAMES[r.l]; form.elements.nachricht.value = describe(r);
  }

  next.addEventListener('click', function () {
    if (!validStep(cur)) return;
    if (cur === 1) configStep2();
    if (cur === 3) render();
    show(cur + 1);
  });
  back.addEventListener('click', function () { show(cur - 1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); if (window.DWForms && window.DWForms.validate(stepsEl[3])) window.DWForms.send(form); });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && cur < 4 && e.target.tagName !== 'BUTTON') { e.preventDefault(); next.click(); } });
  form.addEventListener('blur', function (e) { var t = e.target; if (cur === 4 && window.DWForms && t.matches && t.matches('.dc__contact input:not(.hp):not([type=checkbox]):not([type=file])') && t.value.trim()) window.DWForms.checkField(t); }, true);
  form.addEventListener('input', function (e) { var t = e.target; if (cur === 4 && window.DWForms && t.getAttribute && t.getAttribute('aria-invalid') === 'true') window.DWForms.checkField(t); });
  form.addEventListener('change', function (e) { var t = e.target; if (cur === 4 && window.DWForms && t.getAttribute && t.getAttribute('aria-invalid') === 'true') window.DWForms.checkField(t); });

  // deep link: /dach-check/?leistung=flachdach
  var q = new URLSearchParams(location.search).get('leistung'), rb = q && form.querySelector('[name=leistung][value="' + q.replace(/[^a-z]/g, '') + '"]');
  if (rb) { rb.checked = true; configStep2(); show(2, true); } else show(1, true);
})();
