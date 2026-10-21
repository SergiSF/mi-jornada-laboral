import { useRef, useState } from "react";
import { Search, Phone, Upload, Plus, Trash2, X, ShieldCheck } from "lucide-react";
import { agruparPorZona, buscar, leerListado, nuevoId, separarNumeros, type Extension } from "./extensiones";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen };

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function ExtensionesPage({ almacen }: Props) {
  const lista = almacen.extensiones;
  const [consulta, setConsulta] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [nueva, setNueva] = useState({ area: "", nombre: "", numeros: "" });
  const [borrando, setBorrando] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const resultados = buscar(lista, consulta);
  const zonas = [...new Set(lista.map((e) => e.area))];
  const letrasConDatos = new Set(lista.flatMap((e) => [e.nombre, e.area]).map((t) => t.normalize("NFD")[0]?.toUpperCase()));

  const mostrar = (tipo: "ok" | "error", texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 2500);
  };

  const copiar = async (numero: string) => {
    try {
      await navigator.clipboard.writeText(numero);
      mostrar("ok", `Extensión ${numero} copiada`);
    } catch {
      mostrar("ok", `Extensión ${numero}`);
    }
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = leerListado(await f.text());
    if (!r.ok) return mostrar("error", r.error);
    almacen.cambiarExtensiones(r.lista);
    mostrar("ok", `Listado importado: ${r.lista.length} extensiones.`);
  };

  const anadir = (ev: React.FormEvent) => {
    ev.preventDefault();
    const numeros = separarNumeros(nueva.numeros);
    if (!nueva.nombre.trim() || numeros.length === 0) return mostrar("error", "Escribe al menos el nombre y un número.");
    const e: Extension = { id: nuevoId(), area: nueva.area.trim() || "Otros", nombre: nueva.nombre.trim(), numeros };
    almacen.cambiarExtensiones([...lista, e]);
    setNueva({ area: nueva.area, nombre: "", numeros: "" });
    mostrar("ok", `${e.nombre} añadida`);
  };

  const borrar = (id: string) => {
    almacen.cambiarExtensiones(lista.filter((e) => e.id !== id));
    setBorrando(null);
  };

  const Fila = ({ e, conZona }: { e: Extension; conZona: boolean }) => (
    <li className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-borde/70 px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-semibold">{e.nombre}</p>
        {conZona && <p className="text-xs text-suave">{e.area}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {e.numeros.map((n) => (
          <button key={n} onClick={() => copiar(n)} title="Copiar"
            className="rounded-lg bg-principal/10 px-2.5 py-1 font-num text-sm font-bold tabular-nums text-principal hover:bg-principal hover:text-superficie">
            {n}
          </button>
        ))}
        {borrando === e.id ? (
          <span className="flex items-center gap-1 text-xs">
            <button onClick={() => borrar(e.id)} className="rounded-lg bg-pendiente px-2 py-1 font-bold text-superficie">Borrar</button>
            <button onClick={() => setBorrando(null)} className="rounded-lg border border-borde px-2 py-1 font-semibold">No</button>
          </span>
        ) : (
          <button onClick={() => setBorrando(e.id)} aria-label={`Borrar ${e.nombre}`}
            className="rounded-lg p-1.5 text-suave opacity-60 hover:text-pendiente hover:opacity-100">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-principal">Extensiones</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Teléfonos</h1>
          <p className="text-sm text-suave">{lista.length} extensiones · Pulsa un número para copiarlo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFormulario(!formulario)}
            className="flex items-center gap-2 rounded-xl border border-borde bg-superficie px-3 py-2 text-sm font-semibold hover:border-principal">
            {formulario ? <X size={16} /> : <Plus size={16} />} {formulario ? "Cerrar" : "Añadir"}
          </button>
          <button onClick={() => archivo.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-borde bg-superficie px-3 py-2 text-sm font-semibold hover:border-principal">
            <Upload size={16} /> {lista.length ? "Reemplazar listado" : "Importar listado"}
          </button>
          <input ref={archivo} id="importar-extensiones" type="file" accept=".json,application/json" className="hidden" onChange={importar} />
        </div>
      </header>

      {aviso && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${aviso.tipo === "ok" ? "bg-cumplido/15 text-cumplido" : "bg-pendiente/15 text-pendiente"}`}>
          {aviso.texto}
        </p>
      )}

      {formulario && (
        <form onSubmit={anadir} className="grid gap-3 rounded-2xl border border-borde bg-superficie p-4 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor="ext-zona">
            Zona
            <input id="ext-zona" list="zonas" value={nueva.area} onChange={(e) => setNueva({ ...nueva, area: e.target.value })} placeholder="Edifici A2"
              className="rounded-lg border border-borde bg-fondo px-3 py-2 text-sm normal-case tracking-normal text-texto focus:outline-none focus:ring-2 focus:ring-principal" />
            <datalist id="zonas">{zonas.map((z) => <option key={z} value={z} />)}</datalist>
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor="ext-nombre">
            Nombre
            <input id="ext-nombre" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Oficina RRHH"
              className="rounded-lg border border-borde bg-fondo px-3 py-2 text-sm normal-case tracking-normal text-texto focus:outline-none focus:ring-2 focus:ring-principal" />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-suave" htmlFor="ext-numeros">
            Números
            <input id="ext-numeros" value={nueva.numeros} onChange={(e) => setNueva({ ...nueva, numeros: e.target.value })} placeholder="3552 / 3536" inputMode="numeric"
              className="rounded-lg border border-borde bg-fondo px-3 py-2 font-num text-sm normal-case tracking-normal text-texto focus:outline-none focus:ring-2 focus:ring-principal" />
          </label>
          <button type="submit" className="rounded-xl bg-principal px-4 py-2 text-sm font-bold text-superficie">Añadir</button>
        </form>
      )}

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde bg-superficie px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-principal/10 text-principal"><Phone size={28} /></span>
          <p className="max-w-md text-suave">
            Todavía no hay extensiones. Pulsa <strong className="text-texto">Importar listado</strong> y elige el archivo
            <span className="font-num text-texto"> extensiones-lledoners.json</span>, o añádelas una a una.
          </p>
          <p className="flex max-w-md items-start gap-2 text-left text-xs text-suave">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-cumplido" />
            El listado se guarda solo en este dispositivo. No lo subas a GitHub.
          </p>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-[5] -mx-1 grid gap-2 bg-fondo/95 px-1 pb-2 pt-1 backdrop-blur">
            <label className="flex items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3 focus-within:ring-2 focus-within:ring-principal">
              <Search size={20} className="shrink-0 text-suave" />
              <input id="buscar-extension" type="text" enterKeyHint="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} autoComplete="off"
                placeholder="Busca por inicial, nombre, zona o número" aria-label="Buscar extensión"
                className="w-full min-w-0 bg-transparent text-base focus:outline-none" />
              {consulta && (
                <button onClick={() => setConsulta("")} aria-label="Borrar búsqueda" className="text-suave hover:text-texto"><X size={18} /></button>
              )}
            </label>
            <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Buscar por inicial">
              {LETRAS.map((l) => (
                <button key={l} onClick={() => setConsulta(l)} disabled={!letrasConDatos.has(l)}
                  className={`h-8 min-w-8 shrink-0 rounded-lg text-sm font-bold disabled:opacity-25 ${
                    consulta.toUpperCase() === l ? "bg-principal text-superficie" : "bg-superficie text-suave hover:text-principal"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {consulta ? (
            resultados.length ? (
              <section className="overflow-hidden rounded-2xl border border-borde bg-superficie">
                <p className="border-b border-borde px-4 py-2 text-xs font-bold uppercase tracking-wider text-suave">
                  {resultados.length} resultado{resultados.length === 1 ? "" : "s"}
                </p>
                <ul>{resultados.map((e) => <Fila key={e.id} e={e} conZona />)}</ul>
              </section>
            ) : (
              <p className="py-10 text-center text-suave">No hay ninguna extensión que coincida con «{consulta}».</p>
            )
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {agruparPorZona(lista).map(([zona, items]) => (
                <section key={zona} className="h-fit overflow-hidden rounded-2xl border border-borde bg-superficie">
                  <h2 className="border-b border-borde bg-principal/5 px-4 py-2.5 text-sm font-bold">{zona}</h2>
                  <ul>{items.map((e) => <Fila key={e.id} e={e} conZona={false} />)}</ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
