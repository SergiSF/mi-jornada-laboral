// Pruebas automáticas del motor de cálculo.
// Para ejecutarlas, escribe en la terminal:  npm test
import { describe, expect, it } from "vitest";
import {
  aMinutos,
  balanceAcumulado,
  calcularDia,
  calcularSemana,
  ficharAhora,
  formatoHoras,
  lunesDe,
  fechaISO,
  objetivoDiario,
  resumenSemanal,
  semanaNueva,
  type RegistroDia,
  type Semana,
} from "./calculos";

const trabajo = (entrada: string, salida: string, pausa = 0): RegistroDia => ({ entrada, salida, pausa, tipo: "trabajo" });
const vacio = (): RegistroDia => ({ entrada: "", salida: "", pausa: 0, tipo: "trabajo" });

describe("Regla 1 y 2: jornada y objetivo diario", () => {
  it("35 h son 7 h al día", () => expect(formatoHoras(objetivoDiario(35))).toBe("7 h 00 min"));
  it("37,5 h son 7 h 30 min al día", () => expect(formatoHoras(objetivoDiario(37.5))).toBe("7 h 30 min"));
  it("una semana nueva usa la jornada por defecto y tiene 5 días vacíos", () => {
    const s = semanaNueva(new Date(2026, 9, 21), 35, true);
    expect(s.jornada).toBe(35);
    expect(s.lunes).toBe("2026-10-19");
    expect(s.dias).toHaveLength(5);
  });
});

describe("Regla 3 y 4: horas del día", () => {
  it("08:00 a 15:30 sin pausa son 7 h 30 min", () => expect(calcularDia(trabajo("08:00", "15:30"), 37.5, true).minutos).toBe(450));
  it("08:00 a 16:00 con 30 min de pausa son 7 h 30 min", () =>
    expect(calcularDia(trabajo("08:00", "16:00", 30), 37.5, true).minutos).toBe(450));
  it("lee horas escritas con un solo dígito", () => expect(aMinutos("8:05")).toBe(485));
  it("rechaza horas imposibles", () => expect(aMinutos("25:00")).toBeNull());
});

describe("Regla 5 y 6: festivos, vacaciones y bajas", () => {
  const festivo: RegistroDia = { entrada: "", salida: "", pausa: 0, tipo: "festivo" };
  it("con la opción activada cuentan como el objetivo diario", () => expect(calcularDia(festivo, 37.5, true).minutos).toBe(450));
  it("con la opción desactivada cuentan 0", () => expect(calcularDia(festivo, 37.5, false).minutos).toBe(0));
  it("ignoran las horas escritas", () =>
    expect(calcularDia({ ...trabajo("08:00", "20:00"), tipo: "vacaciones" }, 35, true).minutos).toBe(420));
  it("su estado es ausencia", () => expect(calcularDia(festivo, 35, true).estado).toBe("ausencia"));
});

describe("Regla 7: validaciones", () => {
  it("falta la salida", () => expect(calcularDia(trabajo("08:00", ""), 35, true).error).toBe("incompleto"));
  it("salida anterior a la entrada", () => expect(calcularDia(trabajo("15:00", "08:00"), 35, true).error).toBe("salida-anterior"));
  it("salida igual a la entrada", () => expect(calcularDia(trabajo("08:00", "08:00"), 35, true).error).toBe("salida-anterior"));
  it("pausa negativa", () => expect(calcularDia(trabajo("08:00", "15:00", -10), 35, true).error).toBe("pausa-invalida"));
  it("pausa más larga que el tiempo trabajado", () =>
    expect(calcularDia(trabajo("08:00", "09:00", 90), 35, true).error).toBe("pausa-excesiva"));
  it("un día con error no suma horas", () => expect(calcularDia(trabajo("15:00", "08:00"), 35, true).minutos).toBe(0));
});

describe("Regla 8: estado de cada día", () => {
  it("sin datos: sin registrar", () => expect(calcularDia(vacio(), 37.5, true).estado).toBe("sin-registrar"));
  it("por debajo del objetivo: pendiente", () => expect(calcularDia(trabajo("08:00", "15:00"), 37.5, true).estado).toBe("pendiente"));
  it("justo el objetivo: cumplido", () => expect(calcularDia(trabajo("08:00", "15:30"), 37.5, true).estado).toBe("cumplido"));
  it("por encima del objetivo: exceso", () => expect(calcularDia(trabajo("08:00", "16:00"), 37.5, true).estado).toBe("exceso"));
});

