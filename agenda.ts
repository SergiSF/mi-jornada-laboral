// Agenda de trabajo: notas y tareas de cada día.

export type Nota = {
  id: string;
  texto: string;
  hora: string;
  hecha: boolean;
  creada: number;
  origen?: string; // día en que se apuntó por primera vez, si se ha ido pasando de un día a otro
};
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

const aISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Primer día de lunes a viernes a partir de esa fecha (incluida). Sábado y domingo pasan al lunes. */
export function primerLaborable(fechaISO: string): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  while (f.getDay() === 0 || f.getDay() === 6) f.setDate(f.getDate() + 1);
  return aISO(f);
}

/**
 * Pasa las tareas sin hacer de días anteriores a hoy al siguiente día laborable
 * (hoy, o el lunes si hoy es fin de semana). Guarda en "origen" el día en que se apuntaron.
 * Devuelve la agenda nueva y cuántas tareas se han movido.
 */
export function arrastrarPendientes(agenda: Agenda, hoyISO: string): { agenda: Agenda; movidas: number } {
  const destino = primerLaborable(hoyISO);
  const nueva: Agenda = {};
  const llegan: Nota[] = [];
  for (const [fecha, notas] of Object.entries(agenda)) {
    if (fecha >= hoyISO) {
      nueva[fecha] = [...(nueva[fecha] ?? []), ...notas];
      continue;
    }
    const quedan = notas.filter((n) => n.hecha);
    for (const n of notas.filter((x) => !x.hecha)) llegan.push({ ...n, origen: n.origen ?? fecha });
    if (quedan.length) nueva[fecha] = quedan;
  }
  if (llegan.length) nueva[destino] = [...(nueva[destino] ?? []), ...llegan];
  return { agenda: llegan.length ? nueva : agenda, movidas: llegan.length };
}

/** Días laborables entre dos fechas (sin contar la primera). Sirve para "lleva 3 días pendiente". */
export function diasLaborablesEntre(desdeISO: string, hastaISO: string): number {
  const [a, m, d] = desdeISO.split("-").map(Number);
  const f = new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  let n = 0;
  while (aISO(f) < hastaISO) {
    f.setDate(f.getDate() + 1);
    if (f.getDay() !== 0 && f.getDay() !== 6) n++;
  }
  return n;
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

/** Incidencia del servicio: lo que ha pasado durante el día (no es una tarea, no se marca ni se pasa a otro día). */
export type Incidencia = { id: string; texto: string; hora: string; creada: number };
export type Incidencias = Record<string, Incidencia[]>; // clave: fecha "2026-10-27"

/** Ordena las incidencias por hora; las que no tienen hora, al final en el orden en que se apuntaron. */
export function ordenarIncidencias(lista: Incidencia[]): Incidencia[] {
  return [...lista].sort((a, b) => {
    if (a.hora && b.hora) return a.hora.localeCompare(b.hora) || a.creada - b.creada;
    if (a.hora) return -1;
    if (b.hora) return 1;
    return a.creada - b.creada;
  });
}

/** Busca texto en todas las incidencias (sin acentos ni mayúsculas), las más recientes primero. */
export function buscarIncidencias(incidencias: Incidencias, consulta: string): { fecha: string; incidencia: Incidencia }[] {
  const limpiar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = limpiar(consulta).trim();
  if (!q) return [];
  return Object.entries(incidencias)
    .flatMap(([fecha, lista]) => lista.map((incidencia) => ({ fecha, incidencia })))
    .filter(({ incidencia }) => limpiar(incidencia.texto).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
