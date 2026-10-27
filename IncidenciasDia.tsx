// Apartado "Incidencias servicio" de la agenda: lo que ha pasado durante el día.
import { useState } from "react";
import { AlertTriangle, Clock, Copy, Pencil, Trash2 } from "lucide-react";
import { desdeISO, fechaISO } from "./calculos";
import { ordenarIncidencias, type Incidencia } from "./agenda";
import { nuevoId } from "./extensiones";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; fecha: string };

const horaActual = () => {
  const a = new Date();
  return `${String(a.getHours()).padStart(2, "0")}:${String(a.getMinutes()).padStart(2, "0")}`;
};

export default function IncidenciasDia({ almacen, fecha }: Props) {
  const { incidencias, cambiarIncidencias } = almacen;
  const lista = ordenarIncidencias(incidencias[fecha] ?? []);
  const [texto, setTexto] = useState("");
  const [hora, setHora] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState({ texto: "", hora: "" });
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

  const anadir = (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!texto.trim()) return;
    cambiarDia((l) => [...l, { id: nuevoId(), texto: texto.trim(), hora, creada: Date.now() }]);
    setTexto("");
    setHora("");
  };

  const guardar = (id: string) => {
    if (borrador.texto.trim()) {
      cambiarDia((l) => l.map((i) => (i.id === id ? { ...i, texto: borrador.texto.trim(), hora: borrador.hora } : i)));
    }
    setEditando(null);
  };

  const copiar = async () => {
    const titulo = desdeISO(fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const textoCopia = [`Incidencias servicio · ${titulo}`, ...lista.map((i) => `- ${i.hora ? `${i.hora} ` : ""}${i.texto}`)].join("\n");
    try {
      await navigator.clipboard.writeText(textoCopia);
      setAviso("Incidencias copiadas");
    } catch {
      setAviso("No se han podido copiar");
    }
    window.setTimeout(() => setAviso(""), 2500);
  };

  return (
    <section className="grid gap-3 rounded-2xl border border-rojo/30 bg-superficie p-4" aria-labelledby="titulo-incidencias">
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

      <form onSubmit={anadir} className="grid gap-2">
        <textarea id="incidencia-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
          placeholder="Apunta una incidencia del día…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) anadir(); }}
          className="w-full resize-y rounded-xl border border-borde bg-fondo px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rojo/60" />
        <div className="flex flex-wrap items-center gap-2">
          <input type="time" id="incidencia-hora" aria-label="Hora de la incidencia (opcional)" value={hora} onChange={(e) => setHora(e.target.value)}
            className="h-10 rounded-xl border border-borde bg-fondo px-2 font-num text-sm" />
          {esHoy && (
            <button type="button" onClick={() => setHora(horaActual())}
              className="flex h-10 items-center gap-1 rounded-xl border border-borde px-3 text-sm font-semibold hover:border-principal">
              <Clock size={15} /> Ahora
            </button>
          )}
          <button type="submit" className="ml-auto h-10 rounded-xl bg-rojo px-4 text-sm font-bold text-superficie">Apuntar incidencia</button>
        </div>
      </form>

      {lista.length === 0 ? (
        <p className="text-sm text-suave">No hay incidencias apuntadas este día.</p>
      ) : (
        <ol className="grid gap-2">
          {lista.map((i) => (
            <li key={i.id} className="flex items-start gap-3 rounded-xl border-l-4 border-rojo bg-rojo/5 px-3 py-2.5">
              {editando === i.id ? (
                <div className="grid flex-1 gap-2">
                  <textarea autoFocus rows={3} aria-label="Editar incidencia" value={borrador.texto}
                    onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })}
                    className="w-full rounded-lg border border-principal bg-fondo px-2 py-1.5 text-base focus:outline-none" />
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="time" aria-label="Hora" value={borrador.hora} onChange={(e) => setBorrador({ ...borrador, hora: e.target.value })}
                      className="h-9 rounded-lg border border-borde bg-fondo px-2 font-num text-sm" />
                    <button onClick={() => guardar(i.id)} className="h-9 rounded-lg bg-principal px-3 text-sm font-bold text-superficie">Guardar</button>
                    <button onClick={() => setEditando(null)} className="h-9 rounded-lg border border-borde px-3 text-sm font-semibold">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="mt-0.5 w-12 shrink-0 font-num text-xs font-bold text-rojo">{i.hora || "—"}</span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{i.texto}</p>
                  {borrando === i.id ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs">
                      <button onClick={() => { cambiarDia((l) => l.filter((x) => x.id !== i.id)); setBorrando(null); }}
                        className="rounded-lg bg-pendiente px-2 py-1 font-bold text-superficie">Borrar</button>
                      <button onClick={() => setBorrando(null)} className="rounded-lg border border-borde px-2 py-1 font-semibold">No</button>
                    </span>
                  ) : (
                    <span className="flex shrink-0 gap-0.5">
                      <button onClick={() => { setEditando(i.id); setBorrador({ texto: i.texto, hora: i.hora }); }} aria-label="Editar incidencia"
                        className="rounded-lg p-1.5 text-suave hover:text-principal"><Pencil size={15} /></button>
                      <button onClick={() => setBorrando(i.id)} aria-label="Borrar incidencia"
                        className="rounded-lg p-1.5 text-suave hover:text-pendiente"><Trash2 size={15} /></button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
