import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { ICONOS } from "./iconos";

/**
 * Convierte Mi Jornada en una app instalable (PWA):
 * - añade los iconos y el manifiesto (nombre, colores, iconos)
 * - crea sw.js, que guarda la app en el dispositivo para que funcione sin conexión
 * Solo actúa al publicar (npm run build), no en StackBlitz.
 */
function appInstalable(): Plugin {
  return {
    name: "mi-jornada-instalable",
    apply: "build",
    generateBundle(_opciones, bundle) {
      for (const [nombre, base64] of Object.entries(ICONOS)) {
        this.emitFile({ type: "asset", fileName: nombre, source: Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)) });
      }

      const manifiesto = {
        name: "Mi Jornada",
        short_name: "Mi Jornada",
        description: "Control de horas, saldos, agenda y teléfonos del trabajo.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f3f4f7",
        theme_color: "#2f4fd6",
        icons: [
          { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: JSON.stringify(manifiesto, null, 2) });

      // Lista de archivos que se guardan en el dispositivo. El nombre de la caché cambia en cada versión.
      // (sin repetidos: si un archivo sale dos veces, el navegador no instala nada)
      const archivos = [...new Set(["/", ...Object.keys(bundle).map((f) => `/${f}`)])];
      const version = Object.keys(bundle).sort().join("|").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
      this.emitFile({ type: "asset", fileName: "sw.js", source: crearServiceWorker(version, archivos) });
    },
  };
}

function crearServiceWorker(version: string, archivos: string[]): string {
  return `// Generado automáticamente al publicar. Guarda la app para usarla sin conexión.
const CACHE = "mi-jornada-${version}";
const ARCHIVOS = ${JSON.stringify(archivos)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith("mi-jornada-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const peticion = e.request;
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);

  // Abrir la app: primero internet (para tener la última versión); sin conexión, la copia guardada
  if (peticion.mode === "navigate") {
    e.respondWith(fetch(peticion).catch(() => caches.match("/")));
    return;
  }

  // Tipos de letra de Google: se guardan la primera vez que se descargan
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE + "-letras").then((c) =>
        c.match(peticion).then((guardada) =>
          guardada || fetch(peticion).then((r) => { if (r.ok || r.type === "opaque") c.put(peticion, r.clone()); return r; }),
        ),
      ),
    );
    return;
  }

  // Archivos de la app: la copia guardada si existe
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(peticion).then((guardada) => guardada || fetch(peticion)));
  }
});
`;
}

export default defineConfig({
  plugins: [react(), appInstalable()],
});
