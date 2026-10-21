import { Moon, Sun, Monitor } from "lucide-react";
import type { Tema } from "./tema";

type Props = { tema: Tema; onTema: (t: Tema) => void };

const OPCIONES: { id: Tema; nombre: string; icono: typeof Sun }[] = [
  { id: "claro", nombre: "Claro", icono: Sun },
  { id: "oscuro", nombre: "Oscuro", icono: Moon },
  { id: "sistema", nombre: "Sistema", icono: Monitor },
];

export default function AjustesPage({ tema, onTema }: Props) {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ajustes</h1>
      <div className="mt-6 rounded-2xl border border-borde bg-superficie p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-suave">Apariencia</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {OPCIONES.map(({ id, nombre, icono: Icono }) => (
            <button
              key={id}
              onClick={() => onTema(id)}
              aria-pressed={tema === id}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 font-semibold transition-colors ${
                tema === id ? "border-principal bg-principal/10 text-principal" : "border-borde text-suave hover:text-texto"
              }`}
            >
              <Icono size={22} />
              {nombre}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-suave">
        La jornada por defecto, las copias de seguridad y el borrado de datos llegan en la fase 4.
      </p>
    </section>
  );
}
