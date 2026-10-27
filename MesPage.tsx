import { useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, Circle, CheckCircle2 } from "lucide-react";
import { DIAS_SEMANA, NOMBRE_TIPO, desdeISO, esPorHoras, fechaISO, formatoHoras, lunesDe } from "./calculos";
import { agendaDelMes, resumenMes, type DiaMes } from "./mes";
import { COLOR_TIPO, NOMBRE_CORTO, NOMBRE_MINI } from "./colores";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; onIrASemana: (lunes: Date) => void; onIrAAgenda: (fecha: string) => void };

/** Color de la celda: por tipo de día si es una ausencia; si no, más azul cuantas más horas. */
function colorCelda(d: DiaMes): string {
  if (d.estado === "ausencia") return `${COLOR_TIPO[d.tipo]?.celda ?? "bg-ausencia/20"} text-texto`;
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

const LEYENDA_TIPOS: { nombre: string; muestra: string }[] = [
  { nombre: "Festivo", muestra: "bg-festivo" },
  { nombre: "Vacaciones, AP y AP recuperables (APR)", muestra: "bg-naranja" },
  { nombre: "DR", muestra: "bg-rojo" },
  { nombre: "Baja o permiso", muestra: "bg-gris" },
  { nombre: "Libranza", muestra: "bg-ausencia" },
];

export default function MesPage({ almacen, onIrASemana, onIrAAgenda }: Props) {
  const hoy = new Date();
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const r = resumenMes(mes.getFullYear(), mes.getMonth(), almacen.obtener, hoy);
  const agendaMes = agendaDelMes(almacen.agenda, mes.getFullYear(), mes.getMonth());
  const notasPorDia = new Map(agendaMes.map((d) => [d.fecha, d]));
  const textoMes = mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);

  // Huecos al principio para que el día 1 caiga en su columna
  const primero = r.dias[0];
  const huecos = primero ? (primero.fecha.getDay() + 6) % 7 : 0;
  const hoyISO = fechaISO(hoy);
  const pendientesMes = agendaMes.reduce((s, d) => s + d.pendientes, 0);

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
            const iso = fechaISO(d.fecha);
            const esHoy = iso === hoyISO;
            const esAusencia = d.estado === "ausencia";
            const agendaDia = notasPorDia.get(iso);
            const primeraNota = agendaDia?.notas[0];
            const detalle = esAusencia ? NOMBRE_TIPO[d.tipo] : formatoHoras(d.minutos);
            const resumenAgenda = agendaDia
              ? ` · Agenda: ${agendaDia.notas.length} nota${agendaDia.notas.length === 1 ? "" : "s"}${agendaDia.pendientes ? `, ${agendaDia.pendientes} pendiente${agendaDia.pendientes === 1 ? "" : "s"}` : ""}`
              : "";
            return (
              <button
                key={d.fecha.getDate()}
                onClick={() => onIrASemana(lunesDe(d.fecha))}
                title={`${d.fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}: ${detalle}${resumenAgenda}`}
                className={`relative flex aspect-square min-w-0 flex-col justify-between gap-0.5 rounded-xl p-1.5 text-left transition-transform hover:scale-[1.04] md:aspect-[4/3] md:p-2.5 ${colorCelda(d)} ${
                  esHoy ? "outline outline-2 outline-offset-2 outline-texto" : ""
                }`}
              >
                <span className="flex items-start justify-between gap-1">
                  <span className="flex items-center gap-1 text-xs font-bold md:text-sm">
                    {d.fecha.getDate()}
                    {d.error && <span className="h-2 w-2 rounded-full bg-pendiente" aria-label="Día con un error" />}
                  </span>
                  {agendaDia && (
                    <span
                      className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-bold leading-none ${
                        agendaDia.pendientes ? "bg-pendiente text-superficie" : "bg-cumplido text-superficie"
                      }`}
                      aria-label={`${agendaDia.notas.length} notas en la agenda`}
                    >
                      <NotebookPen size={10} />
                      {agendaDia.pendientes || agendaDia.notas.length}
                    </span>
                  )}
                </span>

                {primeraNota && (
                  <span className={`hidden truncate text-[11px] leading-tight md:block ${primeraNota.hecha ? "line-through opacity-60" : ""}`}>
                    {primeraNota.texto}
                  </span>
                )}

                {esAusencia ? (
                  <span className={`truncate text-[10px] font-bold md:text-xs ${COLOR_TIPO[d.tipo]?.texto ?? ""}`}>
                    <span className="md:hidden">{NOMBRE_MINI[d.tipo] ?? NOMBRE_TIPO[d.tipo]}</span>
                    <span className="hidden md:inline">{NOMBRE_CORTO[d.tipo] ?? NOMBRE_TIPO[d.tipo]}</span>
                    {esPorHoras(d.tipo) && d.minutos > 0 && <span className="ml-1 font-num">{horaCorta(d.minutos)}</span>}
                  </span>
                ) : d.minutos > 0 ? (
                  <span className="font-num text-[10px] font-bold tabular-nums md:text-sm">{horaCorta(d.minutos)}</span>
                ) : (
                  <span />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-2 text-xs text-suave">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEYENDA_TIPOS.map((t) => (
              <span key={t.nombre} className="flex items-center gap-1.5">
                <span className={`h-3.5 w-3.5 rounded ${t.muestra}`} /> {t.nombre}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5">
              Trabajo:
              <span className="h-3.5 w-3.5 rounded bg-principal/20" />
              <span className="h-3.5 w-3.5 rounded bg-principal/40" />
              <span className="h-3.5 w-3.5 rounded bg-principal/70" />
              <span className="h-3.5 w-3.5 rounded bg-principal" />
              objetivo cumplido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5 rounded-md bg-pendiente px-1 py-0.5 text-[10px] font-bold leading-none text-superficie">
                <NotebookPen size={10} />2
              </span>
              tareas pendientes en la agenda
            </span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pendiente" /> Día con un error</span>
            <span>Pulsa un día para ir a su semana.</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <NotebookPen size={20} className="text-principal" /> Agenda del mes
          </h2>
          {agendaMes.length > 0 && (
            <p className="text-sm text-suave">
              {pendientesMes
                ? `${pendientesMes} tarea${pendientesMes === 1 ? "" : "s"} pendiente${pendientesMes === 1 ? "" : "s"}`
                : "Todo hecho"}
            </p>
          )}
        </div>
        {agendaMes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-borde bg-superficie px-4 py-6 text-center text-sm text-suave">
            No hay nada apuntado en la agenda este mes.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {agendaMes.map(({ fecha, notas, pendientes }) => {
              const visibles = notas.slice(0, 3);
              const resto = notas.length - visibles.length;
              const titulo = desdeISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
              return (
                <button key={fecha} onClick={() => onIrAAgenda(fecha)}
                  className="grid content-start gap-2 rounded-2xl border border-borde bg-superficie p-4 text-left transition-colors hover:border-principal">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`font-bold first-letter:uppercase ${fecha === hoyISO ? "text-principal" : ""}`}>
                      {titulo}{fecha === hoyISO ? " · hoy" : ""}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      pendientes ? "bg-pendiente/15 text-pendiente" : "bg-cumplido/15 text-cumplido"
                    }`}>
                      {pendientes ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : "Todo hecho"}
                    </span>
                  </span>
                  <ul className="grid gap-1 text-sm">
                    {visibles.map((n) => (
                      <li key={n.id} className="flex min-w-0 items-center gap-2">
                        {n.hecha ? <CheckCircle2 size={15} className="shrink-0 text-cumplido" /> : <Circle size={15} className="shrink-0 text-suave" />}
                        {n.hora && <span className="shrink-0 font-num text-xs font-bold text-principal">{n.hora}</span>}
                        <span className={`truncate ${n.hecha ? "text-suave line-through" : ""}`}>{n.texto}</span>
                      </li>
                    ))}
                  </ul>
                  {resto > 0 && <span className="text-xs font-semibold text-principal">y {resto} más…</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
