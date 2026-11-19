// /api/v1/Cochera (spec 06, D-FF2). Patrón D-FB14: funciones nombradas que devuelven `data`,
// sin capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums:
// reciben `UtcInstant` y enteros ya listos.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} OcupacionActiva
 * @property {number} ocupacionId
 * @property {number} clienteId
 * @property {string} clienteNombre
 * @property {number} tipo TipoOcupacion
 * @property {string} inicio UtcInstant
 * @property {string} [fin] UtcInstant; ausente en una ocupación abierta
 * @property {number} [precioTotal] suele ser `null`
 */

/**
 * @typedef {Object} CocheraListItem
 * @property {number} id
 * @property {number} numero
 * @property {number} estado EstadoCochera, calculado por el backend (no trae `nota`)
 * @property {OcupacionActiva} [ocupacionActiva] la ocupación en curso o, si no hay, la próxima reserva
 */

/**
 * @typedef {Object} CocheraHistorialItem
 * @property {number} id id de la OCUPACIÓN
 * @property {number} clienteId
 * @property {string} clienteNombre
 * @property {number} tipo
 * @property {string} inicio UtcInstant
 * @property {string} [fin]
 * @property {number} estado EstadoOcupacion
 * @property {number} [precioTotal]
 */

/**
 * @typedef {Object} CocheraDetalle
 * @property {number} id
 * @property {number} numero
 * @property {number} estado
 * @property {string} [nota]
 * @property {OcupacionActiva} [ocupacionActiva]
 * @property {CocheraHistorialItem[]} historial por `inicio` descendente
 */

// Una respuesta que no es un arreglo no se disfraza de "no hay cocheras".
function ensureArray(data) {
  if (!Array.isArray(data)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/**
 * GET /Cochera: ordenada por número, sin paginar.
 * @returns {Promise<CocheraListItem[]>}
 */
export async function listCocheras() {
  const { data } = await http.get("/Cochera");
  return ensureArray(data);
}

/**
 * GET /Cochera/{id}.
 * @param {number} id
 * @param {{ historialTake?: number }} [opciones] el backend usa 20 por defecto
 * @returns {Promise<CocheraDetalle>}
 */
export async function getCochera(id, { historialTake } = {}) {
  const params = cleanParams({ historialTake });
  const config = Object.keys(params).length > 0 ? { params } : undefined;
  const { data } = config ? await http.get(`/Cochera/${id}`, config) : await http.get(`/Cochera/${id}`);
  return data;
}

/**
 * POST /Cochera: alta por rango, todo o nada, hasta 100 por pedido. 201 sin `Location`.
 * @param {{ desde: number, hasta?: number }} body
 * @returns {Promise<{ id: number, numero: number, estado: number, nota?: string }[]>}
 */
export async function createCocheras(body) {
  const { data } = await http.post("/Cochera", body);
  return data;
}

/**
 * PUT /Cochera/{id}: número y nota. `nota: null` la borra. 204.
 * @param {number} id
 * @param {{ numero: number, nota: string | null }} body
 * @returns {Promise<void>}
 */
export async function updateCochera(id, body) {
  await http.put(`/Cochera/${id}`, body);
}

/**
 * PUT /Cochera/{id}/estado: solo DISPONIBLE o BLOQUEADA. 204.
 * @param {number} id
 * @param {{ estado: number, nota: string | null }} body
 * @returns {Promise<void>}
 */
export async function setEstadoCochera(id, body) {
  await http.put(`/Cochera/${id}/estado`, body);
}

/**
 * GET /Cochera/disponibles (la usa el alta de ocupación, spec 07). `hasta` es obligatorio y exclusivo.
 * @param {{ desde: string, hasta: string }} rango UtcInstant ya convertidos
 * @returns {Promise<{ id: number, numero: number }[]>}
 */
export async function listCocherasDisponibles({ desde, hasta }) {
  const { data } = await http.get("/Cochera/disponibles", { params: cleanParams({ desde, hasta }) });
  return ensureArray(data);
}
