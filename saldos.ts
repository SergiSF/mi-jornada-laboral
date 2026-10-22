// Saldos anuales: lo que tienes cada año y lo que ya has gastado.
//
// Reglas:
// - Vacaciones y DR: cuentan de enero a diciembre.
// - AP y AP recuperables de un año se pueden gastar hasta el 31 de enero del año siguiente.
//   Lo que gastes en enero sale primero de lo que te quede del año anterior.
// - Lo pendiente de recuperar de las AP recuperables es una cuenta corriente:
//   todo lo que te has cogido menos todo lo que has recuperado, sin importar el año.
import { desdeISO, fechaISO, lunesDe, minutosFranja, minutosPermiso, minutosRecuperacion, sumarDias, type Semana } from "./calculos";

/** Lo que escribes a mano para cada año. */
export type SaldoAnual = {
  vacacionesDias: number;
  apMinutos: number;
  apRecuperablesMinutos: number;
  drMinutos: number;
};

export const SALDO_VACIO: SaldoAnual = { vacacionesDias: 0, apMinutos: 0, apRecuperablesMinutos: 0, drMinutos: 0 };

export type UsoDia = { fecha: Date; cantidad: number; eneroSiguiente?: boolean };

export type Consumo = {
  vacacionesDias: number;
  apMinutos: number;
  apRecuperablesMinutos: number;
  drMinutos: number;
  libranzas: number;
  detalle: { vacaciones: UsoDia[]; ap: UsoDia[]; apRec: UsoDia[]; dr: UsoDia[]; libranza: UsoDia[] };
};

type Uso = { fecha: Date; cantidad: number };

