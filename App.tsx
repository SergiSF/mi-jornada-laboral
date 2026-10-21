import { useState } from "react";
import Layout from "./Layout";
import SemanaPage from "./SemanaPage";
import MesPage from "./MesPage";
import HistorialPage from "./HistorialPage";
import AjustesPage from "./AjustesPage";
import SaldosPage from "./SaldosPage";
import AgendaPage from "./AgendaPage";
import ExtensionesPage from "./ExtensionesPage";
import { useTema } from "./tema";
import { useSemanas } from "./useSemanas";
import { fechaISO, lunesDe } from "./calculos";
import type { Pantalla } from "./navegacion";

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("semana");
  const [lunesSemana, setLunesSemana] = useState(() => lunesDe(new Date()));
  const [anioSaldos, setAnioSaldos] = useState(() => new Date().getFullYear());
  const [fechaAgenda, setFechaAgenda] = useState(() => fechaISO(new Date()));
  const { tema, setTema } = useTema();
  const almacen = useSemanas();

  // Desde el mes o el historial: abrir una semana concreta
  const irASemana = (lunes: Date) => {
    setLunesSemana(lunes);
    setPantalla("semana");
    window.scrollTo({ top: 0 });
  };

  return (
    <Layout actual={pantalla} onCambiar={setPantalla} tema={tema} onTema={setTema}>
      {almacen.errorGuardado && (
        <p role="alert" className="mb-5 rounded-xl bg-pendiente/15 px-4 py-3 text-sm font-semibold text-pendiente">
          {almacen.errorGuardado}
        </p>
      )}
      {almacen.cargando ? (
        <p className="py-20 text-center text-suave">Cargando tus horas…</p>
      ) : (
        <>
          {pantalla === "semana" && <SemanaPage almacen={almacen} lunes={lunesSemana} onLunes={setLunesSemana} />}
          {pantalla === "agenda" && <AgendaPage almacen={almacen} fecha={fechaAgenda} onFecha={setFechaAgenda} />}
          {pantalla === "extensiones" && <ExtensionesPage almacen={almacen} />}
          {pantalla === "mes" && <MesPage almacen={almacen} onIrASemana={irASemana} />}
          {pantalla === "historial" && <HistorialPage almacen={almacen} onIrASemana={irASemana} />}
          {pantalla === "saldos" && <SaldosPage almacen={almacen} anio={anioSaldos} onAnio={setAnioSaldos} />}
          {pantalla === "ajustes" && <AjustesPage tema={tema} onTema={setTema} almacen={almacen} />}
        </>
      )}
    </Layout>
  );
}
