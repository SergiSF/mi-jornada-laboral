import { describe, expect, it } from "vitest";
import { consumoAnual, pendienteDeRecuperar, SALDO_VACIO, type SaldoAnual } from "./saldos";
import type { RegistroDia, Semana } from "./calculos";

const dia = (r: Partial<RegistroDia>): RegistroDia => ({ entrada: "", salida: "", pausa: 0, tipo: "trabajo", ...r });
const semana = (lunes: string, dias: RegistroDia[]): Semana => ({ lunes, jornada: 35, contarAusencias: true, dias });
const libre = () => dia({});

describe("Saldos anuales", () => {
  const saldos: Record<number, SaldoAnual> = {
    2026: { vacacionesDias: 22, apMinutos: 300, apRecuperablesMinutos: 600, drMinutos: 600 },
    2027: { vacacionesDias: 22, apMinutos: 900, apRecuperablesMinutos: 600, drMinutos: 600 },
  };
  const saldoDe = (a: number) => saldos[a] ?? SALDO_VACIO;
  const semanas: Semana[] = [
    semana("2026-10-19", [
      dia({ tipo: "vacaciones" }),
      dia({ tipo: "asuntos-propios", minutosPermiso: 180 }),
      dia({ tipo: "ap-recuperables", minutosPermiso: 120 }),
      dia({ tipo: "dr", minutosPermiso: 60 }),
      dia({ entrada: "08:00", salida: "16:00", minutosRecuperacion: 45 }),
    ]),
    // semana que cruza de año: 29-31 de diciembre de 2025 y 1-2 de enero de 2026
    semana("2025-12-29", [dia({ tipo: "vacaciones" }), dia({ tipo: "vacaciones" }), libre(), dia({ tipo: "vacaciones" }), dia({ tipo: "libranza" })]),
    // enero de 2027: 4 h de AP. A 2026 le quedan 2 h (300 - 180 min), así que 2 h son de 2026 y 2 h de 2027
    semana("2027-01-11", [dia({ tipo: "asuntos-propios", minutosPermiso: 240 }), libre(), libre(), libre(), libre()]),
  ];

  const c2026 = consumoAnual(semanas, 2026, saldoDe);
  it("las vacaciones cuentan por año natural", () => expect(c2026.vacacionesDias).toBe(2));
  it("suma las horas de AP recuperables y DR", () => {
    expect(c2026.apRecuperablesMinutos).toBe(120);
    expect(c2026.drMinutos).toBe(60);
  });
  it("cuenta las libranzas", () => expect(c2026.libranzas).toBe(1));
  it("las AP de enero se gastan primero del año anterior", () => {
    expect(c2026.apMinutos).toBe(300); // 180 en octubre + 120 en enero de 2027
    expect(consumoAnual(semanas, 2027, saldoDe).apMinutos).toBe(120);
  });
  it("lo pendiente de recuperar es lo cogido menos lo recuperado", () =>
    expect(pendienteDeRecuperar(semanas)).toEqual({ cogido: 120, recuperado: 45, pendiente: 75 }));
});