/** Todos los usos de un concepto, ordenados por fecha. */
function usos(semanas: Semana[], elegir: (s: Semana, i: number) => number): Uso[] {
  const lista: Uso[] = [];
  for (const s of semanas) {
    const lunes = desdeISO(s.lunes);
    s.dias.forEach((_, i) => {
      const cantidad = elegir(s, i);
      if (cantidad > 0) lista.push({ fecha: sumarDias(lunes, i), cantidad });
    });
  }
  return lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Reparte los usos entre años con la regla de enero:
 * en enero, primero se gasta lo que quede del año anterior.
 * Devuelve, para el año pedido, el total gastado y el detalle.
 */
function repartirConEnero(lista: Uso[], saldoDe: (anio: number) => number, anio: number): { total: number; detalle: UsoDia[] } {
  const gastado: Record<number, number> = {};
  const detalle: UsoDia[] = [];
  for (const u of lista) {
    const y = u.fecha.getFullYear();
    let resto = u.cantidad;
    if (u.fecha.getMonth() === 0) {
      const quedaAnterior = Math.max(0, saldoDe(y - 1) - (gastado[y - 1] ?? 0));
      const delAnterior = Math.min(resto, quedaAnterior);
      if (delAnterior > 0) {
        gastado[y - 1] = (gastado[y - 1] ?? 0) + delAnterior;
        if (y - 1 === anio) detalle.push({ fecha: u.fecha, cantidad: delAnterior, eneroSiguiente: true });
        resto -= delAnterior;
      }
    }
    if (resto > 0) {
      gastado[y] = (gastado[y] ?? 0) + resto;
      if (y === anio) detalle.push({ fecha: u.fecha, cantidad: resto });
    }
  }
  return { total: gastado[anio] ?? 0, detalle };
}

/** Suma lo gastado de cada concepto en un año. */
export function consumoAnual(semanas: Semana[], anio: number, saldoDe: (anio: number) => SaldoAnual): Consumo {
  const delTipo = (tipo: string, valor: (s: Semana, i: number) => number) => (s: Semana, i: number) =>
    s.dias[i]?.tipo === tipo ? valor(s, i) : 0;
  const permiso = (s: Semana, i: number) => {
    const d = s.dias[i];
    return d ? minutosPermiso(d) : 0;
  };
  const enAnio = (lista: Uso[]) => lista.filter((u) => u.fecha.getFullYear() === anio);

  const vacaciones = enAnio(usos(semanas, delTipo("vacaciones", () => 1)));
  const dr = enAnio(usos(semanas, delTipo("dr", permiso)));
  const libranza = enAnio(usos(semanas, delTipo("libranza", () => 1)));
  const ap = repartirConEnero(usos(semanas, delTipo("asuntos-propios", permiso)), (y) => saldoDe(y).apMinutos, anio);
  const apRec = repartirConEnero(usos(semanas, delTipo("ap-recuperables", permiso)), (y) => saldoDe(y).apRecuperablesMinutos, anio);

  return {
    vacacionesDias: vacaciones.length,
    apMinutos: ap.total,
    apRecuperablesMinutos: apRec.total,
    drMinutos: dr.reduce((s, u) => s + u.cantidad, 0),
    libranzas: libranza.length,
    detalle: { vacaciones, ap: ap.detalle, apRec: apRec.detalle, dr, libranza },
  };
}

/**
 * Cuenta de AP recuperables:
 * - cogido: horas de AP recuperables que te has cogido
 * - recuperado: franjas de recuperación que has apuntado en tus días (y lo escrito sin franja antes)
 * - pendiente: cogido − recuperado (negativo = recuperado por adelantado)
 */
export function pendienteDeRecuperar(semanas: Semana[]): { cogido: number; recuperado: number; pendiente: number } {
  const sumar = (elegir: (s: Semana, i: number) => number) => usos(semanas, elegir).reduce((s, u) => s + u.cantidad, 0);
  const cogido = sumar((s, i) => (s.dias[i]?.tipo === "ap-recuperables" ? minutosPermiso(s.dias[i]!) : 0));
  const recuperado = sumar((s, i) => (s.dias[i] ? minutosRecuperacion(s.dias[i]!) : 0));
  return { cogido, recuperado, pendiente: cogido - recuperado };
}

/** Una recuperación apuntada: el día, la franja (si la tiene) y el tiempo. */
export type RecuperacionHecha = { fecha: string; desde?: string; hasta?: string; minutos: number };

/** Todas las horas recuperadas, ordenadas por día y hora. */
export function recuperacionesHechas(semanas: Semana[]): RecuperacionHecha[] {
  const lista: RecuperacionHecha[] = [];
  for (const s of semanas) {
    const lunes = desdeISO(s.lunes);
    s.dias.forEach((d, i) => {
      const fecha = fechaISO(sumarDias(lunes, i));
      for (const f of d.franjasRecuperacion ?? []) {
        const minutos = minutosFranja(f);
        if (minutos > 0) lista.push({ fecha, desde: f.desde, hasta: f.hasta, minutos });
      }
      if ((d.minutosRecuperacion ?? 0) > 0) lista.push({ fecha, minutos: d.minutosRecuperacion! });
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.desde ?? "").localeCompare(b.desde ?? ""));
}

/**
 * Pasa los tramos que se programaron desde el día de AP recuperables (versión de ayer)
 * a su día de recuperación como franjas escritas a mano.
 * Devuelve todas las semanas y las que han cambiado (para guardarlas).
 */
export function migrarTramosProgramados(semanas: Semana[], semanaVacia: (lunes: Date) => Semana): { semanas: Semana[]; cambiadas: Semana[] } {
  const hayAlguno = semanas.some((s) => s.dias.some((d) => (d.recuperaciones ?? []).length > 0));
  if (!hayAlguno) return { semanas, cambiadas: [] };
  const mapa = new Map(semanas.map((s) => [s.lunes, { ...s, dias: s.dias.map((d) => ({ ...d })) }]));
  const cambiadas = new Set<string>();
  for (const s of semanas) {
    s.dias.forEach((d, i) => {
      const tramos = d.recuperaciones ?? [];
      if (!tramos.length) return;
      const origen = mapa.get(s.lunes)!;
      delete origen.dias[i]!.recuperaciones;
      cambiadas.add(s.lunes);
      for (const t of tramos) {
        const fecha = desdeISO(t.fecha);
        const indice = (fecha.getDay() + 6) % 7;
        if (indice > 4 || minutosFranja(t) === 0) continue; // fin de semana o franja mal escrita: se descarta
        const lunes = fechaISO(lunesDe(fecha));
        const destino = mapa.get(lunes) ?? { ...semanaVacia(fecha), dias: semanaVacia(fecha).dias.map((x) => ({ ...x })) };
        const dia = destino.dias[indice]!;
        dia.franjasRecuperacion = [...(dia.franjasRecuperacion ?? []), { id: t.id, desde: t.desde, hasta: t.hasta }];
        mapa.set(lunes, destino);
        cambiadas.add(lunes);
      }
    });
  }
  const lista = [...mapa.values()];
  return { semanas: lista, cambiadas: lista.filter((s) => cambiadas.has(s.lunes)) };
}
