import { useEffect, useState } from "react";

export type Tema = "claro" | "oscuro" | "sistema" | "blaugrana" | "viajes";

export const NOMBRE_TEMA: Record<Tema, string> = {
  claro: "Claro",
  oscuro: "Oscuro",
  sistema: "Sistema",
  blaugrana: "Blaugrana",
  viajes: "Viajes",
};

/** Orden en que el botón del menú va pasando de un tema a otro. */
export const SIGUIENTE_TEMA: Record<Tema, Tema> = {
  sistema: "claro",
  claro: "oscuro",
  oscuro: "blaugrana",
  blaugrana: "viajes",
  viajes: "sistema",
};

const CLAVE = "mi-jornada-tema";
const VALIDOS: Tema[] = ["claro", "oscuro", "sistema", "blaugrana", "viajes"];
const COLOR_BARRA: Record<string, string> = { claro: "#2f4fd6", oscuro: "#11151d", blaugrana: "#004d98", viajes: "#0e7490" };

function leerTema(): Tema {
  try {
    const v = localStorage.getItem(CLAVE) as Tema | null;
    if (v && VALIDOS.includes(v)) return v;
  } catch {
    /* sin acceso al almacenamiento: usamos el del sistema */
  }
  return "sistema";
}

/** Guarda el tema elegido y aplica su clase en <html>: "dark", "tema-blaugrana" o "tema-viajes". */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => {
      const raiz = document.documentElement;
      const oscuro = tema === "oscuro" || (tema === "sistema" && consulta.matches);
      raiz.classList.toggle("dark", oscuro);
      raiz.classList.toggle("tema-blaugrana", tema === "blaugrana");
      raiz.classList.toggle("tema-viajes", tema === "viajes");
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute("content", COLOR_BARRA[oscuro ? "oscuro" : tema] ?? COLOR_BARRA.claro!);
    };
    aplicar();
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* no pasa nada si no se puede guardar */
    }
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, [tema]);

  return { tema, setTema };
}
