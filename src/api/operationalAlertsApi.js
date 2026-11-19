// /api/v1/operational-alerts (spec 05, D-FE4). Patrón D-FB14: funciones nombradas que devuelven `data`,
// sin capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums:
// reciben instantes (`UtcInstant`) y enteros ya listos.
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { normalizePaged } from "../utils/paginacion.js";

/**
 * @typedef {Object} Alerta
 * @property {number} id
 * @property {number} tipo TipoAlertaOperativa
 * @property {number} severidad SeveridadAlerta
 * @property {string} mensaje
 * @property {number} [ocupacionId]
 * @property {number} [cajaSesionId]
 * @property {boolean} esDeDinero
 * @property {boolean} resuelta
 * @property {string} fechaCreacion UtcInstant
 * @property {string} [fechaResolucion] UtcInstant
 * @property {boolean} resolucionAutomatica
 * @property {number} [resueltaPorUsuarioId]
 * @property {string} [resueltaPorNombre]
 * @property {string} [comentarioResolucion]
 */

/**
 * @typedef {Object} AlertaFilters
 * @property {boolean} [resuelta]
 * @property {number} [tipo]
 * @property {number} [severidad]
 * @property {number} [ocupacionId]
 * @property {number} [cajaSesionId]
 * @property {string} [desde] UtcInstant, sobre `fechaCreacion`
 * @property {string} [hasta] UtcInstant, inclusivo
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * GET /operational-alerts: paginado, de la más nueva a la más vieja.
 * @param {AlertaFilters} [filters]
 * @returns {Promise<{ items: Alerta[], total: number, page: number, pageSize: number }>}
 */
export async function listAlertas(filters) {
  const { data } = await http.get("/operational-alerts", { params: cleanParams(filters) });
  return normalizePaged(data);
}

/**
 * GET /operational-alerts/{id}.
 * @param {number} id
 * @returns {Promise<Alerta>}
 */
export async function getAlerta(id) {
  const { data } = await http.get(`/operational-alerts/${id}`);
  return data;
}

/**
 * PATCH /operational-alerts/{id}/resolver: devuelve la alerta ya resuelta. 409 `alerta_resuelta`
 * si alguien (o el job) la resolvió antes.
 * @param {number} id
 * @param {{ comentario?: string }} [body]
 * @returns {Promise<Alerta>}
 */
export async function resolveAlerta(id, body = {}) {
  const { data } = await http.patch(`/operational-alerts/${id}/resolver`, body);
  return data;
}

/**
 * Cantidad de alertas del filtro, sin traer filas: pide una sola y devuelve el `total`.
 * @param {AlertaFilters} [filters] los de página y tamaño se ignoran
 * @returns {Promise<number>}
 */
export async function countAlertas(filters) {
  const { total } = await listAlertas({ ...filters, page: 1, pageSize: 1 });
  return total;
}
