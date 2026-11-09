// Permisos por rol según el backend (ParkingControl/Authorization/RolPermisos.cs, leído el 09/11/2026).
// Solo para tests: la UI nunca decide por rol (ARQ-4).

export const OPERADOR = [
  "clientes.ver",
  "clientes.gestionar",
  "cocheras.ver",
  "cocheras.cambiar_estado",
  "ocupaciones.ver",
  "ocupaciones.crear",
  "ocupaciones.finalizar",
  "ocupaciones.cancelar",
  "tarifas.ver",
  "pagos.ver",
  "pagos.registrar",
  "caja.ver",
  "caja.ver_esperado",
  "caja.abrir",
  "caja.cerrar",
  "alertas.ver",
  "alertas.resolver",
  "panel.ver",
];

export const AUDITOR = [
  "clientes.ver",
  "cocheras.ver",
  "ocupaciones.ver",
  "tarifas.ver",
  "pagos.ver",
  "caja.ver",
  "caja.ver_esperado",
  "alertas.ver",
  "auditoria.ver",
  "panel.ver",
  "configuracion.ver",
  "usuarios.ver",
];

export const SUPERADMIN = ["tenants.ver", "tenants.gestionar"];
