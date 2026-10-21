// Copias de seguridad: convertir los datos en un archivo JSON y leerlos de vuelta.
import type { Jornada, RegistroDia, Semana, TipoDia } from "./calculos";
import { AJUSTES_INICIALES, type Ajustes } from "./baseDatos";

export type Copia = {
  aplicacion: "mi-jornada";
  version: 1;
  exportado: string;
  ajustes: Ajustes;
  semanas: Semana[];
};

export function crearCopia(semanas: Semana[], ajustes: Ajustes, ahora: Date): Copia {
  return {
    aplicacion: "mi-jornada",
    version: 1,
    exportado: ahora.toISOString(),
    ajustes,
    semanas: [...semanas].sort((a, b) => a.lunes.localeCompare(b.lunes)),
  };
}

const TIPOS: TipoDia[] = ["trabajo", "festivo", "vacaciones", "asuntos-propios", "baja"];
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const esHora = (v: unknown) => typeof v === "string" && (v === "" || /^\d{1,2}:\d{2}$/.test(v));
const esJornada = (v: unknown): v is Jornada => v === 35 || v === 37.5;

function leerDia(v: unknown): RegistroDia | null {
  if (!esObjeto(v)) return null;
  if (!esHora(v.entrada) || !esHora(v.salida)) return null;
  if (typeof v.pausa !== "number" || !TIPOS.includes(v.tipo as TipoDia)) return null;
  const dia: RegistroDia = { entrada: v.entrada as string, salida: v.salida as string, pausa: v.pausa, tipo: v.tipo as TipoDia };
  if (v.minutosAsuntosPropios !== undefined) {
    if (typeof v.minutosAsuntosPropios !== "number") return null;
    dia.minutosAsuntosPropios = v.minutosAsuntosPropios;
  }
  return dia;
}

function leerSemana(v: unknown): Semana | null {
  if (!esObjeto(v)) return null;
  if (typeof v.lunes !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.lunes)) return null;
  if (!esJornada(v.jornada) || typeof v.contarAusencias !== "boolean") return null;
  if (!Array.isArray(v.dias) || v.dias.length !== 5) return null;
  const dias = v.dias.map(leerDia);
  if (dias.some((d) => d === null)) return null;
  return { lunes: v.lunes, jornada: v.jornada, contarAusencias: v.contarAusencias, dias: dias as RegistroDia[] };
}

/** Comprueba que un texto es una copia válida. Devuelve la copia o un mensaje de error. */
export function leerCopia(texto: string): { ok: true; copia: Copia } | { ok: false; error: string } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es una copia de Mi Jornada (no se puede leer)." };
  }
  if (!esObjeto(datos) || datos.aplicacion !== "mi-jornada") {
    return { ok: false, error: "El archivo no es una copia de Mi Jornada." };
  }
  if (!Array.isArray(datos.semanas)) return { ok: false, error: "La copia no contiene semanas." };
  const semanas = datos.semanas.map(leerSemana);
  const malas = semanas.filter((s) => s === null).length;
  if (malas > 0) return { ok: false, error: `La copia tiene ${malas} semana(s) dañadas. No se ha importado nada.` };

  const a = esObjeto(datos.ajustes) ? datos.ajustes : {};
  const ajustes: Ajustes = {
    jornadaPorDefecto: esJornada(a.jornadaPorDefecto) ? a.jornadaPorDefecto : AJUSTES_INICIALES.jornadaPorDefecto,
    contarPorDefecto: typeof a.contarPorDefecto === "boolean" ? a.contarPorDefecto : AJUSTES_INICIALES.contarPorDefecto,
    ejemploVisto: true,
  };
  return {
    ok: true,
    copia: {
      aplicacion: "mi-jornada",
      version: 1,
      exportado: typeof datos.exportado === "string" ? datos.exportado : "",
      ajustes,
      semanas: semanas as Semana[],
    },
  };
}

export function nombreArchivoCopia(ahora: Date): string {
  const f = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  return `mi-jornada-copia-${f}.json`;
}
