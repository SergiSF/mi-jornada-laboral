import { describe, expect, it } from "vitest";
import { diasLaborables, evolucionBolsa, resumenMes } from "./mes";
import { semanaNueva, type Semana } from "./calculos";

describe("Vista mensual", () => {
  it("octubre de 2026 tiene 22 días de lunes a viernes", () => expect(diasLaborables(2026, 9)).toHaveLength(22));

  it("suma las horas del mes y calcula el balance solo hasta hoy", () => {
    const s = semanaNueva(new Date(2026, 9, 19), 35, true);
    s.dias[0] = { entrada: "08:00", salida: "16:00", pausa: 0, tipo: "trabajo" }; // lunes 19: 8 h
    const obtener = (lunes: Date) => (lunes.getDate() === 19 ? s : semanaNueva(lunes, 35, true));
    const r = resumenMes(2026, 9, obtener, new Date(2026, 9, 1)); // "hoy" es el 1 de octubre
    expect(r.computado).toBe(480);
    expect(r.objetivo).toBe(22 * 420);
    expect(r.balanceHastaHoy).toBe(-420); // solo cuenta el día 1, vacío
    expect(r.registrados).toBe(1);
  });
});

describe("Historial", () => {
  const semana = (lunes: string, salida: string): Semana => ({
    lunes, jornada: 35, contarAusencias: true,
    dias: Array.from({ length: 5 }, () => ({ entrada: "08:00", salida, pausa: 0, tipo: "trabajo" as const })),
  });
  it("acumula el balance en orden y no incluye la semana actual", () => {
    const puntos = evolucionBolsa([semana("2026-10-12", "14:30"), semana("2026-10-05", "15:30"), semana("2026-10-19", "15:00")], new Date(2026, 9, 21));
    expect(puntos.map((p) => p.acumulado)).toEqual([150, 0]);
  });
});
