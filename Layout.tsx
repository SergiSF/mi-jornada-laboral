import { useState, type ReactNode } from "react";
import { Moon, Sun, Monitor, Clock, Menu, Shield, Plane, type LucideIcon } from "lucide-react";
import { PANTALLAS, type Pantalla } from "./navegacion";
import { NOMBRE_TEMA, SIGUIENTE_TEMA, type Tema } from "./tema";
import Postal from "./Postal";

type Props = {
  actual: Pantalla;
  onCambiar: (p: Pantalla) => void;
  tema: Tema;
  onTema: (t: Tema) => void;
  children: ReactNode;
};

export const ICONO_TEMA: Record<Tema, LucideIcon> = { claro: Sun, oscuro: Moon, sistema: Monitor, blaugrana: Shield, viajes: Plane };

export default function Layout({ actual, onCambiar, tema, onTema, children }: Props) {
  const IconoTema = ICONO_TEMA[tema];
  const textoTema = `Tema: ${NOMBRE_TEMA[tema]}`;
  const [masAbierto, setMasAbierto] = useState(false);
  const secundarias = PANTALLAS.filter((p) => !p.principal);
  const enMas = secundarias.some((p) => p.id === actual);
  const ir = (p: Pantalla) => {
    onCambiar(p);
    setMasAbierto(false);
  };

  return (
    <div className="flex h-full">
      {/* Barra lateral: solo en pantallas grandes */}
      <aside className="relative hidden md:flex w-60 shrink-0 flex-col border-r border-borde bg-superficie p-4">
        {tema === "blaugrana" && <div className="rayas-blaugrana absolute inset-x-0 top-0 h-2" aria-hidden="true" />}
        <div className="flex items-center gap-2 px-2 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-principal text-superficie">
            <Clock size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Mi Jornada</span>
        </div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Secciones">
          {PANTALLAS.map(({ id, nombre, icono: Icono }) => {
            const activo = id === actual;
            return (
              <button
                key={id}
                onClick={() => onCambiar(id)}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-principal ${
                  activo ? "bg-principal/10 text-principal" : "text-suave hover:bg-fondo hover:text-texto"
                }`}
              >
                <Icono size={20} />
                {nombre}
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => onTema(SIGUIENTE_TEMA[tema])}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-suave hover:bg-fondo hover:text-texto"
        >
          <IconoTema size={18} />
          {textoTema}
        </button>
      </aside>

      {/* Contenido */}
      <main className="relative flex-1 overflow-y-auto pb-24 md:pb-0">
        {tema === "blaugrana" && <div className="rayas-blaugrana sticky top-0 z-[6] h-1.5 md:hidden" aria-hidden="true" />}
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {tema === "viajes" && <Postal />}
          {children}
        </div>
      </main>

      {/* Menú "Más" del móvil */}
      {masAbierto && (
        <div className="fixed inset-0 z-10 bg-texto/30 md:hidden" onClick={() => setMasAbierto(false)}>
          <div
            className="absolute inset-x-3 grid gap-1 rounded-2xl border border-borde bg-superficie p-2 shadow-xl"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {secundarias.map(({ id, nombre, icono: Icono }) => (
              <button key={id} onClick={() => ir(id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${id === actual ? "bg-principal/10 text-principal" : "text-texto"}`}>
                <Icono size={20} /> {nombre}
              </button>
            ))}
            <button onClick={() => onTema(SIGUIENTE_TEMA[tema])} className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-suave">
              <IconoTema size={20} /> {textoTema}
            </button>
          </div>
        </div>
      )}

      {/* Menú inferior: solo en móvil */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-borde bg-superficie/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {PANTALLAS.filter((p) => p.principal).map(({ id, nombre, icono: Icono }) => {
          const activo = id === actual && !masAbierto;
          return (
            <button
              key={id}
              onClick={() => ir(id)}
              aria-current={activo ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${activo ? "text-principal" : "text-suave"}`}
            >
              <Icono size={22} />
              {nombre}
            </button>
          );
        })}
        <button onClick={() => setMasAbierto(!masAbierto)} aria-expanded={masAbierto}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${masAbierto || enMas ? "text-principal" : "text-suave"}`}>
          <Menu size={22} />
          Más
        </button>
      </nav>
    </div>
  );
}
