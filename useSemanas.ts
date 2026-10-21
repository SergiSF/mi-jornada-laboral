// Mantiene las semanas en pantalla y las guarda en el dispositivo cada vez que cambian.
import { useCallback, useEffect, useState } from "react";
import { fechaISO, lunesDe, semanaNueva, type Semana } from "./calculos";
import {
  AJUSTES_INICIALES,
  guardarAjustes,
  guardarSemana,
  leerTodo,
  pedirGuardadoPermanente,
  reemplazarSemanas,
  guardarSaldos,
  guardarDato,
  type Ajustes,
  type Saldos,
} from "./baseDatos";
import { SALDO_VACIO, type SaldoAnual } from "./saldos";
import type { Agenda } from "./agenda";
import type { Extension } from "./extensiones";
import type { Copia } from "./copia";

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
  cargando: boolean;
  errorGuardado: string;
  ajustes: Ajustes;
  semanas: Semana[];
  saldo: (anio: number) => SaldoAnual;
  cambiarSaldo: (anio: number, saldo: SaldoAnual) => void;
  saldos: Saldos;
  agenda: Agenda;
  cambiarAgenda: (cambio: (prev: Agenda) => Agenda) => void;
  extensiones: Extension[];
  cambiarExtensiones: (lista: Extension[]) => void;
  obtener: (lunes: Date) => Semana;
  guardar: (semana: Semana) => void;
  cambiarAjustes: (cambios: Partial<Ajustes>) => void;
  hayEjemplo: boolean;
  borrarEjemplo: () => void;
  importar: (copia: Copia) => Promise<void>;
  borrarTodo: () => Promise<void>;
};

export function useSemanas(): Almacen {
  const [cargando, setCargando] = useState(true);
  const [errorGuardado, setErrorGuardado] = useState("");
  const [mapa, setMapa] = useState<Record<string, Semana>>({});
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES);
  const [ejemplo, setEjemplo] = useState<Semana | null>(null);
  const [saldos, setSaldos] = useState<Saldos>({});
  const [agenda, setAgenda] = useState<Agenda>({});
  const [extensiones, setExtensiones] = useState<Extension[]>([]);

  const fallo = () =>
    setErrorGuardado("No se han podido guardar los cambios en este dispositivo. Haz una copia de seguridad desde Ajustes.");

  // Al abrir la aplicación: leer lo guardado
  useEffect(() => {
    pedirGuardadoPermanente();
    leerTodo()
      .then(({ semanas, ajustes: a, saldos: sal, agenda: ag, extensiones: ext }) => {
        setSaldos(sal);
        setAgenda(ag);
        setExtensiones(ext);
        setMapa(Object.fromEntries(semanas.map((s) => [s.lunes, s])));
        setAjustes(a);
        if (!a.ejemploVisto && semanas.length === 0) setEjemplo(semanaDeEjemplo());
      })
      .catch(() => {
        setErrorGuardado("Este navegador no permite guardar datos. Lo que escribas se perderá al cerrar.");
        setEjemplo(semanaDeEjemplo());
      })
      .finally(() => setCargando(false));
  }, []);

  const cambiarAjustes = useCallback((cambios: Partial<Ajustes>) => {
    setAjustes((prev) => {
      const nuevos = { ...prev, ...cambios };
      guardarAjustes(nuevos).catch(fallo);
      return nuevos;
    });
  }, []);

  const saldo = useCallback((anio: number) => saldos[String(anio)] ?? SALDO_VACIO, [saldos]);

  const cambiarSaldo = useCallback((anio: number, nuevo: SaldoAnual) => {
    setSaldos((prev) => {
      const todos = { ...prev, [String(anio)]: nuevo };
      guardarSaldos(todos).catch(fallo);
      return todos;
    });
  }, []);

  const cambiarAgenda = useCallback((cambio: (prev: Agenda) => Agenda) => {
    setAgenda((prev) => {
      const nueva = cambio(prev);
      guardarDato("agenda", nueva).catch(fallo);
      return nueva;
    });
  }, []);

  const cambiarExtensiones = useCallback((lista: Extension[]) => {
    setExtensiones(lista);
    guardarDato("extensiones", lista).catch(fallo);
  }, []);

  const obtener = useCallback(
    (lunes: Date) => {
      const clave = fechaISO(lunesDe(lunes));
      if (ejemplo && ejemplo.lunes === clave) return ejemplo;
      return mapa[clave] ?? semanaNueva(lunes, ajustes.jornadaPorDefecto, ajustes.contarPorDefecto);
    },
    [mapa, ajustes, ejemplo],
  );

  const guardar = useCallback(
    (semana: Semana) => {
      setMapa((prev) => ({ ...prev, [semana.lunes]: semana }));
      setEjemplo(null);
      guardarSemana(semana).catch(fallo);
      // Regla 1: la última jornada elegida pasa a ser la de por defecto
      cambiarAjustes({ jornadaPorDefecto: semana.jornada, contarPorDefecto: semana.contarAusencias, ejemploVisto: true });
    },
    [cambiarAjustes],
  );

  const borrarEjemplo = useCallback(() => {
    setEjemplo(null);
    cambiarAjustes({ ejemploVisto: true });
  }, [cambiarAjustes]);

  const importar = useCallback(
    async (copia: Copia) => {
      await reemplazarSemanas(copia.semanas);
      await guardarSaldos(copia.saldos);
      setSaldos(copia.saldos);
      await guardarDato("agenda", copia.agenda);
      setAgenda(copia.agenda);
      if (copia.extensiones.length > 0) {
        await guardarDato("extensiones", copia.extensiones);
        setExtensiones(copia.extensiones);
      }
      setMapa(Object.fromEntries(copia.semanas.map((s) => [s.lunes, s])));
      setEjemplo(null);
      cambiarAjustes({ ...copia.ajustes, ejemploVisto: true });
    },
    [cambiarAjustes],
  );

  const borrarTodo = useCallback(async () => {
    await reemplazarSemanas([]);
    await guardarSaldos({});
    setSaldos({});
    await guardarDato("agenda", {});
    setAgenda({});
    await guardarDato("extensiones", []);
    setExtensiones([]);
    setMapa({});
    setEjemplo(null);
    cambiarAjustes({ ...AJUSTES_INICIALES, ejemploVisto: true });
  }, [cambiarAjustes]);

  return {
    cargando,
    errorGuardado,
    ajustes,
    semanas: Object.values(mapa),
    saldo,
    cambiarSaldo,
    saldos,
    agenda,
    cambiarAgenda,
    extensiones,
    cambiarExtensiones,
    obtener,
    guardar,
    cambiarAjustes,
    hayEjemplo: ejemplo !== null,
    borrarEjemplo,
    importar,
    borrarTodo,
  };
}
