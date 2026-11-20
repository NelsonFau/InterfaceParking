// Fechas con la zona del tenant como única zona (spec 02, D-FB2 a D-FB6).
//
// Módulo puro: sin React ni estado. La zona (IANA) es siempre un parámetro
// explícito; no se lee la del navegador ni la del sistema. Tres tipos de fecha:
//   - UtcInstant: ISO 8601 con zona ("2026-11-11T01:30:00.000Z"). Lo que se envía y lo que llega.
//   - LocalInput: "yyyy-MM-ddTHH:mm" (":ss" opcional), valor de un datetime-local.
//   - DateOnly:   "yyyy-MM-dd", sin zona. Se trata siempre como texto, nunca pasa por `Date`.

import { tzOffset } from "@date-fns/tz";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
// Un instante exige zona explícita: sin ella, `Date` lo interpretaría en la zona del sistema.
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export const MSG_HORA_INEXISTENTE =
  "Esa hora no existe en la zona del local por el cambio de horario. Elegí otra.";
export const MSG_FORMATO_INVALIDO = "La fecha y hora no tienen un formato válido.";

const pad = (n, width = 2) => String(n).padStart(width, "0");

// ---------------------------------------------------------------------------
// Zona
// ---------------------------------------------------------------------------

const validZones = new Map();

/** @param {unknown} timeZone @returns {boolean} */
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || timeZone.trim() === "") return false;
  if (validZones.has(timeZone)) return validZones.get(timeZone);
  let ok = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    ok = true;
  } catch {
    ok = false;
  }
  validZones.set(timeZone, ok);
  return ok;
}

function assertZone(timeZone) {
  // No hay vuelta atrás a la zona del navegador: una zona inválida es un error de programación
  // (MeProvider la valida antes de que cualquier pantalla pueda usar el módulo).
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`Zona horaria inválida: ${String(timeZone)}`);
  }
}

/** Desplazamiento de la zona en ms en ese instante (positivo al este de UTC). */
function offsetMs(timeZone, ms) {
  return tzOffset(timeZone, new Date(ms)) * MINUTE_MS;
}

// ---------------------------------------------------------------------------
// Componentes de calendario (todo sobre UTC, nunca sobre la zona del sistema)
// ---------------------------------------------------------------------------

/** ms UTC de los componentes tomados "como si fueran UTC". Soporta años < 100. */
function utcMs(y, mo, d, h = 0, mi = 0, s = 0) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  dt.setUTCHours(h, mi, s, 0);
  return dt.getTime();
}

/** ¿Los componentes forman una fecha y hora reales? */
function isRealDateTime(y, mo, d, h, mi, s) {
  if (h > 23 || mi > 59 || s > 59) return false;
  const dt = new Date(utcMs(y, mo, d, h, mi, s));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d &&
    dt.getUTCHours() === h &&
    dt.getUTCMinutes() === mi &&
    dt.getUTCSeconds() === s
  );
}

function parseDateOnly(value) {
  if (typeof value !== "string") return null;
  const m = DATE_ONLY_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDateTime(y, mo, d, 0, 0, 0) ? { y, mo, d } : null;
}

