/* =====================================================================
   storage.js — Guardado de datos en el propio dispositivo
   ---------------------------------------------------------------------
   - Guarda en IndexedDB (base de datos del navegador) y además una
     copia espejo en localStorage. Al abrir, usa la más reciente.
   - Pide al navegador almacenamiento "persistente" para que no lo borre
     por falta de espacio.
   - Antes de restaurar una copia guarda los datos actuales para poder
     deshacer.
   No hay servidor ni cuenta: los datos no salen de tu dispositivo.
   ===================================================================== */
(function (global) {
  'use strict';

  var DB_NAME = 'control-horario';
  var STORE = 'kv';
  var KEY = 'state';
  var LS_KEY = 'control-horario:state';
  var LS_UNDO = 'control-horario:antes-de-importar';

  function defaultState() {
    return {
      app: 'control-horario',
      version: 1,
      configured: false,
      schedules: [{ from: '2000-01-01', minutes: 420 }],
      initial: { minutes: 0, date: null },
      days: {},
      recoveries: [],
      lastBackup: null,
      updatedAt: 0
    };
  }

  /* ---------- IndexedDB ---------- */
  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error('IndexedDB no disponible'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function idbGet() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbSet(value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---------- localStorage (espejo) ---------- */
  function lsGet(key) {
    try { var t = localStorage.getItem(key); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* ---------- Normalizar datos (también al importar) ---------- */
  function normalize(raw) {
    var s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    if (typeof raw.configured === 'boolean') s.configured = raw.configured;
    if (Array.isArray(raw.schedules) && raw.schedules.length) {
      s.schedules = raw.schedules.filter(function (p) {
        return p && typeof p.from === 'string' && typeof p.minutes === 'number' && p.minutes > 0 && p.minutes < 24 * 60;
      }).map(function (p) { return { from: p.from, minutes: Math.round(p.minutes) }; });
      if (!s.schedules.length) s.schedules = defaultState().schedules;
    }
    if (raw.initial && typeof raw.initial.minutes === 'number') {
      s.initial = { minutes: Math.round(raw.initial.minutes), date: raw.initial.date || null };
    }
    if (raw.days && typeof raw.days === 'object') {
      Object.keys(raw.days).forEach(function (d) {
        var r = raw.days[d];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !r || typeof r.type !== 'string') return;
        var clean = { type: r.type };
        if (r.in) clean.in = String(r.in);
        if (r.out) clean.out = String(r.out);
        if (r.note) clean.note = String(r.note);
        s.days[d] = clean;
      });
    }
    if (Array.isArray(raw.recoveries)) {
      s.recoveries = raw.recoveries.filter(function (r) {
        return r && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && typeof r.minutes === 'number' && r.minutes > 0;
      }).map(function (r) {
        return { id: r.id || newId(), date: r.date, minutes: Math.round(r.minutes), note: r.note ? String(r.note) : '', createdAt: r.createdAt || Date.now() };
      });
    }
    s.lastBackup = raw.lastBackup || null;
    s.updatedAt = raw.updatedAt || 0;
    return s;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- API pública ---------- */
  var lastError = null;

  function load() {
    var fromLs = lsGet(LS_KEY);
    return idbGet().catch(function (e) { lastError = e; return null; }).then(function (fromIdb) {
      var best = fromIdb;
      if (!best || (fromLs && (fromLs.updatedAt || 0) > (best.updatedAt || 0))) best = fromLs;
      return normalize(best);
    });
  }

  // Guarda en los dos sitios. Devuelve una promesa que indica si se guardó al menos en uno.
  function save(state) {
    state.updatedAt = Date.now();
    var copy = JSON.parse(JSON.stringify(state));
    var okLs = lsSet(LS_KEY, copy);
    return idbSet(copy).then(function () { lastError = null; return true; }, function (e) {
      lastError = e;
      return okLs;
    });
  }

  function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      return navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }
  function isPersisted() {
    if (navigator.storage && navigator.storage.persisted) return navigator.storage.persisted().catch(function () { return false; });
    return Promise.resolve(false);
  }

  function saveUndo(state) { return lsSet(LS_UNDO, { savedAt: Date.now(), data: state }); }
  function getUndo() { return lsGet(LS_UNDO); }
  function clearUndo() { try { localStorage.removeItem(LS_UNDO); } catch (e) { /* nada */ } }

  global.Store = {
    defaultState: defaultState, normalize: normalize, newId: newId,
    load: load, save: save, requestPersistence: requestPersistence, isPersisted: isPersisted,
    saveUndo: saveUndo, getUndo: getUndo, clearUndo: clearUndo,
    lastError: function () { return lastError; }
  };
})(this);
