import { CalendarDays, CalendarRange, History, Settings, Wallet, NotebookPen, Phone, type LucideIcon } from "lucide-react";

export type Pantalla = "semana" | "agenda" | "extensiones" | "saldos" | "mes" | "historial" | "ajustes";

/** "principal" = sale en el menú de abajo del móvil; el resto va dentro de "Más". */
export const PANTALLAS: { id: Pantalla; nombre: string; icono: LucideIcon; principal: boolean }[] = [
  { id: "semana", nombre: "Semana", icono: CalendarDays, principal: true },
  { id: "agenda", nombre: "Agenda", icono: NotebookPen, principal: true },
  { id: "extensiones", nombre: "Teléfonos", icono: Phone, principal: true },
  { id: "saldos", nombre: "Saldos", icono: Wallet, principal: true },
  { id: "mes", nombre: "Mes", icono: CalendarRange, principal: false },
  { id: "historial", nombre: "Historial", icono: History, principal: false },
  { id: "ajustes", nombre: "Ajustes", icono: Settings, principal: false },
];
