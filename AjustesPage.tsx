import { useRef, useState, type ReactNode } from "react";
import { Moon, Sun, Monitor, Download, Upload, Trash2, ShieldCheck } from "lucide-react";
import type { Tema } from "./tema";
import type { Jornada } from "./calculos";
import type { Almacen } from "./useSemanas";
import { crearCopia, leerCopia, nombreArchivoCopia, type Copia } from "./copia";

type Props = { tema: Tema; onTema: (t: Tema) => void; almacen: Almacen };

const TEMAS: { id: Tema; nombre: string; icono: typeof Sun }[] = [
  { id: "claro", nombre: "Claro", icono: Sun },
  { id: "oscuro", nombre: "Oscuro", icono: Moon },
  { id: "sistema", nombre: "Sistema", icono: Monitor },
];

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-suave">{titulo}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

const plural = (n: number) => `${n} semana${n === 1 ? "" : "s"}`;

export default function AjustesPage({ tema, onTema, almacen }: Props) {
  const { ajustes, cambiarAjustes, semanas } = almacen;
  const archivo = useRef<HTMLInputElement>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [copiaPendiente, setCopiaPendiente] = useState<Copia | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const exportar = () => {
    const ahora = new Date();
    const texto = JSON.stringify(crearCopia(semanas, ajustes, almacen.saldos, ahora), null, 2);
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivoCopia(ahora);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMensaje({ tipo: "ok", texto: `Copia descargada con ${plural(semanas.length)}. Guárdala en un sitio seguro.` });
  };

  const alElegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = leerCopia(await f.text());
    if (!r.ok) {
      setCopiaPendiente(null);
      setMensaje({ tipo: "error", texto: r.error });
      return;
    }
    setMensaje(null);
    setCopiaPendiente(r.copia);
  };

  const confirmarImportacion = async () => {
    if (!copiaPendiente) return;
    try {
      await almacen.importar(copiaPendiente);
      setMensaje({ tipo: "ok", texto: `Copia importada: ${plural(copiaPendiente.semanas.length)}.` });
    } catch {
      setMensaje({ tipo: "error", texto: "No se ha podido importar la copia. Vuelve a intentarlo." });
    }
    setCopiaPendiente(null);
  };

  const borrarTodo = async () => {
    try {
      await almacen.borrarTodo();
      setMensaje({ tipo: "ok", texto: "Se han borrado todos los datos." });
    } catch {
      setMensaje({ tipo: "error", texto: "No se han podido borrar los datos." });
    }
    setConfirmarBorrado(false);
  };

  const fechaCopia = copiaPendiente?.exportado
    ? new Date(copiaPendiente.exportado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ajustes</h1>

      {mensaje && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          mensaje.tipo === "ok" ? "bg-cumplido/15 text-cumplido" : "bg-pendiente/15 text-pendiente"
        }`}>
          {mensaje.texto}
        </p>
      )}

      <Bloque titulo="Jornada">
        <div>
          <p className="text-sm font-semibold">Jornada por defecto para semanas nuevas</p>
          <div className="mt-2 inline-flex rounded-xl border border-borde bg-fondo p-1" role="group" aria-label="Jornada por defecto">
            {([35, 37.5] as Jornada[]).map((j) => (
              <button key={j} onClick={() => cambiarAjustes({ jornadaPorDefecto: j })} aria-pressed={ajustes.jornadaPorDefecto === j}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  ajustes.jornadaPorDefecto === j ? "bg-superficie text-principal shadow-sm" : "text-suave hover:text-texto"
                }`}>
                {String(j).replace(".", ",")} h
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-suave">Cada semana puede cambiarse desde su propia pantalla.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--principal))]" checked={ajustes.contarPorDefecto}
            onChange={(e) => cambiarAjustes({ contarPorDefecto: e.target.checked })} />
          Contar festivos, vacaciones y bajas como el objetivo diario en semanas nuevas
        </label>
      </Bloque>

      <Bloque titulo="Apariencia">
        <div className="grid grid-cols-3 gap-2">
          {TEMAS.map(({ id, nombre, icono: Icono }) => (
            <button key={id} onClick={() => onTema(id)} aria-pressed={tema === id}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 font-semibold transition-colors ${
                tema === id ? "border-principal bg-principal/10 text-principal" : "border-borde text-suave hover:text-texto"
              }`}>
              <Icono size={22} />
              {nombre}
            </button>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Copia de seguridad">
        <p className="flex items-start gap-2 text-sm text-suave">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cumplido" />
          Tus datos se guardan solo en este navegador ({plural(semanas.length)} guardadas). Si borras los datos del navegador o
          cambias de dispositivo, los perderás. Descarga una copia de vez en cuando.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportar} className="flex items-center gap-2 rounded-xl bg-principal px-4 py-2.5 text-sm font-bold text-superficie">
            <Download size={18} /> Descargar copia
          </button>
          <button onClick={() => archivo.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-borde px-4 py-2.5 text-sm font-bold hover:border-principal">
            <Upload size={18} /> Importar copia
          </button>
          <input ref={archivo} id="importar-copia" type="file" accept=".json,application/json" className="hidden" onChange={alElegirArchivo} />
        </div>
        {copiaPendiente && (
          <div className="rounded-xl border border-principal/30 bg-principal/10 p-4 text-sm">
            <p className="font-semibold">
              Esta copia{fechaCopia ? ` del ${fechaCopia}` : ""} tiene {plural(copiaPendiente.semanas.length)}.
            </p>
            <p className="mt-1 text-suave">
              Al importarla se sustituyen las {plural(semanas.length)} que tienes ahora en este dispositivo.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={confirmarImportacion} className="rounded-lg bg-principal px-3 py-2 font-bold text-superficie">Importar</button>
              <button onClick={() => setCopiaPendiente(null)} className="rounded-lg border border-borde px-3 py-2 font-semibold">Cancelar</button>
            </div>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Borrar datos">
        {confirmarBorrado ? (
          <div className="rounded-xl border border-pendiente/40 bg-pendiente/10 p-4 text-sm">
            <p className="font-semibold text-pendiente">
              Vas a borrar {plural(semanas.length)}, los saldos anuales y los ajustes. No se puede deshacer.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={borrarTodo} className="rounded-lg bg-pendiente px-3 py-2 font-bold text-superficie">Borrar todo</button>
              <button onClick={() => setConfirmarBorrado(false)} className="rounded-lg border border-borde px-3 py-2 font-semibold">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmarBorrado(true)}
            className="flex w-fit items-center gap-2 rounded-xl border border-borde px-4 py-2.5 text-sm font-bold text-pendiente hover:border-pendiente">
            <Trash2 size={18} /> Borrar todos los datos
          </button>
        )}
      </Bloque>
    </div>
  );
}
