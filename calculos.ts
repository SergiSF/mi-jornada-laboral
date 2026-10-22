// Motor de cálculo de Mi Jornada.
// Aquí no hay nada de diseño: solo funciones que reciben datos y devuelven resultados.
// Todas las horas se manejan en MINUTOS para evitar errores con decimales.

export type Jornada = 35 | 37.5;

export type TipoDia =
  | "trabajo"
  | "festivo"
  | "vacaciones"
  | "asuntos-propios"
  | "ap-recuperables"
  | "dr"
  | "libranza"
  | "baja";

export const NOMBRE_TIPO: Record<TipoDia, string> = {
  trabajo: "Trabajo",
  festivo: "Festivo",
  vacaciones: "Vacaciones",
  "asuntos-propios": "Asuntos propios",
  "ap-recuperables": "AP recuperables",
  dr: "Horas de DR",
  libranza: "Libranza",
  baja: "Baja / permiso",
};

/** Tipos de día que se piden por horas: escribes cuántas te coges y cuentan como trabajadas. */
export const TIPOS_POR_HORAS: TipoDia[] = ["asuntos-propios", "ap-recuperables", "dr"];
export const esPorHoras = (t: TipoDia) => TIPOS_POR_HORAS.includes(t);

/** Tipos a los que se aplica la casilla "contar como el objetivo diario". */
export const TIPOS_DIA_COMPLETO: TipoDia[] = ["festivo", "vacaciones", "baja"];

/** Lo que el usuario escribe para un día. */
export type RegistroDia = {
  entrada: string; // "08:00" o "" si está vacío
  salida: string; // "15:30" o "" si está vacío
  pausa: number; // minutos
  tipo: TipoDia;
  minutosPermiso?: number; // en AP, AP recuperables y DR: cuánto tiempo te has cogido
  /** Franjas de este día en las que recuperas AP recuperables (las escribes tú). No cuentan para la jornada. */
  franjasRecuperacion?: FranjaRecuperacion[];
  /** (versión anterior) tiempo de recuperación escrito sin franja */
  minutosRecuperacion?: number;
  /** @deprecated tramos programados desde el día de AP recuperables; al abrir la app se pasan a su día como franjas */
  recuperaciones?: TramoRecuperacion[];
  /** @deprecated nombre antiguo de minutosPermiso; se sigue leyendo por compatibilidad */
  minutosAsuntosPropios?: number;
};

/** Una franja en la que recuperas horas de AP recuperables, por ejemplo de 15:30 a 16:45. */
export type FranjaRecuperacion = { id: string; desde: string; hasta: string };

/** @deprecated formato anterior: franja programada con su día */
export type TramoRecuperacion = FranjaRecuperacion & { fecha: string };

/** Minutos de una franja (0 si está incompleta o la hora final no es posterior a la inicial). */
export function minutosFranja(f: { desde: string; hasta: string }): number {
  const a = aMinutos(f.desde);
  const b = aMinutos(f.hasta);
  return a !== null && b !== null && b > a ? b - a : 0;
}

export const minutosPermiso = (r: RegistroDia) => r.minutosPermiso ?? r.minutosAsuntosPropios ?? 0;
/** Tiempo de recuperación de un día: las franjas que has apuntado más lo escrito sin franja en la versión anterior. */
export const minutosRecuperacion = (r: RegistroDia) =>
  (r.minutosRecuperacion ?? 0) + (r.franjasRecuperacion ?? []).reduce((s, f) => s + minutosFranja(f), 0);

/** Una semana guardada (de lunes a viernes). */
export type Semana = {
  lunes: string; // fecha del lunes en formato "2026-10-19"
  jornada: Jornada;
  contarAusencias: boolean;
  dias: RegistroDia[]; // siempre 5: lunes a viernes
};

export type EstadoDia = "sin-registrar" | "pendiente" | "cumplido" | "exceso" | "ausencia";

export type ErrorDia = "incompleto" | "salida-anterior" | "pausa-invalida" | "pausa-excesiva" | "permiso-sin-horas" | "permiso-invalido" | "recuperacion-invalida";

