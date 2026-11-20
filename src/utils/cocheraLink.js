// Contrato de enlace al detalle de una cochera: `/cocheras?cochera=N` abre el detalle de la cochera N sobre la
// pantalla Cocheras (el mosaico del Panel lo usa). Módulo puro, sin React. Quien enlace usa `buildCocheraPath`.
import { isPositiveId } from "./trazabilidadLink.js";

export const COCHERAS_PATH = "/cocheras";

/**
 * Ruta con el id de la cochera. Un id que no es entero positivo da la ruta sola (no lanza).
 * @param {number | string | null | undefined} id
 * @returns {string} por ejemplo `/cocheras?cochera=12`
 */
export function buildCocheraPath(id) {
  return isPositiveId(id) ? `${COCHERAS_PATH}?cochera=${Number(String(id).trim())}` : COCHERAS_PATH;
}

/**
 * Lee `cochera` del query (con o sin `?`, o un `URLSearchParams`). Lo que no es un entero positivo se ignora.
 * @param {string | URLSearchParams | null | undefined} search
 * @returns {number | null}
 */
export function parseCocheraId(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? "");
  const raw = params.get("cochera");
  return raw !== null && isPositiveId(raw) ? Number(raw.trim()) : null;
}
