// Agenda de trabajo: notas y tareas de cada día.

export type Nota = { id: string; texto: string; hora: string; hecha: boolean; creada: number };
export type Agenda = Record<string, Nota[]>; // clave: fecha "2026-10-21"

/** Ordena: primero las que tienen hora (por hora), luego el resto en el orden en que se crearon. */
export function ordenarNotas(notas: Nota[]): Nota[] {
  return [...notas].sort((a, b) => {
    if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
    if (a.hora) return -1;
    if (b.hora) return 1;
    return a.creada - b.creada;
  });
}

/** Tareas sin hacer de días anteriores a la fecha indicada. */
export function pendientesAnteriores(agenda: Agenda, fechaISO: string): { fecha: string; nota: Nota }[] {
  return Object.entries(agenda)
    .filter(([f]) => f < fechaISO)
    .flatMap(([fecha, notas]) => notas.filter((n) => !n.hecha).map((nota) => ({ fecha, nota })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Busca texto en toda la agenda (sin tener en cuenta acentos ni mayúsculas). */
export function buscarEnAgenda(agenda: Agenda, consulta: string): { fecha: string; nota: Nota }[] {
  const q = consulta.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (!q) return [];
  return Object.entries(agenda)
    .flatMap(([fecha, notas]) => notas.map((nota) => ({ fecha, nota })))
    .filter(({ nota }) => nota.texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