describe("Regla 9: totales de la semana (ejemplo del prototipo)", () => {
  const semana: Semana = {
    lunes: "2026-10-19",
    jornada: 37.5,
    contarAusencias: true,
    dias: [trabajo("08:00", "15:00"), trabajo("08:00", "15:30"), trabajo("08:00", "14:30"), trabajo("08:00", "15:00"), vacio()],
  };
  const r = calcularSemana(semana);
  it("computa 28 h 00 min", () => expect(formatoHoras(r.computado)).toBe("28 h 00 min"));
  it("faltan 9 h 30 min", () => expect(formatoHoras(r.faltan)).toBe("9 h 30 min"));
  it("el progreso es 75 %", () => expect(r.porcentaje).toBe(75));
  it("el balance es −9 h 30 min", () => expect(formatoHoras(r.balance, true)).toBe("−9 h 30 min"));
  it("si te pasas, sobran horas y el progreso no supera 100 %", () => {
    const larga = calcularSemana({ ...semana, dias: Array.from({ length: 5 }, () => trabajo("08:00", "16:00")) });
    expect(formatoHoras(larga.sobran)).toBe("2 h 30 min");
    expect(larga.faltan).toBe(0);
    expect(larga.porcentaje).toBe(100);
  });
});

describe("Regla 10: bolsa de horas", () => {
  const conBalance = (lunes: string, salida: string): Semana => ({
    lunes,
    jornada: 35,
    contarAusencias: true,
    dias: Array.from({ length: 5 }, () => trabajo("08:00", salida)),
  });
  it("suma las semanas terminadas y no cuenta la semana en curso", () => {
    const semanas = [
      conBalance("2026-10-05", "15:30"), // +2 h 30
      conBalance("2026-10-12", "14:30"), // −2 h 30 (compensa la anterior)
      conBalance("2026-10-19", "08:30"), // semana actual: no cuenta
    ];
    expect(balanceAcumulado(semanas, new Date(2026, 9, 21))).toBe(0);
  });
});

describe("Fechas y fichaje", () => {
  it("el lunes del miércoles 21/10/2026 es el 19", () => expect(fechaISO(lunesDe(new Date(2026, 9, 21)))).toBe("2026-10-19"));
  it("el domingo pertenece a la semana anterior", () => expect(fechaISO(lunesDe(new Date(2026, 9, 25)))).toBe("2026-10-19"));
  it("fichar sin entrada rellena la entrada", () => expect(ficharAhora(vacio(), new Date(2026, 9, 21, 8, 2)).entrada).toBe("08:02"));
  it("fichar con entrada rellena la salida", () =>
    expect(ficharAhora(trabajo("08:02", ""), new Date(2026, 9, 21, 15, 31)).salida).toBe("15:31"));
});

describe("Resumen para copiar", () => {
  it("incluye el total y el balance", () => {
    const s = semanaNueva(new Date(2026, 9, 19), 35, true);
    s.dias[0] = trabajo("08:00", "15:00");
    const texto = resumenSemanal(s);
    expect(texto).toContain("Total: 7 h 00 min / 35 h 00 min");
    expect(texto).toContain("Balance: −28 h 00 min");
  });
});

describe("Asuntos propios por horas", () => {
  const ap = (minutos: number, entrada = "", salida = ""): RegistroDia => ({ entrada, salida, pausa: 0, tipo: "asuntos-propios", minutosAsuntosPropios: minutos });
  it("cuenta solo las horas que te coges, no la jornada completa", () => expect(calcularDia(ap(180), 37.5, true).minutos).toBe(180));
  it("no depende de la casilla de contar ausencias", () => expect(calcularDia(ap(180), 37.5, false).minutos).toBe(180));
  it("suma la parte trabajada: 08:00–12:30 más 3 h son 7 h 30 min", () =>
    expect(calcularDia(ap(180, "08:00", "12:30"), 37.5, true).minutos).toBe(450));
  it("avisa si no has indicado las horas", () => expect(calcularDia(ap(0), 37.5, true).error).toBe("ap-sin-horas"));
  it("fichar en un día de asuntos propios no cambia el tipo de día", () =>
    expect(ficharAhora(ap(120), new Date(2026, 9, 21, 10, 0)).tipo).toBe("asuntos-propios"));
  it("el resumen indica las horas de asuntos propios", () => {
    const s = semanaNueva(new Date(2026, 9, 19), 35, true);
    s.dias[0] = ap(180);
    expect(resumenSemanal(s)).toContain("asuntos propios 3 h 00 min");
  });
});
