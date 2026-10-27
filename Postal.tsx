// Tema Viajes: una postal ilustrada con un lugar emblemático. Cambia cada día y se puede pasar a la siguiente.
import { useState, type ReactNode } from "react";
import { Shuffle } from "lucide-react";

const SILUETA = "#3b2a40";

type Destino = { ciudad: string; lugar: string; cielo: [string, string]; sol: string; dibujo: ReactNode };

/** Ventanas de edificios para el fondo de las ciudades. */
const edificios = (xs: [number, number, number][]) =>
  xs.map(([x, w, h], i) => <rect key={i} x={x} y={150 - h} width={w} height={h} fill={SILUETA} opacity={0.35} />);

const DESTINOS: Destino[] = [
  {
    ciudad: "París",
    lugar: "Torre Eiffel",
    cielo: ["#f7b267", "#f4845f"],
    sol: "#ffe8a3",
    dibujo: (
      <g fill={SILUETA}>
        {edificios([[60, 40, 30], [110, 30, 22], [420, 50, 28], [480, 36, 20], [530, 40, 26]])}
        <path d="M236 150 L282 74 L288 46 L296 22 L299 6 L301 6 L304 22 L312 46 L318 74 L364 150 L340 150 Q300 104 260 150 Z" />
        <rect x="270" y="72" width="60" height="7" />
        <rect x="283" y="44" width="34" height="5" />
      </g>
    ),
  },
  {
    ciudad: "Roma",
    lugar: "Coliseo",
    cielo: ["#ffd29d", "#e98a5c"],
    sol: "#fff1c9",
    dibujo: (
      <g>
        {edificios([[40, 50, 24], [100, 26, 34], [470, 40, 22], [520, 50, 30]])}
        <path d="M170 150 L170 74 Q300 52 430 84 L430 150 Z" fill={SILUETA} />
        {[0, 1, 2].map((fila) =>
          Array.from({ length: 11 }, (_, i) => (
            <rect key={`${fila}-${i}`} x={184 + i * 22} y={86 + fila * 20} width="11" height="13" rx="5.5"
              fill="#ffd29d" opacity={i > 8 && fila === 0 ? 0 : 0.55} />
          )),
        )}
      </g>
    ),
  },
  {
    ciudad: "Londres",
    lugar: "Big Ben",
    cielo: ["#c9d6ea", "#8fa6c9"],
    sol: "#f6f1de",
    dibujo: (
      <g fill={SILUETA}>
        {edificios([[40, 46, 26], [470, 60, 30], [535, 40, 22]])}
        <rect x="150" y="104" width="300" height="46" />
        {[165, 200, 235, 365, 400, 435].map((x) => <path key={x} d={`M${x - 6} 104 L${x} 88 L${x + 6} 104 Z`} />)}
        <rect x="284" y="38" width="32" height="112" />
        <path d="M280 40 L300 4 L320 40 Z" />
        <circle cx="300" cy="58" r="11" fill="#f6f1de" />
        <path d="M300 58 L300 51 M300 58 L305 60" stroke={SILUETA} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  {
    ciudad: "Giza",
    lugar: "Pirámides",
    cielo: ["#ffcf7d", "#f08a4b"],
    sol: "#fff3c4",
    dibujo: (
      <g fill={SILUETA}>
        <path d="M150 150 L262 52 L374 150 Z" />
        <path d="M330 150 L410 80 L490 150 Z" opacity="0.85" />
        <path d="M90 150 L140 108 L190 150 Z" opacity="0.7" />
        <path d="M262 52 L300 150 L374 150 Z" fill="#000" opacity="0.15" />
      </g>
    ),
  },
  {
    ciudad: "Nueva York",
    lugar: "Estatua de la Libertad",
    cielo: ["#a8d8ea", "#6ea8d8"],
    sol: "#fff7d6",
    dibujo: (
      <g fill={SILUETA}>
        {edificios([[30, 26, 70], [60, 30, 46], [95, 22, 90], [440, 28, 64], [472, 24, 98], [500, 34, 54], [540, 26, 80]])}
        <path d="M262 150 L272 112 L328 112 L338 150 Z" />
        <rect x="276" y="100" width="48" height="12" />
        <path d="M288 100 L292 56 Q300 46 308 56 L312 100 Z" />
        <circle cx="300" cy="44" r="8" />
        {[-40, -20, 0, 20, 40].map((a) => (
          <rect key={a} x="299" y="28" width="2.5" height="9" transform={`rotate(${a} 300 44)`} />
        ))}
        <path d="M306 58 L320 22 L325 24 L312 60 Z" />
        <path d="M318 22 Q322 10 326 22 Z" fill="#ffcf5c" />
      </g>
    ),
  },
  {
    ciudad: "Barcelona",
    lugar: "Sagrada Família",
    cielo: ["#ffc6a8", "#e6799a"],
    sol: "#fff0d8",
    dibujo: (
      <g fill={SILUETA}>
        {edificios([[40, 40, 26], [90, 34, 34], [460, 44, 28], [515, 50, 22]])}
        <path d="M200 150 L200 98 L400 98 L400 150 Z" />
        {[
          [222, 40], [252, 22], [282, 8], [318, 8], [348, 22], [378, 40],
        ].map(([x, y]) => (
          <g key={x}>
            <path d={`M${x! - 9} 100 L${x! - 7} ${y! + 18} Q${x} ${y! - 4} ${x! + 7} ${y! + 18} L${x! + 9} 100 Z`} />
            <circle cx={x} cy={y! + 2} r="3.5" fill="#ffcf5c" />
          </g>
        ))}
        <path d="M285 150 L285 122 Q300 106 315 122 L315 150 Z" fill="#ffc6a8" opacity="0.5" />
      </g>
    ),
  },
];

function destinoDeHoy(): number {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), 0, 0);
  const dia = Math.floor((hoy.getTime() - inicio.getTime()) / 864e5);
  return dia % DESTINOS.length;
}

