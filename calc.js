/* =====================================================================
   calc.js — Lógica de cálculo de Control Horario
   ---------------------------------------------------------------------
   Aquí están TODAS las reglas de cálculo. No toca la pantalla ni el
   almacenamiento, así se puede comprobar por separado (ver tests.js).

   Conceptos:
   - Fechas: siempre texto "AAAA-MM-DD" (fecha local, sin horas).
   - Horas: texto "HH:MM". Internamente todo se calcula en MINUTOS.
   - Jornada prevista: depende de la fecha (tabla de periodos), así un
     cambio de modalidad no recalcula semanas anteriores.
   - Recuperación: minutos de saldo que gastas para salir antes. Se
     guardan aparte de las jornadas. Si ese día también registras la
     jornada, la recuperación "justifica" esos minutos para que no se
     resten dos veces (una por salir antes y otra por la recuperación).
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------- Tipos de día ---------- */
  var TYPES = {
    trabajo: 'Trabajo',
    festivo: 'Festivo',
    vacaciones: 'Vacaciones',
    permiso: 'Permiso',
    ausencia: 'Ausencia'
  };
  // Cualquier tipo distinto de "trabajo" no computa: ni suma ni resta.
  function isWorkType(type) { return type === 'trabajo'; }

  var DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---------- Horas ---------- */
  function timeToMin(hhmm) {
    if (typeof hhmm !== 'string') return null;
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function minToTime(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return pad(h) + ':' + pad(m);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Fechas (siempre locales, a mediodía para evitar líos de horario de verano) ---------- */
  function parseDate(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
  }
  function dateToStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(s, n) {
    var d = parseDate(s);
    d.setDate(d.getDate() + n);
    return dateToStr(d);
  }
  function todayStr(now) { return dateToStr(now || new Date()); }
  // 0 = lunes ... 6 = domingo
  function weekdayIndex(s) { return (parseDate(s).getDay() + 6) % 7; }
  function isWeekend(s) { return weekdayIndex(s) >= 5; }
  function mondayOf(s) { return addDays(s, -weekdayIndex(s)); }
  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return dateToStr(parseDate(s)) === s;
  }
  function fmtDateShort(s) { // 29/10/2026
    var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }
  function fmtDateLong(s) { // jueves, 29 de octubre de 2026
    var d = parseDate(s);
    return DAY_NAMES[weekdayIndex(s)].toLowerCase() + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function fmtDayMonth(s) { // 29 oct
    var d = parseDate(s);
    return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
  }

  /* ---------- Formato de duraciones ---------- */
  // 450 -> "7 h 30 min"; 420 -> "7 h"; 45 -> "45 min"; 0 -> "0 min"
  function fmtDur(min) {
    min = Math.abs(Math.round(min));
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + ' h';
    return m + ' min';
  }
  // Con signo: "+30 min", "−1 h 15 min", "0 min"
  function fmtDiff(min) {
    if (!min) return '0 min';
    return (min > 0 ? '+' : '−') + fmtDur(min);
  }
  // "1 hora y 45 minutos"
  function fmtLong(min) {
    min = Math.abs(Math.round(min));
    var h = Math.floor(min / 60), m = min % 60;
    var hs = h === 1 ? '1 hora' : h + ' horas';
    var ms = m === 1 ? '1 minuto' : m + ' minutos';
    if (h && m) return hs + ' y ' + ms;
    if (h) return hs;
    return ms;
  }

  /* ---------- Jornada prevista según la fecha ---------- */
  // state.schedules = [{ from: "AAAA-MM-DD", minutes: 420 }, ...]
  function sortedSchedules(state) {
    return (state.schedules || []).slice().sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
  }
  // Minutos diarios previstos de lunes a viernes para esa fecha.
  function dailyTargetFor(state, date) {
    var list = sortedSchedules(state);
    if (!list.length) return 420;
    var cur = list[0];
    for (var i = 0; i < list.length; i++) if (list[i].from <= date) cur = list[i];
    return cur.minutes;
  }
  // Prevista "bruta" del día: 0 en fin de semana.
  function baseExpected(state, date) {
    return isWeekend(date) ? 0 : dailyTargetFor(state, date);
  }
  function modalityLabel(dailyMin) {
    var w = dailyMin * 5;
    if (dailyMin === 420) return '35 horas semanales';
    if (dailyMin === 450) return '37,5 horas semanales';
    return fmtDur(w) + ' semanales (personalizada)';
  }

  /* ---------- Recuperaciones ---------- */
  function recoveredOn(state, date) {
    var t = 0, r = state.recoveries || [];
    for (var i = 0; i < r.length; i++) if (r[i].date === date) t += r[i].minutes;
    return t;
  }

  /* ---------- Cálculo de un día ---------- */
  // Devuelve toda la información de un día. "counted" indica si suma al saldo.
  function dayInfo(state, date, today) {
    var rec = (state.days || {})[date];
    var recovered = recoveredOn(state, date);
    var base = baseExpected(state, date);
    var info = {
      date: date, record: rec || null, base: base, recovered: recovered,
      status: 'empty', counted: false, worked: 0, expected: base, justified: 0, diff: 0,
      future: date > today
    };
    if (!rec) return info;
    if (!isWorkType(rec.type)) {
      info.status = 'nonwork';
      info.expected = 0;
      return info;
    }
    var a = timeToMin(rec.in), b = timeToMin(rec.out);
    if (a === null || b === null || b <= a) { info.status = 'invalid'; return info; }
    info.worked = b - a;                                  // Regla 1: salida − entrada, sin pausas
    info.justified = Math.min(recovered, base);           // Regla 6: la recuperación se descuenta una sola vez
    info.expected = base - info.justified;
    info.diff = info.worked - info.expected;              // Regla 3
    info.status = info.future ? 'future' : 'work';
    info.counted = !info.future;                          // Regla 7: las jornadas futuras no cuentan
    return info;
  }

  /* ---------- Saldos ---------- */
  function allDates(state) {
    return Object.keys(state.days || {}).sort();
  }
  function initialAt(state, date) {
    var ini = state.initial;
    if (!ini || !ini.minutes) return 0;
    if (!ini.date || ini.date <= date) return ini.minutes;
    return 0;
  }
  // Saldo al final del día "date" (regla 11). Solo cuenta jornadas y recuperaciones hasta esa fecha.
  function balanceAt(state, date, today) {
    var b = initialAt(state, date);
    var dates = allDates(state);
    for (var i = 0; i < dates.length; i++) {
      if (dates[i] > date) break;
      var inf = dayInfo(state, dates[i], today);
      if (inf.counted) b += inf.diff;
    }
    var r = state.recoveries || [];
    for (var j = 0; j < r.length; j++) if (r[j].date <= date) b -= r[j].minutes;
    return b;
  }
  // Saldo disponible ahora: jornadas hasta hoy menos TODAS las recuperaciones
  // (las de fecha futura ya "reservan" ese tiempo).
  function availableNow(state, today) {
    var b = initialAt(state, today);
    var dates = allDates(state);
    for (var i = 0; i < dates.length; i++) {
      var inf = dayInfo(state, dates[i], today);
      if (inf.counted) b += inf.diff;
    }
    return b - totalRecovered(state);
  }
  function totalRecovered(state) {
    var t = 0, r = state.recoveries || [];
    for (var i = 0; i < r.length; i++) t += r[i].minutes;
    return t;
  }

  /* ---------- Resumen de un periodo (semana, mes...) ---------- */
  function rangeSummary(state, from, to, today) {
    var s = { from: from, to: to, worked: 0, expectedCounted: 0, expectedTotal: 0, diff: 0,
      extra: 0, missing: 0, recovered: 0, daysCounted: 0, days: [] };
    for (var d = from; d <= to; d = addDays(d, 1)) {
      var inf = dayInfo(state, d, today);
      s.days.push(inf);
      if (inf.status !== 'nonwork') s.expectedTotal += inf.expected;
      if (inf.counted) {
        s.worked += inf.worked;
        s.expectedCounted += inf.expected;
        s.diff += inf.diff;                               // Regla 4
        if (inf.diff > 0) s.extra += inf.diff; else s.missing -= inf.diff;
        s.daysCounted++;
      }
      s.recovered += inf.recovered;
    }
    return s;
  }

  // Resumen semanal (lunes a domingo; el fin de semana solo cuenta si registras algo).
  function weekSummary(state, anyDate, today) {
    var mon = mondayOf(anyDate), sun = addDays(mon, 6);
    var s = rangeSummary(state, mon, sun, today);
    s.monday = mon; s.sunday = sun;
    s.dailyTarget = dailyTargetFor(state, mon);
    s.mixed = dailyTargetFor(state, addDays(mon, 4)) !== s.dailyTarget;
    s.previous = balanceAt(state, addDays(mon, -1), today);   // saldo acumulado de semanas anteriores
    s.closing = balanceAt(state, sun, today);                 // saldo al cierre de la semana
    s.remaining = Math.max(0, s.expectedTotal - s.expectedCounted); // jornada aún sin registrar
    return s;
  }

  /* ---------- Validación de una jornada ---------- */
  function validateDay(rec) {
    if (!rec || !TYPES[rec.type]) return 'Tipo de día no válido.';
    if (!isWorkType(rec.type)) return null;
    var a = timeToMin(rec.in), b = timeToMin(rec.out);
    if (a === null) return 'Falta la hora de entrada.';
    if (b === null) return 'Falta la hora de salida.';
    if (b <= a) return 'La hora de salida debe ser posterior a la de entrada.';
    return null;
  }

  /* ---------- Fechas con datos ---------- */
  function earliestDate(state, today) {
    var c = [today];
    var d = allDates(state); if (d.length) c.push(d[0]);
    (state.recoveries || []).forEach(function (r) { c.push(r.date); });
    if (state.initial && state.initial.minutes && state.initial.date) c.push(state.initial.date);
    c.sort();
    return c[0];
  }

  var Calc = {
    TYPES: TYPES, DAY_NAMES: DAY_NAMES, DAY_SHORT: DAY_SHORT, MONTHS: MONTHS,
    isWorkType: isWorkType, timeToMin: timeToMin, minToTime: minToTime, pad: pad,
    parseDate: parseDate, dateToStr: dateToStr, addDays: addDays, todayStr: todayStr,
    weekdayIndex: weekdayIndex, isWeekend: isWeekend, mondayOf: mondayOf, isValidDate: isValidDate,
    fmtDateShort: fmtDateShort, fmtDateLong: fmtDateLong, fmtDayMonth: fmtDayMonth,
    fmtDur: fmtDur, fmtDiff: fmtDiff, fmtLong: fmtLong,
    sortedSchedules: sortedSchedules, dailyTargetFor: dailyTargetFor, baseExpected: baseExpected,
    modalityLabel: modalityLabel, recoveredOn: recoveredOn, dayInfo: dayInfo,
    balanceAt: balanceAt, availableNow: availableNow, totalRecovered: totalRecovered,
    rangeSummary: rangeSummary, weekSummary: weekSummary, validateDay: validateDay,
    earliestDate: earliestDate, allDates: allDates
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else global.Calc = Calc;
})(this);
