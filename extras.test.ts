import { describe, expect, it } from "vitest";
import { buscar, leerListado, separarNumeros, type Extension } from "./extensiones";
import { ordenarNotas, pendientesAnteriores, buscarEnAgenda, type Agenda } from "./agenda";

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
  it("encuentra las tareas sin hacer de días anteriores", () => {
    const agenda: Agenda = { "2026-10-19": [n("a", "", 1), n("b", "", 2, true)], "2026-10-21": [n("c", "", 3)] };
    expect(pendientesAnteriores(agenda, "2026-10-21").map((x) => x.nota.id)).toEqual(["a"]);
  });
  it("busca texto en toda la agenda", () =>
    expect(buscarEnAgenda({ "2026-10-20": [{ ...n("a", "", 1), texto: "Llamar a Gestió Econòmica" }] }, "economica")).toHaveLength(1));
});
