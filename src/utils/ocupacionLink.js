// Contrato de enlace a una ocupación (spec 07, D-FG14, D-FG15). Módulo puro, sin React.
// `/ocupaciones?id=N` abre el detalle de la ocupación N sobre el listado. Quien enlace usa
// `buildOcupacionPath`, nunca arma el texto a mano, y muestra el enlace solo con `ocupaciones.ver`.
import { ALERTAS_PATH, OCUPACIONES_PATH } from "../auth/routes.js";
import { isPositiveId } from "./trazabilidadLink.js";

export { OCUPACIONES_PATH };

/**
 * Ruta con el id de la ocupación. Un id que no es entero positivo da la ruta sola (no lanza).
 * @param {number | string | null | undefined} id
 * @returns {string} por ejemplo `/ocupaciones?id=12`
 */
export function buildOcupacionPath(id) {
  return isPositiveId(id) ? `${OCUPACIONES_PATH}?id=${Number(String(id).trim())}` : OCUPACIONES_PATH;
}

/**
 * Lee el `id` del query de la URL (con o sin `?`, o un `URLSearchParams`). Lo que no es un entero positivo
 * se ignora (`null`).
 * @param {string | URLSearchParams | null | undefined} search
 * @returns {number | null}
 */
export function parseOcupacionId(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? "");
  const raw = params.get("id");
  return raw !== null && isPositiveId(raw) ? Number(raw.trim()) : null;
}

/**
 * Ruta de Alertas filtrada por una ocupación (contrato de D-FE6 de la spec 05). Sin id válido, la ruta sola.
 * @param {number | string | null | undefined} ocupacionId
 * @returns {string} por ejemplo `/alertas-operativas?ocupacionId=12`
 */
export function buildAlertasDeOcupacionPath(ocupacionId) {
  return isPositiveId(ocupacionId)
    ? `${ALERTAS_PATH}?ocupacionId=${Number(String(ocupacionId).trim())}`
    : ALERTAS_PATH;
}
