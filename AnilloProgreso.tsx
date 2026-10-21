import { formatoHoras } from "./calculos";

type Props = { computado: number; objetivo: number; porcentaje: number };

export default function AnilloProgreso({ computado, objetivo, porcentaje }: Props) {
  const radio = 84;
  const circunferencia = 2 * Math.PI * radio;
  const completo = computado >= objetivo;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label={`Progreso semanal: ${porcentaje} %`}>
        <circle cx="100" cy="100" r={radio} fill="none" strokeWidth="16" className="stroke-principal/15" />
        <circle
          cx="100"
          cy="100"
          r={radio}
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - porcentaje / 100)}
          className={`transition-[stroke-dashoffset] duration-700 ease-out ${completo ? "stroke-cumplido" : "stroke-principal"}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-num text-5xl font-bold tabular-nums">{porcentaje}<span className="text-2xl">%</span></span>
        <span className="mt-1 font-num text-sm text-suave tabular-nums">{formatoHoras(computado)}</span>
        <span className="font-num text-xs text-suave tabular-nums">de {formatoHoras(objetivo)}</span>
      </div>
    </div>
  );
}
