// Filtros de Trazabilidad: validación previa, parámetros de la API y rango por defecto (spec 04, D-FD6).
// Módulo puro. Valida antes de llamar las reglas que el backend responde con 400 `datos_invalidos`,
// y mide el límite de 31 días en instantes, como el backend (`hasta − desde > 31 días`).
import { Fuente } from "../constants/enums.js";
import { addDays, dateRangeToInstants, isDateOnly, todayInZone } from "./fechas.js";
import { ID_KEYS, isPositiveId } from "./trazabilidadLink.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 31;
export const DEFAULT_RANGE_DAYS = 7;

export const MSG = {
  rango_obligatorio: "Elegí un rango de fechas, o una ocupación, un pago o una sesión de caja.",
  rango_incompleto: "Completá las dos fechas: desde y hasta van juntas.",
  rango_invertido: "La fecha hasta no puede ser anterior a la fecha desde.",
  rango_excede: "El rango máximo es de 31 días.",
  id_invalido: "Tiene que ser un número entero mayor que cero.",
  fecha_invalida: "La fecha no es válida.",
};

const FUENTES = Object.values(Fuente);

const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Filtros vacíos, con la forma que usa el formulario. */
export function emptyFiltros() {
  return { ocupacionId: "", pagoId: "", cajaSesionId: "", usuarioId: "", fuente: [], desde: "", hasta: "" };
}

/**
 * Rango por defecto: los últimos 7 días de calendario, incluido hoy, en la zona del tenant.
 * @param {string} timeZone
 * @param {Date} [now] para probar
 */
export function defaultFiltros(timeZone, now = new Date()) {
  const hasta = todayInZone(timeZone, now);
  return { ...emptyFiltros(), desde: addDays(hasta, -(DEFAULT_RANGE_DAYS - 1)), hasta };
}

/** ¿Hay una ocupación, un pago o una sesión de caja elegidos? (con ellos el backend no exige rango). */
export function hasObjeto(filtros) {
  return ["ocupacionId", "pagoId", "cajaSesionId"].some((k) => !isEmpty(filtros?.[k]));
}

/**
 * Valida los filtros del formulario.
 * @param {object} filtros ids (número o texto), `fuente` (arreglo), `desde` y `hasta` (DateOnly o "")
 * @param {string} timeZone
 * @returns {{ ok: boolean, errors: Record<string, { code: string, message: string }> }}
 *   `errors` por campo (`ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId`, `desde`, `hasta` o `rango`).
 */
export function validateFiltros(filtros, timeZone) {
  const f = filtros ?? {};
  const errors = {};
  const fail = (campo, code) => {
    errors[campo] = { code, message: MSG[code] };
  };

  for (const key of ID_KEYS) {
    if (!isEmpty(f[key]) && !isPositiveId(f[key])) fail(key, "id_invalido");
  }

  const hayDesde = !isEmpty(f.desde);
  const hayHasta = !isEmpty(f.hasta);
  const objeto = hasObjeto(f);

  if (hayDesde !== hayHasta) {
    fail(hayDesde ? "hasta" : "desde", "rango_incompleto");
  } else if (hayDesde && hayHasta) {
    if (!isDateOnly(f.desde)) fail("desde", "fecha_invalida");
    if (!isDateOnly(f.hasta)) fail("hasta", "fecha_invalida");
    if (!errors.desde && !errors.hasta) {
      if (f.desde > f.hasta) {
        fail("hasta", "rango_invertido");
      } else if (!objeto) {
        const r = dateRangeToInstants(f.desde, f.hasta, timeZone);
        if (Date.parse(r.hasta) - Date.parse(r.desde) > MAX_RANGE_DAYS * DAY_MS) fail("hasta", "rango_excede");
      }
    }
  } else if (!objeto) {
    fail("rango", "rango_obligatorio");
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Parámetros para `listTrazabilidad`: ids como números, `fuente` como arreglo (sin la clave si no hay
 * ninguna), `desde` y `hasta` como instantes con Z (inclusivo). Sin las dos fechas, no trae ninguna.
 * Se llama con filtros ya validados; la paginación la agrega la pantalla.
 */
export function toApiParams(filtros, timeZone) {
  const f = filtros ?? {};
  const params = {};
  for (const key of ID_KEYS) {
    if (isPositiveId(f[key])) params[key] = Number(String(f[key]).trim());
  }
  const fuente = [...new Set((f.fuente ?? []).map((x) => String(x).trim().toUpperCase()))].filter((x) =>
    FUENTES.includes(x),
  );
  if (fuente.length > 0) params.fuente = fuente;
  if (!isEmpty(f.desde) && !isEmpty(f.hasta)) {
    const { desde, hasta } = dateRangeToInstants(f.desde, f.hasta, timeZone);
    params.desde = desde;
    params.hasta = hasta;
  }
  return params;
}
