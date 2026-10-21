import type { EstadoDia } from "./calculos";

/** Colores y textos de cada estado, iguales en toda la aplicación. */
export const ESTADO: Record<EstadoDia, { texto: string; chip: string; barra: string }> = {
  "sin-registrar": { texto: "Sin registrar", chip: "bg-fondo text-suave border border-borde", barra: "fill-borde" },
  pendiente: { texto: "Pendiente", chip: "bg-pendiente/15 text-pendiente", barra: "fill-pendiente" },
  cumplido: { texto: "Cumplido", chip: "bg-cumplido/15 text-cumplido", barra: "fill-cumplido" },
  exceso: { texto: "Exceso", chip: "bg-cumplido/15 text-cumplido", barra: "fill-cumplido" },
  ausencia: { texto: "Ausencia", chip: "bg-ausencia/15 text-ausencia", barra: "fill-ausencia" },
};
