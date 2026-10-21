import { History, ChevronRight } from "lucide-react";
import { calcularSemana, desdeISO, fechaISO, formatoHoras, lunesDe, sumarDias } from "./calculos";
import { evolucionBolsa, type PuntoBolsa } from "./mes";
import type { Almacen } from "./useSemanas";

type Props = { almacen: Almacen; onIrASemana: (lunes: Date) => void };

const fechaCorta = (iso: string) => desdeISO(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

function GraficoBolsa({ puntos }: { puntos: PuntoBolsa[] }) {
  const ANCHO = 520, ALTO = 200, M = { a: 16, b: 26, i: 52, d: 12 };
  const maxAbs = Math.max(60, ...puntos.map((p) => Math.abs(p.acumulado)));
  const tope = Math.ceil(maxAbs / 60) * 60;
  const y = (v: number) => M.a + ((tope - v) / (2 * tope)) * (ALTO - M.a - M.b);
  const x = (i: number) => (puntos.length === 1 ? (M.i + ANCHO - M.d) / 2 : M.i + (i / (puntos.length - 1)) * (ANCHO - M.i - M.d));
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.acumulado)}`).join(" ");
  const area = `${linea} L${x(puntos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Evolución de la bolsa de horas">
      {[tope, 0, -tope].map((v) => (
        <g key={v}>
          <line x1={M.i} x2={ANCHO - M.d} y1={y(v)} y2={y(v)} strokeWidth={v === 0 ? 1.5 : 1} className={v === 0 ? "stroke-suave/60" : "stroke-borde"} />
          <text x={M.i - 8} y={y(v) + 4} textAnchor="end" className="fill-suave font-num text-[11px]">
            {v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v) / 60}h`}
          </text>
        </g>
      ))}
      <path d={area} className="fill-principal/10" />
      <path d={linea} fill="none" strokeWidth="2.5" strokeLinejoin="round" className="stroke-principal" />
      {puntos.map((p, i) => (
        <circle key={p.lunes} cx={x(i)} cy={y(p.acumulado)} r={i === puntos.length - 1 ? 6 : 3.5}
          className={`${p.acumulado >= 0 ? "fill-cumplido" : "fill-pendiente"} stroke-superficie`} strokeWidth="2" />
      ))}
      {primero && <text x={x(0)} y={ALTO - 6} textAnchor={puntos.length === 1 ? "middle" : "start"} className="fill-suave text-[11px]">{fechaCorta(primero.lunes)}</text>}
      {ultimo && puntos.length > 1 && <text x={x(puntos.length - 1)} y={ALTO - 6} textAnchor="end" className="fill-suave text-[11px]">{fechaCorta(ultimo.lunes)}</text>}
    </svg>
  );
}

export default function HistorialPage({ almacen, onIrASemana }: Props) {
  const hoy = new Date();
  const puntos = evolucionBolsa(almacen.semanas, hoy);
  const bolsa = puntos[puntos.length - 1]?.acumulado ?? 0;
  const semanas = [...almacen.semanas]
    .filter((s) => calcularSemana(s).dias.some((d) => d.estado !== "sin-registrar"))
    .sort((a, b) => b.lunes.localeCompare(a.lunes));

  if (semanas.length === 0) {
    return (
      <div className="grid gap-6">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Historial</h1>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde bg-superficie px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-principal/10 text-principal"><History size={28} /></span>
          <p className="max-w-md text-suave">Todavía no hay semanas guardadas. Cuando registres horas en la pantalla Semana, aparecerán aquí con su balance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-principal">Historial</p>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Tus semanas</h1>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
        <div className={`flex flex-col justify-center rounded-3xl border p-6 ${bolsa >= 0 ? "border-cumplido/30 bg-cumplido/10" : "border-pendiente/30 bg-pendiente/10"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${bolsa >= 0 ? "text-cumplido" : "text-pendiente"}`}>Bolsa de horas</p>
          <p className={`mt-2 whitespace-nowrap font-num text-3xl font-bold tabular-nums ${bolsa >= 0 ? "text-cumplido" : "text-pendiente"}`}>
            {formatoHoras(bolsa, true)}
          </p>
          <p className="mt-2 text-sm text-suave">
            {bolsa >= 0 ? "Llevas horas de más acumuladas" : "Te faltan horas por recuperar"} en {puntos.length} semana{puntos.length === 1 ? "" : "s"} terminada{puntos.length === 1 ? "" : "s"}. La semana en curso no cuenta.
          </p>
        </div>
        <div className="rounded-3xl border border-borde bg-superficie p-4 md:p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-suave">Evolución de la bolsa</h2>
          {puntos.length > 0 ? (
            <GraficoBolsa puntos={puntos} />
          ) : (
            <p className="py-10 text-center text-sm text-suave">El gráfico aparecerá cuando termine tu primera semana registrada.</p>
          )}
        </div>
      </section>

      <section className="grid gap-2" aria-label="Lista de semanas">
        {semanas.map((s) => {
          const r = calcularSemana(s);
          const enCurso = s.lunes >= fechaISO(lunesDe(hoy));
          return (
            <button key={s.lunes} onClick={() => onIrASemana(desdeISO(s.lunes))}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-borde bg-superficie p-4 text-left transition-colors hover:border-principal sm:grid-cols-[1.3fr_0.7fr_1.4fr_auto_auto]">
              <div>
                <p className="font-bold">{fechaCorta(s.lunes)} – {fechaCorta(fechaISO(sumarDias(desdeISO(s.lunes), 4)))}</p>
                {enCurso && <p className="text-xs font-semibold text-principal">En curso</p>}
              </div>
              <p className="hidden text-sm text-suave sm:block">{String(s.jornada).replace(".", ",")} h</p>
              <div className="hidden sm:block">
                <div className="h-2 overflow-hidden rounded-full bg-principal/15">
                  <div className={`h-full rounded-full ${r.balance >= 0 ? "bg-cumplido" : "bg-principal"}`} style={{ width: `${r.porcentaje}%` }} />
                </div>
                <p className="mt-1 font-num text-xs tabular-nums text-suave">{formatoHoras(r.computado)} / {formatoHoras(r.objetivo)}</p>
              </div>
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 font-num text-xs font-bold tabular-nums ${
                enCurso ? "bg-fondo text-suave" : r.balance >= 0 ? "bg-cumplido/15 text-cumplido" : "bg-pendiente/15 text-pendiente"
              }`}>
                {enCurso ? `${r.porcentaje} %` : formatoHoras(r.balance, true)}
              </span>
              <ChevronRight size={18} className="hidden text-suave sm:block" />
            </button>
          );
        })}
      </section>
    </div>
  );
}
