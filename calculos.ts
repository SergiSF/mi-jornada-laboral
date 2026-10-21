// Motor de cálculo de Mi Jornada.
// Aquí no hay nada de diseño: solo funciones que reciben datos y devuelven resultados.
// Todas las horas se manejan en MINUTOS para evitar errores con decimales.

export type Jornada = 35 | 37.5;

export type TipoDia = "trabajo" | "festivo" | "vacaciones" | "asuntos-propios" | "baja";

export const NOMBRE_TIPO: Record<TipoDia, string> = {
  trabajo: "Trabajo",
  festivo: "Festivo",
  vacaciones: "Vacaciones",
  "asuntos-propios": "Asuntos propios",
  baja: "Baja / permiso",
};

/** Lo que el usuario escribe para un día. */
export type RegistroDia = {
  entrada: string; // "08:00" o "" si está vacío
  salida: string; // "15:30" o "" si está vacío
  pausa: number; // minutos
  tipo: TipoDia;
};

/** Una semana guardada (de lunes a viernes). */
export type Semana = {
  lunes: string; // fecha del lunes en formato "2026-10-19"
  jornada: Jornada;
  contarAusencias: boolean;
  dias: RegistroDia[]; // siempre 5: lunes a viernes
};

export type EstadoDia = "sin-registrar" | "pendiente" | "cumplido" | "exceso" | "ausencia";

export type ErrorDia = "incompleto" | "salida-anterior" | "pausa-invalida" | "pausa-excesiva";

export const MENSAJE_ERROR: Record<ErrorDia, string> = {
  incompleto: "Falta la hora de entrada o la de salida.",
  "salida-anterior": "La salida debe ser posterior a la entrada.",
  "pausa-invalida": "La pausa debe ser un número de minutos igual o mayor que 0.",
  "pausa-excesiva": "La pausa es más larga que el tiempo trabajado.",
};

export type ResultadoDia = {
  minutos: number; // minutos que computan ese día
  objetivo: number; // objetivo diario en minutos
  diferencia: number; // minutos - objetivo (negativo = falta)
  estado: EstadoDia;
  error: ErrorDia | null;
};

export type ResultadoSemana = {
  dias: ResultadoDia[];
  computado: number; // minutos hechos en la semana
  objetivo: number; // minutos de la jornada semanal
  faltan: number; // minutos que faltan (0 si ya se ha llegado)
  sobran: number; // minutos de más (0 si no se ha llegado)
  balance: number; // computado - objetivo
  porcentaje: number; // 0 a 100 (no pasa de 100)
  hayErrores: boolean;
};

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

// ---------- Horas ----------

/** Convierte "08:30" en 510 minutos. Devuelve null si está vacío o mal escrito. */
export function aMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Convierte 510 minutos en "08:30". */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Escribe minutos de forma legible: 450 → "7 h 30 min".
 * Con conSigno = true añade + o − delante: −30 → "−0 h 30 min".
 */
export function formatoHoras(minutos: number, conSigno = false): string {
  const redondeado = Math.round(minutos);
  const signo = redondeado < 0 ? "−" : conSigno ? "+" : "";
  const abs = Math.abs(redondeado);
  return `${signo}${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, "0")} min`;
}

/** 35 h → 420 min al día; 37,5 h → 450 min al día. */
export function objetivoDiario(jornada: Jornada): number {
  return (jornada * 60) / 5;
}

// ---------- Cálculo de un día ----------

export function calcularDia(registro: RegistroDia, jornada: Jornada, contarAusencias: boolean): ResultadoDia {
  const objetivo = objetivoDiario(jornada);
  const resultado = (minutos: number, estado: EstadoDia, error: ErrorDia | null): ResultadoDia => ({
    minutos,
    objetivo,
    diferencia: minutos - objetivo,
    estado,
    error,
  });

  // Regla 5 y 6: días que no son de trabajo
  if (registro.tipo !== "trabajo") {
    return resultado(contarAusencias ? objetivo : 0, "ausencia", null);
  }

  const entrada = aMinutos(registro.entrada);
  const salida = aMinutos(registro.salida);

  if (entrada === null && salida === null) return resultado(0, "sin-registrar", null);
  if (entrada === null || salida === null) return resultado(0, "pendiente", "incompleto");
  if (salida <= entrada) return resultado(0, "pendiente", "salida-anterior");

  const pausa = registro.pausa;
  if (!Number.isFinite(pausa) || pausa < 0) return resultado(0, "pendiente", "pausa-invalida");

  // Regla 4: horas = salida − entrada − pausa
  const minutos = salida - entrada - pausa;
  if (minutos < 0) return resultado(0, "pendiente", "pausa-excesiva");

  // Regla 8: estado
  const estado: EstadoDia = minutos < objetivo ? "pendiente" : minutos === objetivo ? "cumplido" : "exceso";
  return resultado(minutos, estado, null);
}

