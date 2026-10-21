// Guardado en el propio dispositivo con IndexedDB (la "base de datos" del navegador).
// Los datos no salen nunca de tu ordenador o móvil.
import type { Jornada, Semana } from "./calculos";

export type Ajustes = {
  jornadaPorDefecto: Jornada;
  contarPorDefecto: boolean;
  ejemploVisto: boolean; // true cuando ya no hay que enseñar los datos de ejemplo
};

export const AJUSTES_INICIALES: Ajustes = { jornadaPorDefecto: 37.5, contarPorDefecto: true, ejemploVisto: false };

const NOMBRE_BD = "mi-jornada";
const VERSION_BD = 1;

let conexion: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (!conexion) {
    conexion = new Promise((resolver, rechazar) => {
      const peticion = indexedDB.open(NOMBRE_BD, VERSION_BD);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        if (!bd.objectStoreNames.contains("semanas")) bd.createObjectStore("semanas", { keyPath: "lunes" });
        if (!bd.objectStoreNames.contains("ajustes")) bd.createObjectStore("ajustes");
      };
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => rechazar(peticion.error);
    });
  }
  return conexion;
}

function esperar<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

export async function leerTodo(): Promise<{ semanas: Semana[]; ajustes: Ajustes }> {
  const bd = await abrir();
  const tx = bd.transaction(["semanas", "ajustes"], "readonly");
  const semanas = await esperar(tx.objectStore("semanas").getAll() as IDBRequest<Semana[]>);
  const guardados = await esperar(tx.objectStore("ajustes").get("ajustes") as IDBRequest<Ajustes | undefined>);
  return { semanas, ajustes: { ...AJUSTES_INICIALES, ...guardados } };
}

export async function guardarSemana(semana: Semana): Promise<void> {
  const bd = await abrir();
  await esperar(bd.transaction("semanas", "readwrite").objectStore("semanas").put(semana));
}

export async function guardarAjustes(ajustes: Ajustes): Promise<void> {
  const bd = await abrir();
  await esperar(bd.transaction("ajustes", "readwrite").objectStore("ajustes").put(ajustes, "ajustes"));
}

/** Borra todas las semanas y, si se indica, las sustituye por otras (al importar una copia). */
export async function reemplazarSemanas(semanas: Semana[]): Promise<void> {
  const bd = await abrir();
  const tx = bd.transaction("semanas", "readwrite");
  const almacen = tx.objectStore("semanas");
  almacen.clear();
  semanas.forEach((s) => almacen.put(s));
  await new Promise<void>((resolver, rechazar) => {
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
  });
}

/** Pide al navegador que no borre estos datos aunque falte espacio. */
export function pedirGuardadoPermanente(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* algunos navegadores no lo permiten; no pasa nada */
  }
}