function parseInstant(value) {
  if (typeof value !== "string" || !INSTANT_RE.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

const formatters = new Map();

function partsFormatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Hora de pared de un instante en la zona. */
function zonedFields(ms, timeZone) {
  const out = {};
  for (const p of partsFormatter(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return {
    year: pad(out.year, 4),
    month: pad(out.month),
    day: pad(out.day),
    // Algunos motores devuelven "24" a medianoche aunque se pida h23.
    hour: out.hour === "24" ? "00" : pad(out.hour),
    minute: pad(out.minute),
    second: pad(out.second),
  };
}

// ---------------------------------------------------------------------------
// Hora de pared -> instante (el núcleo delicado: D-FB5 y D-FB6)
// ---------------------------------------------------------------------------

/**
 * Resuelve una hora de pared (ms "como si fueran UTC") en la zona.
 * @returns {{ valid: number[], gapStart: number }}
 *   `valid`: instantes (ms) que vuelven a mostrar esa hora de pared, ordenados.
 *   `gapStart`: si no hay ninguno (hora inexistente), el primer instante válido posterior.
 */
function resolveWall(wallMs, timeZone) {
  const offsets = [
    ...new Set([offsetMs(timeZone, wallMs - DAY_MS), offsetMs(timeZone, wallMs + DAY_MS)]),
  ];
  const valid = [];
  for (const o of offsets) {
    const candidate = wallMs - o;
    if (offsetMs(timeZone, candidate) === o) valid.push(candidate);
  }
  valid.sort((a, b) => a - b);
  // Sin candidatos válidos el reloj saltó hacia adelante: el instante del salto es
  // `pared − desplazamiento anterior` (el menor), que es el primer instante que existe.
  const gapStart = wallMs - Math.min(...offsets);
  return { valid, gapStart };
}

/**
 * Valor de un `<input type="datetime-local">` -> instante UTC, en la zona del tenant.
 * Hora inexistente -> error; hora repetida -> la primera.
 * @param {string | null | undefined} value
 * @param {string} timeZone
 * @returns {{ ok: true, instant: string | null } | { ok: false, code: "formato_invalido" | "hora_inexistente", message: string }}
 */
export function localInputToInstant(value, timeZone) {
  assertZone(timeZone);
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return { ok: true, instant: null };
  }
  const m = typeof value === "string" ? LOCAL_INPUT_RE.exec(value) : null;
  if (!m) return { ok: false, code: "formato_invalido", message: MSG_FORMATO_INVALIDO };
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
  const s = m[6] === undefined ? 0 : Number(m[6]);
  if (!isRealDateTime(y, mo, d, h, mi, s)) {
    return { ok: false, code: "formato_invalido", message: MSG_FORMATO_INVALIDO };
  }
  const { valid } = resolveWall(utcMs(y, mo, d, h, mi, s), timeZone);
  if (valid.length === 0) {
    return { ok: false, code: "hora_inexistente", message: MSG_HORA_INEXISTENTE };
  }
  return { ok: true, instant: new Date(valid[0]).toISOString() };
}

// ---------------------------------------------------------------------------
// Instante -> texto
// ---------------------------------------------------------------------------

/** `UtcInstant` -> `LocalInput` en la zona. Nulo, vacío o inválido -> "". No es inyectiva en la hora repetida. */
export function instantToInput(instant, timeZone) {
  assertZone(timeZone);
  const ms = parseInstant(instant);
  if (ms === null) return "";
  const f = zonedFields(ms, timeZone);
  return `${f.year}-${f.month}-${f.day}T${f.hour}:${f.minute}`;
}

/** `UtcInstant` -> `dd/MM/yyyy HH:mm` (con `:ss` si `seconds`). Inválido -> el texto recibido tal cual. */
export function formatInstant(instant, timeZone, { seconds = false } = {}) {
  assertZone(timeZone);
  if (instant == null || instant === "") return "";
  const ms = parseInstant(instant);
  if (ms === null) return String(instant);
  const f = zonedFields(ms, timeZone);
  const base = `${f.day}/${f.month}/${f.year} ${f.hour}:${f.minute}`;
  return seconds ? `${base}:${f.second}` : base;
}

/** `UtcInstant` -> `dd/MM/yyyy` del día en la zona. */
export function formatInstantDate(instant, timeZone) {
  assertZone(timeZone);
  if (instant == null || instant === "") return "";
  const ms = parseInstant(instant);
  if (ms === null) return String(instant);
  const f = zonedFields(ms, timeZone);
  return `${f.day}/${f.month}/${f.year}`;
}

/** `UtcInstant` -> `HH:mm` de la hora en la zona (el mosaico de Cocheras muestra solo la hora). */
export function formatInstantTime(instant, timeZone) {
  assertZone(timeZone);
  if (instant == null || instant === "") return "";
  const ms = parseInstant(instant);
  if (ms === null) return String(instant);
  const f = zonedFields(ms, timeZone);
  return `${f.hour}:${f.minute}`;
}

/** `UtcInstant` -> `DateOnly`: el día de calendario que ese instante tiene en la zona. Inválido -> "". */
export function instantToDateOnly(instant, timeZone) {
  assertZone(timeZone);
  const ms = parseInstant(instant);
  if (ms === null) return "";
  const f = zonedFields(ms, timeZone);
  return `${f.year}-${f.month}-${f.day}`;
}

/** `DateOnly` de hoy en la zona. `now` es para probar. */
export function todayInZone(timeZone, now = new Date()) {
  assertZone(timeZone);
  const f = zonedFields(now.getTime(), timeZone);
  return `${f.year}-${f.month}-${f.day}`;
}

// ---------------------------------------------------------------------------
// DateOnly (siempre como texto)
// ---------------------------------------------------------------------------

/** `yyyy-MM-dd` y fecha real. */
export function isDateOnly(value) {
  return parseDateOnly(value) !== null;
}

/** `DateOnly` -> valor de `<input type="date">`: el mismo texto si es válido; si no, "". */
export function dateOnlyToInput(d) {
  return isDateOnly(d) ? d : "";
}

/** Valor de `<input type="date">` -> `DateOnly`, o `null` si está vacío o es inválido. */
export function inputToDateOnly(value) {
  return isDateOnly(value) ? value : null;
}

/** `DateOnly` -> `dd/MM/yyyy`, sin pasar por `Date`. Nulo o vacío -> ""; inválido -> el texto recibido. */
export function formatDateOnly(d) {
  if (d == null || d === "") return "";
  const p = parseDateOnly(d);
  if (!p) return String(d);
  return `${pad(p.d)}/${pad(p.mo)}/${pad(p.y, 4)}`;
}

/** `DateOnly` + `n` días (positivo o negativo) -> `DateOnly`. Lanza `RangeError` si `d` no es válido. */
export function addDays(d, n) {
  const p = parseDateOnly(d);
  if (!p) throw new RangeError(`DateOnly inválido: ${String(d)}`);
  const dt = new Date(utcMs(p.y, p.mo, p.d + n));
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// ---------------------------------------------------------------------------
// Rangos de días en la zona
// ---------------------------------------------------------------------------

/** Primer instante (ms) del día en la zona. Si la medianoche no existe, el primer instante válido. */
function startOfDayMs(d, timeZone) {
  const p = parseDateOnly(d);
  if (!p) throw new RangeError(`DateOnly inválido: ${String(d)}`);
  const { valid, gapStart } = resolveWall(utcMs(p.y, p.mo, p.d), timeZone);
  return valid.length > 0 ? valid[0] : gapStart;
}

/**
 * `DateOnly` -> `{ desde, hasta }` como `UtcInstant`: inicio de ese día e inicio del siguiente ([desde, hasta)).
 */
export function dayToInstantRange(d, timeZone) {
  assertZone(timeZone);
  return {
    desde: new Date(startOfDayMs(d, timeZone)).toISOString(),
    hasta: new Date(startOfDayMs(addDays(d, 1), timeZone)).toISOString(),
  };
}

const isEmptyDay = (d) => d == null || (typeof d === "string" && d.trim() === "");

/**
 * Rango de un filtro "del día A al día B" -> `{ desde, hasta }` como `UtcInstant`.
 * `hasta` = inicio de B+1 menos 1 ms (`inclusiveEnd: true`) o el inicio de B+1 (`false`).
 * Un día vacío o `null` da `null` en su extremo.
 */
export function dateRangeToInstants(desdeDay, hastaDay, timeZone, { inclusiveEnd = true } = {}) {
  assertZone(timeZone);
  const desde = isEmptyDay(desdeDay) ? null : dayToInstantRange(desdeDay, timeZone).desde;
  let hasta = null;
  if (!isEmptyDay(hastaDay)) {
    const next = dayToInstantRange(hastaDay, timeZone).hasta;
    hasta = inclusiveEnd ? new Date(Date.parse(next) - 1).toISOString() : next;
  }
  return { desde, hasta };
}
