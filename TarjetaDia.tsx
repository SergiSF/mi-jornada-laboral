import { useState } from "react";
import {
  DIAS_SEMANA, MENSAJE_ERROR, NOMBRE_TIPO, TIPOS_DIA_COMPLETO, esPorHoras, formatoHoras, minutosPermiso, minutosRecuperacion,
  type RegistroDia, type ResultadoDia, type TipoDia,
} from "./calculos";
import { ESTADO } from "./colores";

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

/** Convierte lo escrito en horas ("3,5" o "3.5") en minutos. */
const horasAMinutos = (texto: string) => (texto === "" ? 0 : Math.round(Number(texto.replace(",", ".")) * 60));

const campo =
  "w-full min-w-0 rounded-lg border border-borde bg-fondo px-2.5 py-2 font-num text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-principal disabled:opacity-40";

export default function TarjetaDia({ indice, fecha, registro, resultado, esHoy, cuentaAusencia, onCambiar }: Props) {
  const porHoras = esPorHoras(registro.tipo);
  const esTrabajo = registro.tipo === "trabajo" || porHoras; // en días por horas también puedes poner la parte trabajada
  const noComputa = TIPOS_DIA_COMPLETO.includes(registro.tipo) && !cuentaAusencia;
  const [verRecuperacion, setVerRecuperacion] = useState(minutosRecuperacion(registro) > 0);
  const estado = ESTADO[resultado.estado];
  const textoChip = resultado.estado === "ausencia" ? NOMBRE_TIPO[registro.tipo] : estado.texto;
  const id = `dia-${indice}`;

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
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor={`${id}-entrada`}>
          Entrada
          <input id={`${id}-entrada`} type="time" className={campo} disabled={!esTrabajo} value={registro.entrada}
            onChange={(e) => onCambiar({ ...registro, entrada: e.target.value })} />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor={`${id}-salida`}>
          Salida
          <input id={`${id}-salida`} type="time" className={campo} disabled={!esTrabajo} value={registro.salida}
            onChange={(e) => onCambiar({ ...registro, salida: e.target.value })} />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor={`${id}-pausa`}>
          Pausa (min)
          <input id={`${id}-pausa`} type="number" min={0} step={5} inputMode="numeric" className={campo} disabled={!esTrabajo}
            value={registro.pausa} onChange={(e) => onCambiar({ ...registro, pausa: e.target.value === "" ? 0 : Number(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor={`${id}-tipo`}>
          Tipo de día
          <select id={`${id}-tipo`} className={`${campo} font-sans`} value={registro.tipo}
            onChange={(e) => onCambiar({ ...registro, tipo: e.target.value as TipoDia })}>
            {(Object.keys(NOMBRE_TIPO) as TipoDia[]).map((t) => (
              <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>
            ))}
          </select>
        </label>
        {porHoras && (
          <label className="col-span-2 grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-ausencia sm:col-span-4" htmlFor={`${id}-permiso`}>
            {ETIQUETA_HORAS[registro.tipo]}
            <div className="flex items-center gap-2">
              <input id={`${id}-permiso`} type="number" min={0} max={24} step={0.25} inputMode="decimal" placeholder="Ej.: 3,5"
                className={`${campo} max-w-[9rem] border-ausencia/50`}
                value={minutosPermiso(registro) ? minutosPermiso(registro) / 60 : ""}
                onChange={(e) => onCambiar({ ...registro, minutosAsuntosPropios: undefined, minutosPermiso: horasAMinutos(e.target.value) })} />
              <span className="normal-case tracking-normal text-suave">
                h · {registro.entrada || registro.salida ? "se suman a las horas trabajadas" : "deja entrada y salida vacías si no has trabajado"}
              </span>
            </div>
          </label>
        )}
        {registro.tipo === "trabajo" && (verRecuperacion ? (
          <label className="col-span-2 grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-ausencia sm:col-span-4" htmlFor={`${id}-recuperacion`}>
            Horas de recuperación de AP recuperables
            <div className="flex items-center gap-2">
              <input id={`${id}-recuperacion`} type="number" min={0} max={24} step={0.25} inputMode="decimal" placeholder="Ej.: 1"
                className={`${campo} max-w-[9rem] border-ausencia/50`}
                value={minutosRecuperacion(registro) ? minutosRecuperacion(registro) / 60 : ""}
                onChange={(e) => onCambiar({ ...registro, minutosRecuperacion: horasAMinutos(e.target.value) })} />
              <span className="normal-case tracking-normal text-suave">h · no cuentan para la jornada, descuentan de lo pendiente de recuperar</span>
            </div>
          </label>
        ) : (
          <button type="button" onClick={() => setVerRecuperacion(true)}
            className="col-span-2 w-fit text-left text-xs font-semibold text-ausencia hover:underline sm:col-span-4">
            + Añadir horas de recuperación de AP
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-2 md:block md:text-right">
        <p className="font-num text-xl font-bold tabular-nums">{formatoHoras(resultado.minutos)}</p>
        <p className={`font-num text-sm tabular-nums ${
          noComputa ? "text-suave" : resultado.diferencia >= 0 ? "text-cumplido" : "text-pendiente"
        }`}>
          {noComputa ? "No computa" : formatoHoras(resultado.diferencia, true)}
        </p>
      </div>

      {resultado.error && (
        <p className="rounded-lg bg-pendiente/10 px-3 py-2 text-sm font-medium text-pendiente md:col-span-3" role="alert">
          {MENSAJE_ERROR[resultado.error]}
        </p>
      )}
    </article>
  );
}
