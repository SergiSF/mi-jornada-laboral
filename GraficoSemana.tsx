import { DIAS_SEMANA, type ResultadoDia } from "./calculos";
import { ESTADO } from "./colores";

type Props = { dias: ResultadoDia[]; objetivoDia: number; hoy: number | null };

const ANCHO = 520;
const ALTO = 240;
const MARGEN = { arriba: 24, abajo: 30, izquierda: 34, derecha: 8 };

function horaCorta(min: number): string {
  return `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;
}

export default function GraficoSemana({ dias, objetivoDia, hoy }: Props) {
  const maxDatos = Math.max(objetivoDia, ...dias.map((d) => d.minutos));
  const escalaMax = Math.ceil((maxDatos * 1.15) / 120) * 120; // múltiplo de 2 h
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const y = (min: number) => MARGEN.arriba + altoUtil * (1 - min / escalaMax);
  const columna = anchoUtil / 5;
  const anchoBarra = Math.min(56, columna * 0.55);
  const marcas = Array.from({ length: escalaMax / 120 + 1 }, (_, i) => i * 120);

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Horas trabajadas por día">
      {marcas.map((m) => (
        <g key={m}>
          <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(m)} y2={y(m)} className="stroke-borde" strokeWidth="1" />
          <text x={MARGEN.izquierda - 8} y={y(m) + 4} textAnchor="end" className="fill-suave font-num text-[11px]">
            {m / 60}h
          </text>
        </g>
      ))}

      {dias.map((d, i) => {
        const cx = MARGEN.izquierda + columna * i + columna / 2;
        const alto = Math.max(0, y(0) - y(d.minutos));
        return (
          <g key={i}>
            {hoy === i && (
              <rect x={cx - columna / 2 + 4} y={MARGEN.arriba - 16} width={columna - 8} height={altoUtil + 16} rx="10" className="fill-principal/5" />
            )}
            <rect
              x={cx - anchoBarra / 2}
              y={y(0) - alto}
              width={anchoBarra}
              height={alto}
              rx="8"
              className={`${ESTADO[d.estado].barra} transition-all duration-500 ease-out`}
            />
            {d.minutos > 0 && (
              <text
                x={cx}
                y={alto > 34 ? y(0) - alto + 18 : y(0) - alto - 6}
                textAnchor="middle"
                className={`font-num text-[12px] font-bold ${alto > 34 ? "fill-superficie" : "fill-texto"}`}
              >
                {horaCorta(d.minutos)}
              </text>
            )}
            <text
              x={cx}
              y={ALTO - 8}
              textAnchor="middle"
              className={`text-[12px] font-semibold ${hoy === i ? "fill-principal" : "fill-suave"}`}
            >
              {DIAS_SEMANA[i]?.slice(0, 3)}
            </text>
          </g>
        );
      })}

      <line
        x1={MARGEN.izquierda}
        x2={ANCHO - MARGEN.derecha}
        y1={y(objetivoDia)}
        y2={y(objetivoDia)}
        strokeDasharray="6 5"
        strokeWidth="2"
        className="stroke-texto/60"
      />
      <text x={ANCHO - MARGEN.derecha} y={y(objetivoDia) - 6} textAnchor="end" className="fill-texto/70 font-num text-[11px] font-bold">
        Objetivo {horaCorta(objetivoDia)}
      </text>
    </svg>
  );
}
