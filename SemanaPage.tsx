import { CalendarDays } from "lucide-react";
import EnConstruccion from "./EnConstruccion";

export default function SemanaPage() {
  return (
    <EnConstruccion
      titulo="Mi semana"
      fase={3}
      icono={CalendarDays}
      descripcion="Aquí verás el anillo de progreso, las horas de cada día con su gráfico de barras y el botón para fichar."
    />
  );
}
