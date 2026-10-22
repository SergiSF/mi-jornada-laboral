import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Palmtree, UserRound, RotateCcw, Hourglass, CalendarOff } from "lucide-react";
import { desdeISO, fechaISO, formatoHoras } from "./calculos";
import CampoHorasMinutos from "./CampoHorasMinutos";
import { consumoAnual, pendienteDeRecuperar, recuperacionesHechas, todosLosTramos, type SaldoAnual, type UsoDia } from "./saldos";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; anio: number; onAnio: (anio: number) => void };

const fecha = (d: Date) => d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

type TarjetaProps = {
  titulo: string;
  icono: typeof Palmtree;
  unidad: "dias" | "horas";
  total: number; // días o minutos
  gastado: number;
  onTotal: (valor: number) => void;
  idCampo: string;
  nota?: string;
  usos: UsoDia[];
  etiquetaUsos?: string;
  children?: ReactNode;
};

function TarjetaSaldo({ titulo, icono: Icono, unidad, total, gastado, onTotal, idCampo, nota, usos, etiquetaUsos = "Ver días", children }: TarjetaProps) {
  const quedan = total - gastado;
  const fmt = (v: number) => (unidad === "dias" ? `${v} día${Math.abs(v) === 1 ? "" : "s"}` : formatoHoras(v));
  const porcentaje = total > 0 ? Math.min(100, Math.round((gastado / total) * 100)) : 0;
  const pasado = quedan < 0;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-borde bg-superficie p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ausencia/15 text-ausencia"><Icono size={20} /></span>
          <h2 className="font-bold">{titulo}</h2>
        </div>
        <div className="grid justify-items-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave">
          <label htmlFor={idCampo}>Tienes</label>
          {unidad === "dias" ? (
            <span className="flex items-center gap-1.5">
              <input id={idCampo} type="number" min={0} step={1} inputMode="numeric"
                className="w-16 rounded-lg border border-borde bg-fondo px-2 py-2 text-right font-num text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-principal"
                value={total === 0 ? "" : total} placeholder="0"
                onChange={(e) => {
                  const n = e.target.value === "" ? 0 : Math.floor(Number(e.target.value));
                  if (Number.isFinite(n) && n >= 0) onTotal(n);
                }} />
              <span className="normal-case tracking-normal">días</span>
            </span>
          ) : (
            <CampoHorasMinutos id={idCampo} etiqueta={titulo} minutos={total} onCambiar={onTotal} maxHoras={999} destacado={false} />
          )}
        </div>
      </header>

      <div>
        <p className={`text-[11px] font-bold uppercase tracking-wider ${pasado ? "text-pendiente" : "text-suave"}`}>
          {pasado ? "Te has pasado" : "Te quedan"}
        </p>
        <p className={`whitespace-nowrap font-num text-3xl font-bold tabular-nums ${pasado ? "text-pendiente" : "text-texto"}`}>
          {fmt(Math.abs(quedan))}
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ausencia/15">
          <div className={`h-full rounded-full transition-[width] duration-500 ${pasado ? "bg-pendiente" : "bg-ausencia"}`} style={{ width: `${pasado ? 100 : porcentaje}%` }} />
        </div>
        <p className="mt-1.5 font-num text-xs tabular-nums text-suave">
          {total === 0 ? "Escribe arriba cuánto tienes este año" : `Gastado ${fmt(gastado)} de ${fmt(total)}`}
        </p>
        {nota && <p className="mt-1 text-xs text-suave">{nota}</p>}
      </div>

      {children}

      {usos.length > 0 && (
        <details className="group text-sm">
          <summary className="cursor-pointer select-none font-semibold text-ausencia">{etiquetaUsos} ({usos.length})</summary>
          <ul className="mt-2 grid gap-1">
            {usos.map((u, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-borde/60 py-1 last:border-0">
                <span className="capitalize">{fecha(u.fecha)}{u.eneroSiguiente && <span className="ml-1.5 text-xs normal-case text-suave">(del saldo de este año)</span>}</span>
                {unidad === "horas" && <span className="font-num tabular-nums text-suave">{formatoHoras(u.cantidad)}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export default function SaldosPage({ almacen, anio, onAnio }: Props) {
  const saldo = almacen.saldo(anio);
  const c = consumoAnual(almacen.semanas, anio, almacen.saldo);
  const hoyISO = fechaISO(new Date());
  const rec = pendienteDeRecuperar(almacen.semanas, hoyISO);
  const proximas = todosLosTramos(almacen.semanas).filter((t) => t.fecha > hoyISO && t.minutos > 0);
  const hechas = recuperacionesHechas(almacen.semanas, hoyISO);
  const diaLargo = (iso: string) => desdeISO(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const cambiar = (cambios: Partial<SaldoAnual>) => almacen.cambiarSaldo(anio, { ...saldo, ...cambios });
  const notaEnero = `Se pueden gastar hasta el 31 de enero de ${anio + 1}. En enero se gasta primero lo que quede del año anterior.`;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-principal">Saldos anuales</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Permisos de {anio}</h1>
          <p className="text-sm text-suave">Escribe lo que tienes este año. Se descuenta solo lo que marques en tus semanas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAnio(anio - 1)} aria-label="Año anterior"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal"><ChevronLeft size={20} /></button>
          <button onClick={() => onAnio(new Date().getFullYear())}
            className="h-10 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:border-principal">Este año</button>
          <button onClick={() => onAnio(anio + 1)} aria-label="Año siguiente"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal"><ChevronRight size={20} /></button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <TarjetaSaldo titulo="Vacaciones" icono={Palmtree} unidad="dias" idCampo="saldo-vacaciones"
          total={saldo.vacacionesDias} gastado={c.vacacionesDias} onTotal={(v) => cambiar({ vacacionesDias: v })}
          nota={`Cuentan los días marcados como Vacaciones de enero a diciembre de ${anio}.`} usos={c.detalle.vacaciones} />

        <TarjetaSaldo titulo="Asuntos propios (AP)" icono={UserRound} unidad="horas" idCampo="saldo-ap"
          total={saldo.apMinutos} gastado={c.apMinutos} onTotal={(v) => cambiar({ apMinutos: v })} nota={notaEnero} usos={c.detalle.ap} />

        <TarjetaSaldo titulo="AP recuperables" icono={RotateCcw} unidad="horas" idCampo="saldo-ap-rec"
          total={saldo.apRecuperablesMinutos} gastado={c.apRecuperablesMinutos} onTotal={(v) => cambiar({ apRecuperablesMinutos: v })}
          nota={notaEnero} usos={c.detalle.apRec} etiquetaUsos="Ver días cogidos">
          <div className={`rounded-2xl p-4 ${rec.pendiente > 0 ? "bg-pendiente/10" : "bg-cumplido/10"}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${rec.pendiente > 0 ? "text-pendiente" : "text-cumplido"}`}>
              {rec.pendiente > 0 ? "Pendiente de recuperar" : rec.pendiente < 0 ? "Recuperado por adelantado" : "Nada pendiente de recuperar"}
            </p>
            <p className={`whitespace-nowrap font-num text-xl font-bold tabular-nums ${rec.pendiente > 0 ? "text-pendiente" : "text-cumplido"}`}>
              {formatoHoras(Math.abs(rec.pendiente))}
            </p>
            <p className="mt-1 font-num text-xs tabular-nums text-suave">
              Cogidas {formatoHoras(rec.cogido)} · Recuperadas {formatoHoras(rec.recuperado)} · Programadas {formatoHoras(rec.programado)}
            </p>
            {rec.sinProgramar > 0 && (
              <p className="mt-1 text-xs font-semibold text-pendiente">
                {formatoHoras(rec.sinProgramar)} sin día de recuperación. Prográmalas en el día en que cogiste las AP recuperables.
              </p>
            )}
            {hechas.length > 0 && (
              <details className="mt-3 border-t border-borde/60 pt-2 text-sm" open>
                <summary className="cursor-pointer select-none font-semibold text-cumplido">
                  Ver horas recuperadas ({hechas.length})
                </summary>
                <ul className="mt-2 grid gap-1">
                  {hechas.map((h, n) => (
                    <li key={n} className="flex flex-wrap justify-between gap-x-3 border-b border-borde/50 py-1 last:border-0">
                      <span>
                        <span className="capitalize">{diaLargo(h.fecha)}</span>
                        <span className="ml-2 font-num tabular-nums text-suave">
                          {h.desde && h.hasta ? `${h.desde}–${h.hasta}` : "sin franja"}
                        </span>
                      </span>
                      <span className="font-num font-semibold tabular-nums text-cumplido">{formatoHoras(h.minutos)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 pt-1 text-xs font-bold uppercase tracking-wider text-suave">
                    <span>Total recuperado</span>
                    <span className="font-num tabular-nums">{formatoHoras(rec.recuperado)}</span>
                  </li>
                </ul>
              </details>
            )}
            {proximas.length > 0 && (
              <ul className="mt-3 grid gap-1 border-t border-borde/60 pt-2 text-sm">
                <li className="text-[11px] font-bold uppercase tracking-wider text-suave">Próximas recuperaciones</li>
                {proximas.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="capitalize">
                      {desdeISO(t.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })} · {t.desde}–{t.hasta}
                    </span>
                    <span className="font-num tabular-nums text-suave">{formatoHoras(t.minutos)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TarjetaSaldo>

        <TarjetaSaldo titulo="Horas de DR" icono={Hourglass} unidad="horas" idCampo="saldo-dr"
          total={saldo.drMinutos} gastado={c.drMinutos} onTotal={(v) => cambiar({ drMinutos: v })}
          nota={`Cuentan las horas de DR de enero a diciembre de ${anio}.`} usos={c.detalle.dr} />
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-borde bg-superficie p-4 text-sm">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ausencia/15 text-ausencia"><CalendarOff size={18} /></span>
        <p>
          <span className="font-bold">{c.libranzas} libranza{c.libranzas === 1 ? "" : "s"}</span>{" "}
          <span className="text-suave">en {anio}. Las libranzas no tienen contador: ese día cuenta 0 h y las horas se hacen en el resto de la semana.</span>
        </p>
      </section>
    </div>
  );
}