export default function Postal() {
  const [indice, setIndice] = useState(destinoDeHoy);
  const d = DESTINOS[indice]!;
  const id = `cielo-${indice}`;

  return (
    <figure className="relative mb-6 overflow-hidden rounded-3xl border border-borde shadow-sm">
      <svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMax meet" className="block h-28 w-full md:h-36" role="img"
        aria-label={`Ilustración de ${d.lugar}, ${d.ciudad}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor={d.cielo[0]} />
            <stop offset="1" stopColor={d.cielo[1]} />
          </linearGradient>
        </defs>
        <rect x="-1500" y="-400" width="3600" height="560" fill={`url(#${id})`} />
        <circle cx="470" cy="60" r="30" fill={d.sol} opacity="0.9" />
        <path d="M-1500 130 Q-1050 112 -600 126 T300 128 T1200 124 T2100 128 L2100 160 L-1500 160 Z" fill={SILUETA} opacity="0.18" />
        {edificios([[-260, 50, 26], [-190, 34, 18], [-120, 44, 30], [640, 46, 24], [700, 30, 34], [760, 52, 20]])}
        {d.dibujo}
        <rect x="-1500" y="148" width="3600" height="12" fill={SILUETA} />
      </svg>
      <figcaption className="absolute left-4 top-3 rounded-xl bg-superficie/85 px-3 py-1.5 backdrop-blur md:left-5 md:top-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-suave">Destino de hoy</p>
        <p className="text-sm font-extrabold leading-tight">
          {d.ciudad} <span className="font-semibold text-suave">· {d.lugar}</span>
        </p>
      </figcaption>
      <button onClick={() => setIndice((indice + 1) % DESTINOS.length)} aria-label="Ver otro destino"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-superficie/85 text-texto backdrop-blur hover:bg-superficie md:right-4 md:top-4">
        <Shuffle size={16} />
      </button>
    </figure>
  );
}
