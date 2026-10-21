import { CalendarDays, CalendarRange, History, Settings, type LucideIcon } from "lucide-react";

export type Pantalla = "semana" | "mes" | "historial" | "ajustes";

export const PANTALLAS: { id: Pantalla; nombre: string; icono: LucideIcon }[] = [
  { id: "semana", nombre: "Semana", icono: CalendarDays },
  { id: "mes", nombre: "Mes", icono: CalendarRange },
  { id: "historial", nombre: "Historial", icono: History },
  { id: "ajustes", nombre: "Ajustes", icono: Settings },
];
