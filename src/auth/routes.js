// Mapa único de rutas privadas (D-FA8): de acá salen las <Route> y los ítems del menú.
// El permiso de cada ruta sale de la matriz rol × recurso del backend.
import { can } from "./permissions.js";

// Ruta de Trazabilidad (D-FD3, D-FD5): una sola constante para el mapa y para el contrato de enlace.
export const TRAZABILIDAD_PATH = "/trazabilidad";

export const PRIVATE_ROUTES = [
  { path: "/dashboard", label: "Dashboard", permiso: "panel.ver" },
  // P-FA4 cerrado (spec 05): el Monitor ya no mezcla caja, así que alertas.ver alcanza. Si la 09 repone un
  // widget de caja, revisa si esta ruta debe exigir además caja.ver.
  { path: "/operaciones", label: "Monitor operativo", permiso: "alertas.ver" },
  { path: "/cocheras", label: "Cocheras", permiso: "cocheras.ver" },
  { path: "/ocupaciones", label: "Ocupaciones", permiso: "ocupaciones.ver" },
  { path: "/clientes", label: "Clientes", permiso: "clientes.ver" },
  { path: "/tarifas", label: "Tarifas", permiso: "tarifas.ver" },
  { path: TRAZABILIDAD_PATH, label: "Trazabilidad", permiso: "auditoria.ver" },
  { path: "/alertas-operativas", label: "Alertas operativas", permiso: "alertas.ver" },
  { path: "/caja-diaria", label: "Caja diaria", permiso: "caja.ver" },
];

// Rutas a las que el usuario tiene acceso, en el orden del mapa. La primera es la ruta inicial.
export function accessibleRoutes(permisos) {
  return PRIVATE_ROUTES.filter((route) => can(permisos, route.permiso));
}

// Ruta inicial: la primera accesible, o null si no tiene acceso a ninguna (pantalla "Sin acceso").
export function initialRoute(permisos) {
  return accessibleRoutes(permisos)[0]?.path ?? null;
}
