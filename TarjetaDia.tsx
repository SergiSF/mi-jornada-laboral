import { RotateCcw, Plus, Trash2 } from "lucide-react";
import {
  DIAS_SEMANA, MENSAJE_ERROR, NOMBRE_TIPO, TIPOS_DIA_COMPLETO, aMinutos, esPorHoras, formatoHoras, minutosFranja, minutosPermiso,
  minutosRecuperacion, type FranjaRecuperacion, type RegistroDia, type ResultadoDia, type TipoDia,
} from "./calculos";
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

/** ¿La franja está entera dentro de la entrada y salida del día? */
function dentroDelHorario(f: { desde: string; hasta: string }, r: RegistroDia): boolean {
  const a = aMinutos(r.entrada), b = aMinutos(r.salida), c = aMinutos(f.desde), d = aMinutos(f.hasta);
  if (a === null || b === null || c === null || d === null) return true; // sin horario completo no se avisa
  return c >= a && d <= b;
}


export default function TarjetaDia({ indice, fecha, registro, resultado, esHoy, cuentaAusencia, onCambiar }: Props) {
  const porHoras = esPorHoras(registro.tipo);
  const esTrabajo = registro.tipo === "trabajo" || porHoras; // en días por horas también puedes poner la parte trabajada
  const noComputa = TIPOS_DIA_COMPLETO.includes(registro.tipo) && !cuentaAusencia;
  const estado = ESTADO[resultado.estado];
  const textoChip = resultado.estado === "ausencia" ? NOMBRE_TIPO[registro.tipo] : estado.texto;
  const id = `dia-${indice}`;

  // Recuperación de AP recuperables: franjas que escribes tú en el día en que recuperas
  const franjas = registro.franjasRecuperacion ?? [];
  const sinFranja = registro.minutosRecuperacion ?? 0;
  const recuperado = minutosRecuperacion(registro);
  const cambiarFranja = (fid: string, cambios: Partial<FranjaRecuperacion>) =>
    onCambiar({ ...registro, franjasRecuperacion: franjas.map((f) => (f.id === fid ? { ...f, ...cambios } : f)) });
  const anadirFranja = () =>
    onCambiar({ ...registro, franjasRecuperacion: [...franjas, { id: nuevoId(), desde: registro.salida || "", hasta: "" }] });
  const quitarFranja = (fid: string) => onCambiar({ ...registro, franjasRecuperacion: franjas.filter((f) => f.id !== fid) });
  const fueraDeHorario = franjas.some((f) => minutosFranja(f) > 0 && !dentroDelHorario(f, registro));

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
              <CampoHorasMinutos id={`${id}-permiso`} etiqueta={ETIQUETA_HORAS[registro.tipo] ?? "Horas"} minutos={minutosPermiso(registro)}
                onCambiar={(m) => onCambiar({ ...registro, minutosAsuntosPropios: undefined, minutosPermiso: m })} />
              <span className="text-xs text-suave">
                {registro.entrada || registro.salida ? "Se suman a las horas trabajadas." : "Deja entrada y salida vacías si no has trabajado."}
              </span>
            </div>
          </div>
        )}

        {registro.tipo === "trabajo" && franjas.length === 0 && sinFranja === 0 && (
          <button type="button" onClick={anadirFranja}
            className="col-span-2 flex w-fit items-center gap-1 text-xs font-semibold text-ausencia hover:underline sm:col-span-4">
            <Plus size={14} /> Añadir recuperación de AP recuperables
          </button>
        )}

        {registro.tipo === "trabajo" && (franjas.length > 0 || sinFranja > 0) && (
          <div className="col-span-2 grid gap-2 rounded-xl border border-ausencia/30 bg-ausencia/5 p-3 sm:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ausencia">
                <RotateCcw size={14} /> Recuperación de AP recuperables
              </p>
              <p className="font-num text-xs font-bold tabular-nums text-ausencia">{formatoHoras(recuperado)}</p>
            </div>
            {franjas.map((f, n) => {
              const mal = f.desde !== "" && f.hasta !== "" && minutosFranja(f) === 0;
              return (
                <div key={f.id} className="grid gap-1">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className={etiquetaCampo} htmlFor={`${id}-rec-${n}-desde`}>
                      De
                      <input id={`${id}-rec-${n}-desde`} type="time" className={`${campo} w-auto`} value={f.desde}
                        onChange={(e) => cambiarFranja(f.id, { desde: e.target.value })} />
                    </label>
                    <label className={etiquetaCampo} htmlFor={`${id}-rec-${n}-hasta`}>
                      A
                      <input id={`${id}-rec-${n}-hasta`} type="time" className={`${campo} w-auto`} value={f.hasta}
                        onChange={(e) => cambiarFranja(f.id, { hasta: e.target.value })} />
                    </label>
                    <span className="pb-2 font-num text-sm font-bold tabular-nums text-ausencia">
                      {minutosFranja(f) ? `= ${formatoHoras(minutosFranja(f))}` : ""}
                    </span>
                    <button type="button" onClick={() => quitarFranja(f.id)} aria-label="Quitar esta franja"
                      className="mb-1 rounded-lg p-1.5 text-suave hover:text-pendiente"><Trash2 size={16} /></button>
                  </div>
                  {mal && <p className="text-xs font-medium text-pendiente">La hora final debe ser posterior a la inicial.</p>}
                </div>
              );
            })}
            {sinFranja > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${id}-recuperacion`} className="text-xs text-suave">Apuntado sin franja:</label>
                <CampoHorasMinutos id={`${id}-recuperacion`} etiqueta="Recuperación sin franja" minutos={sinFranja}
                  onCambiar={(m) => onCambiar({ ...registro, minutosRecuperacion: m })} />
              </div>
            )}
            <button type="button" onClick={anadirFranja} className="flex w-fit items-center gap-1 text-xs font-semibold text-ausencia hover:underline">
              <Plus size={14} /> Añadir otra franja
            </button>
            <p className="text-xs text-suave">
              Pon tu entrada y salida reales. El tiempo de recuperación no cuenta en las horas del día y se descuenta de lo pendiente de
              recuperar.
            </p>
            {fueraDeHorario && (
              <p className="text-xs font-medium text-pendiente">
                Alguna franja queda fuera de tu entrada y salida. Revisa la salida: tiene que ser la hora real a la que te fuiste.
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
          {registro.tipo === "trabajo" && recuperado > 0 && !resultado.error && (
            <>
              <p className="font-num text-xs font-bold tabular-nums text-ausencia">{formatoHoras(recuperado)} recuperadas</p>
              <p className="font-num text-[11px] tabular-nums text-suave">En el centro: {formatoHoras(resultado.minutos + recuperado)}</p>
            </>
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
