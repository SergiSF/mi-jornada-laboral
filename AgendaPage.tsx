import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Search, X, ArrowDownToLine, NotebookPen } from "lucide-react";
import { DIAS_SEMANA, desdeISO, fechaISO, lunesDe, sumarDias } from "./calculos";
import { buscarEnAgenda, ordenarNotas, pendientesAnteriores, type Nota } from "./agenda";
import { nuevoId } from "./extensiones";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; fecha: string; onFecha: (fecha: string) => void };

const largo = (iso: string) => {
  const t = desdeISO(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const corto = (iso: string) => desdeISO(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

export default function AgendaPage({ almacen, fecha, onFecha }: Props) {
  const { agenda, cambiarAgenda } = almacen;
  const hoy = fechaISO(new Date());
  const [texto, setTexto] = useState("");
  const [hora, setHora] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [consulta, setConsulta] = useState("");

  const notas = ordenarNotas(agenda[fecha] ?? []);
  const pendientes = fecha === hoy ? pendientesAnteriores(agenda, hoy) : [];
  const resultados = buscarEnAgenda(agenda, consulta);
  const lunes = lunesDe(desdeISO(fecha));
  const hechas = notas.filter((n) => n.hecha).length;

  const actualizar = (dia: string, id: string, cambios: Partial<Nota>) =>
    cambiarAgenda((prev) => ({ ...prev, [dia]: (prev[dia] ?? []).map((n) => (n.id === id ? { ...n, ...cambios } : n)) }));

  const borrar = (dia: string, id: string) =>
    cambiarAgenda((prev) => {
      const quedan = (prev[dia] ?? []).filter((n) => n.id !== id);
      const copia = { ...prev };
      if (quedan.length) copia[dia] = quedan;
      else delete copia[dia];
      return copia;
    });

  const anadir = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!texto.trim()) return;
    const nota: Nota = { id: nuevoId(), texto: texto.trim(), hora, hecha: false, creada: Date.now() };
    cambiarAgenda((prev) => ({ ...prev, [fecha]: [...(prev[fecha] ?? []), nota] }));
    setTexto("");
    setHora("");
  };

  const pasarAHoy = (dia: string, nota: Nota) =>
    cambiarAgenda((prev) => {
      const copia = { ...prev, [hoy]: [...(prev[hoy] ?? []), { ...nota, creada: Date.now() }] };
      const quedan = (prev[dia] ?? []).filter((n) => n.id !== nota.id);
      if (quedan.length) copia[dia] = quedan;
      else delete copia[dia];
      return copia;
    });

  const guardarEdicion = (id: string) => {
    if (borrador.trim()) actualizar(fecha, id, { texto: borrador.trim() });
    setEditando(null);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-principal">{fecha === hoy ? "Hoy" : "Agenda"}</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{largo(fecha)}</h1>
          {notas.length > 0 && <p className="text-sm text-suave">{hechas} de {notas.length} hechas</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onFecha(fechaISO(sumarDias(desdeISO(fecha), -1)))} aria-label="Día anterior"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal"><ChevronLeft size={20} /></button>
          <button onClick={() => onFecha(hoy)} className="h-10 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:border-principal">Hoy</button>
          <button onClick={() => onFecha(fechaISO(sumarDias(desdeISO(fecha), 1)))} aria-label="Día siguiente"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal"><ChevronRight size={20} /></button>
          <input type="date" id="agenda-fecha" aria-label="Ir a una fecha" value={fecha} onChange={(e) => e.target.value && onFecha(e.target.value)}
            className="h-10 rounded-xl border border-borde bg-superficie px-2 text-sm" />
        </div>
      </header>

      {/* Semana: cada día con el número de notas */}
      <nav className="grid grid-cols-5 gap-2" aria-label="Días de la semana">
        {DIAS_SEMANA.map((nombre, i) => {
          const dia = fechaISO(sumarDias(lunes, i));
          const lista = agenda[dia] ?? [];
          const sinHacer = lista.filter((n) => !n.hecha).length;
          const activo = dia === fecha;
          return (
            <button key={dia} onClick={() => onFecha(dia)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-2 text-center transition-colors ${
                activo ? "border-principal bg-principal text-superficie" : "border-borde bg-superficie hover:border-principal"
              }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${activo ? "" : dia === hoy ? "text-principal" : "text-suave"}`}>{nombre.slice(0, 3)}</span>
              <span className="text-lg font-extrabold">{desdeISO(dia).getDate()}</span>
              <span className={`h-5 min-w-5 rounded-full px-1.5 text-[11px] font-bold leading-5 ${
                lista.length === 0 ? "opacity-0" : activo ? "bg-superficie/25" : sinHacer ? "bg-pendiente/15 text-pendiente" : "bg-cumplido/15 text-cumplido"
              }`}>
                {sinHacer || lista.length}
              </span>
            </button>
          );
        })}
      </nav>

      <form onSubmit={anadir} className="flex flex-wrap gap-2 rounded-2xl border border-borde bg-superficie p-3">
        <input type="time" id="agenda-hora" aria-label="Hora (opcional)" value={hora} onChange={(e) => setHora(e.target.value)}
          className="h-11 rounded-xl border border-borde bg-fondo px-2 font-num text-sm" />
        <input id="agenda-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Apunta una tarea o nota y pulsa Intro"
          className="order-first h-11 min-w-0 basis-full rounded-xl border border-borde bg-fondo px-3 text-base focus:outline-none focus:ring-2 focus:ring-principal sm:order-none sm:basis-auto sm:flex-1" />
        <button type="submit" className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-principal px-4 font-bold text-superficie sm:flex-none">
          <Plus size={18} /> Añadir
        </button>
      </form>

      {notas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-borde bg-superficie px-6 py-10 text-center text-suave">
          <NotebookPen size={28} className="text-principal" />
          <p>No hay nada apuntado este día.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-borde bg-superficie">
          {notas.map((n) => (
            <li key={n.id} className="flex items-start gap-3 border-b border-borde/70 px-4 py-3 last:border-0">
              <input type="checkbox" id={`nota-${n.id}`} checked={n.hecha} onChange={(e) => actualizar(fecha, n.id, { hecha: e.target.checked })}
                className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--cumplido))]" aria-label={n.hecha ? "Marcar como pendiente" : "Marcar como hecha"} />
              {n.hora && <span className="mt-0.5 rounded-md bg-principal/10 px-1.5 py-0.5 font-num text-xs font-bold text-principal">{n.hora}</span>}
              {editando === n.id ? (
                <input autoFocus value={borrador} onChange={(e) => setBorrador(e.target.value)} onBlur={() => guardarEdicion(n.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") guardarEdicion(n.id); if (e.key === "Escape") setEditando(null); }}
                  aria-label="Editar nota" className="min-w-0 flex-1 rounded-lg border border-principal bg-fondo px-2 py-1 text-base focus:outline-none" />
              ) : (
                <button onClick={() => { setEditando(n.id); setBorrador(n.texto); }} title="Pulsa para editar"
                  className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-left ${n.hecha ? "text-suave line-through" : ""}`}>
                  {n.texto}
                </button>
              )}
              <button onClick={() => borrar(fecha, n.id)} aria-label="Borrar nota" className="rounded-lg p-1 text-suave opacity-60 hover:text-pendiente hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendientes.length > 0 && (
        <section className="rounded-2xl border border-pendiente/30 bg-pendiente/10 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-pendiente">Pendiente de días anteriores ({pendientes.length})</h2>
          <ul className="mt-2 grid gap-1.5">
            {pendientes.map(({ fecha: dia, nota }) => (
              <li key={nota.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <input type="checkbox" id={`pend-${nota.id}`} onChange={() => actualizar(dia, nota.id, { hecha: true })} className="h-4 w-4 accent-[rgb(var(--cumplido))]"
                  aria-label="Marcar como hecha" />
                <button onClick={() => onFecha(dia)} className="font-semibold capitalize text-pendiente hover:underline">{corto(dia)}</button>
                <span className="min-w-0 flex-1">{nota.texto}</span>
                <button onClick={() => pasarAHoy(dia, nota)} className="flex items-center gap-1 rounded-lg border border-pendiente/40 px-2 py-0.5 text-xs font-semibold text-pendiente">
                  <ArrowDownToLine size={13} /> Pasar a hoy
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2">
        <label className="flex items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-2.5 focus-within:ring-2 focus-within:ring-principal">
          <Search size={18} className="text-suave" />
          <input id="buscar-agenda" type="text" enterKeyHint="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar en toda la agenda"
            className="w-full min-w-0 bg-transparent focus:outline-none" />
          {consulta && <button onClick={() => setConsulta("")} aria-label="Borrar búsqueda" className="text-suave"><X size={16} /></button>}
        </label>
        {consulta && (
          <ul className="overflow-hidden rounded-2xl border border-borde bg-superficie text-sm">
            {resultados.length === 0 && <li className="px-4 py-3 text-suave">Nada coincide con «{consulta}».</li>}
            {resultados.map(({ fecha: dia, nota }) => (
              <li key={nota.id} className="border-b border-borde/70 last:border-0">
                <button onClick={() => { onFecha(dia); setConsulta(""); }} className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-fondo">
                  <span className="w-28 shrink-0 font-semibold capitalize text-principal">{corto(dia)}</span>
                  <span className={nota.hecha ? "text-suave line-through" : ""}>{nota.texto}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
