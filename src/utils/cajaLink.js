// Contrato de enlace a una sesión de caja (spec 09, D-FI4, D-FI13). Módulo puro, sin React.
// `/caja?sesion=N` abre el detalle de la sesión N sobre la pantalla de Caja. Quien enlace usa
// `buildCajaPath`, nunca arma el texto a mano, y muestra el enlace solo con `caja.ver`.
import { CAJA_PATH } from "../auth/routes.js";
import { isPositiveId } from "./trazabilidadLink.js";

export { CAJA_PATH };

/**
 * Ruta con el id de la sesión. Un id que no es entero positivo da la ruta sola (no lanza).
 * @param {number | string | null | undefined} id
 * @returns {string} por ejemplo `/caja?sesion=12`
 */
export function buildCajaPath(id) {
  return isPositiveId(id) ? `${CAJA_PATH}?sesion=${Number(String(id).trim())}` : CAJA_PATH;
}

/**
 * Lee el parámetro `sesion` de la URL (con o sin `?`, o un `URLSearchParams`). Lo que no es un entero
 * positivo se ignora (`null`).
 * @param {string | URLSearchParams | null | undefined} search
 * @returns {number | null}
 */
export function parseCajaSesionId(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? "");
  const raw = params.get("sesion");
  return raw !== null && isPositiveId(raw) ? Number(raw.trim()) : null;
}
