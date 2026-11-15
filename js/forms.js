/* Enquiry forms: validation, photo checks, delivery. Honest fallback when no mail endpoint is configured. */
(function () {
  'use strict';
  var D = window.DW || {};
  var MAX_PHOTOS = 3, MAX_BYTES = 5 * 1024 * 1024, OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  var seq = 0;
  function errEl(field) {
    var f = field.closest('.field'); if (f) return f.querySelector('[data-err]');
    var n = field.closest('label'); n = n && n.nextElementSibling; return n && n.hasAttribute('data-err') ? n : null;
  }
  function setErr(field, msg) {
    var e = errEl(field), f = field.closest('.field');
    if (e) { e.textContent = msg || ''; if (!e.id) e.id = 'err-' + (++seq); if (msg) field.setAttribute('aria-describedby', e.id); else field.removeAttribute('aria-describedby'); }
    if (f) f.classList.toggle('has-err', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  function checkField(el) {
    var v = (el.value || '').trim();
    if (el.type === 'checkbox') return setErr(el, el.checked ? '' : 'Bitte bestätigen Sie die Datenschutzhinweise.');
    if (el.type === 'file') {
      var files = el.files ? Array.prototype.slice.call(el.files) : [];
      if (files.length > MAX_PHOTOS) return setErr(el, 'Bitte höchstens ' + MAX_PHOTOS + ' Fotos auswählen.');
      for (var i = 0; i < files.length; i++) {
        if (OK_TYPES.indexOf(files[i].type) < 0) return setErr(el, 'Nur JPG, PNG oder WebP erlaubt.');
        if (files[i].size > MAX_BYTES) return setErr(el, 'Ein Foto ist größer als 5 MB.');
      }
      return setErr(el, '');
    }
    if (el.required && !v) return setErr(el, 'Bitte ausfüllen.');
    if (el.name === 'name' && v && v.length < 2) return setErr(el, 'Bitte Namen angeben.');
    if (el.name === 'telefon' && v && !/^[+()\d][\d\s\/()+\-]{5,}$/.test(v)) return setErr(el, 'Bitte gültige Telefonnummer angeben.');
    if (el.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setErr(el, 'Bitte gültige E-Mail angeben.');
    return setErr(el, '');
  }
  function validate(scope) {
    var ok = true, first = null;
    Array.prototype.slice.call(scope.querySelectorAll('input:not([type=hidden]):not(.hp), select, textarea')).forEach(function (el) {
      if (el.closest('[hidden]')) return;
      if (!checkField(el)) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }
  function summary(fd) {
    var out = ['Anfrage über die Website (' + location.pathname + ')'];
    [['name', 'Name'], ['telefon', 'Telefon'], ['ort', 'PLZ/Ort'], ['anliegen', 'Anliegen'], ['nachricht', 'Nachricht']].forEach(function (p) {
      var v = (fd.get(p[0]) || '').toString().trim(); if (v) out.push(p[1] + ': ' + v);
    });
    return out.join('\n');
  }
  function status(form, kind, html) {
    var s = form.querySelector('.form__status'); s.hidden = false; s.className = 'form__status ' + kind; s.innerHTML = html;
    s.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function fallback(form, fd, reason) {
    var text = summary(fd).slice(0, 900);
    var wa = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(text);
    status(form, 'warn', '<b>' + (reason || 'Ihre Anfrage wurde noch nicht gesendet.') + '</b><br>Senden Sie sie jetzt direkt per WhatsApp (Text ist vorausgefüllt, Fotos hängen Sie im Chat an) oder rufen Sie uns an.<br>' +
      '<a class="btn btn--navy btn--sm" href="' + wa + '" rel="noopener" target="_blank">Per WhatsApp senden</a><a class="btn btn--ghost btn--sm" href="tel:' + D.phoneTel + '">' + D.phoneDisplay + ' anrufen</a>');
  }
  function send(form) {
    var fd = new FormData(form);
    if (fd.get('website')) return; // honeypot
    fd.append('seite', location.pathname);
    var btn = form.querySelector('[type=submit]'); if (!D.formEndpoint) { fallback(form, fd); return; }
    btn.disabled = true; var old = btn.textContent; btn.textContent = 'Wird gesendet…';
    fetch(D.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { status(form, 'ok', '<b>Danke, Ihre Anfrage ist bei uns angekommen.</b><br>Wir melden uns so schnell wie möglich bei Ihnen.'); form.reset(); }
        else fallback(form, fd, (res.j && res.j.error) || 'Das Senden hat leider nicht geklappt.');
      })
      .catch(function () { fallback(form, fd, 'Das Senden hat leider nicht geklappt.'); })
      .finally(function () { btn.disabled = false; btn.textContent = old; });
  }

  Array.prototype.slice.call(document.querySelectorAll('form[data-form]')).forEach(function (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); if (validate(form)) send(form); });
    // Live feedback without layout jumps: re-check a field only once it already shows an error; on blur only validate non-empty values.
    var recheck = function (e) { var t = e.target; if (t && t.matches && t.matches('input:not(.hp),select,textarea') && t.getAttribute('aria-invalid') === 'true') checkField(t); };
    form.addEventListener('input', recheck); form.addEventListener('change', function (e) { recheck(e); if (e.target.type === 'file') checkField(e.target); });
    form.addEventListener('blur', function (e) { var t = e.target; if (t && t.matches && t.matches('input:not(.hp):not([type=checkbox]):not([type=file]),textarea') && t.value.trim()) checkField(t); }, true);
  });
  window.DWForms = { validate: validate, send: send, checkField: checkField };
})();
