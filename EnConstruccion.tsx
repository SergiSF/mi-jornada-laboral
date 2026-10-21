import type { LucideIcon } from "lucide-react";

type Props = { titulo: string; descripcion: string; fase: number; icono: LucideIcon };

export default function EnConstruccion({ titulo, descripcion, fase, icono: Icono }: Props) {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{titulo}</h1>
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde bg-superficie px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-principal/10 text-principal">
          <Icono size={28} />
        </span>
        <p className="max-w-md text-suave">{descripcion}</p>
        <span className="rounded-full bg-fondo px-3 py-1 text-xs font-bold text-suave">Llega en la fase {fase}</span>
      </div>
    </section>
  );
}
