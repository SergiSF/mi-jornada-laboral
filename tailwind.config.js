/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        fondo: "rgb(var(--fondo) / <alpha-value>)",
        superficie: "rgb(var(--superficie) / <alpha-value>)",
        texto: "rgb(var(--texto) / <alpha-value>)",
        suave: "rgb(var(--suave) / <alpha-value>)",
        borde: "rgb(var(--borde) / <alpha-value>)",
        principal: "rgb(var(--principal) / <alpha-value>)",
        cumplido: "rgb(var(--cumplido) / <alpha-value>)",
        pendiente: "rgb(var(--pendiente) / <alpha-value>)",
        ausencia: "rgb(var(--ausencia) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Figtree", "system-ui", "Segoe UI", "sans-serif"],
        num: ["JetBrains Mono", "Cascadia Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
