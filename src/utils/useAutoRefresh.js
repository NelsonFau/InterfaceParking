// Hook delgado de refresco automático (spec 05, D-FE12). La decisión de "toca refrescar" es `isStale`.
// Cada TICK_MS mira si la pestaña está visible y si la última carga ya es vieja; al volver a una pestaña
// oculta hace la misma verificación en el momento. No pide datos: llama a `onRefresh`.
import { useEffect, useRef } from "react";
import { isStale } from "./autoRefresh.js";

// Con qué frecuencia se verifica. Más chico que el intervalo para que el refresco no se atrase.
const TICK_MS = 30000;

/**
 * @param {{ lastAttemptAt: number | null, onRefresh: () => void, intervalMs: number, enabled?: boolean }} options
 *   `lastAttemptAt`: ms del último intento de carga, exitoso o no, para no reintentar cada tick tras un fallo (`null` si todavía no hubo). `enabled` en `false`
 *   (por ejemplo con un diálogo abierto) suspende el refresco. `onRefresh` se encarga de no pisar una carga en curso.
 */
export function useAutoRefresh({ lastAttemptAt, onRefresh, intervalMs, enabled = true }) {
  const state = useRef({ lastAttemptAt, onRefresh, enabled });
  useEffect(() => {
    state.current = { lastAttemptAt, onRefresh, enabled };
  });

  useEffect(() => {
    function check() {
      const { lastAttemptAt: last, onRefresh: refresh, enabled: on } = state.current;
      if (!on || document.visibilityState !== "visible") return;
      // Sin una primera carga todavía no hay nada que refrescar: la pantalla carga sola al montarse.
      if (last === null) return;
      if (isStale(last, Date.now(), intervalMs)) refresh();
    }
    const timer = setInterval(check, TICK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [intervalMs]);
}
