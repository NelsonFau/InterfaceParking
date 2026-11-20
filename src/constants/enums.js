// Enums del backend (D-FB11). Fuente de valores: docs/inventario/backend.md, sección 2.
// Se envían y reciben como enteros. `defineEnum` acepta valores numéricos o de texto, para
// sumar más adelante los enums de string (Fuente, AccionTrazabilidad; spec 04) con la misma forma.
// Los valores retirados del backend NO se declaran (RolUsuario sin el 2, TipoAlertaOperativa sin el 4).

const REGISTRY = new WeakMap();

/**
 * Declara un enum. La constante expone sus claves como valores (`TipoOcupacion.HORA === 1`)
 * y guarda por entrada `{ key, value, label, color?, calculado?, dinero? }`.
 *
 * @param {string} nombre Para mensajes de error.
 * @param {Record<string, { value: number | string, label: string, color?: string, calculado?: boolean, dinero?: boolean }>} entradas
 */
export function defineEnum(nombre, entradas) {
  const constante = {};
  const lista = [];
  const vistos = new Set();
  for (const [key, def] of Object.entries(entradas)) {
    const { value, label } = def;
    const tipoValido =
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && value !== "");
    if (!tipoValido) throw new TypeError(`${nombre}.${key}: value debe ser un número o un texto no vacío`);
    if (typeof label !== "string" || label === "") throw new TypeError(`${nombre}.${key}: falta label`);
    if (vistos.has(value)) throw new RangeError(`${nombre}: valor duplicado ${String(value)}`);
    vistos.add(value);
    constante[key] = value;
    lista.push(Object.freeze({ key, ...def }));
  }
  REGISTRY.set(constante, Object.freeze(lista));
  return Object.freeze(constante);
}

/** Entradas `{ key, value, label, color?, calculado?, dinero? }` de un enum, en orden de declaración. */
export function entriesOf(E) {
  return REGISTRY.get(E) ?? [];
}

const findByValue = (E, value) => entriesOf(E).find((e) => e.value === value);

/** Etiqueta. Valor desconocido (por ejemplo, retirado) → `String(value)`. `null`/`undefined` → `""`. */
export function labelOf(E, value) {
  if (value === null || value === undefined) return "";
  return findByValue(E, value)?.label ?? String(value);
}

/** Color de MUI. Sin color o desconocido → `"default"`. */
export function colorOf(E, value) {
  return findByValue(E, value)?.color ?? "default";
}

/** Etiqueta desde el nombre en texto (el `rol` de `/me`). Solo para mostrar, nunca para decidir (ARQ-4). */
export function labelOfKey(E, key) {
  if (key === null || key === undefined) return "";
  return entriesOf(E).find((e) => e.key === key)?.label ?? String(key);
}

/**
 * Lista `{ value, label }` para un `<TextField select>`.
 * `only` y `exclude` son listas de claves; `allLabel` agrega `{ value: "", label: allLabel }` al principio.
 */
export function optionsOf(E, { only, exclude, excludeCalculated, allLabel } = {}) {
  const opciones = entriesOf(E)
    .filter((e) => !only || only.includes(e.key))
    .filter((e) => !exclude || !exclude.includes(e.key))
    .filter((e) => !(excludeCalculated && e.calculado))
    .map(({ value, label }) => ({ value, label }));
  return allLabel ? [{ value: "", label: allLabel }, ...opciones] : opciones;
}

export const TipoOcupacion = defineEnum("TipoOcupacion", {
  HORA: { value: 1, label: "Hora" },
  DIA: { value: 2, label: "Día" },
  MES: { value: 3, label: "Mes" },
});

export const EstadoOcupacion = defineEnum("EstadoOcupacion", {
  ACTIVA: { value: 1, label: "Activa", color: "success" },
  VENCIDA: { value: 2, label: "Vencida", color: "warning", calculado: true },
  CANCELADA: { value: 3, label: "Cancelada", color: "default" },
  FINALIZADA: { value: 4, label: "Finalizada", color: "info" },
});

export const EstadoCochera = defineEnum("EstadoCochera", {
  DISPONIBLE: { value: 1, label: "Disponible", color: "success" },
  BLOQUEADA: { value: 2, label: "Bloqueada", color: "error" },
  OCUPADA: { value: 3, label: "Ocupada", color: "oc", calculado: true },
  RESERVADA: { value: 4, label: "Reservada", color: "info", calculado: true },
});

export const MetodoPago = defineEnum("MetodoPago", {
  EFECTIVO: { value: 1, label: "Efectivo" },
  TRANSFERENCIA: { value: 2, label: "Transferencia" },
  TARJETA: { value: 3, label: "Tarjeta" },
  OTRO: { value: 4, label: "Otro" },
});

export const EstadoPago = defineEnum("EstadoPago", {
  PAGADO: { value: 1, label: "Pagado", color: "success" },
  ANULADO: { value: 2, label: "Anulado", color: "default" },
});

export const RolUsuario = defineEnum("RolUsuario", {
  DUENO: { value: 1, label: "Dueño" },
  ENCARGADO: { value: 3, label: "Encargado" },
  OPERADOR: { value: 4, label: "Operador" },
  AUDITOR: { value: 5, label: "Auditor" },
  SUPERADMIN: { value: 6, label: "Superadmin" },
});

export const ModoCaja = defineEnum("ModoCaja", {
  DIARIA: { value: 1, label: "Diaria" },
  TURNO: { value: 2, label: "Por turno" },
});

export const ModoMes = defineEnum("ModoMes", {
  CALENDARIO: { value: 1, label: "Calendario" },
  CORRIDO: { value: 2, label: "Corrido" },
  BLOQUES_30: { value: 3, label: "Bloques de 30 días" },
});

