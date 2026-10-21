import type { ReactNode } from "react";
import { Moon, Sun, Monitor, Clock } from "lucide-react";
import { PANTALLAS, type Pantalla } from "./navegacion";
import type { Tema } from "./tema";

type Props = {
  actual: Pantalla;
  onCambiar: (p: Pantalla) => void;
  tema: Tema;
  onTema: (t: Tema) => void;
  children: ReactNode;
};

const SIGUIENTE_TEMA: Record<Tema, Tema> = { sistema: "claro", claro: "oscuro", oscuro: "sistema" };
const NOMBRE_TEMA: Record<Tema, string> = { sistema: "Tema del sistema", claro: "Tema claro", oscuro: "Tema oscuro" };

export default function Layout({ actual, onCambiar, tema, onTema, children }: Props) {
  const IconoTema = tema === "claro" ? Sun : tema === "oscuro" ? Moon : Monitor;

  return (
    <div className="flex h-full">
      {/* Barra lateral: solo en pantallas grandes */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-borde bg-superficie p-4">
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
          {NOMBRE_TEMA[tema]}
        </button>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      {/* Menú inferior: solo en móvil */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-borde bg-superficie/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {PANTALLAS.map(({ id, nombre, icono: Icono }) => {
          const activo = id === actual;
          return (
            <button
              key={id}
              onClick={() => onCambiar(id)}
              aria-current={activo ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${activo ? "text-principal" : "text-suave"}`}
            >
              <Icono size={22} />
              {nombre}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
