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

export const PRIVATE_ROUTES = [
  { path: "/dashboard", label: "Dashboard", permiso: "panel.ver" },
  // P-FA4 cerrado (spec 09, D-FI12): alertas.ver alcanza. Todo rol con alertas.ver tiene caja.ver, y el widget
  // de caja del Monitor se oculta por su cuenta con can("caja.ver"), así que no hace falta exigir los dos.
  { path: "/operaciones", label: "Monitor operativo", permiso: "alertas.ver" },
  { path: "/cocheras", label: "Cocheras", permiso: "cocheras.ver" },
  { path: OCUPACIONES_PATH, label: "Ocupaciones", permiso: "ocupaciones.ver" },
  { path: "/clientes", label: "Clientes", permiso: "clientes.ver" },
  { path: "/tarifas", label: "Tarifas", permiso: "tarifas.ver" },
  { path: TRAZABILIDAD_PATH, label: "Trazabilidad", permiso: "auditoria.ver" },
  { path: ALERTAS_PATH, label: "Alertas operativas", permiso: "alertas.ver" },
  { path: CAJA_PATH, label: "Caja", permiso: "caja.ver" },
  // Specs 11 y 12: pantallas de administración, al final del menú (contrato de rutas de brechas-front.md).
  { path: "/configuracion", label: "Configuración", permiso: "configuracion.ver" },
  // Spec 12 (D-FL3).
  { path: "/usuarios", label: "Usuarios", permiso: "usuarios.ver" },
];

// Rutas a las que el usuario tiene acceso, en el orden del mapa. La primera es la ruta inicial.
export function accessibleRoutes(permisos) {
  return PRIVATE_ROUTES.filter((route) => can(permisos, route.permiso));
}

// Ruta inicial: la primera accesible, o null si no tiene acceso a ninguna (pantalla "Sin acceso").
export function initialRoute(permisos) {
  return accessibleRoutes(permisos)[0]?.path ?? null;
}
