// /api/v1/Ocupacion (spec 07, D-FG2). Patrón D-FB14: funciones nombradas que devuelven `data`, sin
// capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums: reciben
// `UtcInstant` y enteros ya listos. La spec 10 sumó acá el ajuste de precio, la baja programada y el ajuste masivo.
import { ApiError } from "./errors.js";
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/**
 * @typedef {Object} OcupacionListItem
 * @property {number} id
 * @property {number} cocheraId
 * @property {number} cocheraNumero
 * @property {number} clienteId
 * @property {string} clienteNombre
 * @property {number} tipo TipoOcupacion
 * @property {string} inicio UtcInstant
 * @property {string | null} fin UtcInstant; `null` es una ocupación abierta
 * @property {string | null} finReal UtcInstant; `null` hasta finalizar
 * @property {number} estado EstadoOcupacion guardado
 * @property {number} estadoCalculado EstadoOcupacion con VENCIDA
 * @property {number | null} precioTotal `null` hasta finalizar
 * @property {number} topeDeCobro lo máximo que se puede cobrar hoy (calculado por el backend)
 * @property {number} pagado neto de devoluciones
 * @property {number} saldo
 */

/**
 * @typedef {Object} OcupacionDetalle
 * @property {number} id
 * @property {number} cocheraId
 * @property {number} cocheraNumero
 * @property {number} clienteId
 * @property {string} clienteNombre
 * @property {string} clienteDocumento
 * @property {string} clienteTelefono
 * @property {number} tipo
 * @property {string} inicio
 * @property {string | null} fin
 * @property {string | null} finReal
 * @property {number} precioUnitarioAplicado
 * @property {boolean} esTarifaExcepcional
 * @property {string | null} motivoTarifaExcepcional
 * @property {number | null} precioTotal
 * @property {number | null} modoMes ModoMes; solo en MES (congelado al crear)
 * @property {number | null} fraccionMes FraccionMes; solo en MES (congelado al crear)
 * @property {number} topeDeCobro
 * @property {number} estado
 * @property {number} estadoCalculado
 * @property {number} pagado
 * @property {number} saldo
 * @property {number} saldoAFavor
 */

/**
 * @typedef {Object} OcupacionRequest
 * @property {number} cocheraId
 * @property {number} clienteId
 * @property {number} tipo TipoOcupacion
 * @property {string} inicio UtcInstant
 * @property {string} [fin] UtcInstant; se omite en una ocupación abierta
 * @property {boolean} usarTarifaExcepcional
 * @property {number} [precioUnitarioExcepcional]
 * @property {string} [motivoTarifaExcepcional]
 * @property {string} [motivoRetroactivo]
 */

/**
 * @typedef {Object} OcupacionResponse respuesta del alta (200): no trae `saldo` ni `esTarifaExcepcional`
 * @property {number} id
 * @property {number} cocheraId
 * @property {number} clienteId
 * @property {number} tipo
 * @property {string} inicio
 * @property {string | null} fin
 * @property {number} precioUnitarioAplicado
 * @property {number | null} precioTotal siempre `null` en el alta
 * @property {number} topeDeCobro
 * @property {number} estado
 */

/**
 * GET /Ocupacion: sin paginar (`take` por defecto 200; el backend recorta a 500 en silencio), por `inicio`
 * descendente. `desde` filtra por `Inicio` y `hasta` por `Fin`, inclusivo (excluye las abiertas).
 * @param {{ estado?: number, cocheraId?: number, clienteId?: number, desde?: string, hasta?: string,
 *   venceEnDias?: number, take?: number }} [filters]
 * @returns {Promise<OcupacionListItem[]>}
 */
export async function listOcupaciones(filters) {
  const { data } = await http.get("/Ocupacion", { params: cleanParams(filters) });
  // Una respuesta que no es un arreglo no se disfraza de "no hay ocupaciones".
  if (!Array.isArray(data)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/**
 * GET /Ocupacion/{id}.
 * @param {number} id
 * @returns {Promise<OcupacionDetalle>}
 */
export async function getOcupacion(id) {
  const { data } = await http.get(`/Ocupacion/${id}`);
  return data;
}

/**
 * POST /Ocupacion: 200 (no 201) con la ocupación creada.
 * @param {OcupacionRequest} body
 * @returns {Promise<OcupacionResponse>}
 */
export async function createOcupacion(body) {
  const { data } = await http.post("/Ocupacion", body);
  return data;
}

/**
 * POST /Ocupacion/{id}/cancelar: solo reservas (ACTIVA con inicio futuro). El motivo es obligatorio.
 * 204. `finReal` se ignora en el backend: no se manda.
 * @param {number} id
 * @param {{ motivo: string }} body
 * @returns {Promise<void>}
 */
export async function cancelOcupacion(id, body) {
  await http.post(`/Ocupacion/${id}/cancelar`, body);
}

/**
 * POST /Ocupacion/{id}/finalizar. El cuerpo es opcional: solo hace falta con un excedente en un mensual.
 * Si es `undefined`, no se manda. 204.
 * @param {number} id
 * @param {{ resolucionExcedente: number, motivo?: string }} [body]
 * @returns {Promise<void>}
 */
export async function finalizeOcupacion(id, body) {
  if (body === undefined) await http.post(`/Ocupacion/${id}/finalizar`);
  else await http.post(`/Ocupacion/${id}/finalizar`, body);
}

/**
 * @typedef {Object} AjustePrecioResponse
 * @property {number} id `0` en la respuesta del lote
 * @property {number} ocupacionId
 * @property {string} vigenteDesde DateOnly
 * @property {number} precioAnterior el vigente en esa fecha
 * @property {number} precioNuevo
 */

/**
 * POST /Ocupacion/{id}/precio (`tarifas.editar`): nuevo precio de un contrato mensual desde `vigenteDesde`
 * (DateOnly, posterior a hoy; se manda tal cual). No edita el precio de partida.
 * @param {number} id
 * @param {{ vigenteDesde: string, precioUnitario: number, motivo: string }} body
 * @returns {Promise<AjustePrecioResponse>}
 */
export async function adjustOcupacionPrecio(id, body) {
  const { data } = await http.post(`/Ocupacion/${id}/precio`, body);
  return data;
}

/**
 * PUT /Ocupacion/{id}/fin (`ocupaciones.finalizar`): programa, mueve o quita (con `null`) la baja de un
 * contrato mensual. La clave `fin` se manda siempre, también con `null`.
 * @param {number} id
 * @param {{ fin: string | null }} body `fin` es un UtcInstant
 * @returns {Promise<{ ocupacionId: number, fin: string | null }>}
 */
export async function setOcupacionFin(id, body) {
  const { data } = await http.put(`/Ocupacion/${id}/fin`, body);
  return data;
}

/**
 * POST /Ocupacion/ajuste-precio (`tarifas.editar`): ajuste por porcentaje (de -50 a 100) de todos los
 * mensuales activos, menos los de `excluir`. Todo o nada.
 * @param {{ vigenteDesde: string, porcentaje: number, motivo: string, excluir?: number[] }} body
 * @returns {Promise<{ cantidad: number, contratos: AjustePrecioResponse[] }>}
 */
export async function adjustPreciosMensuales(body) {
  const { data } = await http.post("/Ocupacion/ajuste-precio", body);
  if (typeof data?.cantidad !== "number" || !Array.isArray(data?.contratos)) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}
