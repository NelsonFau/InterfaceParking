// Lógica pura de la pantalla de Configuración (spec 11, D-FK6 a D-FK12). Sin React ni estado.
// Los rangos y los textos de ayuda salen de docs/inventario/backend.md, sección `/Configuracion`.

/** Rangos del backend (ConfiguracionTenant.cs). `ventanaAlertasDias` es solo informativo. */
export const CONFIG_LIMITS = {
  toleranciaInicioHoras: { min: 0, max: 168 },
  topePasadoDias: { min: 1, max: 3650 },
  techoFuturoMeses: { min: 1, max: 24 },
  graciaHoraMinutos: { min: 0, max: 59 },
  diasGraciaMora: { min: 0, max: 60 },
  ventanaAlertasDias: { min: 7, max: 90 },
};

/** Campos numéricos editables, en el orden del formulario. */
export const NUMERIC_FIELDS = ["toleranciaInicioHoras", "topePasadoDias", "techoFuturoMeses", "graciaHoraMinutos", "diasGraciaMora"];

/** Selects opcionales del PUT (enteros). */
const ENUM_OPTIONAL_FIELDS = ["modoMes", "fraccionMes"];

/** Todos los campos del formulario, para comparar contra el original. */
const OPTIONAL_FIELDS = [
  "toleranciaInicioHoras",
  "topePasadoDias",
  "techoFuturoMeses",
  "modoMes",
  "fraccionMes",
  "graciaHoraMinutos",
  "diasGraciaMora",
];

/** Ayuda de cada campo (D-FK11). Los rangos tienen que coincidir con CONFIG_LIMITS (hay un test). */
export const CONFIG_AYUDA = {
  zonaHoraria:
    "Zona horaria del local. Con ella se calculan los días del local (por ejemplo, el día de una caja) y se muestran todas las fechas y horas. No se puede cambiar con una caja abierta.",
  modoCaja:
    "Diaria: una caja por día, que se abre sola con el primer movimiento. Por turno: la caja se abre y se cierra a mano, y sin caja abierta no se puede cobrar, anular ni devolver. No se puede cambiar con una caja abierta.",
  toleranciaInicioHoras:
    "Horas hacia atrás desde ahora en las que se puede registrar el inicio de una ocupación sin permiso especial. Un inicio más viejo es retroactivo y exige permiso y motivo. De 0 a 168.",
  topePasadoDias: "Máximo de días hacia atrás para el inicio de una ocupación, para todos los roles. De 1 a 3650.",
  techoFuturoMeses:
    "Máximo de meses hacia adelante para el inicio de una ocupación. No limita el fin ni las tarifas. De 1 a 24.",
  graciaHoraMinutos:
    "Solo en ocupaciones por hora: minutos de tolerancia sobre la última fracción antes de cobrar otra hora. Con 10, 1 h 05 paga 1 hora y 1 h 15 paga 2. De 0 a 59.",
  modoMes:
    "Cómo se arman los períodos de un contrato mensual. Calendario: del 1 al fin de cada mes. Corrido: el mismo día y hora de cada mes. Bloques de 30 días: cada 30 días desde el inicio. Afecta solo a los contratos nuevos.",
  fraccionMes:
    "Cómo se cobra un período incompleto. Completo: el período entero. Proporcional: los días cubiertos sobre los días del período, redondeado al peso entero. Aplica al primer período si el contrato empieza a mitad y al último si hay baja anticipada. Afecta solo a los contratos nuevos.",
  diasGraciaMora:
    "Días desde el inicio de un período impago de un contrato mensual activo antes de considerarlo en mora y generar la alerta. No afecta nada más. De 0 a 60.",
  ventanaAlertasDias:
    "Cuántos días hacia atrás revisa el proceso horario de alertas. No se puede cambiar desde acá: lo configura la plataforma. Entre 7 y 90 días.",
};

const INTEGER_RE = /^\d+$/;

const isBlank = (v) => v === "" || v === null || v === undefined;

/** Pasa un valor del formulario a su forma comparable: un entero escrito como texto pasa a número. */
function normalize(v) {
  if (typeof v === "string") {
    const t = v.trim();
    return INTEGER_RE.test(t) ? Number(t) : t;
  }
  return v;
}

/** Arma el borrador inicial desde la configuración del servidor (los números pasan a texto para los inputs). */
export function toForm(config) {
  const form = { ...config };
  for (const f of NUMERIC_FIELDS) form[f] = String(config[f]);
  return form;
}

/**
 * Valida el borrador. Devuelve `{ ok: true, values }` (números ya convertidos) o `{ ok: false, errors }`
 * con un mensaje por campo.
 */
export function validateConfiguracionForm(form) {
  const errors = {};
  const values = {};

  if (isBlank(form.zonaHoraria)) errors.zonaHoraria = "Elegí una zona horaria";
  if (isBlank(form.modoCaja)) errors.modoCaja = "Elegí un modo de caja";
  for (const f of ENUM_OPTIONAL_FIELDS) {
    if (isBlank(form[f])) errors[f] = "Elegí una opción";
  }

  for (const f of NUMERIC_FIELDS) {
    const { min, max } = CONFIG_LIMITS[f];
    const raw = typeof form[f] === "number" ? String(form[f]) : String(form[f] ?? "").trim();
    if (!INTEGER_RE.test(raw)) {
      errors[f] = "Ingresá un número entero";
      continue;
    }
    const n = Number(raw);
    if (n < min || n > max) {
      errors[f] = `Tiene que estar entre ${min} y ${max}`;
      continue;
    }
    values[f] = n;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}

/** Campos opcionales que cambiaron respecto del original (`{ campo: valorNuevo }`). `{}` si nada cambió. */
export function diffConfiguracion(original, form) {
  const diff = {};
  if (normalize(form.zonaHoraria) !== original.zonaHoraria) diff.zonaHoraria = normalize(form.zonaHoraria);
  if (normalize(form.modoCaja) !== original.modoCaja) diff.modoCaja = normalize(form.modoCaja);
  for (const f of OPTIONAL_FIELDS) {
    if (normalize(form[f]) !== original[f]) diff[f] = normalize(form[f]);
  }
  return diff;
}

/**
 * Cuerpo del PUT: `zonaHoraria`, `modoCaja` y `version` siempre (la versión tal cual vino) y, de los
 * opcionales, solo los que cambiaron. Nunca lleva `ventanaAlertasDias`.
 */
export function buildUpdateBody(original, form) {
  const body = {
    zonaHoraria: form.zonaHoraria,
    modoCaja: normalize(form.modoCaja),
    version: original.version,
  };
  for (const f of OPTIONAL_FIELDS) {
    const v = normalize(form[f]);
    if (v !== original[f]) body[f] = v;
  }
  return body;
}

/**
 * Cambios que piden confirmación (D-FK8): `{ zona?, modoCaja?, modoMes?, fraccionMes? }`, cada uno `{ de, a }`.
 * `{}` si no cambió ninguno de los cuatro.
 */
export function summarizeChanges(original, form) {
  const out = {};
  const pairs = [
    ["zona", "zonaHoraria"],
    ["modoCaja", "modoCaja"],
    ["modoMes", "modoMes"],
    ["fraccionMes", "fraccionMes"],
  ];
  for (const [key, campo] of pairs) {
    const a = normalize(form[campo]);
    if (a !== original[campo]) out[key] = { de: original[campo], a };
  }
  return out;
}

/** Qué hace la pantalla después de un error del PUT (D-FK9). Nunca recarga sola. */
export function afterSaveError(code) {
  return { ofrecerRecargar: code === "configuracion_modificada" };
}
