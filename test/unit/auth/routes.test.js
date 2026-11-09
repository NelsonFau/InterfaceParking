import { describe, expect, it } from "vitest";
import { accessibleRoutes, initialRoute, PRIVATE_ROUTES } from "../../../src/auth/routes.js";
import { can } from "../../../src/auth/permissions.js";
import { AUDITOR, OPERADOR, SUPERADMIN } from "./rolePermissions.fixture.js";

const paths = (routes) => routes.map((r) => r.path);

describe("routes", () => {
  it("el mapa tiene las 9 rutas privadas con su permiso", () => {
    expect(PRIVATE_ROUTES.map((r) => [r.path, r.permiso])).toEqual([
      ["/dashboard", "panel.ver"],
      ["/operaciones", "alertas.ver"],
      ["/cocheras", "cocheras.ver"],
      ["/ocupaciones", "ocupaciones.ver"],
      ["/clientes", "clientes.ver"],
      ["/tarifas", "tarifas.ver"],
      ["/auditoria", "auditoria.ver"],
      ["/alertas-operativas", "alertas.ver"],
      ["/caja-diaria", "caja.ver"],
    ]);
  });

  it("OPERADOR accede a todas las rutas menos /auditoria", () => {
    expect(paths(accessibleRoutes(OPERADOR))).toEqual(paths(PRIVATE_ROUTES).filter((p) => p !== "/auditoria"));
    expect(initialRoute(OPERADOR)).toBe("/dashboard");
  });

  it("AUDITOR accede a todas las rutas pero no puede gestionar clientes", () => {
    expect(paths(accessibleRoutes(AUDITOR))).toEqual(paths(PRIVATE_ROUTES));
    expect(can(AUDITOR, "clientes.gestionar")).toBe(false);
  });

  it("un usuario con solo tenants.* no accede a ninguna ruta", () => {
    expect(accessibleRoutes(SUPERADMIN)).toEqual([]);
    expect(initialRoute(SUPERADMIN)).toBeNull();
  });

  it("la ruta inicial es la primera accesible del mapa", () => {
    expect(initialRoute(["clientes.ver", "cocheras.ver"])).toBe("/cocheras");
  });
});
