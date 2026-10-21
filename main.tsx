import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No se encontró el elemento #root en index.html");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Al publicar: guardar la app en el dispositivo para que funcione sin conexión.
// (En StackBlitz no se activa, para no interferir mientras se desarrolla.)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* si el navegador no lo permite, la app sigue funcionando con conexión */
  });
}
