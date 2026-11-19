// /api/v1/Trazabilidad (spec 04, D-FD12). Patrón D-FB14: una función `async` que devuelve `data`,
// sin capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni validar:
// recibe los parámetros ya listos (`toApiParams` de src/utils/trazabilidadFiltros.js).
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { normalizePaged } from "../utils/paginacion.js";

/**
 * @typedef {Object} EventoTrazabilidad
 * @property {string} fecha UtcInstant
 * @property {string} fuente AUDITORIA, PAGO, DEVOLUCION, CAJA o ALERTA
 * @property {string} accion texto; de AUDITORIA puede llegar `Finalizar` (se normaliza con `canonicalKey`)
 * @property {number} [usuarioId]
 * @property {string} [usuarioNombre]
 * @property {boolean} automatica
 * @property {number} [ocupacionId]
 * @property {number} [pagoId]
 * @property {number} [cajaSesionId]
 * @property {number} [alertaId]
 * @property {string} [entidad]
 * @property {number} [entidadId]
 * @property {Object} detalle claves según la fuente (ver el manual de la spec 04)
 */

/**
 * GET /Trazabilidad: línea de tiempo de auditoría, pagos, devoluciones, caja y alertas.
 * `fuente` sale como `fuente=PAGO&fuente=CAJA` (PARAMS_SERIALIZER de `http`).
 * @param {{ ocupacionId?: number, pagoId?: number, cajaSesionId?: number, usuarioId?: number,
 *   fuente?: string[], desde?: string, hasta?: string, page?: number, pageSize?: number }} [filters]
 *   `desde` y `hasta` son instantes con Z (ya convertidos).
 * @returns {Promise<{ items: EventoTrazabilidad[], total: number, page: number, pageSize: number }>}
 */
export async function listTrazabilidad(filters = {}) {
  const { data } = await http.get("/Trazabilidad", { params: cleanParams(filters) });
  return normalizePaged(data);
}
