import { describe, expect, it } from "vitest";
import { consumoAnual, pendienteDeRecuperar, tramosDelDia, SALDO_VACIO, type SaldoAnual } from "./saldos";
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
    expect(pendienteDeRecuperar(semanas, "2026-10-23")).toEqual({ cogido: 120, recuperado: 45, programado: 0, pendiente: 75, sinProgramar: 75 }));

});

describe("Tramos de recuperación de AP recuperables", () => {
  // Martes 20: 2 h de AP recuperables, que se recuperan el jueves 22 de 15:30 a 16:30 y el martes 27 de 15:30 a 16:30
  const semanas: Semana[] = [
    semana("2026-10-19", [
      libre(),
      dia({
        tipo: "ap-recuperables",
        minutosPermiso: 120,
        recuperaciones: [
          { id: "t1", fecha: "2026-10-22", desde: "15:30", hasta: "16:30" },
          { id: "t2", fecha: "2026-10-27", desde: "15:30", hasta: "16:30" },
        ],
      }),
      libre(), libre(), libre(),
    ]),
  ];
  it("el tramo aparece en su día de recuperación", () => {
    const t = tramosDelDia(semanas, "2026-10-22");
    expect(t.map((x) => [x.desde, x.hasta, x.minutos, x.origen])).toEqual([["15:30", "16:30", 60, "2026-10-20"]]);
  });
  it("los tramos pasados cuentan como recuperados y los futuros como programados", () =>
    expect(pendienteDeRecuperar(semanas, "2026-10-23")).toEqual({ cogido: 120, recuperado: 60, programado: 60, pendiente: 60, sinProgramar: 0 }));
  it("cuando pasan todos los tramos, no queda nada pendiente", () =>
    expect(pendienteDeRecuperar(semanas, "2026-10-28").pendiente).toBe(0));
  it("un tramo mal escrito no cuenta", () =>
    expect(tramosDelDia([semana("2026-10-19", [dia({ tipo: "ap-recuperables", minutosPermiso: 60, recuperaciones: [{ id: "x", fecha: "2026-10-22", desde: "17:00", hasta: "16:00" }] }), libre(), libre(), libre(), libre()])], "2026-10-22")).toEqual([]));
});
