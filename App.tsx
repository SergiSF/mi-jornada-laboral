import { useState } from "react";
import Layout from "./Layout";
import SemanaPage from "./SemanaPage";
import MesPage from "./MesPage";
import HistorialPage from "./HistorialPage";
import AjustesPage from "./AjustesPage";
import { useTema } from "./tema";
import { useSemanas } from "./useSemanas";
import type { Pantalla } from "./navegacion";

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("semana");
  const { tema, setTema } = useTema();
  const almacen = useSemanas();

  return (
    <Layout actual={pantalla} onCambiar={setPantalla} tema={tema} onTema={setTema}>
      {pantalla === "semana" && <SemanaPage almacen={almacen} />}
      {pantalla === "mes" && <MesPage />}
      {pantalla === "historial" && <HistorialPage />}
      {pantalla === "ajustes" && <AjustesPage tema={tema} onTema={setTema} />}
    </Layout>
  );
}
