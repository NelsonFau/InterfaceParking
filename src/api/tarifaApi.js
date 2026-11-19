// /api/v1/Tarifa (spec 03, D-FC2). Patrón D-FB14: funciones nombradas que devuelven `data`,
// sin capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums:
// reciben `DateOnly` y enteros ya listos.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} Tarifa
 * @property {number} id
 * @property {number} tipo TipoOcupacion (1 Hora, 2 Día, 3 Mes)
 * @property {number} precio
 * @property {string} vigenteDesde DateOnly `yyyy-MM-dd`
 * @property {string} [vigenteHasta] DateOnly; el backend lo calcula al leer
 * @property {boolean} vigente
 */

/**
 * @typedef {Object} TarifaVigente
 * @property {number} tipo
 * @property {Tarifa | null} vigente
 * @property {Tarifa | null} proxima la futura de menor `vigenteDesde`
 */

// Una respuesta que no es un arreglo no se disfraza de "no hay tarifas".
function ensureArray(data) {
  if (!Array.isArray(data)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/**
 * GET /Tarifa/vigentes: siempre 3 elementos (Hora, Día, Mes).
 * @returns {Promise<TarifaVigente[]>}
 */
export async function listTarifasVigentes() {
  const { data } = await http.get("/Tarifa/vigentes");
  return ensureArray(data);
}

/**
 * GET /Tarifa/historial: todas las tarifas del tipo, programadas incluidas, por `vigenteDesde` descendente.
 * @param {number} tipo
 * @returns {Promise<Tarifa[]>}
 */
export async function listTarifaHistorial(tipo) {
  const { data } = await http.get("/Tarifa/historial", { params: cleanParams({ tipo }) });
  return ensureArray(data);
}

/**
 * PUT /Tarifa: alta o reemplazo (si ya hay una tarifa futura en esa fecha). Manda el cuerpo tal cual.
 * @param {{ tipo: number, nuevoPrecio: number, vigenteDesde?: string }} body
 * @returns {Promise<Tarifa>}
 */
export async function updateTarifa(body) {
  const { data } = await http.put("/Tarifa", body);
  return data;
}

/**
 * DELETE /Tarifa/{id}: solo tarifas que todavía no rigen. 204.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function removeTarifa(id) {
  await http.delete(`/Tarifa/${id}`);
}
