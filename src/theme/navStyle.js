// Estilo del menú lateral (spec 13, P-FM-D1): anchos y un punto de color por ítem, indexado por `path`.
// Los puntos son de la lista del diseño y se ven igual en claro y en oscuro.

/** Ancho del menú en desktop (D-FM8). */
export const SIDEBAR_WIDTH = 260;
/** Ancho del menú como drawer en mobile (D-FM8). */
export const SIDEBAR_WIDTH_MOBILE = 284;

const FALLBACK_DOT = "#8a8faa";

// Orden del diseño: #6d7cff #2fc58a #f0a935 #f2557a #a274f5 #e2589f #22b0d6 #f08a3e #7cc23f #5b8cff #e8b923.
export const NAV_DOTS = {
  "/dashboard": "#6d7cff",
  "/operaciones": "#2fc58a",
  "/ocupaciones": "#f0a935",
  "/alertas-operativas": "#f2557a",
  "/cocheras": "#a274f5",
  "/clientes": "#e2589f",
  "/tarifas": "#22b0d6",
  "/caja": "#f08a3e",
  "/usuarios": "#7cc23f",
  "/trazabilidad": "#5b8cff",
  "/configuracion": "#e8b923",
};

/** Color del punto de una ruta; el atajo "Registrar ingreso" usa el de Ocupaciones. */
export function dotColor(path) {
  const clean = String(path ?? "").split("?")[0];
  return NAV_DOTS[clean] ?? FALLBACK_DOT;
}
