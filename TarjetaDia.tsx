import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  DIAS_SEMANA, MENSAJE_ERROR, NOMBRE_TIPO, TIPOS_DIA_COMPLETO, aMinutos, esPorHoras, fechaISO, formatoHoras, minutosPermiso,
  minutosProgramados, minutosRecuperacion, minutosTramo, sumarDias, desdeISO,
  type RegistroDia, type ResultadoDia, type TipoDia, type TramoRecuperacion,
} from "./calculos";
import type { TramoConOrigen } from "./saldos";
import { primerLaborable } from "./agenda";
import { nuevoId } from "./extensiones";
import { ESTADO } from "./colores";
import CampoHorasMinutos from "./CampoHorasMinutos";

type Props = {
  indice: number;
  fecha: Date;
  registro: RegistroDia;
  resultado: ResultadoDia;
  esHoy: boolean;
  cuentaAusencia: boolean;
  recuperacionesDelDia: TramoConOrigen[]; // tramos de AP recuperables que se recuperan este día
  onCambiar: (r: RegistroDia) => void;
};

const ETIQUETA_HORAS: Partial<Record<TipoDia, string>> = {
  "asuntos-propios": "Horas de asuntos propios",
  "ap-recuperables": "Horas de AP recuperables",
  dr: "Horas de DR",
};

const campo =
  "w-full min-w-0 rounded-lg border border-borde bg-fondo px-2.5 py-2 font-num text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-principal disabled:opacity-40";
const etiquetaCampo = "grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave";

const diaCorto = (iso: string) => desdeISO(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });

/** ¿El tramo coincide con el horario de entrada y salida de ese día? */
function seSolapa(t: { desde: string; hasta: string }, r: RegistroDia): boolean {
  const a = aMinutos(r.entrada), b = aMinutos(r.salida), c = aMinutos(t.desde), d = aMinutos(t.hasta);
  return a !== null && b !== null && c !== null && d !== null && c < b && d > a;
}