// ---------- Cálculo de una semana ----------

export function calcularSemana(semana: Semana): ResultadoSemana {
  const dias = semana.dias.map((d) => calcularDia(d, semana.jornada, semana.contarAusencias));
  const computado = dias.reduce((suma, d) => suma + d.minutos, 0);
  const objetivo = semana.jornada * 60;
  const balance = computado - objetivo;
  return {
    dias,
    computado,
    objetivo,
    balance,
    faltan: Math.max(0, -balance),
    sobran: Math.max(0, balance),
    porcentaje: Math.min(100, Math.round((computado / objetivo) * 100)),
    hayErrores: dias.some((d) => d.error !== null),
  };
}

// ---------- Fechas ----------

/** Fecha en formato "2026-10-21" (hora local, sin problemas de zona horaria). */
export function fechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/** Convierte "2026-10-21" en una fecha local. */
export function desdeISO(texto: string): Date {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Devuelve el lunes de la semana de esa fecha (el domingo pertenece a la semana anterior). */
export function lunesDe(fecha: Date): Date {
  const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diasDesdeLunes = (copia.getDay() + 6) % 7;
  copia.setDate(copia.getDate() - diasDesdeLunes);
  return copia;
}

export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

// ---------- Semanas nuevas ----------

export function diaVacio(): RegistroDia {
  return { entrada: "", salida: "", pausa: 0, tipo: "trabajo" };
}

/** Regla 1: una semana nueva usa la última jornada elegida. */
export function semanaNueva(lunes: Date, jornadaPorDefecto: Jornada, contarAusencias: boolean): Semana {
  return {
    lunes: fechaISO(lunesDe(lunes)),
    jornada: jornadaPorDefecto,
    contarAusencias,
    dias: Array.from({ length: 5 }, diaVacio),
  };
}

// ---------- Bolsa de horas ----------

/**
 * Regla 10: suma el balance de las semanas YA TERMINADAS.
 * La semana en curso no cuenta, porque a mitad de semana siempre
 * saldría negativa aunque vayas bien.
 */
export function balanceAcumulado(semanas: Semana[], hoy: Date): number {
  const lunesActual = fechaISO(lunesDe(hoy));
  return semanas
    .filter((s) => s.lunes < lunesActual)
    .reduce((suma, s) => suma + calcularSemana(s).balance, 0);
}

// ---------- Fichar ----------

/** Rellena la entrada si está vacía; si no, rellena la salida. */
export function ficharAhora(registro: RegistroDia, ahora: Date): RegistroDia {
  const hora = aHora(ahora.getHours() * 60 + ahora.getMinutes());
  if (registro.entrada === "") return { ...registro, tipo: "trabajo", entrada: hora };
  return { ...registro, salida: hora };
}

// ---------- Resumen para copiar ----------

export function resumenSemanal(semana: Semana): string {
  const r = calcularSemana(semana);
  const lunes = desdeISO(semana.lunes);
  const lineas = semana.dias.map((d, i) => {
    const fecha = sumarDias(lunes, i).toLocaleDateString("es-ES");
    let detalle = "";
    if (d.tipo !== "trabajo") detalle = ` (${NOMBRE_TIPO[d.tipo]})`;
    else if (d.entrada && d.salida) detalle = ` (${d.entrada}–${d.salida}${d.pausa ? `, pausa ${d.pausa} min` : ""})`;
    return `${DIAS_SEMANA[i]} ${fecha}: ${formatoHoras(r.dias[i]?.minutos ?? 0)}${detalle}`;
  });
  return [
    `Semana del ${lunes.toLocaleDateString("es-ES")} · Jornada ${String(semana.jornada).replace(".", ",")} h`,
    ...lineas,
    `Total: ${formatoHoras(r.computado)} / ${formatoHoras(r.objetivo)}`,
    `Balance: ${formatoHoras(r.balance, true)}`,
  ].join("\n");
}
