// /api/v1/Cliente (spec 07, D-FG3). Por ahora solo `listClientes`, para el selector de cliente de
// Ocupaciones; si hay una spec de Clientes, suma sus funciones a este mismo archivo sin recrearlo.
// `Clientes.jsx` sigue con su propio acceso.
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { normalizePaged } from "../utils/paginacion.js";

/**
 * @typedef {Object} Cliente
 * @property {number} id
 * @property {string} nombreCompleto
 * @property {string} documento
 * @property {string} telefono
 * @property {string | null} email
 * @property {boolean} activo
 * @property {string} fechaCreacion UtcInstant
 */

/**
 * GET /Cliente (`clientes.ver`): paginado, con `q` por nombre o documento.
 * @param {{ q?: string, activos?: boolean, page?: number, pageSize?: number }} [filters]
 * @returns {Promise<{ items: Cliente[], total: number, page: number, pageSize: number }>}
 */
export async function listClientes({ q, activos, page, pageSize } = {}) {
  const { data } = await http.get("/Cliente", { params: cleanParams({ q, activos, page, pageSize }) });
  return normalizePaged(data);
}