export const MENSAJE_ERROR: Record<ErrorDia, string> = {
  incompleto: "Falta la hora de entrada o la de salida.",
  "salida-anterior": "La salida debe ser posterior a la entrada.",
  "pausa-invalida": "La pausa debe ser un número de minutos igual o mayor que 0.",
  "pausa-excesiva": "La pausa es más larga que el tiempo trabajado.",
  "permiso-sin-horas": "Indica cuántas horas te has cogido.",
  "permiso-invalido": "Las horas deben ser un número igual o mayor que 0.",
  "recuperacion-invalida": "Las horas de recuperación no pueden ser más que las horas trabajadas.",
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

/** Horas trabajadas según entrada, salida y pausa. */
function horasTrabajadas(registro: RegistroDia): { minutos: number; vacio: boolean; error: ErrorDia | null } {
  const entrada = aMinutos(registro.entrada);
  const salida = aMinutos(registro.salida);
  if (entrada === null && salida === null) return { minutos: 0, vacio: true, error: null };
  if (entrada === null || salida === null) return { minutos: 0, vacio: false, error: "incompleto" };
  if (salida <= entrada) return { minutos: 0, vacio: false, error: "salida-anterior" };
  const pausa = registro.pausa;
  if (!Number.isFinite(pausa) || pausa < 0) return { minutos: 0, vacio: false, error: "pausa-invalida" };
  // Regla 4: horas = salida − entrada − pausa
  const minutos = salida - entrada - pausa;
  if (minutos < 0) return { minutos: 0, vacio: false, error: "pausa-excesiva" };
  return { minutos, vacio: false, error: null };
}

export function calcularDia(registro: RegistroDia, jornada: Jornada, contarAusencias: boolean): ResultadoDia {
  const objetivo = objetivoDiario(jornada);
  const resultado = (minutos: number, estado: EstadoDia, error: ErrorDia | null): ResultadoDia => ({
    minutos,
    objetivo,
    diferencia: minutos - objetivo,
    estado,
    error,
  });

  // AP, AP recuperables y DR: cuentan las horas que te coges, más lo que hayas trabajado ese día
  if (esPorHoras(registro.tipo)) {
    const permiso = minutosPermiso(registro);
    if (!Number.isFinite(permiso) || permiso < 0) return resultado(0, "ausencia", "permiso-invalido");
    const t = horasTrabajadas(registro);
    if (t.error) return resultado(permiso, "ausencia", t.error);
    if (permiso === 0 && t.vacio) return resultado(0, "ausencia", "permiso-sin-horas");
    return resultado(t.minutos + permiso, "ausencia", null);
  }

  // Libranza: ese día cuenta 0 h y las horas se reparten en el resto de la semana
  if (registro.tipo === "libranza") return resultado(0, "ausencia", null);

  // Regla 5 y 6: festivos, vacaciones y bajas
  if (registro.tipo !== "trabajo") {
    return resultado(contarAusencias ? objetivo : 0, "ausencia", null);
  }

  const t = horasTrabajadas(registro);
  if (t.vacio) return resultado(0, "sin-registrar", null);
  if (t.error) return resultado(0, "pendiente", t.error);

  // Las horas de recuperación de AP no cuentan para la jornada
  const recuperacion = minutosRecuperacion(registro);
  if (!Number.isFinite(recuperacion) || recuperacion < 0 || recuperacion > t.minutos) {
    return resultado(0, "pendiente", "recuperacion-invalida");
  }
  const minutos = t.minutos - recuperacion;

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
  const tipo = esPorHoras(registro.tipo) ? registro.tipo : "trabajo";
  if (registro.entrada === "") return { ...registro, tipo, entrada: hora };
  return { ...registro, salida: hora };
}

// ---------- Resumen para copiar ----------

export function resumenSemanal(semana: Semana): string {
  const r = calcularSemana(semana);
  const lunes = desdeISO(semana.lunes);
  const lineas = semana.dias.map((d, i) => {
    const fecha = sumarDias(lunes, i).toLocaleDateString("es-ES");
    let detalle = "";
    if (esPorHoras(d.tipo)) {
      const trabajo = d.entrada && d.salida ? `${d.entrada}–${d.salida}, ` : "";
      const nombre = d.tipo === "asuntos-propios" ? "asuntos propios" : d.tipo === "dr" ? "DR" : "AP recuperables";
      detalle = ` (${trabajo}${nombre} ${formatoHoras(minutosPermiso(d))})`;
    } else if (d.tipo !== "trabajo") {
      detalle = ` (${NOMBRE_TIPO[d.tipo]})`;
    } else if (d.entrada && d.salida) {
      const franjas = (d.franjasRecuperacion ?? []).filter((f) => minutosFranja(f) > 0).map((f) => `recupera ${f.desde}–${f.hasta}`);
      const sinFranja = d.minutosRecuperacion ? `recupera ${formatoHoras(d.minutosRecuperacion)}` : "";
      const extras = [d.pausa ? `pausa ${d.pausa} min` : "", ...franjas, sinFranja]
        .filter(Boolean)
        .join(", ");
      detalle = ` (${d.entrada}–${d.salida}${extras ? `, ${extras}` : ""})`;
    }
    return `${DIAS_SEMANA[i]} ${fecha}: ${formatoHoras(r.dias[i]?.minutos ?? 0)}${detalle}`;
  });
  return [
    `Semana del ${lunes.toLocaleDateString("es-ES")} · Jornada ${String(semana.jornada).replace(".", ",")} h`,
    ...lineas,
    `Total: ${formatoHoras(r.computado)} / ${formatoHoras(r.objetivo)}`,
    `Balance: ${formatoHoras(r.balance, true)}`,
  ].join("\n");
}
