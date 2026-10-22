import { describe, expect, it } from "vitest";
import { consumoAnual, migrarTramosProgramados, pendienteDeRecuperar, recuperacionesHechas, SALDO_VACIO, type SaldoAnual } from "./saldos";
import { calcularDia, calcularSemana, semanaNueva } from "./calculos";
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

describe("Recuperación de AP recuperables apuntada a mano con franja", () => {
  // Martes: trabaja de 08:00 a 13:15 y coge 2 h 15 min de AP recuperables.
  // Jueves: entrada 08:00 y salida real 16:45; marca a mano que de 15:30 a 16:45 es recuperación.
  const semanas: Semana[] = [
    semana("2026-10-19", [
      libre(),
      dia({ tipo: "ap-recuperables", entrada: "08:00", salida: "13:15", minutosPermiso: 135 }),
      libre(),
      dia({ entrada: "08:00", salida: "16:45", franjasRecuperacion: [{ id: "f", desde: "15:30", hasta: "16:45" }] }),
      libre(),
    ]),
  ];
  const s = semanas[0]!;
  it("el día de AP recuperables cuenta lo trabajado más las horas cogidas", () => expect(calcularDia(s.dias[1]!, 37.5, true).minutos).toBe(450));
  it("la franja de recuperación no cuenta en las horas del día", () => expect(calcularDia(s.dias[3]!, 37.5, true).minutos).toBe(450));
  it("la semana no la cuenta dos veces", () => expect(calcularSemana(s).computado).toBe(900));
  it("lo recuperado se descuenta de lo pendiente", () =>
    expect(pendienteDeRecuperar(semanas)).toEqual({ cogido: 135, recuperado: 75, pendiente: 60 }));
  it("la lista de horas recuperadas muestra el día, la franja y el tiempo", () =>
    expect(recuperacionesHechas(semanas)).toEqual([{ fecha: "2026-10-22", desde: "15:30", hasta: "16:45", minutos: 75 }]));
  it("si no marcas la franja, esas horas cuentan como trabajadas", () =>
    expect(calcularDia({ ...s.dias[3]!, franjasRecuperacion: [] }, 37.5, true).minutos).toBe(525));
  it("incluye lo apuntado sin franja en la versión anterior", () =>
    expect(recuperacionesHechas([semana("2026-10-19", [dia({ entrada: "08:00", salida: "16:00", minutosRecuperacion: 45 }), libre(), libre(), libre(), libre()])]))
      .toEqual([{ fecha: "2026-10-19", minutos: 45 }]));
});

describe("Paso de recuperaciones programadas con la versión anterior", () => {
  const conTramos: Semana[] = [
    semana("2026-10-19", [
      libre(),
      dia({ tipo: "ap-recuperables", minutosPermiso: 135, recuperaciones: [
        { id: "a", fecha: "2026-10-22", desde: "15:30", hasta: "16:45" },
        { id: "b", fecha: "2026-10-27", desde: "15:30", hasta: "16:30" }, // semana que aún no existe
      ] }),
      libre(), libre(), libre(),
    ]),
  ];
  const r = migrarTramosProgramados(conTramos, (f) => semanaNueva(f, 35, true));
  const porLunes = Object.fromEntries(r.semanas.map((x) => [x.lunes, x]));
  it("cada tramo pasa a su día como franja", () => {
    expect(porLunes["2026-10-19"]?.dias[3]?.franjasRecuperacion).toEqual([{ id: "a", desde: "15:30", hasta: "16:45" }]);
    expect(porLunes["2026-10-26"]?.dias[1]?.franjasRecuperacion).toEqual([{ id: "b", desde: "15:30", hasta: "16:30" }]);
  });
  it("el día de AP recuperables se queda sin tramos programados", () => expect(porLunes["2026-10-19"]?.dias[1]?.recuperaciones).toBeUndefined());
  it("sin tramos antiguos no cambia nada", () => expect(migrarTramosProgramados(r.semanas, (f) => semanaNueva(f, 35, true)).cambiadas).toEqual([]));
});
