// Apartado "Incidencias servicio" de la agenda: lo que ha pasado durante el día.
import { useState } from "react";
import { AlertTriangle, Clock, Copy, Pencil, Trash2 } from "lucide-react";
import { desdeISO, fechaISO } from "./calculos";
import { NOMBRE_TURNO, cuandoIncidencia, ordenarIncidencias, type Incidencia, type Turno } from "./agenda";
import { nuevoId } from "./extensiones";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; fecha: string };

/** Lo que se escribe en el formulario (para apuntar o editar una incidencia). */
type Formulario = { turno: Turno | ""; hora: string; hasta: string; texto: string };
const VACIO: Formulario = { turno: "", hora: "", hasta: "", texto: "" };

const horaActual = () => {
  const a = new Date();
  return `${String(a.getHours()).padStart(2, "0")}:${String(a.getMinutes()).padStart(2, "0")}`;
};

/** Turno que corresponde a una hora: mañana de 7 a 15, tarde de 15 a 23 y noche de 23 a 7. */
const turnoDeHora = (h: string): Turno => {
  const n = Number(h.slice(0, 2));
  return n >= 7 && n < 15 ? "manana" : n >= 15 && n < 23 ? "tarde" : "noche";
};

const campo = "rounded-xl border border-borde bg-fondo px-3 text-base focus:outline-none focus:ring-2 focus:ring-rojo/60";
const etiqueta = "grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave";

function Campos({ valor, onCambiar, prefijo, conAhora }: { valor: Formulario; onCambiar: (f: Formulario) => void; prefijo: string; conAhora: boolean }) {
  const franjaMal = valor.hora !== "" && valor.hasta !== "" && valor.hasta <= valor.hora && valor.turno !== "noche";
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className={etiqueta} htmlFor={`${prefijo}-turno`}>
          Turno
          <select id={`${prefijo}-turno`} value={valor.turno} onChange={(e) => onCambiar({ ...valor, turno: e.target.value as Turno | "" })}
            className={`${campo} h-10 text-sm normal-case tracking-normal text-texto`}>
            <option value="">Sin turno</option>
            {(Object.keys(NOMBRE_TURNO) as Turno[]).map((t) => <option key={t} value={t}>{NOMBRE_TURNO[t]}</option>)}
          </select>
        </label>
        <label className={etiqueta} htmlFor={`${prefijo}-desde`}>
          De
          <input type="time" id={`${prefijo}-desde`} value={valor.hora}
            onChange={(e) => onCambiar({ ...valor, hora: e.target.value, turno: valor.turno || (e.target.value ? turnoDeHora(e.target.value) : "") })}
            className={`${campo} h-10 px-2 font-num text-sm text-texto`} />
        </label>
        <label className={etiqueta} htmlFor={`${prefijo}-hasta`}>
          A
          <input type="time" id={`${prefijo}-hasta`} value={valor.hasta} onChange={(e) => onCambiar({ ...valor, hasta: e.target.value })}
            className={`${campo} h-10 px-2 font-num text-sm text-texto`} />
        </label>
        {conAhora && (
          <button type="button" onClick={() => { const h = horaActual(); onCambiar({ ...valor, hora: h, turno: valor.turno || turnoDeHora(h) }); }}
            className="flex h-10 items-center gap-1 rounded-xl border border-borde px-3 text-sm font-semibold hover:border-principal">
            <Clock size={15} /> Ahora
          </button>
        )}
      </div>
      {franjaMal && <p className="-mt-1 text-xs font-medium text-pendiente">La hora final debe ser posterior a la inicial.</p>}

      <label className={etiqueta} htmlFor={`${prefijo}-texto`}>
        Comentario
        <textarea id={`${prefijo}-texto`} value={valor.texto} onChange={(e) => onCambiar({ ...valor, texto: e.target.value })} rows={3}
          placeholder="Escribe la incidencia: qué ha pasado, a quién se ha avisado, cómo se ha resuelto…" className={`${campo} resize-y py-2 normal-case tracking-normal text-texto`} />
      </label>
    </div>
  );
}

