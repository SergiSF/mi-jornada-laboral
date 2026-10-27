import { describe, expect, it } from "vitest";
import { buscar, leerListado, separarNumeros, type Extension } from "./extensiones";
import { ordenarNotas, arrastrarPendientes, primerLaborable, diasLaborablesEntre, buscarEnAgenda, ordenarIncidencias, buscarIncidencias, type Agenda } from "./agenda";

const lista: Extension[] = [
  { id: "1", area: "Mòdul 1", nombre: "Consulta Mèdica", numeros: ["3604"] },
  { id: "2", area: "Edifici A2", nombre: "Cap RRHH", numeros: ["3566"] },
  { id: "3", area: "Edifici A2", nombre: "Oficina RRHH", numeros: ["3552", "3536"] },
  { id: "4", area: "Infermeria", nombre: "Director Mèdic", numeros: ["3209"] },
];

describe("Buscador de extensiones", () => {
  it("busca por la inicial", () => expect(buscar(lista, "c").map((e) => e.id)).toEqual(["2", "1"]));
  it("no tiene en cuenta acentos ni mayúsculas", () => expect(buscar(lista, "MEDIC").map((e) => e.id)).toEqual(["1", "4"]));
  it("busca por palabra dentro del nombre", () => expect(buscar(lista, "rrhh").map((e) => e.id)).toEqual(["2", "3"]));
  it("busca por número", () => expect(buscar(lista, "355").map((e) => e.id)).toEqual(["3"]));
  it("busca por zona", () => expect(buscar(lista, "inferm").map((e) => e.id)).toEqual(["4"]));
  it("separa varios números", () => expect(separarNumeros("3600/3601 3602")).toEqual(["3600", "3601", "3602"]));
  it("rechaza un archivo que no es un listado", () => expect(leerListado('{"a":1}').ok).toBe(false));
});

describe("Agenda", () => {
  const n = (id: string, hora: string, creada: number, hecha = false) => ({ id, texto: `Nota ${id}`, hora, hecha, creada });
  it("ordena primero por hora y luego por orden de creación", () =>
    expect(ordenarNotas([n("a", "", 1), n("b", "10:00", 2), n("c", "09:00", 3), n("d", "", 0)]).map((x) => x.id)).toEqual(["c", "b", "d", "a"]));
  it("pasa las tareas sin hacer de días anteriores a hoy y recuerda de qué día vienen", () => {
    const agenda: Agenda = { "2026-10-19": [n("a", "", 1), n("b", "", 2, true)], "2026-10-21": [n("c", "", 3)], "2026-10-23": [n("d", "", 4)] };
    const r = arrastrarPendientes(agenda, "2026-10-21");
    expect(r.movidas).toBe(1);
    expect(r.agenda["2026-10-19"]?.map((x) => x.id)).toEqual(["b"]); // las hechas se quedan en su día
    expect(r.agenda["2026-10-21"]?.map((x) => [x.id, x.origen])).toEqual([["c", undefined], ["a", "2026-10-19"]]);
    expect(r.agenda["2026-10-23"]?.map((x) => x.id)).toEqual(["d"]); // los días futuros no se tocan
  });
  it("si hoy es sábado, las tareas del viernes pasan al lunes", () => {
    const r = arrastrarPendientes({ "2026-10-23": [n("a", "", 1)] }, "2026-10-24");
    expect(Object.keys(r.agenda)).toEqual(["2026-10-26"]);
  });
  it("una tarea que se va pasando conserva el día en que se apuntó", () => {
    const una = arrastrarPendientes({ "2026-10-19": [n("a", "", 1)] }, "2026-10-20").agenda;
    const dos = arrastrarPendientes(una, "2026-10-22").agenda;
    expect(dos["2026-10-22"]?.[0]?.origen).toBe("2026-10-19");
  });
  it("sin tareas pendientes no cambia nada", () => {
    const agenda: Agenda = { "2026-10-19": [n("a", "", 1, true)] };
    expect(arrastrarPendientes(agenda, "2026-10-21").agenda).toBe(agenda);
  });
  it("el primer día laborable desde un domingo es el lunes", () => expect(primerLaborable("2026-10-25")).toBe("2026-10-26"));
  it("cuenta los días laborables entre dos fechas", () => expect(diasLaborablesEntre("2026-10-23", "2026-10-27")).toBe(2));
  it("busca texto en toda la agenda", () =>
    expect(buscarEnAgenda({ "2026-10-20": [{ ...n("a", "", 1), texto: "Llamar a Gestió Econòmica" }] }, "economica")).toHaveLength(1));
});

describe("Incidencias servicio", () => {
  const inc = (id: string, hora: string, creada: number, texto = id) => ({ id, texto, hora, creada });
  it("se ordenan por hora y las que no tienen hora van al final", () =>
    expect(ordenarIncidencias([inc("a", "", 1), inc("b", "12:10", 2), inc("c", "08:45", 3)]).map((x) => x.id)).toEqual(["c", "b", "a"]));
  it("se pueden buscar sin tener en cuenta acentos", () =>
    expect(buscarIncidencias({ "2026-10-27": [inc("a", "09:00", 1, "Caída del sistema de fichaje en el Mòdul 3")] }, "modul")).toHaveLength(1));
  it("no se pasan al día siguiente como las tareas", () => {
    // las incidencias van en su propio apartado; arrastrarPendientes solo mueve tareas de la agenda
    expect(arrastrarPendientes({}, "2026-10-28").movidas).toBe(0);
  });
});
