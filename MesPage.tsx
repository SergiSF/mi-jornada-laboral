import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DIAS_SEMANA, NOMBRE_TIPO, fechaISO, formatoHoras, lunesDe } from "./calculos";
import { resumenMes, type DiaMes } from "./mes";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; onIrASemana: (lunes: Date) => void };

/** Color de la celda según las horas hechas respecto al objetivo del día. */
function colorCelda(d: DiaMes): string {
  if (d.estado === "ausencia") return "bg-ausencia/25 text-texto";
  if (d.minutos === 0) return d.pasado ? "bg-fondo text-suave" : "bg-fondo/50 text-suave/70";
  const ratio = d.minutos / d.objetivo;
  if (ratio >= 1) return "bg-principal text-superficie";
  if (ratio >= 0.85) return "bg-principal/70 text-superficie";
  if (ratio >= 0.5) return "bg-principal/40 text-texto";
  return "bg-principal/20 text-texto";
}

function horaCorta(min: number) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

export default function MesPage({ almacen, onIrASemana }: Props) {
  const hoy = new Date();
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const r = resumenMes(mes.getFullYear(), mes.getMonth(), almacen.obtener, hoy);
  const textoMes = mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);

  // Huecos al principio para que el día 1 caiga en su columna
  const primero = r.dias[0];
  const huecos = primero ? (primero.fecha.getDay() + 6) % 7 : 0;
  const hoyISO = fechaISO(hoy);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-principal">Vista mensual</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{nombreMes}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1))}
            className="h-10 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:border-principal">
            Este mes
          </button>
          <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { t: "Horas del mes", v: formatoHoras(r.computado), c: "" },
          { t: "Objetivo del mes", v: formatoHoras(r.objetivo), c: "" },
          { t: "Balance hasta hoy", v: formatoHoras(r.balanceHastaHoy, true), c: r.balanceHastaHoy >= 0 ? "text-cumplido" : "text-pendiente" },
          { t: "Días registrados", v: `${r.registrados} de ${r.dias.length}`, c: "" },
        ].map((k) => (
          <div key={k.t} className="rounded-2xl border border-borde bg-superficie p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-suave">{k.t}</p>
            <p className={`mt-1 whitespace-nowrap font-num text-base font-bold tabular-nums md:text-lg ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-borde bg-superficie p-4 md:p-6">
        <div className="grid grid-cols-5 gap-1.5 md:gap-2.5">
          {DIAS_SEMANA.map((d) => (
            <p key={d} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-suave">
              <span className="md:hidden">{d.slice(0, 1)}</span>
              <span className="hidden md:inline">{d.slice(0, 3)}</span>
            </p>
          ))}
          {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
          {r.dias.map((d) => {
            const esHoy = fechaISO(d.fecha) === hoyISO;
            const detalle = d.estado === "ausencia" ? NOMBRE_TIPO[d.tipo] : formatoHoras(d.minutos);
            return (
              <button
                key={d.fecha.getDate()}
                onClick={() => onIrASemana(lunesDe(d.fecha))}
                title={`${d.fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}: ${detalle}`}
                className={`relative flex aspect-square flex-col justify-between rounded-xl p-1.5 text-left transition-transform hover:scale-[1.04] md:aspect-[4/3] md:p-2.5 ${colorCelda(d)} ${
                  esHoy ? "ring-2 ring-texto ring-offset-2 ring-offset-superficie" : ""
                }`}
              >
                <span className="text-xs font-bold md:text-sm">{d.fecha.getDate()}</span>
                {d.estado === "ausencia" ? (
                  <span className="truncate text-[10px] font-semibold md:text-xs">{NOMBRE_TIPO[d.tipo]}</span>
                ) : d.minutos > 0 ? (
                  <span className="font-num text-[10px] font-bold tabular-nums md:text-sm">{horaCorta(d.minutos)}</span>
                ) : null}
                {d.error && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pendiente" aria-label="Día con un error" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-suave">
          <span className="flex items-center gap-1.5">
            Menos
            <span className="h-3.5 w-3.5 rounded bg-fondo ring-1 ring-borde" />
            <span className="h-3.5 w-3.5 rounded bg-principal/20" />
            <span className="h-3.5 w-3.5 rounded bg-principal/40" />
            <span className="h-3.5 w-3.5 rounded bg-principal/70" />
            <span className="h-3.5 w-3.5 rounded bg-principal" />
            Objetivo cumplido
          </span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-ausencia/25" /> Festivo o ausencia</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pendiente" /> Día con un error</span>
          <span>Pulsa un día para ir a su semana.</span>
        </div>
      </section>
    </div>
  );
}
