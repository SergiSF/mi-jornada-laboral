import { History } from "lucide-react";
import EnConstruccion from "./EnConstruccion";

export default function HistorialPage() {
  return (
    <EnConstruccion
      titulo="Historial"
      fase={5}
      icono={History}
      descripcion="Todas tus semanas con la jornada, las horas hechas y el balance, y la evolución de tu bolsa de horas."
    />
  );
}
