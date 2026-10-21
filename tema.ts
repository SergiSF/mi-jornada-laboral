import { useEffect, useState } from "react";

export type Tema = "claro" | "oscuro" | "sistema";

const CLAVE = "mi-jornada-tema";

function leerTema(): Tema {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === "claro" || v === "oscuro" || v === "sistema") return v;
  } catch {
    /* sin acceso al almacenamiento: usamos el del sistema */
  }
  return "sistema";
}

/** Guarda el tema elegido y aplica la clase "dark" en <html> cuando toca. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => {
      const oscuro = tema === "oscuro" || (tema === "sistema" && consulta.matches);
      document.documentElement.classList.toggle("dark", oscuro);
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
