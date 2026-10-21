import { describe, expect, it } from "vitest";
import { crearCopia, leerCopia, nombreArchivoCopia } from "./copia";
import { semanaNueva } from "./calculos";
import { AJUSTES_INICIALES } from "./baseDatos";

describe("Copias de seguridad", () => {
  const semana = semanaNueva(new Date(2026, 9, 19), 35, true);
  semana.dias[0] = { entrada: "08:00", salida: "15:00", pausa: 0, tipo: "trabajo" };

  it("una copia exportada se puede volver a importar igual", () => {
    const texto = JSON.stringify(crearCopia([semana], AJUSTES_INICIALES, { "2026": { vacacionesDias: 22, apMinutos: 900, apRecuperablesMinutos: 0, drMinutos: 300 } }, {}, [], new Date(2026, 9, 21)));
    const r = leerCopia(texto);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.copia.semanas).toEqual([semana]);
      expect(r.copia.saldos["2026"]?.vacacionesDias).toBe(22);
    }
  });
  it("rechaza un archivo que no es JSON", () => expect(leerCopia("hola").ok).toBe(false));
  it("rechaza un JSON de otra aplicación", () => expect(leerCopia('{"semanas": []}').ok).toBe(false));
  it("rechaza una copia con una semana dañada", () => {
    const mala = { aplicacion: "mi-jornada", semanas: [{ ...semana, jornada: 40 }] };
    expect(leerCopia(JSON.stringify(mala)).ok).toBe(false);
  });
  it("el nombre del archivo lleva la fecha", () =>
    expect(nombreArchivoCopia(new Date(2026, 9, 21))).toBe("mi-jornada-copia-2026-10-21.json"));
});
