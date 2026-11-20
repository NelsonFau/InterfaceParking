// Mapa único de rutas privadas (D-FA8): de acá salen las <Route> y los ítems del menú.
// El permiso de cada ruta sale de la matriz rol × recurso del backend.
import { can } from "./permissions.js";

// Ruta de Trazabilidad (D-FD3, D-FD5): una sola constante para el mapa y para el contrato de enlace.
export const TRAZABILIDAD_PATH = "/trazabilidad";

// Ocupaciones (spec 07, D-FG14): una constante para el mapa y para el contrato de enlace `/ocupaciones?id=N`.
export const OCUPACIONES_PATH = "/ocupaciones";

// Alertas operativas: la ruta la comparten el mapa, alertas.js y los enlaces de Ocupaciones (D-FG15).
export const ALERTAS_PATH = "/alertas-operativas";

// Caja con sesiones (spec 09, D-FI3): una constante para el mapa y para el contrato de enlace `/caja?sesion=N`.
export const CAJA_PATH = "/caja";

// Grupos del menú (spec 13, D-FM9), en el orden en que se muestran.
export const MENU_GROUPS = ["Operación", "Gestión", "Administración"];
const [OPERACION, GESTION, ADMINISTRACION] = MENU_GROUPS;

// El orden de este arreglo es el del menú (grupo por grupo): DV-FM2. `initialRoute` sigue siendo la primera
// accesible y todos los roles reales tienen `panel.ver`, así que la ruta inicial no cambia.
export const PRIVATE_ROUTES = [
  { path: "/dashboard", label: "Dashboard", permiso: "panel.ver", group: OPERACION },
  // P-FA4 cerrado (spec 09, D-FI12): alertas.ver alcanza. Todo rol con alertas.ver tiene caja.ver, y el widget
  // de caja del Monitor se oculta por su cuenta con can("caja.ver"), así que no hace falta exigir los dos.
  { path: "/operaciones", label: "Monitor operativo", permiso: "alertas.ver", group: OPERACION },
  { path: OCUPACIONES_PATH, label: "Ocupaciones", permiso: "ocupaciones.ver", group: OPERACION },
  { path: ALERTAS_PATH, label: "Alertas operativas", permiso: "alertas.ver", group: OPERACION },
  { path: "/cocheras", label: "Cocheras", permiso: "cocheras.ver", group: GESTION },
  { path: "/clientes", label: "Clientes", permiso: "clientes.ver", group: GESTION },
  { path: "/tarifas", label: "Tarifas", permiso: "tarifas.ver", group: GESTION },
  { path: CAJA_PATH, label: "Caja", permiso: "caja.ver", group: GESTION },
  // Spec 12 (D-FL3).
  { path: "/usuarios", label: "Usuarios", permiso: "usuarios.ver", group: ADMINISTRACION },
  { path: TRAZABILIDAD_PATH, label: "Trazabilidad", permiso: "auditoria.ver", group: ADMINISTRACION },
  // Spec 11: pantalla de configuración (contrato de rutas de brechas-front.md).
  { path: "/configuracion", label: "Configuración", permiso: "configuracion.ver", group: ADMINISTRACION },
];

// Rutas a las que el usuario tiene acceso, en el orden del mapa. La primera es la ruta inicial.
export function accessibleRoutes(permisos) {
  return PRIVATE_ROUTES.filter((route) => can(permisos, route.permiso));
}

// Ruta inicial: la primera accesible, o null si no tiene acceso a ninguna (pantalla "Sin acceso").
export function initialRoute(permisos) {
  return accessibleRoutes(permisos)[0]?.path ?? null;
}

/**
 * Menú agrupado (D-FM9): `[{ label, items }]` solo con lo que el usuario puede ver y sin grupos vacíos.
 * `shortcuts` son atajos del menú que no son rutas (D-FM10): `{ path, label, permiso, group, after }`. Un atajo
 * se ve solo si el usuario tiene su permiso, va justo después del ítem `after` (o al principio de su grupo si
 * ese ítem no es visible) y sale marcado con `shortcut: true`.
 * @param {string[]} permisos
 * @param {{ path: string, label: string, permiso: string, group: string, after?: string }[]} [shortcuts]
 * @returns {{ label: string, items: { path: string, label: string, permiso: string, group: string, shortcut?: boolean }[] }[]}
 */
export function menuGroups(permisos, shortcuts = []) {
  const visibles = shortcuts.filter((s) => can(permisos, s.permiso));
  return MENU_GROUPS.map((label) => {
    const items = accessibleRoutes(permisos).filter((route) => route.group === label);
    for (const s of visibles.filter((x) => x.group === label)) {
      const idx = items.findIndex((it) => it.path === s.after);
      items.splice(idx + 1, 0, { ...s, shortcut: true });
    }
    return { label, items };
  }).filter((g) => g.items.length > 0);
}
