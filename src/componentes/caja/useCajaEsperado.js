// Pide el efectivo esperado en vivo de una sesión (`GET /Caja/sesiones/{id}/esperado`, `caja.ver_esperado`).
// Lo comparten la caja actual, el diálogo de cierre y el detalle de una sesión. Un fallo NO abre un aviso: cada
// pantalla muestra su texto chico "No pudimos cargar el esperado" (la caja sigue operable, D-FI5).
import { useCallback, useEffect, useState } from "react";
import { getCajaEsperado } from "../../api/cajaApi";

/**
 * @param {number | null | undefined} sesionId
 * @param {boolean} enabled en falso no se pide nada (sin permiso o sin sesión abierta)
 * @param {unknown} [refreshKey] cuando cambia, se vuelve a pedir
 * @returns {{ status: "off" | "loading" | "ok" | "error", data: import("../../api/cajaApi").CajaEsperado | null,
 *   error: { code?: string } | null, reload: () => void }}
 */
export function useCajaEsperado(sesionId, enabled, refreshKey = 0) {
  const [reloadKey, setReloadKey] = useState(0);
  // `key` es el pedido que lo trajo: si no coincide con el actual, se está cargando uno nuevo.
  const [result, setResult] = useState(null);
  const requestKey = `${sesionId}|${refreshKey}|${reloadKey}`;
  const active = Boolean(enabled) && sesionId !== null && sesionId !== undefined;

  useEffect(() => {
    if (!active) return undefined;
    let ignore = false;
    (async () => {
      try {
        const data = await getCajaEsperado(sesionId);
        if (!ignore) setResult({ key: requestKey, status: "ok", data, error: null });
      } catch (e) {
        if (!ignore) setResult({ key: requestKey, status: "error", data: null, error: e });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [active, sesionId, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (!active) return { status: "off", data: null, error: null, reload };
  if (result === null || result.key !== requestKey) {
    // Mientras recarga se conserva el valor anterior de la misma sesión, para que la cifra no parpadee.
    const previo = result?.status === "ok" && result.key.startsWith(`${sesionId}|`) ? result.data : null;
    return { status: "loading", data: previo, error: null, reload };
  }
  return { status: result.status, data: result.data, error: result.error, reload };
}