export default function IncidenciasDia({ almacen, fecha }: Props) {
  const { incidencias, cambiarIncidencias } = almacen;
  const lista = ordenarIncidencias(incidencias[fecha] ?? []);
  const [nueva, setNueva] = useState<Formulario>(VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Formulario>(VACIO);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const esHoy = fecha === fechaISO(new Date());

  const cambiarDia = (cambio: (l: Incidencia[]) => Incidencia[]) =>
    cambiarIncidencias((prev) => {
      const nuevas = cambio(prev[fecha] ?? []);
      const copia = { ...prev };
      if (nuevas.length) copia[fecha] = nuevas;
      else delete copia[fecha];
      return copia;
    });

  const aIncidencia = (f: Formulario, base: { id: string; creada: number }): Incidencia => ({
    ...base,
    turno: f.turno || undefined,
    hora: f.hora,
    hasta: f.hasta || undefined,
    texto: f.texto.trim(),
  });
  const vacio = (f: Formulario) => !f.texto.trim();

  const anadir = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (vacio(nueva)) return;
    cambiarDia((l) => [...l, aIncidencia(nueva, { id: nuevoId(), creada: Date.now() })]);
    setNueva(VACIO);
  };

  const guardar = (i: Incidencia) => {
    if (!vacio(borrador)) cambiarDia((l) => l.map((x) => (x.id === i.id ? aIncidencia(borrador, { id: i.id, creada: i.creada }) : x)));
    setEditando(null);
  };

  const copiar = async () => {
    const dia = desdeISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const lineas = lista.map((i) => {
      const cuando = cuandoIncidencia(i);
      return `- ${cuando ? `[${cuando}] ` : ""}${i.texto}`;
    });
    try {
      await navigator.clipboard.writeText([`Incidencias servicio · ${dia}`, ...lineas].join("\n"));
      setAviso("Incidencias copiadas");
    } catch {
      setAviso("No se han podido copiar");
    }
    window.setTimeout(() => setAviso(""), 2500);
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-rojo/30 bg-superficie p-4" aria-labelledby="titulo-incidencias">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-incidencias" className="flex items-center gap-2 font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-rojo/15 text-rojo"><AlertTriangle size={17} /></span>
          Incidencias servicio
          {lista.length > 0 && <span className="rounded-full bg-rojo/15 px-2 py-0.5 text-xs font-bold text-rojo">{lista.length}</span>}
        </h2>
        <div className="flex items-center gap-2">
          {aviso && <span className="text-xs font-semibold text-cumplido" aria-live="polite">{aviso}</span>}
          {lista.length > 0 && (
            <button onClick={copiar} className="flex items-center gap-1.5 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-semibold hover:border-principal">
              <Copy size={14} /> Copiar las del día
            </button>
          )}
        </div>
      </div>

      <form onSubmit={anadir} className="grid gap-3 rounded-xl bg-fondo/60 p-3">
        <Campos valor={nueva} onCambiar={setNueva} prefijo="incidencia" conAhora={esHoy} />
        <button type="submit" disabled={vacio(nueva)}
          className="h-11 w-full rounded-xl bg-rojo px-4 text-sm font-bold text-superficie disabled:opacity-40 sm:ml-auto sm:w-fit">
          Apuntar incidencia
        </button>
      </form>

      {lista.length === 0 ? (
        <p className="text-sm text-suave">No hay incidencias apuntadas este día.</p>
      ) : (
        <ol className="grid gap-2">
          {lista.map((i) =>
            editando === i.id ? (
              <li key={i.id} className="grid gap-3 rounded-xl border border-principal bg-superficie p-3">
                <Campos valor={borrador} onCambiar={setBorrador} prefijo={`editar-${i.id}`} conAhora={false} />
                <div className="flex gap-2">
                  <button onClick={() => guardar(i)} className="h-10 rounded-lg bg-principal px-4 text-sm font-bold text-superficie">Guardar</button>
                  <button onClick={() => setEditando(null)} className="h-10 rounded-lg border border-borde px-4 text-sm font-semibold">Cancelar</button>
                </div>
              </li>
            ) : (
              <li key={i.id} className="flex items-start gap-3 rounded-xl border-l-4 border-rojo bg-rojo/5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {cuandoIncidencia(i) && (
                    <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-rojo">
                      {i.turno && <span className="rounded bg-rojo/15 px-1.5 py-0.5 uppercase tracking-wider">{NOMBRE_TURNO[i.turno]}</span>}
                      {(i.hora || i.hasta) && (
                        <span className="font-num">{i.hora && i.hasta ? `${i.hora}–${i.hasta}` : i.hora || `hasta ${i.hasta}`}</span>
                      )}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{i.texto}</p>
                </div>
                {borrando === i.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs">
                    <button onClick={() => { cambiarDia((l) => l.filter((x) => x.id !== i.id)); setBorrando(null); }}
                      className="rounded-lg bg-pendiente px-2 py-1 font-bold text-superficie">Borrar</button>
                    <button onClick={() => setBorrando(null)} className="rounded-lg border border-borde px-2 py-1 font-semibold">No</button>
                  </span>
                ) : (
                  <span className="flex shrink-0 gap-0.5">
                    <button aria-label="Editar incidencia" className="rounded-lg p-1.5 text-suave hover:text-principal"
                      onClick={() => {
                        setEditando(i.id);
                        setBorrador({ turno: i.turno ?? "", hora: i.hora, hasta: i.hasta ?? "", texto: i.texto });
                      }}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setBorrando(i.id)} aria-label="Borrar incidencia"
                      className="rounded-lg p-1.5 text-suave hover:text-pendiente"><Trash2 size={15} /></button>
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
