// Acceso al estado de /me y a los permisos del usuario (D-FA7).
import { createContext, useContext, useMemo } from "react";
import { can, canAny } from "./permissions.js";

export const ME_STATUS = {
  LOADING: "cargando",
  READY: "listo",
  BLOCKED: "bloqueado",
  ERROR: "error",
};

// Valor: { status, me, error, reload }. Lo provee MeProvider.
export const MeContext = createContext(null);

export function useMe() {
  const value = useContext(MeContext);
  if (!value) throw new Error("useMe se usa dentro de MeProvider.");
  return value;
}

// `rol` es solo texto para mostrar: nunca se usa para decidir (ARQ-4; lo bloquea el lint).
export function usePermissions() {
  const { me } = useMe();
  return useMemo(() => {
    const permisos = me?.permisos ?? [];
    return {
      permisos,
      rol: me?.rol ?? null,
      can: (permiso) => can(permisos, permiso),
      canAny: (lista) => canAny(permisos, lista),
    };
  }, [me]);
}
