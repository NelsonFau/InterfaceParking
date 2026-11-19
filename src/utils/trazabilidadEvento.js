// Eventos de Trazabilidad: normalización, resumen y diferencias antes/después (spec 04, D-FD4, D-FD9, D-FD10).
// Módulo puro. Las claves de `detalle` salen del relevamiento del backend (ConsultaDeTrazabilidad.cs, `Armar`).
import { MetodoPago, TipoAlertaOperativa, labelOfKey } from "../constants/enums.js";
import { formatInstant } from "./fechas.js";
import { formatMoney } from "./formato.js";

const SIN_DATO = "—";

/** Clave canónica de `fuente` y `accion`: `Finalizar` → `FINALIZAR`, ` pago ` → `PAGO`. */
export function canonicalKey(s) {
  return String(s ?? "").trim().toUpperCase();
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const hasValue = (v) => v !== undefined && v !== null && v !== "";

// ---------------------------------------------------------------------------
// Etiquetas de claves
// ---------------------------------------------------------------------------

// Claves de `detalle` de CAJA (las ocho que arma el backend) y de PAGO, DEVOLUCION y ALERTA.
const KEY_LABELS = {
  fondoDeclarado: "Fondo declarado",
  fondoQueQuedo: "Fondo que quedó",
  efectivoContado: "Efectivo contado",
  efectivoEsperado: "Efectivo esperado",
  diferencia: "Diferencia",
  fondoSiguiente: "Fondo siguiente",
  observacion: "Observación",
  motivo: "Motivo",
  monto: "Monto",
  metodo: "Método",
  tipo: "Tipo",
  comentario: "Comentario",
};

// De CAJA, solo estas seis son dinero; `observacion` y `motivo` son texto.
const CAJA_MONEY_KEYS = new Set([
  "fondoDeclarado",
  "fondoQueQuedo",
  "efectivoContado",
  "efectivoEsperado",
  "diferencia",
  "fondoSiguiente",
]);

/**
 * Clave legible: usa la etiqueta conocida y, si no, separa camelCase, PascalCase y snake_case
 * (`PrecioTotal` → "Precio total"). Sin acentos inventados: solo los de las claves conocidas.
 */
export function humanizeKey(key) {
  const k = String(key ?? "");
  if (KEY_LABELS[k]) return KEY_LABELS[k];
  const texto = k
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

// ---------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------

// Un instante UTC con Z. Uno sin zona no se convierte: no se adivina en qué zona está.
const UTC_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/**
 * Valor de `antes` o `despues` para mostrar. `null` → "—", booleano → "Sí"/"No", instante con Z → fecha y
 * hora con segundos en la zona del tenant, objeto o arreglo → JSON compacto, lo demás tal cual.
 * No se interpreta el significado de un número (un enum entero se ve como entero).
 */
export function formatValor(valor, timeZone) {
  if (valor === null || valor === undefined) return SIN_DATO;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string") {
    return timeZone && UTC_INSTANT_RE.test(valor) ? formatInstant(valor, timeZone, { seconds: true }) : valor;
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

// ---------------------------------------------------------------------------
// Diferencias (AUDITORIA)
// ---------------------------------------------------------------------------

// JSON con las claves ordenadas, para comparar valores anidados sin depender del orden.
function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (isPlainObject(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/**
 * Diferencias de primer nivel entre `antes` y `despues`. Claves en el orden de `despues` y después las
 * que solo estaban en `antes`. Los valores anidados se comparan enteros.
 * `antes` nulo: todo "agregado"; `despues` nulo: todo "quitado"; los dos nulos: sin filas.
 * @returns {{ campo: string, antes: unknown, despues: unknown, estado: "cambiado"|"igual"|"agregado"|"quitado" }[]}
 */
export function diffAntesDespues(antes, despues) {
  const a = isPlainObject(antes) ? antes : null;
  const d = isPlainObject(despues) ? despues : null;
  if (!a && !d) return [];
  if (!a) return Object.keys(d).map((campo) => ({ campo, antes: null, despues: d[campo], estado: "agregado" }));
  if (!d) return Object.keys(a).map((campo) => ({ campo, antes: a[campo], despues: null, estado: "quitado" }));

  const filas = Object.keys(d).map((campo) => {
    if (!(campo in a)) return { campo, antes: null, despues: d[campo], estado: "agregado" };
    const igual = stableStringify(a[campo]) === stableStringify(d[campo]);
    return { campo, antes: a[campo], despues: d[campo], estado: igual ? "igual" : "cambiado" };
  });
  for (const campo of Object.keys(a)) {
    if (!(campo in d)) filas.push({ campo, antes: a[campo], despues: null, estado: "quitado" });
  }
  return filas;
}

/**
 * Detalle de un evento de AUDITORIA: `{ modo: "texto", antes, despues }` si el backend no pudo parsear
 * alguno de los dos JSON (trae `antesTexto` o `despuesTexto`: se muestran tal cual), o
 * `{ modo: "diff", filas }` en los demás casos.
 */
export function auditoriaDetalle(detalle) {
  const d = isPlainObject(detalle) ? detalle : {};
  if (hasValue(d.antesTexto) || hasValue(d.despuesTexto)) {
    const lado = (texto, obj) =>
      hasValue(texto) ? String(texto) : isPlainObject(obj) ? JSON.stringify(obj, null, 2) : null;
    return { modo: "texto", antes: lado(d.antesTexto, d.antes), despues: lado(d.despuesTexto, d.despues) };
  }
  return { modo: "diff", filas: diffAntesDespues(d.antes, d.despues) };
}

// ---------------------------------------------------------------------------
// Pares campo/valor y resumen
// ---------------------------------------------------------------------------

/**
 * Pares `{ clave, etiqueta, valor }` del `detalle` de PAGO, DEVOLUCION, CAJA y ALERTA, listos para mostrar
 * (dinero con `formatMoney`, método y tipo con su etiqueta). Omite los valores vacíos.
 * AUDITORIA no usa pares: ver `auditoriaDetalle`.
 */
export function detallePares(evento, timeZone) {
  const fuente = canonicalKey(evento?.fuente);
  const detalle = isPlainObject(evento?.detalle) ? evento.detalle : {};
  const par = (clave, valor) => ({ clave, etiqueta: humanizeKey(clave), valor });
  const pares = [];

  if (fuente === "PAGO" || fuente === "DEVOLUCION") {
    if (hasValue(detalle.monto)) pares.push(par("monto", formatMoney(detalle.monto)));
    if (hasValue(detalle.metodo)) {
      pares.push(par("metodo", labelOfKey(MetodoPago, canonicalKey(detalle.metodo)) || String(detalle.metodo)));
    }
    if (hasValue(detalle.motivo)) pares.push(par("motivo", String(detalle.motivo)));
  } else if (fuente === "ALERTA") {
    if (hasValue(detalle.tipo)) {
      pares.push(par("tipo", labelOfKey(TipoAlertaOperativa, canonicalKey(detalle.tipo)) || String(detalle.tipo)));
    }
    if (hasValue(detalle.comentario)) pares.push(par("comentario", String(detalle.comentario)));
  } else {
    for (const [clave, valor] of Object.entries(detalle)) {
      if (!hasValue(valor)) continue;
      const texto =
        fuente === "CAJA" && CAJA_MONEY_KEYS.has(clave) ? formatMoney(valor) : formatValor(valor, timeZone);
      pares.push(par(clave, texto));
    }
  }
  return pares;
}

/**
 * Resumen de una línea de un evento (columna "Resumen" de la tabla).
 * PAGO y DEVOLUCION: `$ 1.200,00 · Efectivo · motivo`. ALERTA: `Tipo · comentario`. CAJA: `Etiqueta: valor · …`.
 * AUDITORIA: `N campo(s) modificado(s)`, "Alta" (sin `antes`) o "Baja" (sin `despues`).
 */
export function resumenDeEvento(evento) {
  const fuente = canonicalKey(evento?.fuente);
  const detalle = isPlainObject(evento?.detalle) ? evento.detalle : {};

  if (fuente === "AUDITORIA") {
    const aud = auditoriaDetalle(detalle);
    if (aud.modo === "texto") return "Datos sin interpretar";
    const tieneAntes = isPlainObject(detalle.antes);
    const tieneDespues = isPlainObject(detalle.despues);
    if (!tieneAntes && !tieneDespues) return "Sin datos";
    if (!tieneAntes) return "Alta";
    if (!tieneDespues) return "Baja";
    const n = aud.filas.filter((f) => f.estado !== "igual").length;
    if (n === 0) return "Sin cambios";
    return `${n} ${n === 1 ? "campo modificado" : "campos modificados"}`;
  }

  const pares = detallePares(evento, null);
  if (fuente === "CAJA") return pares.map((p) => `${p.etiqueta}: ${p.valor}`).join(" · ");
  return pares.map((p) => p.valor).join(" · ");
}
