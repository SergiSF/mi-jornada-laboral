import { CalendarRange } from "lucide-react";
import EnConstruccion from "./EnConstruccion";

export default function MesPage() {
  return (
    <EnConstruccion
      titulo="Vista mensual"
      fase={5}
      icono={CalendarRange}
      descripcion="Un calendario de colores donde cada día se ve más intenso cuantas más horas hayas hecho, con el total del mes."
    />
  );
}
