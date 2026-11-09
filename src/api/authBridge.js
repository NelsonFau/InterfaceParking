// Puente entre el cliente HTTP (que no es de React) y el SDK de Auth0 (que sí lo es) (D-FA5).
// Un componente hijo de AuthProvider (MeProvider) registra cuatro funciones; http.js las usa sin conocer React.

// Comparte una sola ejecución de `fn` entre llamadas concurrentes (en la spec, `compartirPromesa`).
// Mientras la promesa está pendiente, toda llamada recibe la misma; cuando termina (bien o mal), la
// siguiente llamada vuelve a ejecutar `fn`. Con Refresh Token Rotation, dos renovaciones simultáneas con
// el mismo refresh token dispararían la detección de reuso y revocarían la sesión.
export function sharePromise(fn) {
  let pending = null;
  return function shared() {
    if (!pending) {
      pending = Promise.resolve()
        .then(fn)
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}

const noHandlers = {
  getToken: null,
  refreshToken: null,
  onSessionLost: null,
  onAccountBlocked: null,
};

let handlers = noHandlers;

// Registra las funciones del SDK. Devuelve la función que las retira (para el cleanup del efecto).
export function registerAuthBridge(next) {
  handlers = { ...noHandlers, ...next };
  return () => {
    if (handlers.getToken === next.getToken) handlers = noHandlers;
  };
}

// Token vigente (de la caché en memoria del SDK, o renovado si venció). Falla si el SDK no puede darlo.
export async function getToken() {
  if (!handlers.getToken) throw new Error("El puente de autenticación no está registrado.");
  return handlers.getToken();
}

// Fuerza la renovación del token. Una sola renovación en curso, compartida por todos los pedidos.
export const refreshToken = sharePromise(async () => {
  if (!handlers.refreshToken) throw new Error("El puente de autenticación no está registrado.");
  return handlers.refreshToken();
});

// Sesión perdida: lleva a /login con el aviso, sin redirigir sola a Auth0 (D-FA9). Debe ser idempotente.
export function sessionLost() {
  handlers.onSessionLost?.();
}

// Cuenta bloqueada (403 usuario_no_registrado, usuario_inactivo o tenant_inactivo): recibe el ApiError.
export function accountBlocked(apiError) {
  handlers.onAccountBlocked?.(apiError);
}