export const FraccionMes = defineEnum("FraccionMes", {
  COMPLETO: { value: 1, label: "Completo" },
  PROPORCIONAL: { value: 2, label: "Proporcional" },
});

export const ResolucionExcedente = defineEnum("ResolucionExcedente", {
  COBRAR_COMPLETO: { value: 1, label: "Cobrar completo" },
  DEVOLVER: { value: 2, label: "Devolver" },
});

export const EstadoCajaSesion = defineEnum("EstadoCajaSesion", {
  ABIERTA: { value: 1, label: "Abierta", color: "success" },
  CERRADA: { value: 2, label: "Cerrada", color: "default" },
});

export const TipoEventoCaja = defineEnum("TipoEventoCaja", {
  APERTURA: { value: 1, label: "Apertura" },
  CIERRE: { value: 2, label: "Cierre" },
  REAPERTURA: { value: 3, label: "Reapertura" },
});

export const TipoMovimientoCaja = defineEnum("TipoMovimientoCaja", {
  COBRO: { value: 1, label: "Cobro", color: "success" },
  ANULACION: { value: 2, label: "Anulación", color: "default" },
  DEVOLUCION: { value: 3, label: "Devolución", color: "warning" },
});

export const SeveridadAlerta = defineEnum("SeveridadAlerta", {
  BAJA: { value: 1, label: "Baja", color: "info" },
  MEDIA: { value: 2, label: "Media", color: "warning" },
  ALTA: { value: 3, label: "Alta", color: "error" },
  CRITICA: { value: 4, label: "Crítica", color: "error" },
});

export const TipoAlertaOperativa = defineEnum("TipoAlertaOperativa", {
  OCUPACION_VENCIDA_SIN_PAGO: { value: 1, label: "Ocupación vencida sin pago" },
  OCUPACION_VENCIDA_SIN_CIERRE: { value: 2, label: "Ocupación vencida sin cierre" },
  TARIFA_EXCEPCIONAL: { value: 3, label: "Tarifa excepcional" },
  OCUPACION_FINALIZADA_SIN_PAGO: { value: 5, label: "Ocupación finalizada sin pago", dinero: true },
  PAGO_MENOR_AL_ESPERADO: { value: 6, label: "Pago menor al esperado", dinero: true },
  PAGO_REGISTRADO_TARDE: { value: 7, label: "Pago registrado tarde", dinero: true },
  DEVOLUCION_PENDIENTE: { value: 8, label: "Devolución pendiente", dinero: true },
  DIFERENCIA_DE_CAJA: { value: 9, label: "Diferencia de caja", dinero: true },
  CAJA_SIN_CERRAR: { value: 10, label: "Caja sin cerrar" },
  FONDO_DISTINTO: { value: 11, label: "Fondo distinto", dinero: true },
  MENSUAL_IMPAGO: { value: 12, label: "Mensual impago", dinero: true },
});

// Enums de string de Trazabilidad (spec 04, D-FD4). El `value` es el texto canónico en mayúsculas:
// la pantalla normaliza lo que manda el backend con `canonicalKey` (trazabilidadEvento.js) antes de
// llamar a `labelOf` / `colorOf` (el backend manda `Finalizar`, con F mayúscula y el resto en minúscula).
export const Fuente = defineEnum("Fuente", {
  AUDITORIA: { value: "AUDITORIA", label: "Auditoría", color: "info" },
  PAGO: { value: "PAGO", label: "Pago", color: "success" },
  DEVOLUCION: { value: "DEVOLUCION", label: "Devolución", color: "warning" },
  CAJA: { value: "CAJA", label: "Caja", color: "secondary" },
  ALERTA: { value: "ALERTA", label: "Alerta", color: "error" },
});

export const AccionTrazabilidad = defineEnum("AccionTrazabilidad", {
  // AUDITORIA
  CREAR: { value: "CREAR", label: "Crear", color: "success" },
  EDITAR: { value: "EDITAR", label: "Editar", color: "info" },
  CANCELAR: { value: "CANCELAR", label: "Cancelar", color: "warning" },
  FINALIZAR: { value: "FINALIZAR", label: "Finalizar", color: "info" },
  INVITAR: { value: "INVITAR", label: "Invitar usuario" },
  CAMBIAR_ROL: { value: "CAMBIAR_ROL", label: "Cambio de rol" },
  DESACTIVAR: { value: "DESACTIVAR", label: "Desactivar", color: "warning" },
  REACTIVAR: { value: "REACTIVAR", label: "Reactivar", color: "success" },
  REENVIAR_INVITACION: { value: "REENVIAR_INVITACION", label: "Reenvío de invitación" },
  BORRAR: { value: "BORRAR", label: "Borrar", color: "error" },
  AJUSTAR_PRECIO: { value: "AJUSTAR_PRECIO", label: "Ajuste de precio", color: "warning" },
  PROGRAMAR_BAJA: { value: "PROGRAMAR_BAJA", label: "Baja programada", color: "warning" },
  // PAGO
  PAGADO: { value: "PAGADO", label: "Pago registrado", color: "success" },
  ANULADO: { value: "ANULADO", label: "Pago anulado", color: "error" },
  // DEVOLUCION
  DEVOLUCION: { value: "DEVOLUCION", label: "Devolución", color: "warning" },
  // CAJA
  APERTURA: { value: "APERTURA", label: "Apertura de caja" },
  CIERRE: { value: "CIERRE", label: "Cierre de caja" },
  REAPERTURA: { value: "REAPERTURA", label: "Reapertura de caja" },
  // ALERTA
  RESOLUCION: { value: "RESOLUCION", label: "Alerta resuelta", color: "success" },
  RESOLUCION_AUTOMATICA: { value: "RESOLUCION_AUTOMATICA", label: "Alerta resuelta automáticamente" },
});
