// Guarda las semanas mientras la aplicación está abierta.
// En la fase 4 este archivo pasará a guardarlas en el dispositivo.
import { useCallback, useState } from "react";
import { fechaISO, lunesDe, semanaNueva, type Jornada, type Semana } from "./calculos";

function semanaDeEjemplo(): Semana {
  const s = semanaNueva(new Date(), 37.5, true);
  s.dias = [
    { entrada: "08:00", salida: "15:00", pausa: 0, tipo: "trabajo" },
    { entrada: "08:00", salida: "15:30", pausa: 0, tipo: "trabajo" },
    { entrada: "08:00", salida: "14:30", pausa: 0, tipo: "trabajo" },
    { entrada: "08:00", salida: "15:00", pausa: 0, tipo: "trabajo" },
    { entrada: "", salida: "", pausa: 0, tipo: "trabajo" },
  ];
  return s;
}

export type Almacen = {
  obtener: (lunes: Date) => Semana;
  guardar: (semana: Semana) => void;
  hayEjemplo: boolean;
  borrarEjemplo: () => void;
};

export function useSemanas(): Almacen {
  const [semanas, setSemanas] = useState<Record<string, Semana>>(() => {
    const e = semanaDeEjemplo();
    return { [e.lunes]: e };
  });
  const [hayEjemplo, setHayEjemplo] = useState(true);
  const [jornadaPorDefecto, setJornadaPorDefecto] = useState<Jornada>(37.5);
  const [contarPorDefecto, setContarPorDefecto] = useState(true);

  const obtener = useCallback(
    (lunes: Date) => semanas[fechaISO(lunesDe(lunes))] ?? semanaNueva(lunes, jornadaPorDefecto, contarPorDefecto),
    [semanas, jornadaPorDefecto, contarPorDefecto],
  );

  const guardar = useCallback((semana: Semana) => {
    setSemanas((prev) => ({ ...prev, [semana.lunes]: semana }));
    setJornadaPorDefecto(semana.jornada);
    setContarPorDefecto(semana.contarAusencias);
    setHayEjemplo(false);
  }, []);

  const borrarEjemplo = useCallback(() => {
    setSemanas({});
    setHayEjemplo(false);
  }, []);

  return { obtener, guardar, hayEjemplo, borrarEjemplo };
}
