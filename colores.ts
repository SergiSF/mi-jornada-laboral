import type { EstadoDia, TipoDia } from "./calculos";

/** Colores y textos de cada estado, iguales en toda la aplicación. */
export const ESTADO: Record<EstadoDia, { texto: string; chip: string; barra: string }> = {
  "sin-registrar": { texto: "Sin registrar", chip: "bg-fondo text-suave border border-borde", barra: "fill-borde" },
  pendiente: { texto: "Pendiente", chip: "bg-pendiente/15 text-pendiente", barra: "fill-pendiente" },
  cumplido: { texto: "Cumplido", chip: "bg-cumplido/15 text-cumplido", barra: "fill-cumplido" },
  exceso: { texto: "Exceso", chip: "bg-cumplido/15 text-cumplido", barra: "fill-cumplido" },
  ausencia: { texto: "Ausencia", chip: "bg-ausencia/15 text-ausencia", barra: "fill-ausencia" },
};

/**
 * Colores de los tipos de día en la vista mensual:
 * festivo en verde; vacaciones, AP y AP recuperables en naranja; DR en rojo; baja o permiso en gris; libranza en violeta.
 */
export const COLOR_TIPO: Partial<Record<TipoDia, { celda: string; texto: string; muestra: string }>> = {
  festivo: { celda: "bg-festivo/20 ring-2 ring-inset ring-festivo", texto: "text-festivo", muestra: "bg-festivo" },
  vacaciones: { celda: "bg-naranja/20 ring-2 ring-inset ring-naranja", texto: "text-naranja", muestra: "bg-naranja" },
  "asuntos-propios": { celda: "bg-naranja/20 ring-2 ring-inset ring-naranja", texto: "text-naranja", muestra: "bg-naranja" },
  "ap-recuperables": { celda: "bg-naranja/20 ring-2 ring-inset ring-naranja", texto: "text-naranja", muestra: "bg-naranja" },
  dr: { celda: "bg-rojo/20 ring-2 ring-inset ring-rojo", texto: "text-rojo", muestra: "bg-rojo" },
  baja: { celda: "bg-gris/25 ring-2 ring-inset ring-gris", texto: "text-gris", muestra: "bg-gris" },
  libranza: { celda: "bg-ausencia/20 ring-2 ring-inset ring-ausencia", texto: "text-ausencia", muestra: "bg-ausencia" },
};

/** Nombre corto para que quepa en la celda del mes. */
export const NOMBRE_CORTO: Partial<Record<TipoDia, string>> = {
  festivo: "Festivo",
  vacaciones: "Vacaciones",
  "asuntos-propios": "AP",
  "ap-recuperables": "AP recup.",
  dr: "DR",
  baja: "Baja/permiso",
  libranza: "Libranza",
};

/** Nombre aún más corto para la celda del mes en el móvil. */
export const NOMBRE_MINI: Partial<Record<TipoDia, string>> = {
  festivo: "Fest.",
  vacaciones: "Vac.",
  "asuntos-propios": "AP",
  "ap-recuperables": "APR",
  dr: "DR",
  baja: "Baja",
  libranza: "Libr.",
};
