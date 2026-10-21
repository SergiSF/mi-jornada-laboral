import { useState } from "react";
import Layout from "./Layout";
import SemanaPage from "./SemanaPage";
import MesPage from "./MesPage";
import HistorialPage from "./HistorialPage";
import AjustesPage from "./AjustesPage";
import { useTema } from "./tema";
import { useSemanas } from "./useSemanas";
import { lunesDe } from "./calculos";
import type { Pantalla } from "./navegacion";

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("semana");
  const [lunesSemana, setLunesSemana] = useState(() => lunesDe(new Date()));
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
          {pantalla === "mes" && <MesPage almacen={almacen} onIrASemana={irASemana} />}
          {pantalla === "historial" && <HistorialPage almacen={almacen} onIrASemana={irASemana} />}
          {pantalla === "ajustes" && <AjustesPage tema={tema} onTema={setTema} almacen={almacen} />}
        </>
      )}
    </Layout>
  );
}
