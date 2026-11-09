// Lógica pura de permisos (D-FA7, ARQ-4). La UI decide por permisos, nunca por rol.

export function can(permisos, permiso) {
  return Array.isArray(permisos) && permisos.includes(permiso);
}

export function canAny(permisos, lista) {
  return Array.isArray(lista) && lista.some((permiso) => can(permisos, permiso));
}
