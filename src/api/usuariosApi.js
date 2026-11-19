// /api/v1/Usuarios (spec 04, D-FD8 y spec 12, D-FL2). `listUsuarios` lo creó la 04 para el filtro de
// Trazabilidad; la 12 agrega las de escritura. Patrón D-FB14: devuelven `data`, no capturan errores y no
// convierten fechas ni enums.
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

/**
 * POST /Usuarios (`usuarios.gestionar`): invita a una persona. 201. Si falló solo el envío del mail,
 * `invitacionEnviada` es `false` (el usuario igual se creó).
 * @param {{ nombre: string, email: string, rol: number }} body
 * @returns {Promise<{ usuario: Usuario, invitacionEnviada: boolean }>}
 */
export async function createUsuario({ nombre, email, rol }) {
  const { data } = await http.post("/Usuarios", { nombre, email, rol });
  if (!data || typeof data !== "object" || !data.usuario || typeof data.invitacionEnviada !== "boolean") {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/**
 * POST /Usuarios/{id}/reenviar-invitacion (`usuarios.gestionar`). 204. A un desactivado: 409.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function resendInvitacion(id) {
  await http.post(`/Usuarios/${id}/reenviar-invitacion`);
}

/**
 * PUT /Usuarios/{id}/rol (`usuarios.gestionar`).
 * @param {number} id
 * @param {number} rol RolUsuario invitable
 * @returns {Promise<Usuario>}
 */
export async function updateUsuarioRol(id, rol) {
  const { data } = await http.put(`/Usuarios/${id}/rol`, { rol });
  return data;
}

/**
 * POST /Usuarios/{id}/desactivar (`usuarios.gestionar`): solo local, no toca Auth0.
 * @param {number} id
 * @returns {Promise<Usuario>}
 */
export async function deactivateUsuario(id) {
  const { data } = await http.post(`/Usuarios/${id}/desactivar`);
  return data;
}

/**
 * POST /Usuarios/{id}/reactivar (`usuarios.gestionar`): solo pone `activo = true`.
 * @param {number} id
 * @returns {Promise<Usuario>}
 */
export async function reactivateUsuario(id) {
  const { data } = await http.post(`/Usuarios/${id}/reactivar`);
  return data;
}
