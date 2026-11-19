// Lógica pura de la pantalla de Usuarios (spec 12, D-FL13). Sin React, sin estado y sin leer la fecha del sistema.
// Nunca se decide por rol (ARQ-4): los roles invitables son una lista de valores, no una condición sobre `me`.
import { RolUsuario } from "../constants/enums.js";

export const MAX_NOMBRE = 120;
export const MAX_EMAIL = 200;

export const MSG_NOMBRE_OBLIGATORIO = "Ingresá el nombre";
export const MSG_NOMBRE_LARGO = `El nombre no puede superar ${MAX_NOMBRE} caracteres`;
export const MSG_EMAIL_OBLIGATORIO = "Ingresá el email";
export const MSG_EMAIL_INVALIDO = "El email no es válido";
export const MSG_EMAIL_LARGO = `El email no puede superar ${MAX_EMAIL} caracteres`;
export const MSG_ROL_OBLIGATORIO = "Elegí un rol";

/** Claves de `RolUsuario` que se pueden invitar o asignar (el backend rechaza SUPERADMIN y el 2 con 400). */
export const ROLES_INVITABLES_KEYS = ["DUENO", "ENCARGADO", "OPERADOR", "AUDITOR"];

/** Valores enteros de los roles invitables: 1, 3, 4 y 5. */
export const ROLES_INVITABLES = ROLES_INVITABLES_KEYS.map((k) => RolUsuario[k]);

// Chequeo liviano `algo@algo.algo`; el backend es la autoridad.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Entero (número o texto de dígitos) o null.
function toRol(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/**
 * Valida el formulario de invitación (D-FL5) y arma el cuerpo de `POST /Usuarios`.
 * @param {{ nombre?: string, email?: string, rol?: number|string|null }} form
 * @returns {{ ok: true, body: { nombre: string, email: string, rol: number } }
 *   | { ok: false, errors: { nombre?: string, email?: string, rol?: string } }}
 */
export function validateInvitacion({ nombre, email, rol } = {}) {
  const errors = {};

  const n = String(nombre ?? "").trim();
  if (n === "") errors.nombre = MSG_NOMBRE_OBLIGATORIO;
  else if (n.length > MAX_NOMBRE) errors.nombre = MSG_NOMBRE_LARGO;

  const e = String(email ?? "").trim();
  if (e === "") errors.email = MSG_EMAIL_OBLIGATORIO;
  else if (e.length > MAX_EMAIL) errors.email = MSG_EMAIL_LARGO;
  else if (!EMAIL_RE.test(e)) errors.email = MSG_EMAIL_INVALIDO;

  const r = toRol(rol);
  if (r === null || !ROLES_INVITABLES.includes(r)) errors.rol = MSG_ROL_OBLIGATORIO;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, body: { nombre: n, email: e, rol: r } };
}

// Minúsculas y sin tildes, para comparar y filtrar.
function plain(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Orden de la lista (D-FL4): activos primero, después por nombre sin distinguir mayúsculas ni tildes,
 * desempate por id. No muta el arreglo recibido.
 * @param {{ id: number, nombre: string, activo: boolean }[]} usuarios
 */
export function sortUsuarios(usuarios) {
  return [...usuarios].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    const porNombre = String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es", { sensitivity: "base" });
    if (porNombre !== 0) return porNombre;
    return a.id - b.id;
  });
}

/**
 * Filtro local (D-FL4): subcadena en nombre o email, sin distinguir mayúsculas ni tildes, y opcionalmente
 * sin los desactivados.
 * @param {{ nombre: string, email: string, activo: boolean }[]} usuarios
 * @param {{ texto?: string, mostrarDesactivados?: boolean }} filtros
 */
export function filterUsuarios(usuarios, { texto = "", mostrarDesactivados = true } = {}) {
  const t = plain(texto.trim());
  return usuarios.filter((u) => {
    if (!mostrarDesactivados && !u.activo) return false;
    if (t === "") return true;
    return plain(u.nombre).includes(t) || plain(u.email).includes(t);
  });
}

/**
 * Qué acciones corresponden a una fila (D-FL7 a D-FL10). La fila propia no ofrece ninguna de escritura.
 * @param {{ id: number, rol: number, activo: boolean }} usuario
 * @param {{ meId?: number|null, canManage?: boolean }} contexto
 * @returns {{ esPropio: boolean, cambiarRol: boolean, desactivar: boolean, reenviar: boolean, reactivar: boolean }}
 */
export function usuarioRowActions(usuario, { meId = null, canManage = false } = {}) {
  const esPropio = meId !== null && meId !== undefined && usuario.id === meId;
  const ninguna = { esPropio, cambiarRol: false, desactivar: false, reenviar: false, reactivar: false };
  if (!canManage || esPropio) return ninguna;
  if (usuario.activo) {
    return {
      ...ninguna,
      cambiarRol: ROLES_INVITABLES.includes(usuario.rol),
      desactivar: true,
      reenviar: true,
    };
  }
  return { ...ninguna, reactivar: true };
}

/**
 * Datos del resumen de confirmación de "Cambiar rol" (D-FL8).
 * @param {{ nombre: string, rol: number }} usuario
 * @param {number} nuevoRol
 * @returns {{ nombre: string, de: number, a: number, cambia: boolean }}
 */
export function summarizeRoleChange(usuario, nuevoRol) {
  // Es una comparación de valores para mostrar "de X a Y", no una decisión de acceso (ARQ-4).
  const { nombre, rol: de } = usuario;
  return { nombre, de, a: nuevoRol, cambia: nuevoRol !== de };
}

// Códigos después de los cuales lo que ve el usuario quedó viejo: se recarga la lista (D-FL12).
const RELOAD_CODES = new Set([
  "usuario_ya_desactivado",
  "usuario_ya_activo",
  "usuario_no_encontrado",
  "proveedor_identidad_no_disponible",
]);

/** `true` si después de este error de escritura hay que recargar la lista. */
export function shouldReloadAfter(code) {
  return RELOAD_CODES.has(code);
}
