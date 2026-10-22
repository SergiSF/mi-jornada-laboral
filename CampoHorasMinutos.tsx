// Campo para escribir una duración exacta en horas y minutos (por ejemplo, 2 h 45 min).

type Props = {
  id: string;
  minutos: number;
  onCambiar: (minutos: number) => void;
  etiqueta: string; // para lectores de pantalla, por ejemplo "Horas de DR"
  maxHoras?: number;
  destacado?: boolean; // borde violeta para permisos
};

const caja =
  "w-14 rounded-lg border bg-fondo px-2 py-2 text-right font-num text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-principal";

export default function CampoHorasMinutos({ id, minutos, onCambiar, etiqueta, maxHoras = 24, destacado = true }: Props) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  const borde = destacado ? "border-ausencia/50" : "border-borde";
  const leer = (texto: string) => {
    const n = Math.floor(Number(texto));
    return texto === "" || !Number.isFinite(n) || n < 0 ? 0 : n;
  };

  return (
    <span className="inline-flex items-center gap-1.5 font-num text-sm normal-case tracking-normal text-suave">
      <input id={id} type="number" inputMode="numeric" min={0} max={maxHoras} placeholder="0" aria-label={`${etiqueta}: horas`}
        className={`${caja} ${borde} text-texto`} value={minutos ? h : ""}
        onChange={(e) => onCambiar(Math.min(maxHoras, leer(e.target.value)) * 60 + m)} />
      h
      <input id={`${id}-min`} type="number" inputMode="numeric" min={0} max={59} step={5} placeholder="00" aria-label={`${etiqueta}: minutos`}
        className={`${caja} ${borde} text-texto`} value={minutos ? m : ""}
        onChange={(e) => onCambiar(h * 60 + Math.min(59, leer(e.target.value)))} />
      min
    </span>
  );
}
