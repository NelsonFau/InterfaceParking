// Datos del mosaico de cocheras (Cocheras y Panel): la lista de `GET /Cochera` y, si el usuario puede ver
// ocupaciones, las ocupaciones activas para marcar "con deuda" (P-FM10 de la spec 13). Si esa segunda lista llega al
// tope (`isTruncated`) o no se puede pedir, `deudaIds` es `null` y no se marca deuda en lugar de adivinar.
import { useCallback, useEffect, useState } from "react";
import { listCocheras } from "../../api/cocheraApi";
import { showApiError } from "../../api/errors";
import { listOcupaciones } from "../../api/ocupacionApi";
import { usePermissions } from "../../auth/usePermissions";
import { ocupacionesConDeuda } from "../../utils/cocheras";
import { ESTADO_FILTRO, buildListQueries, isTruncated, mergeOcupaciones } from "../../utils/ocupaciones";
import { useTenantDates } from "../../utils/useTenantDates";

// Tope de ocupaciones activas que se piden para calcular la deuda (el máximo que acepta el backend).
const TAKE_DEUDA = 500;
// Cada cuánto se refresca el reloj (el "vence en…" y las reservas), sin pedir nada al servidor.
const TICK_MS = 60_000;

/**
 * @returns {{
 *   items: import("../../api/cocheraApi").CocheraListItem[] | null,
 *   deudaIds: Set<number> | null,
 *   loading: boolean,
 *   error: boolean,
 *   now: Date,
 *   reload: () => void,
 * }}
 */
export function useCocherasMosaico() {
  const { can } = usePermissions();
  const { timeZone } = useTenantDates();
  const puedeVerOcupaciones = can("ocupaciones.ver");

  const [items, setItems] = useState(null);
  const [deudaIds, setDeudaIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [cocheras, deuda] = await Promise.all([
          listCocheras(),
          (async () => {
            if (!puedeVerOcupaciones) return null;
            try {
              const r = buildListQueries({ estado: ESTADO_FILTRO.ACTIVAS, take: TAKE_DEUDA }, { timeZone, now: new Date() });
              if (!r.ok) return null;
              const lists = await Promise.all(r.queries.map((q) => listOcupaciones(q)));
              if (isTruncated(lists, TAKE_DEUDA)) return null;
              return ocupacionesConDeuda(lists.length > 1 ? mergeOcupaciones(lists, TAKE_DEUDA) : lists[0]);
            } catch (e) {
              if (!ignore) showApiError(e);
              return null;
            }
          })(),
        ]);
        if (ignore) return;
        setItems(cocheras);
        setDeudaIds(deuda);
        setNow(new Date());
      } catch (e) {
        if (ignore) return;
        setItems(null);
        setDeudaIds(null);
        setError(true);
        showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [key, puedeVerOcupaciones, timeZone]);

  return { items, deudaIds, loading, error, now, reload };
}
