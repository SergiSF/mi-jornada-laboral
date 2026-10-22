// Saldos anuales: lo que tienes cada año y lo que ya has gastado.
//
// Reglas:
// - Vacaciones y DR: cuentan de enero a diciembre.
// - AP y AP recuperables de un año se pueden gastar hasta el 31 de enero del año siguiente.
//   Lo que gastes en enero sale primero de lo que te quede del año anterior.
// - Lo pendiente de recuperar de las AP recuperables es una cuenta corriente:
//   todo lo que te has cogido menos todo lo que has recuperado, sin importar el año.
import { desdeISO, minutosPermiso, minutosRecuperacion, minutosTramo, sumarDias, type Semana, type TramoRecuperacion } from "./calculos";

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

/** Un tramo de recuperación con el día de AP recuperables del que sale. */
export type TramoConOrigen = TramoRecuperacion & { minutos: number; origen: string };

/** Todos los tramos de recuperación programados, ordenados por fecha y hora. */
export function todosLosTramos(semanas: Semana[]): TramoConOrigen[] {
  const lista: TramoConOrigen[] = [];
  for (const s of semanas) {
    const lunes = desdeISO(s.lunes);
    s.dias.forEach((d, i) => {
      if (d.tipo !== "ap-recuperables") return;
      const f = sumarDias(lunes, i);
      const origen = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
      for (const t of d.recuperaciones ?? []) lista.push({ ...t, minutos: minutosTramo(t), origen });
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.desde.localeCompare(b.desde));
}

/** Tramos de recuperación que caen en un día concreto ("2026-10-22"). */
export const tramosDelDia = (semanas: Semana[], fecha: string) => todosLosTramos(semanas).filter((t) => t.fecha === fecha && t.minutos > 0);

/**
 * Cuenta de AP recuperables:
 * - cogido: horas de AP recuperables que te has cogido
 * - recuperado: tramos ya pasados (hasta hoy incluido) + recuperación escrita a mano en versiones anteriores
 * - programado: tramos con fecha posterior a hoy
 * - pendiente: lo que falta por recuperar (cogido − recuperado; negativo = recuperado por adelantado)
 * - sinProgramar: lo pendiente que aún no tiene día asignado
 */
export function pendienteDeRecuperar(
  semanas: Semana[],
  hoyISO: string,
): { cogido: number; recuperado: number; programado: number; pendiente: number; sinProgramar: number } {
  const sumar = (elegir: (s: Semana, i: number) => number) => usos(semanas, elegir).reduce((s, u) => s + u.cantidad, 0);
  const cogido = sumar((s, i) => (s.dias[i]?.tipo === "ap-recuperables" ? minutosPermiso(s.dias[i]!) : 0));
  const manual = sumar((s, i) => (s.dias[i]?.tipo === "trabajo" ? minutosRecuperacion(s.dias[i]!) : 0));
  const tramos = todosLosTramos(semanas);
  const hecho = tramos.filter((t) => t.fecha <= hoyISO).reduce((s, t) => s + t.minutos, 0);
  const programado = tramos.filter((t) => t.fecha > hoyISO).reduce((s, t) => s + t.minutos, 0);
  const recuperado = manual + hecho;
  const pendiente = cogido - recuperado;
  return { cogido, recuperado, programado, pendiente, sinProgramar: Math.max(0, pendiente - programado) };
}

/** Una recuperación ya hecha: el día, la franja (si se programó con horario) y el tiempo. */
export type RecuperacionHecha = { fecha: string; desde?: string; hasta?: string; minutos: number; origen?: string };

/**
 * Horas de AP recuperables ya recuperadas (hasta hoy incluido), ordenadas por fecha:
 * los tramos programados y la recuperación escrita a mano en la versión anterior.
 */
export function recuperacionesHechas(semanas: Semana[], hoyISO: string): RecuperacionHecha[] {
  const lista: RecuperacionHecha[] = todosLosTramos(semanas)
    .filter((t) => t.fecha <= hoyISO && t.minutos > 0)
    .map((t) => ({ fecha: t.fecha, desde: t.desde, hasta: t.hasta, minutos: t.minutos, origen: t.origen }));
  for (const s of semanas) {
    const lunes = desdeISO(s.lunes);
    s.dias.forEach((d, i) => {
      if (d.tipo !== "trabajo" || minutosRecuperacion(d) <= 0) return;
      const f = sumarDias(lunes, i);
      const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
      lista.push({ fecha, minutos: minutosRecuperacion(d) });
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.desde ?? "").localeCompare(b.desde ?? ""));
}
