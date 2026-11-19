// /api/v1/Caja (spec 09, D-FI2). Patrón D-FB14: funciones nombradas que devuelven `data`, sin capturar errores
// (la pantalla llama a `showApiError`) y sin convertir fechas ni enums: reciben `DateOnly` y enteros ya listos.
// Los tipos salen de `docs/inventario/backend.md`, sección `/Caja`.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { normalizePaged } from "../utils/paginacion.js";

/**
 * @typedef {Object} CajaSesion
 * @property {number} id
 * @property {number} estado EstadoCajaSesion (ABIERTA = 1, CERRADA = 2)
 * @property {string} fechaApertura UtcInstant
 * @property {number} fondoInicial
 */

/**
 * @typedef {Object} CajaTotalMetodo snapshot o en vivo; solo trae los métodos con movimientos
 * @property {number} metodo MetodoPago
 * @property {number} cobros
 * @property {number} anulaciones
 * @property {number} devoluciones
 */

/**
 * @typedef {Object} CajaActual
 * @property {number} modo ModoCaja (DIARIA = 1, TURNO = 2)
 * @property {CajaSesion | null} [sesion] la abierta
 * @property {number | null} [fondoPropuesto] solo sin sesión abierta
 */

/**
 * @typedef {Object} CajaHistorial
 * @property {number} tipo TipoEventoCaja (APERTURA = 1, CIERRE = 2, REAPERTURA = 3)
 * @property {string} fecha UtcInstant
 * @property {number} usuarioId el backend no manda el nombre
 * @property {boolean} automatica
 * @property {string} [motivo]
 * @property {string} [observacion]
 * @property {number} [fondoDeclarado] APERTURA
 * @property {number} [fondoQueQuedo] APERTURA
 * @property {number} [efectivoContado] CIERRE
 * @property {number} [efectivoEsperado] CIERRE
 * @property {number} [diferencia] CIERRE, contado − esperado
 * @property {number} [fondoSiguiente] CIERRE
 * @property {CajaTotalMetodo[]} [totales] CIERRE
 */

/**
 * @typedef {Object} CajaMovimiento
 * @property {number} tipo TipoMovimientoCaja (COBRO = 1, ANULACION = 2, DEVOLUCION = 3)
 * @property {number} pagoId
 * @property {number} monto
 * @property {number} metodo MetodoPago
 * @property {string} fecha UtcInstant
 * @property {number} usuarioId
 * @property {boolean} dePagoDeOtraSesion solo vale en las ANULACION
 */

/**
 * @typedef {Object} CajaSesionDetalle
 * @property {CajaSesion} sesion
 * @property {CajaHistorial[]} historial cronológico ascendente
 * @property {CajaMovimiento[] | null} movimientos `null` con la sesión abierta; completo (sin paginar) con la cerrada
 */

/**
 * @typedef {Object} CajaEsperado
 * @property {number} sesionId
 * @property {number} estado
 * @property {number} fondoInicial
 * @property {CajaTotalMetodo[]} totales
 * @property {number} efectivoEsperado fondo + cobros − anulaciones − devoluciones, solo en EFECTIVO
 */

/**
 * @typedef {Object} CierreCaja
 * @property {CajaSesion} sesion
 * @property {number} efectivoContado
 * @property {number} efectivoEsperado
 * @property {number} diferencia contado − esperado
 * @property {number} fondoSiguiente
 * @property {string} [observacion]
 * @property {CajaTotalMetodo[]} totales
 */

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function respuestaInvalida() {
  return new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
}

/**
 * GET /Caja/actual (`caja.ver`): el modo del tenant y la sesión abierta (o el fondo propuesto si no hay).
 * @returns {Promise<CajaActual>}
 */
export async function getCajaActual() {
  const { data } = await http.get("/Caja/actual");
  if (!isObject(data) || data.modo === undefined || data.modo === null) throw respuestaInvalida();
  return data;
}

/**
 * GET /Caja/sesiones (`caja.ver`): paginado por `fechaApertura` descendente. `desde` y `hasta` son `DateOnly`,
 * obligatorios, con rango de hasta 366 días; el día `hasta` entra entero. `pageSize` hasta 200.
 * @param {{ desde: string, hasta: string, page?: number, pageSize?: number }} filters
 * @returns {Promise<{ items: CajaSesion[], total: number, page: number, pageSize: number }>}
 */
export async function listCajaSesiones(filters) {
  const { data } = await http.get("/Caja/sesiones", { params: cleanParams(filters) });
  return normalizePaged(data);
}

/**
 * GET /Caja/sesiones/{id} (`caja.ver`): la sesión, su historial y, si está cerrada, sus movimientos.
 * @param {number} id
 * @returns {Promise<CajaSesionDetalle>}
 */
export async function getCajaSesion(id) {
  const { data } = await http.get(`/Caja/sesiones/${id}`);
  const valido =
    isObject(data) &&
    isObject(data.sesion) &&
    Array.isArray(data.historial) &&
    (data.movimientos === null || data.movimientos === undefined || Array.isArray(data.movimientos));
  if (!valido) throw respuestaInvalida();
  return data;
}

/**
 * GET /Caja/sesiones/{id}/esperado (`caja.ver_esperado`): el efectivo esperado en vivo.
 * @param {number} id
 * @returns {Promise<CajaEsperado>}
 */
export async function getCajaEsperado(id) {
  const { data } = await http.get(`/Caja/sesiones/${id}/esperado`);
  return data;
}

/**
 * POST /Caja/abrir (`caja.abrir`): 201 con la sesión. Sirve en los dos modos. 409 `caja_ya_abierta`.
 * @param {{ fondoInicial: number, observacion?: string }} body observación obligatoria si el fondo difiere del que quedó
 * @returns {Promise<CajaSesion>}
 */
export async function openCaja(body) {
  const { data } = await http.post("/Caja/abrir", body);
  return data;
}

/**
 * POST /Caja/sesiones/{id}/cerrar (`caja.cerrar`): el arqueo.
 * @param {number} id
 * @param {{ efectivoContado: number, fondoSiguiente: number, observacion?: string }} body
 * @returns {Promise<CierreCaja>}
 */
export async function closeCaja(id, body) {
  const { data } = await http.post(`/Caja/sesiones/${id}/cerrar`, body);
  return data;
}

/**
 * POST /Caja/sesiones/{id}/reabrir (`caja.reabrir`, solo DUENO): solo la última sesión cerrada.
 * @param {number} id
 * @param {{ motivo: string }} body
 * @returns {Promise<CajaSesion>}
 */
export async function reopenCaja(id, body) {
  const { data } = await http.post(`/Caja/sesiones/${id}/reabrir`, body);
  return data;
}