export default function TarjetaDia({ indice, fecha, registro, resultado, esHoy, cuentaAusencia, recuperacionesDelDia, onCambiar }: Props) {
  const porHoras = esPorHoras(registro.tipo);
  const esTrabajo = registro.tipo === "trabajo" || porHoras; // en días por horas también puedes poner la parte trabajada
  const noComputa = TIPOS_DIA_COMPLETO.includes(registro.tipo) && !cuentaAusencia;
  const estado = ESTADO[resultado.estado];
  const textoChip = resultado.estado === "ausencia" ? NOMBRE_TIPO[registro.tipo] : estado.texto;
  const id = `dia-${indice}`;

  // Tramos de recuperación (solo en días de AP recuperables)
  const tramos = registro.recuperaciones ?? [];
  const permiso = minutosPermiso(registro);
  const programado = minutosProgramados(registro);
  const cambiarTramo = (tid: string, cambios: Partial<TramoRecuperacion>) =>
    onCambiar({ ...registro, recuperaciones: tramos.map((t) => (t.id === tid ? { ...t, ...cambios } : t)) });
  const anadirTramo = () => {
    const siguiente = primerLaborable(fechaISO(sumarDias(fecha, 1)));
    onCambiar({ ...registro, recuperaciones: [...tramos, { id: nuevoId(), fecha: siguiente, desde: "", hasta: "" }] });
  };
  const quitarTramo = (tid: string) => onCambiar({ ...registro, recuperaciones: tramos.filter((t) => t.id !== tid) });

  const recuperaHoy = recuperacionesDelDia.reduce((s, t) => s + t.minutos, 0);
  const solapados = recuperacionesDelDia.filter((t) => seSolapa(t, registro));

  return (
    <article
      className={`grid gap-4 rounded-2xl border bg-superficie p-4 md:grid-cols-[140px_1fr_150px] md:items-center ${
        esHoy ? "border-principal ring-1 ring-principal" : "border-borde"
      }`}
    >
      <div className="flex items-start justify-between gap-2 md:block">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold">{DIAS_SEMANA[indice]}</h3>
            {esHoy && <span className="rounded-full bg-principal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-superficie">Hoy</span>}
          </div>
          <p className="text-sm text-suave">{fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
        </div>
        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${estado.chip}`}>{textoChip}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={etiquetaCampo} htmlFor={`${id}-entrada`}>
          Entrada
          <input id={`${id}-entrada`} type="time" className={campo} disabled={!esTrabajo} value={registro.entrada}
            onChange={(e) => onCambiar({ ...registro, entrada: e.target.value })} />
        </label>
        <label className={etiquetaCampo} htmlFor={`${id}-salida`}>
          Salida
          <input id={`${id}-salida`} type="time" className={campo} disabled={!esTrabajo} value={registro.salida}
            onChange={(e) => onCambiar({ ...registro, salida: e.target.value })} />
        </label>
        <label className={etiquetaCampo} htmlFor={`${id}-pausa`}>
          Pausa (min)
          <input id={`${id}-pausa`} type="number" min={0} step={5} inputMode="numeric" className={campo} disabled={!esTrabajo}
            value={registro.pausa} onChange={(e) => onCambiar({ ...registro, pausa: e.target.value === "" ? 0 : Number(e.target.value) })} />
        </label>
        <label className={etiquetaCampo} htmlFor={`${id}-tipo`}>
          Tipo de día
          <select id={`${id}-tipo`} className={`${campo} font-sans`} value={registro.tipo}
            onChange={(e) => onCambiar({ ...registro, tipo: e.target.value as TipoDia })}>
            {(Object.keys(NOMBRE_TIPO) as TipoDia[]).map((t) => (
              <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>
            ))}
          </select>
        </label>

        {porHoras && (
          <div className="col-span-2 grid gap-1 sm:col-span-4">
            <label htmlFor={`${id}-permiso`} className="text-[11px] font-semibold uppercase tracking-wider text-ausencia">
              {ETIQUETA_HORAS[registro.tipo]}
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <CampoHorasMinutos id={`${id}-permiso`} etiqueta={ETIQUETA_HORAS[registro.tipo] ?? "Horas"} minutos={permiso}
                onCambiar={(m) => onCambiar({ ...registro, minutosAsuntosPropios: undefined, minutosPermiso: m })} />
              <span className="text-xs text-suave">
                {registro.entrada || registro.salida ? "Se suman a las horas trabajadas." : "Deja entrada y salida vacías si no has trabajado."}
              </span>
            </div>
          </div>
        )}

        {registro.tipo === "ap-recuperables" && (
          <div className="col-span-2 grid gap-2 rounded-xl border border-ausencia/30 bg-ausencia/5 p-3 sm:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ausencia">
                <CalendarClock size={14} /> Recuperación
              </p>
              {permiso > 0 && (
                <p className={`font-num text-xs font-bold tabular-nums ${
                  programado === permiso ? "text-cumplido" : programado > permiso ? "text-pendiente" : "text-suave"
                }`}>
                  Programado {formatoHoras(programado)} de {formatoHoras(permiso)}
                </p>
              )}
            </div>
            {tramos.map((t, n) => {
              const mal = t.desde !== "" && t.hasta !== "" && minutosTramo(t) === 0;
              return (
                <div key={t.id} className="grid gap-1">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className={etiquetaCampo} htmlFor={`${id}-rec-${n}-fecha`}>
                      Día
                      <input id={`${id}-rec-${n}-fecha`} type="date" className={`${campo} w-auto`} value={t.fecha}
                        onChange={(e) => e.target.value && cambiarTramo(t.id, { fecha: e.target.value })} />
                    </label>
                    <label className={etiquetaCampo} htmlFor={`${id}-rec-${n}-desde`}>
                      De
                      <input id={`${id}-rec-${n}-desde`} type="time" className={`${campo} w-auto`} value={t.desde}
                        onChange={(e) => cambiarTramo(t.id, { desde: e.target.value })} />
                    </label>
                    <label className={etiquetaCampo} htmlFor={`${id}-rec-${n}-hasta`}>
                      A
                      <input id={`${id}-rec-${n}-hasta`} type="time" className={`${campo} w-auto`} value={t.hasta}
                        onChange={(e) => cambiarTramo(t.id, { hasta: e.target.value })} />
                    </label>
                    <span className="pb-2 font-num text-sm font-bold tabular-nums text-ausencia">{minutosTramo(t) ? formatoHoras(minutosTramo(t)) : ""}</span>
                    <button type="button" onClick={() => quitarTramo(t.id)} aria-label="Quitar este tramo"
                      className="mb-1 rounded-lg p-1.5 text-suave hover:text-pendiente"><Trash2 size={16} /></button>
                  </div>
                  {mal && <p className="text-xs font-medium text-pendiente">La hora final debe ser posterior a la inicial.</p>}
                </div>
              );
            })}
            <button type="button" onClick={anadirTramo}
              className="flex w-fit items-center gap-1 text-xs font-semibold text-ausencia hover:underline">
              <Plus size={14} /> {tramos.length ? "Añadir otro tramo" : "Programar día y horario de recuperación"}
            </button>
            {programado > permiso && permiso > 0 && (
              <p className="text-xs font-medium text-pendiente">Has programado más tiempo del que te has cogido.</p>
            )}
          </div>
        )}

        {/* Recuperación escrita a mano en la versión anterior: se muestra solo si había algo */}
        {registro.tipo === "trabajo" && minutosRecuperacion(registro) > 0 && (
          <div className="col-span-2 grid gap-1 sm:col-span-4">
            <label htmlFor={`${id}-recuperacion`} className="text-[11px] font-semibold uppercase tracking-wider text-ausencia">
              Recuperación escrita a mano
            </label>
            <CampoHorasMinutos id={`${id}-recuperacion`} etiqueta="Recuperación" minutos={minutosRecuperacion(registro)}
              onCambiar={(m) => onCambiar({ ...registro, minutosRecuperacion: m })} />
          </div>
        )}

        {recuperacionesDelDia.length > 0 && (
          <div className="col-span-2 grid gap-1 rounded-xl bg-ausencia/10 px-3 py-2 text-sm sm:col-span-4">
            {recuperacionesDelDia.map((t) => (
              <p key={t.id} className="flex flex-wrap items-center gap-x-2">
                <CalendarClock size={14} className="text-ausencia" />
                <span className="font-semibold text-ausencia">Recuperación {t.desde}–{t.hasta}</span>
                <span className="font-num tabular-nums">{formatoHoras(t.minutos)}</span>
                <span className="text-xs text-suave">· de las AP recuperables del {diaCorto(t.origen)}</span>
              </p>
            ))}
            {solapados.length > 0 && (
              <p className="text-xs font-medium text-pendiente">
                La recuperación coincide con tu horario de entrada y salida. Pon como salida la hora en que acaba tu jornada normal: la
                recuperación se suma aparte.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 md:block md:text-right">
        <p className="font-num text-xl font-bold tabular-nums">{formatoHoras(resultado.minutos)}</p>
        <div className="text-right">
          <p className={`font-num text-sm tabular-nums ${
            noComputa ? "text-suave" : resultado.diferencia >= 0 ? "text-cumplido" : "text-pendiente"
          }`}>
            {noComputa ? "No computa" : formatoHoras(resultado.diferencia, true)}
          </p>
          {recuperaHoy > 0 && (
            <p className="font-num text-xs font-bold tabular-nums text-ausencia">+{formatoHoras(recuperaHoy)} recuperación</p>
          )}
        </div>
      </div>

      {resultado.error && (
        <p className="rounded-lg bg-pendiente/10 px-3 py-2 text-sm font-medium text-pendiente md:col-span-3" role="alert">
          {MENSAJE_ERROR[resultado.error]}
        </p>
      )}
    </article>
  );
}
