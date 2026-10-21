import { CalendarDays, CalendarRange, History, Settings, Wallet, type LucideIcon } from "lucide-react";

export type Pantalla = "semana" | "mes" | "historial" | "saldos" | "ajustes";

export const PANTALLAS: { id: Pantalla; nombre: string; icono: LucideIcon }[] = [
  { id: "semana", nombre: "Semana", icono: CalendarDays },
  { id: "mes", nombre: "Mes", icono: CalendarRange },
  { id: "historial", nombre: "Historial", icono: History },
  { id: "saldos", nombre: "Saldos", icono: Wallet },
  { id: "ajustes", nombre: "Ajustes", icono: Settings },
];
