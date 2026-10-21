// Cálculos para la vista mensual y el historial.
import { balanceAcumulado, calcularDia, calcularSemana, fechaISO, lunesDe, type Semana, type ResultadoDia, type TipoDia } from "./calculos";

export type DiaMes = ResultadoDia & { fecha: Date; tipo: TipoDia; pasado: boolean };

export type ResumenMes = {
  dias: DiaMes[]; // solo de lunes a viernes
  computado: number;
  objetivo: number; // de todo el mes
  balanceHastaHoy: number; // solo cuenta los días que ya han llegado
  registrados: number; // días con horas o con ausencia
};

/** Días de lunes a viernes de un mes (mes: 0 = enero). */
export function diasLaborables(anio: number, mes: number): Date[] {
  const dias: Date[] = [];
  for (let d = new Date(anio, mes, 1); d.getMonth() === mes; d = new Date(anio, mes, d.getDate() + 1)) {
    const semana = d.getDay();
    if (semana >= 1 && semana <= 5) dias.push(d);
  }
  return dias;
}

export function resumenMes(anio: number, mes: number, obtener: (lunes: Date) => Semana, hoy: Date): ResumenMes {
  const hoyISO = fechaISO(hoy);
  const dias = diasLaborables(anio, mes).map((fecha): DiaMes => {
    const semana = obtener(lunesDe(fecha));
    const registro = semana.dias[(fecha.getDay() + 6) % 7] ?? { entrada: "", salida: "", pausa: 0, tipo: "trabajo" as const };
    const r = calcularDia(registro, semana.jornada, semana.contarAusencias);
    return { ...r, fecha, tipo: registro.tipo, pasado: fechaISO(fecha) <= hoyISO };
  });
  const computado = dias.reduce((s, d) => s + d.minutos, 0);
  const objetivo = dias.reduce((s, d) => s + d.objetivo, 0);
  const hastaHoy = dias.filter((d) => d.pasado);
  return {
    dias,
    computado,
    objetivo,
    balanceHastaHoy: hastaHoy.reduce((s, d) => s + d.minutos - d.objetivo, 0),
    registrados: dias.filter((d) => d.estado !== "sin-registrar").length,
  };
}

export type PuntoBolsa = { lunes: string; balance: number; acumulado: number };

/** Evolución de la bolsa de horas, semana a semana (solo semanas terminadas). */
export function evolucionBolsa(semanas: Semana[], hoy: Date): PuntoBolsa[] {
  const lunesActual = fechaISO(lunesDe(hoy));
  let acumulado = 0;
  return [...semanas]
    .filter((s) => s.lunes < lunesActual)
    .sort((a, b) => a.lunes.localeCompare(b.lunes))
    .map((s) => {
      const balance = calcularSemana(s).balance;
      acumulado += balance;
      return { lunes: s.lunes, balance, acumulado };
    });
}

export { balanceAcumulado };
