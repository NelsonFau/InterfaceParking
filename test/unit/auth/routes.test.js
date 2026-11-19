import { describe, expect, it } from "vitest";
import { accessibleRoutes, initialRoute, PRIVATE_ROUTES } from "../../../src/auth/routes.js";
import { can } from "../../../src/auth/permissions.js";
import { AUDITOR, OPERADOR, SUPERADMIN } from "./rolePermissions.fixture.js";

const paths = (routes) => routes.map((r) => r.path);

describe("routes", () => {
  it("el mapa tiene las 11 rutas privadas con su permiso", () => {
    expect(PRIVATE_ROUTES.map((r) => [r.path, r.permiso])).toEqual([
      ["/dashboard", "panel.ver"],
      ["/operaciones", "alertas.ver"],
      ["/cocheras", "cocheras.ver"],
      ["/ocupaciones", "ocupaciones.ver"],
      ["/clientes", "clientes.ver"],
      ["/tarifas", "tarifas.ver"],
      ["/trazabilidad", "auditoria.ver"],
      ["/alertas-operativas", "alertas.ver"],
      ["/caja-diaria", "caja.ver"],
      ["/configuracion", "configuracion.ver"],
      ["/usuarios", "usuarios.ver"],
    ]);
  });

  it("/configuracion va antes de /usuarios, al final del menú, y la ven los que tienen configuracion.ver", () => {
    expect(paths(PRIVATE_ROUTES).slice(-2)).toEqual(["/configuracion", "/usuarios"]);
    expect(paths(accessibleRoutes(["configuracion.ver"]))).toEqual(["/configuracion"]);
    expect(paths(accessibleRoutes(AUDITOR))).toContain("/configuracion");
  });

  it("OPERADOR no ve /configuracion", () => {
    expect(paths(accessibleRoutes(OPERADOR))).not.toContain("/configuracion");
  });

  it("/usuarios es la última entrada del mapa y aparece con usuarios.ver", () => {
    expect(PRIVATE_ROUTES.at(-1)).toEqual({ path: "/usuarios", label: "Usuarios", permiso: "usuarios.ver" });
    expect(paths(accessibleRoutes(["usuarios.ver"]))).toEqual(["/usuarios"]);
    expect(paths(accessibleRoutes(AUDITOR))).toContain("/usuarios");
  });

  it("OPERADOR no ve /usuarios", () => {
    expect(paths(accessibleRoutes(OPERADOR))).not.toContain("/usuarios");
  });

  it("OPERADOR accede a todas las rutas menos /trazabilidad, /configuracion y /usuarios", () => {
    expect(paths(accessibleRoutes(OPERADOR))).toEqual(
      paths(PRIVATE_ROUTES).filter((p) => !["/trazabilidad", "/configuracion", "/usuarios"].includes(p))
    );
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
