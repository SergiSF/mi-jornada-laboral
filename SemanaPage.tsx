import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Copy, Trash2, Info } from "lucide-react";
import {
  calcularSemana,
  desdeISO,
  ficharAhora,
  fechaISO,
  formatoHoras,
  lunesDe,
  objetivoDiario,
  resumenSemanal,
  sumarDias,
  diaVacio,
  type Jornada,
  type RegistroDia,
} from "./calculos";
import type { Almacen } from "./useSemanas";
import AnilloProgreso from "./AnilloProgreso";
import GraficoSemana from "./GraficoSemana";
import TarjetaDia from "./TarjetaDia";

type Props = { almacen: Almacen; lunes: Date; onLunes: (lunes: Date) => void };

function nombreSemana(lunes: Date): string {
  const diferencia = Math.round((lunes.getTime() - lunesDe(new Date()).getTime()) / (7 * 864e5));
  if (diferencia === 0) return "Esta semana";
  if (diferencia === -1) return "Semana pasada";
  if (diferencia === 1) return "Semana que viene";
  return diferencia < 0 ? `Hace ${-diferencia} semanas` : `Dentro de ${diferencia} semanas`;
}

export default function SemanaPage({ almacen, lunes, onLunes: setLunes }: Props) {
  const [aviso, setAviso] = useState("");
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);

  const semana = almacen.obtener(lunes);
  const r = calcularSemana(semana);
  const objetivoDia = objetivoDiario(semana.jornada);

  const hoy = new Date();
  const indiceHoy = fechaISO(lunesDe(hoy)) === semana.lunes ? (hoy.getDay() + 6) % 7 : -1;
  const hoyEnSemana = indiceHoy >= 0 && indiceHoy <= 4 ? indiceHoy : null;
  const registroHoy = hoyEnSemana !== null ? semana.dias[hoyEnSemana] : undefined;

  const viernes = sumarDias(desdeISO(semana.lunes), 4);
  const rango = `Del ${desdeISO(semana.lunes).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} al ${viernes.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`;

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(""), 2500);
  };

  const cambiarDia = (i: number, registro: RegistroDia) => {
    const dias = semana.dias.map((d, j) => (j === i ? registro : d));
    almacen.guardar({ ...semana, dias });
  };

  const cambiarJornada = (jornada: Jornada) => almacen.guardar({ ...semana, jornada });

  const fichar = () => {
    if (hoyEnSemana === null || !registroHoy) return;
    const nuevo = ficharAhora(registroHoy, new Date());
    cambiarDia(hoyEnSemana, nuevo);
    mostrarAviso(registroHoy.entrada === "" ? `Entrada fichada a las ${nuevo.entrada}` : `Salida fichada a las ${nuevo.salida}`);
  };

  const copiar = async () => {
    const texto = resumenSemanal(semana);
    try {
      await navigator.clipboard.writeText(texto);
      mostrarAviso("Resumen copiado");
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      mostrarAviso(ok ? "Resumen copiado" : "No se ha podido copiar");
    }
  };

  const limpiar = () => {
    almacen.guardar({ ...semana, dias: Array.from({ length: 5 }, diaVacio) });
    setConfirmarLimpiar(false);
    mostrarAviso("Semana limpiada");
  };

  const textoFichar = !registroHoy ? "" : registroHoy.entrada === "" ? "Fichar entrada" : registroHoy.salida === "" ? "Fichar salida" : "Actualizar salida";

  return (
    <div className="grid gap-6">
      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-principal">{nombreSemana(lunes)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Mi semana</h1>
          <p className="text-sm text-suave">{rango}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setLunes(lunesDe(new Date()))}
            className="h-10 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:border-principal">
            Hoy
          </button>
          <button onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente"
            className="grid h-10 w-10 place-items-center rounded-xl border border-borde bg-superficie hover:border-principal">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {almacen.hayEjemplo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-principal/30 bg-principal/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-principal">
            <Info size={18} /> Estás viendo datos de ejemplo. Edita cualquier día o bórralos para empezar.
          </p>
          <button onClick={almacen.borrarEjemplo} className="rounded-lg bg-principal px-3 py-1.5 font-semibold text-superficie">
            Borrar ejemplo
          </button>
        </div>
      )}

      {/* Resumen */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-borde bg-superficie p-6">
          <div className="flex w-full items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-suave">Progreso semanal</h2>
            <div className="inline-flex rounded-xl border border-borde bg-fondo p-1" role="group" aria-label="Jornada">
              {([35, 37.5] as Jornada[]).map((j) => (
                <button key={j} onClick={() => cambiarJornada(j)} aria-pressed={semana.jornada === j}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                    semana.jornada === j ? "bg-superficie text-principal shadow-sm" : "text-suave hover:text-texto"
                  }`}>
                  {String(j).replace(".", ",")} h
                </button>
              ))}
            </div>
          </div>
          <AnilloProgreso computado={r.computado} objetivo={r.objetivo} porcentaje={r.porcentaje} />
          {textoFichar && (
            <button onClick={fichar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-principal px-5 py-3.5 text-base font-bold text-superficie shadow-lg shadow-principal/25 transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <Clock size={20} /> {textoFichar}
            </button>
          )}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 sm:block rounded-2xl border border-borde bg-superficie p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-suave">Computadas</p>
              <p className="whitespace-nowrap font-num text-lg font-bold tabular-nums sm:mt-1 sm:text-base lg:text-lg">{formatoHoras(r.computado)}</p>
            </div>
            <div className={`flex items-center justify-between gap-3 sm:block rounded-2xl border p-4 ${r.faltan > 0 ? "border-pendiente/30 bg-pendiente/10" : "border-cumplido/30 bg-cumplido/10"}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${r.faltan > 0 ? "text-pendiente" : "text-cumplido"}`}>
                {r.faltan > 0 ? "Te faltan" : "Te sobran"}
              </p>
              <p className={`whitespace-nowrap font-num text-lg font-bold tabular-nums sm:mt-1 sm:text-base lg:text-lg ${r.faltan > 0 ? "text-pendiente" : "text-cumplido"}`}>
                {formatoHoras(r.faltan > 0 ? r.faltan : r.sobran)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:block rounded-2xl border border-borde bg-superficie p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-suave">Objetivo diario</p>
              <p className="whitespace-nowrap font-num text-lg font-bold tabular-nums sm:mt-1 sm:text-base lg:text-lg">{formatoHoras(objetivoDia)}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-borde bg-superficie p-4 md:p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-suave">Horas por día</h2>
            <GraficoSemana dias={r.dias} objetivoDia={objetivoDia} hoy={hoyEnSemana} />
          </div>
        </div>
      </section>

      {/* Días */}
      <section className="grid gap-3" aria-label="Horario diario">
        {semana.dias.map((d, i) => {
          const resultado = r.dias[i];
          if (!resultado) return null;
          return (
            <TarjetaDia key={`${semana.lunes}-${i}`} indice={i} fecha={sumarDias(desdeISO(semana.lunes), i)} registro={d}
              resultado={resultado} esHoy={hoyEnSemana === i} cuentaAusencia={semana.contarAusencias}
              onCambiar={(nuevo) => cambiarDia(i, nuevo)} />
          );
        })}
      </section>

      {/* Pie */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-borde bg-superficie p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--principal))]" checked={semana.contarAusencias}
            onChange={(e) => almacen.guardar({ ...semana, contarAusencias: e.target.checked })} />
          Contar festivos, vacaciones y bajas como el objetivo diario
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-cumplido" aria-live="polite">{aviso}</span>
          <button onClick={copiar} className="flex items-center gap-2 rounded-xl bg-principal px-4 py-2 text-sm font-bold text-superficie">
            <Copy size={16} /> Copiar resumen
          </button>
          {confirmarLimpiar ? (
            <span className="flex items-center gap-2 text-sm">
              ¿Borrar las horas de esta semana?
              <button onClick={limpiar} className="rounded-xl bg-pendiente px-3 py-2 font-bold text-superficie">Borrar</button>
              <button onClick={() => setConfirmarLimpiar(false)} className="rounded-xl border border-borde px-3 py-2 font-semibold">Cancelar</button>
            </span>
          ) : (
            <button onClick={() => setConfirmarLimpiar(true)}
              className="flex items-center gap-2 rounded-xl border border-borde px-4 py-2 text-sm font-semibold text-pendiente hover:border-pendiente">
              <Trash2 size={16} /> Limpiar semana
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
