// Limpieza de las claves del login propio que quedaron en localStorage (D-FA12).
// Un navegador que usó la versión vieja conserva ahí un JWT: es la exposición que ARQ-1 quiere eliminar.
// Es el ÚNICO archivo de src/ que toca localStorage, y solo para borrar. Se retira con P-FA7.
/* eslint-disable no-restricted-globals -- excepción justificada: solo borra las claves viejas (D-FA12) */

const LEGACY_KEYS = ["token", "userId", "userName", "userRole"];

export function cleanLegacySession() {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // El acceso a localStorage puede estar bloqueado (modo privado, políticas del navegador): no hay nada que limpiar.
  }
}
