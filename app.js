/* =====================================================================
   app.js — Pantallas y acciones de Control Horario
   ---------------------------------------------------------------------
   Secciones: Inicio, Calculadora semanal, Calendario, Recuperaciones,
   Historial, Configuración y Copias de seguridad.
   Los cálculos están en calc.js y el guardado en storage.js.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.Calc;
  var S = window.Store;

  var state = null;
  var ui = {
    view: 'inicio',
    openDay: null,
    calMonth: C.todayStr().slice(0, 7),
    histYear: +C.todayStr().slice(0, 4),
    histDate: C.todayStr(),
    installPrompt: null
  };

  /* ---------- Iconos (SVG en línea, funcionan sin conexión) ---------- */
  function icon(name) {
    var p = {
      inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
      calculadora: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 7h10M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
      calendario: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
      recuperaciones: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
      historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
      configuracion: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
      copias: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
      mas: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
      prev: '<path d="m15 18-6-6 6-6"/>',
      next: '<path d="m9 18 6-6-6-6"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'
    }[name] || '';
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  var VIEWS = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'calculadora', label: 'Calculadora semanal', short: 'Calculadora' },
    { id: 'calendario', label: 'Calendario' },
    { id: 'recuperaciones', label: 'Recuperaciones', short: 'Recuperar' },
    { id: 'historial', label: 'Historial' },
    { id: 'configuracion', label: 'Configuración' },
    { id: 'copias', label: 'Copias de seguridad', short: 'Copias' }
  ];

  /* ---------- Utilidades ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() { return C.todayStr(); }
  function cls(min) { return min > 0 ? 'pos' : min < 0 ? 'neg' : 'zero'; }
  function compact(min) { // para celdas pequeñas del calendario en móvil
    if (!min) return '0';
    var a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
    return (min > 0 ? '+' : '−') + (h ? h + 'h' + (m ? C.pad(m) : '') : m + "'");
  }
  function typeOptions(selected) {
    return Object.keys(C.TYPES).map(function (k) {
      return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + C.TYPES[k] + '</option>';
    }).join('');
  }

  var toastTimer = null;
  function toast(msg, kind) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  // Guarda y vuelve a dibujar. Guardado automático tras cada cambio.
  function commit(msg) {
    S.save(state).then(function (ok) {
      if (!ok) toast('No se ha podido guardar en este navegador. Descarga una copia de seguridad.', 'error');
      else if (msg) toast(msg);
    });
    S.requestPersistence();
    render();
  }

  /* ---------- Ventana emergente ---------- */
  var modal = null;
  function openModal(opts) {
    modal = $('#modal');
    $('#modalTitle').textContent = opts.title;
    $('#modalBody').innerHTML = opts.body;
    var foot = $('#modalFoot');
    foot.innerHTML = '';
    (opts.buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn ' + (b.cls || 'btn-ghost');
      el.textContent = b.label;
      el.addEventListener('click', function () {
        if (b.onClick) { if (b.onClick() === false) return; }
        closeModal();
      });
      foot.appendChild(el);
    });
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    if (opts.onOpen) opts.onOpen($('#modalBody'));
  }
  function closeModal() {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open');
  }
  function confirmBox(title, text, okLabel, onOk, danger) {
    openModal({
      title: title,
      body: '<p>' + text + '</p>',
      buttons: [
        { label: 'Cancelar' },
        { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: onOk }
      ]
    });
  }

  /* ---------- Navegación ---------- */
  function renderNav() {
    $('#sideNav').innerHTML = VIEWS.map(function (v) {
      return '<a href="#' + v.id + '" class="nav-item' + (ui.view === v.id ? ' active' : '') + '">' + icon(v.id) + '<span>' + v.label + '</span></a>';
    }).join('');
    var main = ['inicio', 'calculadora', 'calendario', 'recuperaciones'];
    var moreActive = main.indexOf(ui.view) === -1;
    $('#bottomNav').innerHTML = main.map(function (id) {
      var v = VIEWS.filter(function (x) { return x.id === id; })[0];
      return '<a href="#' + id + '" class="bn-item' + (ui.view === id ? ' active' : '') + '">' + icon(id) + '<span>' + (v.short || v.label) + '</span></a>';
    }).join('') + '<button type="button" class="bn-item' + (moreActive ? ' active' : '') + '" id="moreBtn">' + icon('mas') + '<span>Más</span></button>';
    $('#moreBtn').addEventListener('click', function () {
      openModal({
        title: 'Más secciones',
        body: '<div class="more-list">' + ['historial', 'configuracion', 'copias'].map(function (id) {
          var v = VIEWS.filter(function (x) { return x.id === id; })[0];
          return '<a href="#' + id + '" class="more-item" data-close>' + icon(id) + '<span>' + v.label + '</span></a>';
        }).join('') + '</div>',
        onOpen: function (b) { $all('[data-close]', b).forEach(function (a) { a.addEventListener('click', closeModal); }); }
      });
    });
  }

  function goto(view) {
    if (location.hash !== '#' + view) location.hash = view; else { ui.view = view; render(); }
  }

  function render() {
    var v = VIEWS.filter(function (x) { return x.id === ui.view; })[0] || VIEWS[0];
    ui.view = v.id;
    $('#viewTitle').textContent = v.label;
    document.title = v.label + ' · Control Horario';
    renderNav();
    var el = $('#view');
    el.innerHTML = '';
    RENDER[v.id](el);
  }

  /* =====================================================================
     1. INICIO
     ===================================================================== */
  function renderInicio(el) {
    var t = today();
    var avail = C.availableNow(state, t);
    var ws = C.weekSummary(state, t, t);
    var recFromMonday = 0;
    state.recoveries.forEach(function (r) { if (r.date >= ws.monday) recFromMonday += r.minutes; });
    var adjust = avail - (ws.previous + ws.diff - recFromMonday);
    var totalRec = C.totalRecovered(state);

    var sub;
    if (avail > 0) sub = 'Puedes recuperar hasta <b>' + C.fmtLong(avail) + '</b>.';
    else if (avail < 0) sub = '<b>Saldo negativo:</b> te faltan ' + C.fmtLong(avail) + ' por compensar.';
    else sub = 'Estás al día: no tienes minutos a favor ni pendientes.';

    var html = '';
    html += '<section class="card hero hero-' + cls(avail) + '">' +
      '<div class="hero-label">Saldo disponible</div>' +
      '<div class="hero-value">' + C.fmtDiff(avail) + '</div>' +
      '<p class="hero-sub">' + sub + '</p>' +
      '<div class="hero-actions">' +
      '<button class="btn btn-primary btn-lg" type="button" data-open-day="' + t + '">Registrar jornada</button>' +
      '<button class="btn btn-light btn-lg" type="button" id="heroRec">Registrar recuperación</button>' +
      '</div></section>';

    // Registro rápido de hoy
    if (!C.isWeekend(t) || state.days[t]) html += quickTodayCard(t);

    // Cifras clave
    html += '<section class="stats">' +
      stat('Minutos extra esta semana', ws.extra ? '+' + C.fmtDur(ws.extra) : '0 min', ws.extra ? 'pos' : '') +
      stat('Minutos que faltan esta semana', ws.missing ? '−' + C.fmtDur(ws.missing) : '0 min', ws.missing ? 'neg' : '') +
      stat('Saldo de semanas anteriores', C.fmtDiff(ws.previous), cls(ws.previous)) +
      stat('Saldo total disponible', C.fmtDiff(avail), cls(avail)) +
      stat('Minutos ya recuperados', C.fmtDur(totalRec), '') +
      '</section>';

    // Resumen semanal
    var modality = ws.mixed ? 'Cambia durante esta semana' : C.modalityLabel(ws.dailyTarget);
    html += '<section class="card">' +
      '<div class="card-head"><h2>Resumen de la semana</h2><span class="muted">' + C.fmtDayMonth(ws.monday) + ' – ' + C.fmtDayMonth(C.addDays(ws.monday, 4)) + '</span></div>' +
      '<dl class="summary">' +
      row('Jornada seleccionada', modality) +
      row('Horas previstas', C.fmtDur(ws.expectedTotal)) +
      row('Horas trabajadas', C.fmtDur(ws.worked) + ' <span class="muted">(' + ws.daysCounted + (ws.daysCounted === 1 ? ' día registrado' : ' días registrados') + ')</span>') +
      row('Diferencia de esta semana', '<span class="' + cls(ws.diff) + '">' + C.fmtDiff(ws.diff) + '</span>') +
      row('Saldo anterior acumulado', '<span class="' + cls(ws.previous) + '">' + C.fmtDiff(ws.previous) + '</span>') +
      (recFromMonday ? row('Recuperado desde el lunes', '<span class="neg">−' + C.fmtDur(recFromMonday) + '</span>') : '') +
      (adjust ? row('Saldo inicial / ajuste', '<span class="' + cls(adjust) + '">' + C.fmtDiff(adjust) + '</span>') : '') +
      row('Saldo total disponible', '<b class="' + cls(avail) + '">' + C.fmtDiff(avail) + '</b>') +
      '</dl>' +
      '<div class="recover-box recover-' + cls(avail) + '">' +
      '<div class="recover-q">¿Cuánto tiempo puedo recuperar?</div>' +
      '<div class="recover-a">' + (avail > 0 ? cap(C.fmtLong(avail)) + '.' : avail < 0 ? 'Nada por ahora. Saldo negativo de ' + C.fmtLong(avail) + '.' : 'Nada por ahora (saldo 0).') + '</div>' +
      '</div>' +
      (ws.remaining ? '<p class="muted small">Te quedan ' + C.fmtDur(ws.remaining) + ' de jornada por registrar esta semana.</p>' : '') +
      '<p class="muted small">El tiempo disponible es orientativo y no implica autorización automática para salir antes del trabajo.</p>' +
      '</section>';

    html += weekStrip(ws, t);
    html += backupReminder();

    el.innerHTML = html;
    $('#heroRec').addEventListener('click', function () { recoveryModal(null); });
    $all('[data-open-day]', el).forEach(function (b) { b.addEventListener('click', function () { openDayInCalendar(b.getAttribute('data-open-day')); }); });
  }
  // Las jornadas reales solo se registran desde el calendario.
  function openDayInCalendar(d) {
    ui.calMonth = d.slice(0, 7);
    ui.openDay = d;
    goto('calendario');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function stat(label, value, c) {
    return '<div class="stat"><div class="stat-label">' + label + '</div><div class="stat-value ' + (c || '') + '">' + value + '</div></div>';
  }
  function row(k, v) { return '<div class="srow"><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }

  // Tarjeta "Hoy": solo muestra lo guardado. Para registrar, abre la ventana del calendario.
  function quickTodayCard(t) {
    var inf = C.dayInfo(state, t, t);
    var txt;
    if (inf.status === 'work') txt = 'Entrada ' + esc(inf.record.in) + ' · Salida ' + esc(inf.record.out) + ' · Trabajado <b>' + C.fmtDur(inf.worked) + '</b> · Diferencia <b class="' + cls(inf.diff) + '">' + C.fmtDiff(inf.diff) + '</b>';
    else if (inf.status === 'nonwork') txt = 'Marcado como <b>' + C.TYPES[inf.record.type] + '</b> (no computa).';
    else if (inf.status === 'invalid') txt = 'Entrada ' + esc(inf.record.in || '—') + ' guardada. Falta la hora de salida.';
    else txt = 'Aún no has registrado la jornada de hoy. Jornada prevista: ' + C.fmtDur(inf.expected) + '.';
    return '<section class="card quick">' +
      '<div class="card-head"><h2>Hoy</h2><span class="muted">' + cap(C.fmtDateLong(t)) + '</span></div>' +
      '<p class="quick-res">' + txt + '</p>' +
      '<button class="btn btn-ghost" type="button" data-open-day="' + t + '">' + (inf.record ? 'Ver o modificar en el calendario' : 'Registrar en el calendario') + '</button>' +
      '</section>';
  }
  function cloneWithDay(date, rec) {
    var days = {};
    Object.keys(state.days).forEach(function (k) { days[k] = state.days[k]; });
    if (rec) days[date] = rec; else delete days[date];
    return { schedules: state.schedules, initial: state.initial, recoveries: state.recoveries, days: days };
  }

  function weekStrip(ws, t) {
    var html = '<section class="card"><div class="card-head"><h2>Esta semana</h2><a class="link" href="#calendario">Ver calendario</a></div><div class="strip">';
    for (var i = 0; i < 5; i++) {
      var inf = ws.days[i];
      var c = 'st-empty', val = '—';
      if (inf.status === 'work') { c = 'st-' + cls(inf.diff); val = C.fmtDiff(inf.diff); }
      else if (inf.status === 'nonwork') { c = 'st-nonwork'; val = C.TYPES[inf.record.type]; }
      else if (inf.status === 'future') { c = 'st-future'; val = 'Futuro'; }
      else if (inf.status === 'invalid') { c = 'st-empty'; val = 'Sin salida'; }
      html += '<button type="button" class="chip ' + c + (inf.date === t ? ' is-today' : '') + '" data-open-day="' + inf.date + '">' +
        '<span class="chip-day">' + C.DAY_NAMES[i].slice(0, 3) + ' ' + C.parseDate(inf.date).getDate() + '</span>' +
        '<span class="chip-val">' + val + '</span></button>';
    }
    return html + '</div></section>';
  }

  function backupReminder() {
    var n = Object.keys(state.days).length + state.recoveries.length;
    if (!n) return '';
    var days = state.lastBackup ? Math.floor((Date.now() - state.lastBackup) / 86400000) : null;
    if (days !== null && days < 14) return '';
    return '<section class="card notice"><b>Consejo:</b> ' + (days === null ? 'aún no has descargado ninguna copia de seguridad.' : 'tu última copia de seguridad es de hace ' + days + ' días.') +
      ' <a class="link" href="#copias">Hacer copia ahora</a></section>';
  }

  /* =====================================================================
     2. CALCULADORA SEMANAL (herramienta temporal)
     ---------------------------------------------------------------------
     IMPORTANTE: esta sección NO lee ni escribe "state.days" ni las
     recuperaciones. Sus datos viven solo en "calc" (memoria de la
     pantalla) y no se guardan nunca: no van al calendario, al historial
     ni al saldo. Se borran con «Limpiar campos» o al cerrar la app.
     ===================================================================== */
  var calc = null;
  function calcReset(keepMode) {
    var mode = keepMode && calc ? calc.mode : null;
    if (!mode) {
      var cur = C.dailyTargetFor(state, today());
      mode = cur === 450 ? 450 : cur === 420 ? 420 : cur;
    }
    calc = { mode: mode, rows: [0, 1, 2, 3, 4].map(function () { return { in: '', out: '' }; }) };
  }

  function calcRowResult(r, target) {
    var a = C.timeToMin(r.in), b = C.timeToMin(r.out);
    if (a === null && b === null) return { state: 'empty' };
    if (a === null || b === null) return { state: 'partial' };
    if (b <= a) return { state: 'invalid' };
    return { state: 'ok', worked: b - a, diff: b - a - target };
  }

  function calcTotals() {
    var target = calc.mode, t = { worked: 0, diff: 0, filled: 0, extra: 0, missing: 0 };
    calc.rows.forEach(function (r) {
      var x = calcRowResult(r, target);
      if (x.state !== 'ok') return;
      t.worked += x.worked; t.diff += x.diff; t.filled++;
      if (x.diff > 0) t.extra += x.diff; else t.missing -= x.diff;
    });
    t.weekTarget = target * 5;
    t.expectedFilled = target * t.filled;
    t.vsWeek = t.worked - t.weekTarget;
    return t;
  }

  function renderCalculadora(el) {
    if (!calc) calcReset();
    var cur = C.dailyTargetFor(state, today());
    var modes = [{ v: 420, l: '35 h semanales', s: '7 h al día' }, { v: 450, l: '37,5 h semanales', s: '7 h 30 min al día' }];
    if (cur !== 420 && cur !== 450) modes.push({ v: cur, l: 'Mi jornada', s: C.fmtDur(cur) + ' al día' });

    var html = '<section class="card notice calc-note">' +
      '<b>Herramienta de cálculo.</b> Lo que escribas aquí <b>no se guarda</b> y no afecta al calendario, al historial ni a tu saldo real. ' +
      'Para registrar una jornada real, usa el <a class="link" href="#calendario">Calendario</a>.</section>';

    html += '<section class="card"><div class="card-head"><h2>Jornada para el cálculo</h2></div>' +
      '<div class="seg" role="radiogroup">' + modes.map(function (m) {
        return '<button type="button" role="radio" class="seg-btn' + (calc.mode === m.v ? ' active' : '') + '" aria-checked="' + (calc.mode === m.v) + '" data-mode="' + m.v + '"><b>' + m.l + '</b><small>' + m.s + '</small></button>';
      }).join('') + '</div></section>';

    html += '<section class="card wtable-card"><div class="wtable calc-table" role="table">' +
      '<div class="wrow whead" role="row"><div>Día</div><div>Entrada</div><div>Salida</div><div>Trabajado</div><div>Prevista</div><div>Diferencia</div></div>';
    calc.rows.forEach(function (r, i) {
      html += '<div class="wrow" role="row" data-i="' + i + '">' +
        '<div class="c-day"><b>' + C.DAY_NAMES[i] + '</b></div>' +
        '<div class="c-in"><label><span class="m-lbl">Entrada</span><input type="time" class="k-in" value="' + esc(r.in) + '"></label></div>' +
        '<div class="c-out"><label><span class="m-lbl">Salida</span><input type="time" class="k-out" value="' + esc(r.out) + '"></label></div>' +
        '<div class="c-worked" data-l="Trabajado"></div>' +
        '<div class="c-exp" data-l="Prevista"></div>' +
        '<div class="c-diff" data-l="Diferencia"></div>' +
        '<div class="c-msg"></div></div>';
    });
    html += '<div class="wrow wfoot" role="row"><div>Total</div><div></div><div></div>' +
      '<div data-l="Trabajado" id="kW"></div><div data-l="Prevista" id="kE"></div><div data-l="Diferencia" id="kD"></div></div>' +
      '</div></section>';

    html += '<section class="card"><div class="card-head"><h2>Resultado de la calculadora</h2><span class="badge">No se guarda</span></div>' +
      '<div id="kResult"></div>' +
      '<div class="btn-row"><button class="btn btn-ghost" type="button" id="kClear">Limpiar campos</button></div>' +
      '<p class="muted small">Este resultado es independiente de tu saldo real acumulado.</p></section>';

    el.innerHTML = html;

    $all('[data-mode]', el).forEach(function (b) {
      b.addEventListener('click', function () { calc.mode = +b.getAttribute('data-mode'); render(); });
    });
    $all('.wrow[data-i]', el).forEach(function (row) {
      var i = +row.getAttribute('data-i');
      ['.k-in', '.k-out'].forEach(function (s) {
        var f = $(s, row);
        function onChange() {
          calc.rows[i][s === '.k-in' ? 'in' : 'out'] = f.value;
          updateCalc(el);
        }
        f.addEventListener('input', onChange); f.addEventListener('change', onChange);
      });
    });
    $('#kClear').addEventListener('click', function () { calcReset(true); render(); toast('Campos limpiados'); });
    updateCalc(el);
  }

  function updateCalc(el) {
    var target = calc.mode;
    $all('.wrow[data-i]', el).forEach(function (row) {
      var i = +row.getAttribute('data-i');
      var x = calcRowResult(calc.rows[i], target);
      $('.c-exp', row).textContent = C.fmtDur(target);
      var w = $('.c-worked', row), d = $('.c-diff', row), m = $('.c-msg', row);
      m.innerHTML = '';
      if (x.state === 'ok') {
        w.textContent = C.fmtDur(x.worked);
        d.innerHTML = '<span class="pill pill-' + cls(x.diff) + '">' + C.fmtDiff(x.diff) + '</span>';
      } else {
        w.innerHTML = '<span class="muted">—</span>';
        d.innerHTML = '<span class="muted">—</span>';
        if (x.state === 'invalid') m.innerHTML = '<span class="neg">La salida debe ser posterior a la entrada.</span>';
      }
    });
    var t = calcTotals();
    $('#kW').textContent = C.fmtDur(t.worked);
    $('#kE').textContent = C.fmtDur(t.expectedFilled);
    $('#kD').innerHTML = '<b class="' + cls(t.diff) + '">' + C.fmtDiff(t.diff) + '</b>';

    var main;
    if (!t.filled) main = '<p class="muted">Introduce la entrada y la salida de algún día para ver el resultado.</p>';
    else {
      var verdict = t.diff > 0 ? 'Te sobran ' + C.fmtLong(t.diff) : t.diff < 0 ? 'Te faltan ' + C.fmtLong(t.diff) : 'Jornada exacta: ni te sobra ni te falta';
      main = '<div class="recover-box recover-' + cls(t.diff) + '"><div class="recover-q">Resultado de los días introducidos</div>' +
        '<div class="recover-a">' + C.fmtDiff(t.diff) + '</div><div>' + verdict + '.</div></div>' +
        '<dl class="summary">' +
        row('Días calculados', t.filled + ' de 5') +
        row('Minutos de más', t.extra ? '<span class="pos">+' + C.fmtDur(t.extra) + '</span>' : '0 min') +
        row('Minutos de menos', t.missing ? '<span class="neg">−' + C.fmtDur(t.missing) + '</span>' : '0 min') +
        row('Horas trabajadas', C.fmtDur(t.worked)) +
        row('Jornada semanal completa', C.fmtDur(t.weekTarget)) +
        (t.filled < 5 ? row('Para completar la semana', t.vsWeek < 0 ? 'te faltan ' + C.fmtDur(t.vsWeek) : 'ya la superas en ' + C.fmtDur(t.vsWeek)) :
          row('Respecto a la semana completa', '<span class="' + cls(t.vsWeek) + '">' + C.fmtDiff(t.vsWeek) + '</span>')) +
        '</dl>';
    }
    $('#kResult').innerHTML = main;
  }

  /* =====================================================================
     3. CALENDARIO
     ===================================================================== */
  function renderCalendario(el) {
    var t = today();
    var parts = ui.calMonth.split('-');
    var y = +parts[0], m = +parts[1];
    var first = ui.calMonth + '-01';
    var lastDay = new Date(y, m, 0).getDate();
    var last = ui.calMonth + '-' + C.pad(lastDay);
    var startYear = Math.min(+C.earliestDate(state, t).slice(0, 4), y);
    var endYear = Math.max(+t.slice(0, 4) + 1, y);

    var yearOpts = '';
    for (var yy = startYear; yy <= endYear; yy++) yearOpts += '<option' + (yy === y ? ' selected' : '') + '>' + yy + '</option>';
    var monthOpts = C.MONTHS.map(function (n, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === m ? ' selected' : '') + '>' + cap(n) + '</option>'; }).join('');

    var html = '<section class="card">' +
      '<div class="period-nav">' +
      '<button class="icon-btn" type="button" id="cPrev" aria-label="Mes anterior">' + icon('prev') + '</button>' +
      '<div class="period-title selects"><select id="cMonth" aria-label="Mes">' + monthOpts + '</select><select id="cYear" aria-label="Año">' + yearOpts + '</select></div>' +
      '<button class="icon-btn" type="button" id="cNext" aria-label="Mes siguiente">' + icon('next') + '</button>' +
      '</div>' +
      (t.slice(0, 7) !== ui.calMonth ? '<div class="center"><button class="btn btn-ghost btn-sm" type="button" id="cToday">Ir a hoy</button></div>' : '') +
      '<div class="cal">' + C.DAY_SHORT.map(function (s, i) { return '<div class="cal-h' + (i >= 5 ? ' we' : '') + '">' + s + '</div>'; }).join('');

    var start = C.mondayOf(first);
    var end = C.addDays(C.mondayOf(last), 6);
    for (var d = start; d <= end; d = C.addDays(d, 1)) html += calCell(d, t, d.slice(0, 7) === ui.calMonth);
    html += '</div>' +
      '<p class="muted small cal-hint">Pulsa un día para registrar o modificar tu jornada real. Solo lo que guardes aquí cuenta para el saldo.</p>' +
      '<div class="legend"><span><i class="lg pos"></i>Más tiempo</span><span><i class="lg zero"></i>Jornada exacta</span><span><i class="lg neg"></i>Menos tiempo</span><span><i class="lg nonwork"></i>Festivo / vacaciones / permiso</span><span><i class="lg future"></i>Futuro (no computa)</span></div>' +
      '</section>';

    // Resumen del mes
    var ms = C.rangeSummary(state, first, last, t);
    var monthEnd = last < t ? last : t;
    html += '<section class="stats">' +
      stat('Trabajado en ' + C.MONTHS[m - 1], C.fmtDur(ms.worked), '') +
      stat('Diferencia del mes', C.fmtDiff(ms.diff), cls(ms.diff)) +
      stat('Recuperado en el mes', ms.recovered ? '−' + C.fmtDur(ms.recovered) : '0 min', '') +
      stat(last < t ? 'Saldo a fin de mes' : 'Saldo a día de hoy', C.fmtDiff(C.balanceAt(state, first > t ? t : monthEnd, t)), cls(C.balanceAt(state, first > t ? t : monthEnd, t))) +
      '</section>';

    // Lista del mes (útil en móvil)
    var list = ms.days.filter(function (i) { return i.record || i.recovered; });
    html += '<section class="card"><div class="card-head"><h2>Registros del mes</h2><span class="muted">' + list.length + '</span></div>';
    if (!list.length) html += '<p class="muted">No hay registros en este mes. Pulsa un día para añadirlo.</p>';
    else html += '<div class="list">' + list.map(function (i) { return dayListItem(i); }).join('') + '</div>';
    html += '</section>';

    el.innerHTML = html;
    function setMonth(yv, mv) {
      if (mv < 1) { mv = 12; yv--; } if (mv > 12) { mv = 1; yv++; }
      ui.calMonth = yv + '-' + C.pad(mv); render();
    }
    $('#cPrev').addEventListener('click', function () { setMonth(y, m - 1); });
    $('#cNext').addEventListener('click', function () { setMonth(y, m + 1); });
    $('#cMonth').addEventListener('change', function () { setMonth(y, +this.value); });
    $('#cYear').addEventListener('change', function () { setMonth(+this.value, m); });
    if ($('#cToday')) $('#cToday').addEventListener('click', function () { ui.calMonth = t.slice(0, 7); render(); });
    $all('[data-day]', el).forEach(function (b) { b.addEventListener('click', function () { dayModal(b.getAttribute('data-day')); }); });
    if (ui.openDay) { var od = ui.openDay; ui.openDay = null; dayModal(od); }
  }

  function calCell(d, t, inMonth) {
    var inf = C.dayInfo(state, d, t);
    var c = 'st-empty', inner = '';
    if (inf.status === 'work' || inf.status === 'future') {
      c = inf.status === 'future' ? 'st-future' : 'st-' + cls(inf.diff);
      inner = '<span class="c-times">' + esc(inf.record.in) + '–' + esc(inf.record.out) + '</span>' +
        '<span class="c-worked">' + C.fmtDur(inf.worked) + '</span>' +
        '<span class="c-diff full">' + C.fmtDiff(inf.diff) + '</span>' +
        '<span class="c-diff short">' + compact(inf.diff) + '</span>';
    } else if (inf.status === 'nonwork') {
      c = 'st-nonwork';
      inner = '<span class="c-tag full">' + C.TYPES[inf.record.type] + '</span><span class="c-tag short">' + C.TYPES[inf.record.type].slice(0, 3) + '</span>';
    } else if (inf.status === 'invalid') {
      inner = '<span class="c-tag">Sin salida</span>';
    }
    if (inf.recovered) inner += '<span class="c-rec">↺ ' + C.fmtDur(inf.recovered) + '</span>';
    var label = C.fmtDateLong(d);
    return '<button type="button" class="cday ' + c + (inMonth ? '' : ' out') + (d === t ? ' is-today' : '') + (C.isWeekend(d) ? ' we' : '') + '" data-day="' + d + '" aria-label="' + esc(label) + '">' +
      '<span class="dnum">' + C.parseDate(d).getDate() + '</span>' + inner + '</button>';
  }

  function dayListItem(inf) {
    var d = inf.date;
    var right = '', mid = '';
    if (inf.status === 'work' || inf.status === 'future') {
      mid = esc(inf.record.in) + ' – ' + esc(inf.record.out) + ' · ' + C.fmtDur(inf.worked);
      right = '<span class="pill pill-' + (inf.future ? 'future' : cls(inf.diff)) + '">' + C.fmtDiff(inf.diff) + '</span>';
    } else if (inf.status === 'nonwork') {
      mid = C.TYPES[inf.record.type];
      right = '<span class="pill pill-nonwork">No computa</span>';
    } else if (inf.status === 'invalid') {
      mid = 'Entrada ' + esc(inf.record.in || '—') + ' · falta la salida';
    } else mid = 'Sin jornada registrada';
    if (inf.recovered) mid += ' · ↺ recuperados ' + C.fmtDur(inf.recovered);
    if (inf.record && inf.record.note) mid += ' · ' + esc(inf.record.note);
    return '<button type="button" class="litem" data-day="' + d + '"><span class="l-main"><b>' + cap(C.DAY_NAMES[C.weekdayIndex(d)]) + ' ' + C.fmtDayMonth(d) + '</b><span class="muted">' + mid + '</span></span>' + right + '</button>';
  }

  /* ---------- Registrar / modificar una jornada (solo desde el calendario) ----------
     Nada se guarda hasta pulsar «Guardar jornada». «Cancelar» cierra sin guardar. */
  function dayModal(d) {
    var t = today();
    var saved = state.days[d] || null;
    var rec = saved || { type: 'trabajo', in: '', out: '' };
    var body =
      '<label class="field"><span>Fecha</span><input type="date" id="mDate" value="' + d + '"></label>' +
      '<div class="two" id="mTimes">' +
      '<label class="field"><span>Hora de entrada</span><input type="time" id="mIn" value="' + esc(rec.in || '') + '"></label>' +
      '<label class="field"><span>Hora de salida</span><input type="time" id="mOut" value="' + esc(rec.out || '') + '"></label>' +
      '</div>' +
      '<label class="field"><span>Observaciones (opcional)</span><input type="text" id="mNote" maxlength="200" value="' + esc(rec.note || '') + '"></label>' +
      '<details class="more-opts"' + (rec.type !== 'trabajo' ? ' open' : '') + '><summary>¿Festivo, vacaciones, permiso o ausencia?</summary>' +
      '<label class="field"><span>Tipo de día</span><select id="mType">' + typeOptions(rec.type) + '</select></label>' +
      '<p class="muted small">Los días que no son de trabajo no suman ni restan minutos.</p></details>' +
      '<div class="preview" id="mPrev"></div>' +
      '<p class="err" id="mErr"></p>' +
      (saved ? '<button type="button" class="link link-danger" id="mDel">Borrar esta jornada</button>' : '');

    function read() {
      var r = { type: $('#mType').value };
      if (C.isWorkType(r.type)) { r.in = $('#mIn').value; r.out = $('#mOut').value; }
      var note = $('#mNote').value.trim();
      if (note) r.note = note;
      return r;
    }
    function preview() {
      var date = $('#mDate').value;
      var r = read();
      var work = C.isWorkType(r.type);
      $('#mTimes').style.display = work ? '' : 'none';
      $('#mErr').textContent = '';
      if (!C.isValidDate(date)) { $('#mPrev').innerHTML = 'Indica una fecha.'; return; }
      var inf = C.dayInfo(cloneWithDay(date, r), date, t);
      var html = '<b>' + cap(C.fmtDateLong(date)) + '</b><br>';
      if (!work) html += 'Este día <b>no computa</b>: no suma ni resta minutos.';
      else if (inf.status === 'work' || inf.status === 'future') html += 'Trabajado: <b>' + C.fmtDur(inf.worked) + '</b> · Prevista: ' + C.fmtDur(inf.expected) + ' · Diferencia: <b class="' + cls(inf.diff) + '">' + C.fmtDiff(inf.diff) + '</b>';
      else html += 'Jornada prevista: ' + C.fmtDur(inf.expected);
      if (date > t) html += '<br><small>Fecha futura: no contará en el saldo hasta ese día.</small>';
      if (inf.recovered) html += '<br><small>Este día tiene ' + C.fmtDur(inf.recovered) + ' registrados como recuperación' + (inf.justified ? ': no se restan otra vez al salir antes.' : '.') + '</small>';
      if (date !== d && state.days[date]) html += '<br><span class="warn">Ese día ya tiene una jornada guardada: se sustituirá.</span>';
      $('#mPrev').innerHTML = html;
    }
    function save() {
      var date = $('#mDate').value;
      if (!C.isValidDate(date)) { $('#mErr').textContent = 'Indica una fecha válida.'; return false; }
      var r = read();
      if (!(C.isWorkType(r.type) && r.in && !r.out)) {
        var err = C.validateDay(r);
        if (err) { $('#mErr').textContent = err; return false; }
      }
      if (saved && date !== d) delete state.days[d];   // se ha cambiado la fecha: se mueve el registro
      state.days[date] = r;
      ui.calMonth = date.slice(0, 7);
      commit(C.isWorkType(r.type) && !r.out ? 'Entrada guardada. Falta la salida.' : 'Jornada guardada');
    }

    openModal({
      title: saved ? 'Modificar jornada' : 'Registrar jornada',
      body: body,
      buttons: [
        { label: 'Cancelar' },
        { label: 'Guardar jornada', cls: 'btn-primary', onClick: save }
      ],
      onOpen: function (b) {
        ['#mDate', '#mType', '#mIn', '#mOut'].forEach(function (s) { $(s, b).addEventListener('input', preview); $(s, b).addEventListener('change', preview); });
        if ($('#mDel', b)) $('#mDel', b).addEventListener('click', function () {
          closeModal();
          confirmBox('Borrar jornada', '¿Borrar la jornada del ' + C.fmtDateLong(d) + '? El saldo se recalculará.', 'Borrar', function () {
            delete state.days[d]; commit('Jornada borrada');
          }, true);
        });
        preview();
      }
    });
  }

  /* =====================================================================
     4. RECUPERACIONES
     ===================================================================== */
  function renderRecuperaciones(el) {
    var t = today();
    var avail = C.availableNow(state, t);
    var total = C.totalRecovered(state);
    var list = state.recoveries.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0); });

    var html = '<section class="card hero hero-' + cls(avail) + ' hero-compact">' +
      '<div class="hero-label">Saldo disponible</div>' +
      '<div class="hero-value">' + C.fmtDiff(avail) + '</div>' +
      '<p class="hero-sub">' + (avail > 0 ? 'Puedes recuperar hasta ' + C.fmtLong(avail) + '.' : avail < 0 ? 'Saldo negativo: no tienes minutos para recuperar.' : 'Sin minutos disponibles.') + '</p>' +
      '<div class="hero-actions"><button class="btn btn-primary btn-lg" type="button" id="recNew">Registrar recuperación</button></div>' +
      '</section>';

    html += '<section class="card"><div class="card-head"><h2>Historial de recuperaciones</h2><span class="muted">Total: ' + C.fmtDur(total) + '</span></div>';
    if (!list.length) html += '<p class="muted">Todavía no has registrado ninguna recuperación.</p>';
    else {
      html += '<div class="rtable"><div class="rrow rhead"><div>Fecha</div><div>Minutos</div><div>Observaciones</div><div></div></div>';
      html += list.map(function (r) {
        return '<div class="rrow">' +
          '<div><b>' + C.fmtDateShort(r.date) + '</b>' + (r.date > t ? ' <span class="badge">Prevista</span>' : '') + '</div>' +
          '<div class="neg"><b>−' + r.minutes + ' min</b>' + (r.minutes >= 60 ? ' <span class="muted">(' + C.fmtDur(r.minutes) + ')</span>' : '') + '</div>' +
          '<div class="muted">' + (esc(r.note) || '—') + '</div>' +
          '<div class="r-act"><button class="icon-btn" type="button" data-edit="' + r.id + '" aria-label="Modificar">' + icon('edit') + '</button>' +
          '<button class="icon-btn" type="button" data-del="' + r.id + '" aria-label="Borrar">' + icon('trash') + '</button></div>' +
          '</div>';
      }).join('');
      html += '</div>';
    }
    html += '<p class="muted small">Las recuperaciones se guardan aparte de las jornadas. Si ese día registras también tu jornada (saliendo antes), esos minutos no se restan dos veces.</p></section>';

    el.innerHTML = html;
    $('#recNew').addEventListener('click', function () { recoveryModal(null); });
    $all('[data-edit]', el).forEach(function (b) { b.addEventListener('click', function () { recoveryModal(b.getAttribute('data-edit')); }); });
    $all('[data-del]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var r = findRec(b.getAttribute('data-del'));
        confirmBox('Borrar recuperación', '¿Borrar la recuperación de ' + r.minutes + ' min del ' + C.fmtDateShort(r.date) + '? Esos minutos volverán a tu saldo.', 'Borrar', function () {
          state.recoveries = state.recoveries.filter(function (x) { return x.id !== r.id; });
          commit('Recuperación borrada');
        }, true);
      });
    });
  }
  function findRec(id) { return state.recoveries.filter(function (r) { return r.id === id; })[0]; }

  function recoveryModal(id) {
    var t = today();
    var editing = id ? findRec(id) : null;
    var others = { schedules: state.schedules, initial: state.initial, days: state.days,
      recoveries: state.recoveries.filter(function (r) { return !editing || r.id !== editing.id; }) };
    var base = C.availableNow(others, t);
    var chips = [15, 30, 45, 60, 90, 120].map(function (v) { return '<button type="button" class="chipbtn" data-min="' + v + '">' + (v < 60 ? v + ' min' : C.fmtDur(v)) + '</button>'; }).join('');
    var body =
      '<label class="field"><span>Fecha</span><input type="date" id="rDate" value="' + (editing ? editing.date : t) + '"></label>' +
      '<label class="field"><span>Minutos recuperados</span><input type="number" id="rMin" inputmode="numeric" min="1" max="1440" step="1" value="' + (editing ? editing.minutes : '') + '" placeholder="Ej.: 30"></label>' +
      '<div class="chips">' + chips + '</div>' +
      '<label class="field"><span>Observaciones (opcional)</span><input type="text" id="rNote" maxlength="200" value="' + esc(editing ? editing.note : '') + '" placeholder="Ej.: salgo antes por médico"></label>' +
      '<div class="preview" id="rPrev"></div><p class="err" id="rErr"></p>';
    var saving = false;
    openModal({
      title: editing ? 'Modificar recuperación' : 'Registrar recuperación',
      body: body,
      buttons: [
        { label: 'Cancelar' },
        { label: editing ? 'Guardar cambios' : 'Registrar', cls: 'btn-primary', onClick: function () {
          if (saving) return false;
          var date = $('#rDate').value, min = Math.round(+$('#rMin').value), note = $('#rNote').value.trim();
          if (!C.isValidDate(date)) { $('#rErr').textContent = 'Indica una fecha válida.'; return false; }
          if (!(min >= 1 && min <= 1440)) { $('#rErr').textContent = 'Indica los minutos (entre 1 y 1440).'; return false; }
          saving = true;
          if (editing) { editing.date = date; editing.minutes = min; editing.note = note; }
          else state.recoveries.push({ id: S.newId(), date: date, minutes: min, note: note, createdAt: Date.now() });
          commit(editing ? 'Recuperación modificada' : 'Recuperación registrada: −' + C.fmtDur(min));
        } }
      ],
      onOpen: function (b) {
        function preview() {
          var min = Math.round(+$('#rMin', b).value) || 0;
          var after = base - min;
          $('#rPrev', b).innerHTML = 'Saldo disponible: <b class="' + cls(base) + '">' + C.fmtDiff(base) + '</b>' +
            (min ? ' → Nuevo saldo: <b class="' + cls(after) + '">' + C.fmtDiff(after) + '</b>' : '') +
            (min && after < 0 ? '<br><span class="warn">Atención: el saldo quedará en negativo.</span>' : '') +
            (min ? '<br><small class="muted">= ' + C.fmtDur(min) + '</small>' : '');
        }
        $('#rMin', b).addEventListener('input', preview);
        $all('[data-min]', b).forEach(function (c) { c.addEventListener('click', function () { $('#rMin', b).value = c.getAttribute('data-min'); preview(); }); });
        preview();
      }
    });
  }

  /* =====================================================================
     5. HISTORIAL
     ===================================================================== */
  function renderHistorial(el) {
    var t = today();
    var earliest = C.earliestDate(state, t);
    var firstYear = +earliest.slice(0, 4), curYear = +t.slice(0, 4);
    if (ui.histYear > curYear) ui.histYear = curYear;
    if (ui.histYear < firstYear) ui.histYear = firstYear;
    var Y = ui.histYear;

    // Saldo en una fecha
    var hd = ui.histDate;
    var bal = C.balanceAt(state, hd, t);
    var html = '<section class="card"><div class="card-head"><h2>Saldo en una fecha</h2></div>' +
      '<div class="inline-form"><label class="field"><span>Fecha</span><input type="date" id="hDate" value="' + hd + '"></label>' +
      '<div class="result"><span class="muted">Saldo al final del día</span><b class="big ' + cls(bal) + '">' + C.fmtDiff(bal) + '</b></div></div>' +
      (hd > t ? '<p class="muted small">Es una fecha futura: solo incluye lo registrado hasta hoy y las recuperaciones previstas hasta esa fecha.</p>' : '') +
      '</section>';

    var yearOpts = '';
    for (var yy = curYear; yy >= firstYear; yy--) yearOpts += '<option' + (yy === Y ? ' selected' : '') + '>' + yy + '</option>';

    // Resumen mensual
    html += '<section class="card"><div class="card-head"><h2>Meses</h2><select id="hYear" aria-label="Año">' + yearOpts + '</select></div>' +
      '<div class="htable"><div class="hrow hhead"><div>Mes</div><div>Trabajado</div><div>Diferencia</div><div>Recuperado</div><div>Saldo a fin de mes</div></div>';
    var monthRows = [];
    for (var m = 1; m <= 12; m++) {
      var first = Y + '-' + C.pad(m) + '-01';
      if (first > t) break;
      var last = Y + '-' + C.pad(m) + '-' + C.pad(new Date(Y, m, 0).getDate());
      var ms = C.rangeSummary(state, first, last, t);
      var end = last < t ? last : t;
      var b = C.balanceAt(state, end, t);
      monthRows.unshift('<button type="button" class="hrow" data-month="' + Y + '-' + C.pad(m) + '">' +
        '<div><b>' + cap(C.MONTHS[m - 1]) + '</b></div>' +
        '<div data-l="Trabajado">' + (ms.daysCounted ? C.fmtDur(ms.worked) : '<span class="muted">—</span>') + '</div>' +
        '<div data-l="Diferencia" class="' + cls(ms.diff) + '">' + C.fmtDiff(ms.diff) + '</div>' +
        '<div data-l="Recuperado">' + (ms.recovered ? '−' + C.fmtDur(ms.recovered) : '—') + '</div>' +
        '<div data-l="Saldo" class="' + cls(b) + '"><b>' + C.fmtDiff(b) + '</b></div></button>');
    }
    html += monthRows.join('') + '</div></section>';

    // Semanas
    html += '<section class="card"><div class="card-head"><h2>Semanas de ' + Y + '</h2></div>' +
      '<div class="htable"><div class="hrow hhead"><div>Semana</div><div>Trabajado</div><div>Diferencia</div><div>Recuperado</div><div>Saldo al cierre</div></div>';
    var startMon = C.mondayOf(Y + '-01-01');
    if (startMon.slice(0, 4) < String(Y)) startMon = C.addDays(startMon, 7);
    var minMon = C.mondayOf(earliest);
    var weekRows = [];
    for (var mon = startMon; mon.slice(0, 4) === String(Y) && mon <= t; mon = C.addDays(mon, 7)) {
      if (mon < minMon) continue;
      var ws = C.weekSummary(state, mon, t);
      var empty = !ws.daysCounted && !ws.recovered;
      weekRows.unshift('<button type="button" class="hrow' + (empty ? ' is-empty' : '') + '" data-week="' + mon + '">' +
        '<div><b>' + C.fmtDayMonth(mon) + ' – ' + C.fmtDayMonth(C.addDays(mon, 4)) + '</b>' + (empty ? '<br><small class="muted">Sin registros</small>' : '') + '</div>' +
        '<div data-l="Trabajado">' + (ws.daysCounted ? C.fmtDur(ws.worked) : '—') + '</div>' +
        '<div data-l="Diferencia" class="' + cls(ws.diff) + '">' + C.fmtDiff(ws.diff) + '</div>' +
        '<div data-l="Recuperado">' + (ws.recovered ? '−' + C.fmtDur(ws.recovered) : '—') + '</div>' +
        '<div data-l="Saldo" class="' + cls(ws.closing) + '"><b>' + C.fmtDiff(ws.closing) + '</b></div></button>');
    }
    html += (weekRows.length ? weekRows.join('') : '<p class="muted pad">No hay semanas con datos en este año.</p>') + '</div>' +
      '<p class="muted small">Pulsa una semana o un mes para verlo en el calendario.</p></section>';

    el.innerHTML = html;
    $('#hDate').addEventListener('change', function () { if (C.isValidDate(this.value)) { ui.histDate = this.value; render(); } });
    $('#hYear').addEventListener('change', function () { ui.histYear = +this.value; render(); });
    $all('[data-week]', el).forEach(function (b) { b.addEventListener('click', function () { ui.calMonth = b.getAttribute('data-week').slice(0, 7); goto('calendario'); }); });
    $all('[data-month]', el).forEach(function (b) { b.addEventListener('click', function () { ui.calMonth = b.getAttribute('data-month'); goto('calendario'); }); });
  }

  /* =====================================================================
     6. CONFIGURACIÓN
     ===================================================================== */
  function renderConfiguracion(el) {
    var t = today();
    var cur = C.dailyTargetFor(state, t);
    var sched = C.sortedSchedules(state);
    var mode = cur === 420 ? '35' : cur === 450 ? '375' : 'custom';
    var ini = state.initial || { minutes: 0, date: null };
    var iniAbs = Math.abs(ini.minutes || 0);

    var html = '<section class="card"><div class="card-head"><h2>Jornada</h2></div>' +
      '<p>Jornada actual: <b>' + C.modalityLabel(cur) + '</b> (' + C.fmtDur(cur) + ' al día, de lunes a viernes).</p>' +
      '<div class="radios">' +
      radio('mode', '35', mode === '35', 'Jornada de 35 horas semanales', '7 horas diarias') +
      radio('mode', '375', mode === '375', 'Jornada de 37,5 horas semanales', '7 horas y 30 minutos diarios') +
      radio('mode', 'custom', mode === 'custom', 'Personalizada', 'Si cambian tus condiciones laborales') +
      '</div>' +
      '<div class="two" id="customBox"' + (mode === 'custom' ? '' : ' style="display:none"') + '>' +
      '<label class="field"><span>Horas al día</span><input type="number" id="cH" min="0" max="23" inputmode="numeric" value="' + Math.floor(cur / 60) + '"></label>' +
      '<label class="field"><span>Minutos al día</span><input type="number" id="cM" min="0" max="59" inputmode="numeric" value="' + (cur % 60) + '"></label>' +
      '</div>' +
      '<label class="field"><span>Aplicar desde</span><input type="date" id="cFrom" value="' + C.mondayOf(t) + '"></label>' +
      '<p class="muted small">Las fechas anteriores conservan la jornada que tenían. No se recalculan las semanas pasadas.</p>' +
      '<button class="btn btn-primary" type="button" id="cSave">Guardar jornada</button>' +
      '<h3>Historial de jornadas</h3><div class="list">' +
      sched.map(function (p, i) {
        return '<div class="litem static"><span class="l-main"><b>' + (i === 0 ? 'Desde el principio' : 'Desde el ' + C.fmtDateShort(p.from)) + '</b>' +
          '<span class="muted">' + C.fmtDur(p.minutes) + ' al día · ' + C.modalityLabel(p.minutes) + '</span></span>' +
          (sched.length > 1 ? '<button class="icon-btn" type="button" data-del-sched="' + p.from + '" aria-label="Eliminar">' + icon('trash') + '</button>' : '') + '</div>';
      }).join('') + '</div></section>';

    html += '<section class="card"><div class="card-head"><h2>Saldo inicial</h2></div>' +
      '<p class="muted">Si ya tenías minutos acumulados (a favor o en contra) antes de empezar a usar la app, indícalos aquí.</p>' +
      '<div class="three">' +
      '<label class="field"><span>Signo</span><select id="iSign"><option value="1"' + ((ini.minutes || 0) >= 0 ? ' selected' : '') + '>A favor (+)</option><option value="-1"' + (ini.minutes < 0 ? ' selected' : '') + '>En contra (−)</option></select></label>' +
      '<label class="field"><span>Horas</span><input type="number" id="iH" min="0" inputmode="numeric" value="' + Math.floor(iniAbs / 60) + '"></label>' +
      '<label class="field"><span>Minutos</span><input type="number" id="iM" min="0" max="59" inputmode="numeric" value="' + (iniAbs % 60) + '"></label>' +
      '</div>' +
      '<label class="field"><span>Fecha del saldo inicial</span><input type="date" id="iDate" value="' + (ini.date || t) + '"></label>' +
      '<button class="btn btn-primary" type="button" id="iSave">Guardar saldo inicial</button>' +
      '</section>';

    html += '<section class="card"><div class="card-head"><h2>Instalar la aplicación</h2></div>' +
      (ui.installPrompt ? '<button class="btn btn-primary" type="button" id="cfgInstall">Instalar en este dispositivo</button>' :
        '<p class="muted">Si el botón de instalar no aparece, usa el menú del navegador: en Chrome o Edge, «Instalar Control Horario» (icono ⊕ de la barra de direcciones); en el móvil, «Añadir a pantalla de inicio».</p>') +
      '</section>';

    html += '<section class="card danger-zone"><div class="card-head"><h2>Borrar todos los datos</h2></div>' +
      '<p class="muted">Elimina jornadas, recuperaciones y ajustes de este dispositivo. Descarga antes una copia de seguridad.</p>' +
      '<button class="btn btn-danger-ghost" type="button" id="wipe">Borrar todos los datos</button></section>';

    el.innerHTML = html;

    $all('input[name=mode]', el).forEach(function (r) {
      r.addEventListener('change', function () { $('#customBox').style.display = this.value === 'custom' ? '' : 'none'; });
    });
    $('#cSave').addEventListener('click', function () {
      var v = $('input[name=mode]:checked').value;
      var minutes = v === '35' ? 420 : v === '375' ? 450 : (+$('#cH').value || 0) * 60 + (+$('#cM').value || 0);
      var from = $('#cFrom').value;
      if (!(minutes > 0 && minutes < 1440)) return toast('Indica una jornada diaria válida.', 'error');
      if (!C.isValidDate(from)) return toast('Indica la fecha desde la que se aplica.', 'error');
      if (C.dailyTargetFor(state, from) === minutes && !state.schedules.some(function (p) { return p.from > from; })) {
        return toast('Esa ya es tu jornada desde esa fecha.');
      }
      var exist = state.schedules.filter(function (p) { return p.from === from; })[0];
      if (exist) exist.minutes = minutes; else state.schedules.push({ from: from, minutes: minutes });
      // Si la nueva fecha es anterior al primer periodo, el primero sigue cubriendo el pasado.
      state.configured = true;
      commit('Jornada guardada: ' + C.fmtDur(minutes) + ' al día desde el ' + C.fmtDateShort(from));
    });
    $all('[data-del-sched]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var from = b.getAttribute('data-del-sched');
        confirmBox('Eliminar jornada', 'Las fechas de este periodo pasarán a usar la jornada del periodo anterior (o del siguiente si es el primero). ¿Continuar?', 'Eliminar', function () {
          state.schedules = state.schedules.filter(function (p) { return p.from !== from; });
          commit('Periodo eliminado');
        }, true);
      });
    });
    $('#iSave').addEventListener('click', function () {
      var min = ((+$('#iH').value || 0) * 60 + (+$('#iM').value || 0)) * (+$('#iSign').value);
      var date = $('#iDate').value;
      if (!C.isValidDate(date)) return toast('Indica una fecha válida.', 'error');
      state.initial = { minutes: Math.round(min), date: date };
      commit('Saldo inicial guardado: ' + C.fmtDiff(min));
    });
    if ($('#cfgInstall')) $('#cfgInstall').addEventListener('click', doInstall);
    $('#wipe').addEventListener('click', function () {
      confirmBox('Borrar todos los datos', 'Se borrarán <b>todas</b> tus jornadas, recuperaciones y ajustes de este dispositivo. Esta acción no se puede deshacer salvo que tengas una copia de seguridad.', 'Sí, borrar todo', function () {
        S.saveUndo(state);
        state = S.defaultState();
        commit('Datos borrados');
        setTimeout(firstRun, 300);
      }, true);
    });
  }
  function radio(name, value, checked, title, sub) {
    return '<label class="radio"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span><b>' + title + '</b><small>' + sub + '</small></span></label>';
  }

  /* =====================================================================
     7. COPIAS DE SEGURIDAD
     ===================================================================== */
  function renderCopias(el) {
    var nDays = Object.keys(state.days).length, nRec = state.recoveries.length;
    var undo = S.getUndo();
    var html = '<section class="card"><div class="card-head"><h2>Estado de tus datos</h2></div>' +
      '<dl class="summary">' +
      row('Guardado automático', '<span class="pos">Activado</span>') +
      row('Días registrados', String(nDays)) +
      row('Recuperaciones', String(nRec)) +
      row('Almacenamiento persistente', '<span id="persist" class="muted">Comprobando…</span>') +
      row('Última copia descargada', state.lastBackup ? new Date(state.lastBackup).toLocaleString('es-ES') : '<span class="warn">Nunca</span>') +
      '</dl></section>';

    html += '<section class="card"><div class="card-head"><h2>Copia de seguridad</h2></div>' +
      '<p class="muted">Descarga un archivo con todos tus datos. Guárdalo en otra carpeta, en una memoria USB o en tu correo. Con él puedes restaurarlo todo en este u otro dispositivo.</p>' +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" type="button" id="bDown">Descargar copia de seguridad</button>' +
      '<label class="btn btn-ghost" for="bFile">Restaurar una copia…</label>' +
      '<input type="file" id="bFile" accept=".json,application/json" hidden>' +
      '</div></section>';

    html += '<section class="card"><div class="card-head"><h2>Exportar a Excel (CSV)</h2></div>' +
      '<p class="muted">Archivos que se abren directamente con Excel (separados por punto y coma).</p>' +
      '<div class="btn-row">' +
      '<button class="btn btn-ghost" type="button" id="csvDays">Exportar jornadas</button>' +
      '<button class="btn btn-ghost" type="button" id="csvRec">Exportar recuperaciones</button>' +
      '</div></section>';

    if (undo && undo.data) {
      html += '<section class="card notice"><b>¿Te has equivocado al restaurar o borrar?</b> Hay una copia de tus datos anteriores del ' + new Date(undo.savedAt).toLocaleString('es-ES') + '. ' +
        '<button class="link" type="button" id="bUndo">Volver a esos datos</button></section>';
    }

    html += '<section class="card"><details><summary><b>Dónde se guardan los datos y limitaciones</b></summary><div class="prose">' +
      '<p>Tus datos se guardan solo en <b>este navegador de este dispositivo</b> (en su base de datos interna, con una segunda copia de seguridad interna). No se envían a ningún servidor y no necesitas cuenta.</p>' +
      '<ul>' +
      '<li>Se conservan al cerrar y volver a abrir la aplicación, y al apagar el equipo.</li>' +
      '<li><b>Se pierden</b> si borras los datos de navegación / cookies de este sitio, si desinstalas el navegador o si el dispositivo se estropea.</li>' +
      '<li>El ordenador y el móvil <b>no se sincronizan</b> entre sí: cada uno tiene sus propios datos. Para pasar datos de uno a otro, descarga la copia en uno y restáurala en el otro.</li>' +
      '<li>En iPhone, Safari puede borrar los datos de sitios que no usas en varias semanas si la app no está añadida a la pantalla de inicio. Añádela para evitarlo.</li>' +
      '<li>Por eso es importante <b>descargar una copia de seguridad con regularidad</b> (por ejemplo, cada semana). La app te lo recordará.</li>' +
      '</ul></div></details></section>';

    el.innerHTML = html;
    S.isPersisted().then(function (p) {
      var s = $('#persist'); if (!s) return;
      s.className = p ? 'pos' : 'warn';
      s.textContent = p ? 'Concedido (el navegador no lo borrará por falta de espacio)' : 'No concedido aún (se solicita automáticamente; mantén copias)';
    });
    $('#bDown').addEventListener('click', downloadBackup);
    $('#bFile').addEventListener('change', function () { if (this.files[0]) importBackup(this.files[0]); this.value = ''; });
    $('#csvDays').addEventListener('click', exportDaysCsv);
    $('#csvRec').addEventListener('click', exportRecCsv);
    if ($('#bUndo')) $('#bUndo').addEventListener('click', function () {
      confirmBox('Recuperar datos anteriores', 'Se sustituirán los datos actuales por los guardados el ' + new Date(undo.savedAt).toLocaleString('es-ES') + '.', 'Recuperar', function () {
        var cur = state;
        state = S.normalize(undo.data);
        S.saveUndo(cur);
        commit('Datos recuperados');
      });
    });
  }

  function downloadFile(name, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function downloadBackup() {
    state.lastBackup = Date.now();
    var payload = { app: 'control-horario', format: 1, exportedAt: new Date().toISOString(), data: state };
    downloadFile('control-horario-copia-' + today() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    commit('Copia descargada. Guárdala en un lugar seguro.');
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw;
      try { raw = JSON.parse(reader.result); } catch (e) { return toast('El archivo no es una copia válida.', 'error'); }
      var data = raw && raw.app === 'control-horario' && raw.data ? raw.data : raw;
      if (!data || typeof data !== 'object' || (!data.days && !data.recoveries && !data.schedules)) {
        return toast('El archivo no es una copia de Control Horario.', 'error');
      }
      var incoming = S.normalize(data);
      incoming.configured = true;
      var nd = Object.keys(incoming.days).length, nr = incoming.recoveries.length;
      confirmBox('Restaurar copia',
        'La copia ' + (raw.exportedAt ? 'del <b>' + new Date(raw.exportedAt).toLocaleString('es-ES') + '</b> ' : '') + 'contiene <b>' + nd + '</b> días y <b>' + nr + '</b> recuperaciones.<br><br>' +
        'Sustituirá los datos actuales. Tus datos actuales se guardarán para poder deshacerlo.',
        'Restaurar', function () {
          S.saveUndo(state);
          state = incoming;
          commit('Copia restaurada correctamente');
        });
    };
    reader.onerror = function () { toast('No se ha podido leer el archivo.', 'error'); };
    reader.readAsText(file);
  }

  function csvCell(v) {
    v = v == null ? '' : String(v);
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function hmm(min) { // -75 -> -1:15
    var s = min < 0 ? '-' : '', a = Math.abs(min);
    return s + Math.floor(a / 60) + ':' + C.pad(a % 60);
  }
  function toCsv(rows) { return '﻿' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n') + '\r\n'; }

  function exportDaysCsv() {
    var t = today();
    var dates = {};
    Object.keys(state.days).forEach(function (d) { dates[d] = 1; });
    state.recoveries.forEach(function (r) { dates[r.date] = 1; });
    var list = Object.keys(dates).sort();
    if (!list.length) return toast('No hay jornadas para exportar.');
    var rows = [['Fecha', 'Día', 'Tipo', 'Entrada', 'Salida', 'Trabajado (h:mm)', 'Trabajado (min)', 'Prevista (min)', 'Recuperado ese día (min)', 'Diferencia (min)', 'Diferencia (h:mm)', 'Computa', 'Saldo al final del día (min)', 'Saldo (h:mm)', 'Observaciones']];
    list.forEach(function (d) {
      var inf = C.dayInfo(state, d, t);
      var rec = inf.record;
      var bal = C.balanceAt(state, d, t);
      var isW = inf.status === 'work' || inf.status === 'future';
      rows.push([
        C.fmtDateShort(d), C.DAY_NAMES[C.weekdayIndex(d)], rec ? C.TYPES[rec.type] : 'Sin jornada',
        rec && rec.in || '', rec && rec.out || '',
        isW ? hmm(inf.worked) : '', isW ? inf.worked : '',
        inf.status === 'nonwork' || !rec ? '' : inf.expected, inf.recovered || '',
        inf.counted ? inf.diff : '', inf.counted ? hmm(inf.diff) : '',
        inf.counted ? 'Sí' : 'No', bal, hmm(bal), rec && rec.note || ''
      ]);
    });
    downloadFile('control-horario-jornadas-' + t + '.csv', toCsv(rows), 'text/csv;charset=utf-8');
    toast('CSV de jornadas descargado');
  }
  function exportRecCsv() {
    if (!state.recoveries.length) return toast('No hay recuperaciones para exportar.');
    var rows = [['Fecha', 'Minutos', 'Tiempo (h:mm)', 'Observaciones', 'Registrada el']];
    state.recoveries.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (r) {
      rows.push([C.fmtDateShort(r.date), r.minutes, hmm(r.minutes), r.note || '', r.createdAt ? new Date(r.createdAt).toLocaleString('es-ES') : '']);
    });
    downloadFile('control-horario-recuperaciones-' + today() + '.csv', toCsv(rows), 'text/csv;charset=utf-8');
    toast('CSV de recuperaciones descargado');
  }

  /* ---------- Primer uso ---------- */
  function firstRun() {
    if (state.configured) return;
    openModal({
      title: 'Bienvenido a Control Horario',
      body: '<p>Elige tu jornada. Podrás cambiarla cuando quieras en Configuración.</p>' +
        '<div class="radios">' +
        radio('fr', '420', true, 'Jornada de 35 horas semanales', '7 horas diarias, de lunes a viernes') +
        radio('fr', '450', false, 'Jornada de 37,5 horas semanales', '7 h 30 min diarios, de lunes a viernes') +
        '</div><p class="muted small">Tus datos se guardan solo en este dispositivo. No necesitas cuenta.</p>',
      buttons: [{ label: 'Empezar', cls: 'btn-primary', onClick: function () {
        var v = +$('input[name=fr]:checked').value;
        state.schedules = [{ from: '2000-01-01', minutes: v }];
        state.configured = true;
        commit('Jornada configurada: ' + C.modalityLabel(v));
      } }]
    });
  }

  /* ---------- Instalación (PWA) ---------- */
  function doInstall() {
    if (!ui.installPrompt) return;
    ui.installPrompt.prompt();
    ui.installPrompt.userChoice.then(function () { ui.installPrompt = null; $('#installBtn').classList.add('hidden'); render(); });
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    ui.installPrompt = e;
    $('#installBtn').classList.remove('hidden');
  });
  window.addEventListener('appinstalled', function () { ui.installPrompt = null; $('#installBtn').classList.add('hidden'); toast('Aplicación instalada'); });

  var RENDER = {
    inicio: renderInicio, calculadora: renderCalculadora, calendario: renderCalendario,
    recuperaciones: renderRecuperaciones, historial: renderHistorial,
    configuracion: renderConfiguracion, copias: renderCopias
  };

  /* ---------- Arranque ---------- */
  function fromHash() {
    var h = (location.hash || '').replace('#', '');
    if (h === 'semana') h = 'calculadora';
    return RENDER[h] ? h : 'inicio';
  }
  window.addEventListener('hashchange', function () {
    ui.view = fromHash();
    closeModal();
    render();
    window.scrollTo(0, 0);
  });
  // Si la app queda abierta y cambia el día, actualiza al volver.
  var lastDay = C.todayStr();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && C.todayStr() !== lastDay) {
      lastDay = C.todayStr(); render();
    }
  });

  $('#installBtn').addEventListener('click', doInstall);
  // Pulsar Intro dentro de una ventana no la cierra por accidente.
  $('#modalForm').addEventListener('submit', function (e) {
    if (!e.submitter || e.submitter.value !== 'cancel') e.preventDefault();
  });

  S.load().then(function (s) {
    state = s;
    ui.view = fromHash();
    render();
    if (!state.configured) firstRun();
  });

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin conexión offline */ }); });
  }

  // Para comprobaciones desde la consola
  window.__app = { getState: function () { return state; } };
})();
