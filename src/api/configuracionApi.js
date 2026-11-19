// /api/v1/Configuracion (spec 11, D-FK3). Patrón D-FB14: devuelven `data`, no capturan errores y no
// convierten enums (reciben y devuelven enteros).
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} Configuracion
 * @property {string} zonaHoraria IANA, de una lista cerrada del backend
 * @property {number} modoCaja ModoCaja
 * @property {number} toleranciaInicioHoras 0..168
 * @property {number} topePasadoDias 1..3650
 * @property {number} techoFuturoMeses 1..24
 * @property {number} modoMes ModoMes
 * @property {number} fraccionMes FraccionMes
 * @property {number} graciaHoraMinutos 0..59
 * @property {number} diasGraciaMora 0..60
 * @property {number} ventanaAlertasDias 7..90, solo lectura
 * @property {string} version token opaco (base64): se devuelve tal cual en el PUT
 */

function checkConfiguracion(data) {
  const ok =
    data &&
    typeof data === "object" &&
    typeof data.zonaHoraria === "string" &&
    typeof data.modoCaja === "number" &&
    typeof data.version === "string";
  if (!ok) throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  return data;
}

/**
 * GET /Configuracion (`configuracion.ver`).
 * @returns {Promise<Configuracion>}
 */
export async function getConfiguracion() {
  const { data } = await http.get("/Configuracion");
  return checkConfiguracion(data);
}

/**
 * PUT /Configuracion (`configuracion.editar`). 200 con la configuración completa y la `version` nueva.
 * 409 `configuracion_modificada` (versión vieja) o `caja_abierta`.
 * @param {Object} body `zonaHoraria`, `modoCaja` y `version` obligatorios; el resto, opcional.
 * @returns {Promise<Configuracion>}
 */
export async function updateConfiguracion(body) {
  const { data } = await http.put("/Configuracion", body);
  return checkConfiguracion(data);
}
