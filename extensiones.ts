// Listado de extensiones telefónicas: se importa desde un archivo y se guarda solo en el dispositivo.

export type Extension = { id: string; area: string; nombre: string; numeros: string[] };

/** Quita acentos y mayúsculas para buscar: "Mèdica" y "medica" son lo mismo. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Busca por nombre, zona o número.
 * Primero salen las que empiezan por lo escrito (por ejemplo, "c" → Cab. Control, Cap…),
 * después las que tienen alguna palabra que empieza así, y al final las que lo contienen.
 */
export function buscar(lista: Extension[], consulta: string): Extension[] {
  const q = normalizar(consulta);
  if (!q) return lista;
  const puntuadas = lista
    .map((e) => {
      const nombre = normalizar(e.nombre);
      const area = normalizar(e.area);
      const palabras = `${nombre} ${area}`.split(/[\s/().,-]+/);
      let p = 0;
      if (e.numeros.some((n) => n.startsWith(q))) p = 4;
      else if (nombre.startsWith(q)) p = 3;
      else if (palabras.some((w) => w.startsWith(q))) p = 2;
      else if (q.length >= 2 && (nombre.includes(q) || area.includes(q))) p = 1; // con una sola letra, solo iniciales
      return { e, p };
    })
    .filter((x) => x.p > 0);
  puntuadas.sort((a, b) => b.p - a.p || a.e.nombre.localeCompare(b.e.nombre, "es"));
  return puntuadas.map((x) => x.e);
}

/** Agrupa por zona manteniendo el orden. */
export function agruparPorZona(lista: Extension[]): [string, Extension[]][] {
  const mapa = new Map<string, Extension[]>();
  for (const e of lista) mapa.set(e.area, [...(mapa.get(e.area) ?? []), e]);
  return [...mapa.entries()];
}

let contador = 0;
export const nuevoId = () => `${Date.now().toString(36)}-${(contador++).toString(36)}`;

/** Lee el archivo de extensiones. Devuelve la lista o un mensaje de error. */
export function leerListado(texto: string): { ok: true; lista: Extension[] } | { ok: false; error: string } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no se puede leer." };
  }
  const d = datos as { aplicacion?: unknown; extensiones?: unknown };
  if (typeof d !== "object" || d === null || d.aplicacion !== "mi-jornada-extensiones" || !Array.isArray(d.extensiones)) {
    return { ok: false, error: "El archivo no es un listado de extensiones de Mi Jornada." };
  }
  const lista: Extension[] = [];
  for (const x of d.extensiones as unknown[]) {
    const e = x as Partial<Extension>;
    if (typeof e?.area !== "string" || typeof e.nombre !== "string" || !Array.isArray(e.numeros)) {
      return { ok: false, error: "El listado tiene alguna línea dañada. No se ha importado nada." };
    }
    lista.push({ id: nuevoId(), area: e.area, nombre: e.nombre, numeros: e.numeros.map(String) });
  }
  return { ok: true, lista };
}

/** Convierte "3600/3601 3602" en ["3600", "3601", "3602"]. */
export function separarNumeros(texto: string): string[] {
  return texto.split(/[\s/,;]+/).map((n) => n.trim()).filter(Boolean);
}
