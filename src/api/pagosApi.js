// /api/v1/Pagos (spec 08, D-FH2). Patrón D-FB14: funciones nombradas que devuelven `data`, sin capturar
// errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums: reciben `UtcInstant` y
// enteros ya listos. Los tipos salen de `docs/inventario/backend.md`, sección `/Pagos`.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} PagoResponse
 * @property {number} id
 * @property {number} ocupacionId
 * @property {number} monto
 * @property {number} montoDevuelto 0 si no se devolvió nada (`POST /Pagos` también lo manda en 0)
 * @property {number} metodo MetodoPago
 * @property {number} estado EstadoPago (PAGADO = 1, ANULADO = 2)
 * @property {string} fechaPago UtcInstant
 * @property {string} [referencia]
 */

/**
 * @typedef {Object} Devolucion
 * @property {number} id
 * @property {number} pagoId
 * @property {number} monto
 * @property {number} metodo MetodoPago; puede diferir del del pago
 * @property {string} motivo
 * @property {number} usuarioId el backend no manda el nombre
 * @property {string} fecha UtcInstant
 */

/**
 * @typedef {Object} PagoHistorial
 * @property {number} estado EstadoPago (PAGADO sin motivo; ANULADO con motivo)
 * @property {string} fecha UtcInstant
 * @property {number} usuarioId
 * @property {string} [motivo]
 */

/**
 * @typedef {PagoResponse & { registradoPorUsuarioId: number, historial: PagoHistorial[], devoluciones: Devolucion[] }} PagoDetalle
 * `historial` en orden cronológico ascendente y `devoluciones` ascendentes por `id`.
 */

/**
 * POST /Pagos (`pagos.registrar`): 201 con el pago. Función de la spec 07 (D-FG4), adoptada tal cual.
 * `monto` va con hasta 2 decimales, mayor que 0 y como mucho 10.000.000 (`[Dinero]`); `referencia` se omite si no hay.
 * @param {{ ocupacionId: number, monto: number, metodo: number, referencia?: string }} body
 * @returns {Promise<PagoResponse>}
 */
export async function createPago(body) {
  const { data } = await http.post("/Pagos", body);
  return data;
}

/**
 * GET /Pagos/ocupacion/{ocupacionId} (`pagos.ver`): por `fechaPago` descendente, **con los anulados**. Una
 * ocupación inexistente da 200 con `[]` (no 404).
 * @param {number} ocupacionId
 * @returns {Promise<PagoResponse[]>}
 */
export async function listPagosByOcupacion(ocupacionId) {
  const { data } = await http.get(`/Pagos/ocupacion/${ocupacionId}`);
  // Una respuesta que no es un arreglo no se disfraza de "todavía no hay pagos".
  if (!Array.isArray(data)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/**
 * GET /Pagos/{pagoId} (`pagos.ver`): el pago con su historial y sus devoluciones.
 * @param {number} pagoId
 * @returns {Promise<PagoDetalle>}
 */
export async function getPago(pagoId) {
  const { data } = await http.get(`/Pagos/${pagoId}`);
  return data;
}

/**
 * PATCH /Pagos/{pagoId}/anular (`pagos.anular`): 204. El motivo es obligatorio (250 como máximo). Anular un
 * pago de otra sesión de caja exige además `pagos.devolver`; un pago con devoluciones no se anula.
 * @param {number} pagoId
 * @param {{ motivo: string }} body
 * @returns {Promise<void>}
 */
export async function anularPago(pagoId, body) {
  await http.patch(`/Pagos/${pagoId}/anular`, body);
}

/**
 * POST /Pagos/{pagoId}/devoluciones (`pagos.devolver`): 201 con la devolución. Es por pago y se compara solo
 * contra lo que queda por devolver de ese pago.
 * @param {number} pagoId
 * @param {{ monto: number, metodo: number, motivo: string }} body
 * @returns {Promise<Devolucion>}
 */
export async function createDevolucion(pagoId, body) {
  const { data } = await http.post(`/Pagos/${pagoId}/devoluciones`, body);
  return data;
}
