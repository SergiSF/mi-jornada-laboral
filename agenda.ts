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

/** Turnos del servicio. */
export type Turno = "manana" | "tarde" | "noche";
export const NOMBRE_TURNO: Record<Turno, string> = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };
const ORDEN_TURNO: Record<Turno, string> = { manana: "07:00", tarde: "15:00", noche: "23:00" };

/**
 * Incidencia del servicio: lo que ha pasado durante el día (no es una tarea, no se marca ni se pasa a otro día).
 * - turno y franja (hora = desde, hasta): cuándo ha pasado
 * - texto: el comentario libre
 */
export type Incidencia = { id: string; turno?: Turno; hora: string; hasta?: string; texto: string; creada: number };
export type Incidencias = Record<string, Incidencia[]>; // clave: fecha "2026-10-27"

/** Hora con la que se ordena: el inicio de la franja o, si no hay, el inicio del turno. */
const claveOrden = (i: Incidencia) => i.hora || (i.turno ? ORDEN_TURNO[i.turno] : "");

/** Ordena las incidencias por hora (o turno); las que no tienen ninguna de las dos, al final. */
export function ordenarIncidencias(lista: Incidencia[]): Incidencia[] {
  return [...lista].sort((a, b) => {
    const ka = claveOrden(a), kb = claveOrden(b);
    if (ka && kb) return ka.localeCompare(kb) || a.creada - b.creada;
    if (ka) return -1;
    if (kb) return 1;
    return a.creada - b.creada;
  });
}

/** "Mañana · 08:45–09:30", "08:45", "Tarde"… o "" si no hay datos. */
export function cuandoIncidencia(i: Incidencia): string {
  const franja = i.hora && i.hasta ? `${i.hora}–${i.hasta}` : i.hora || (i.hasta ? `hasta ${i.hasta}` : "");
  return [i.turno ? NOMBRE_TURNO[i.turno] : "", franja].filter(Boolean).join(" · ");
}

/** Busca texto en todas las incidencias (sin acentos ni mayúsculas), las más recientes primero. */
export function buscarIncidencias(incidencias: Incidencias, consulta: string): { fecha: string; incidencia: Incidencia }[] {
  const limpiar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = limpiar(consulta).trim();
  if (!q) return [];
  return Object.entries(incidencias)
    .flatMap(([fecha, lista]) => lista.map((incidencia) => ({ fecha, incidencia })))
    .filter(({ incidencia }) => limpiar(incidencia.texto).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
