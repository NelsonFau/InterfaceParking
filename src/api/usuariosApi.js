// /api/v1/Usuarios (spec 04, D-FD8). Por ahora solo `listUsuarios`, para el filtro de Trazabilidad;
// la spec 12 agrega las demás funciones a este mismo archivo sin recrearlo.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} Usuario
 * @property {number} id
 * @property {string} nombre
 * @property {string} email
 * @property {number} rol RolUsuario
 * @property {boolean} activo
 * @property {string} fechaCreacion UtcInstant
 */

/**
 * GET /Usuarios (`usuarios.ver`): todos los usuarios del tenant, sin paginar, por nombre y después por id.
 * @returns {Promise<Usuario[]>}
 */
export async function listUsuarios() {
  const { data } = await http.get("/Usuarios");
  // Una respuesta que no es un arreglo no se disfraza de "no hay usuarios".
  if (!Array.isArray(data)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}
