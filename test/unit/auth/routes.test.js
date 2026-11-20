import { describe, expect, it } from "vitest";
import {
  MENU_GROUPS,
  accessibleRoutes,
  initialRoute,
  menuGroups,
  PRIVATE_ROUTES,
} from "../../../src/auth/routes.js";
import { can } from "../../../src/auth/permissions.js";
import { buildNuevaOcupacionPath } from "../../../src/utils/ocupacionLink.js";
import { AUDITOR, OPERADOR, SUPERADMIN } from "./rolePermissions.fixture.js";

const paths = (routes) => routes.map((r) => r.path);
const TODOS = PRIVATE_ROUTES.map((r) => r.permiso).concat("ocupaciones.crear");

// Atajo genérico del menú (`menuGroups` sigue aceptándolos); "Registrar ingreso" ya es una ruta propia.
const SHORTCUTS = [
  {
    path: buildNuevaOcupacionPath(),
    label: "Atajo de prueba",
    permiso: "ocupaciones.crear",
    group: "Gestión",
    after: "/caja",
  },
];

describe("routes", () => {
  it("1: el mapa tiene las 12 rutas privadas con su permiso y un grupo válido", () => {
    expect(PRIVATE_ROUTES).toHaveLength(12);
    expect(PRIVATE_ROUTES.map((r) => [r.path, r.permiso]).sort()).toEqual(
      [
        ["/dashboard", "panel.ver"],
        ["/registrar-ingreso", "ocupaciones.crear"],
        ["/operaciones", "alertas.ver"],
        ["/cocheras", "cocheras.ver"],
        ["/ocupaciones", "ocupaciones.ver"],
        ["/clientes", "clientes.ver"],
        ["/tarifas", "tarifas.ver"],
        ["/trazabilidad", "auditoria.ver"],
        ["/alertas-operativas", "alertas.ver"],
        ["/caja", "caja.ver"],
        ["/configuracion", "configuracion.ver"],
        ["/usuarios", "usuarios.ver"],
      ].sort()
    );
    for (const r of PRIVATE_ROUTES) expect(MENU_GROUPS).toContain(r.group);
    expect(MENU_GROUPS).toEqual(["Operación", "Gestión", "Administración"]);
  });

  it("2: menuGroups con todos los permisos: tres grupos en orden del diseño y sin Configuración", () => {
    const grupos = menuGroups(TODOS);
    expect(grupos.map((g) => g.label)).toEqual(["Operación", "Gestión", "Administración"]);
    expect(grupos[0].items.map((i) => i.label)).toEqual([
      "Panel",
      "Registrar ingreso",
      "Monitor operativo",
      "Ocupaciones",
      "Alertas operativas",
    ]);
    expect(grupos[0].items[1]).toMatchObject({ path: "/registrar-ingreso" });
    expect(grupos[1].items.map((i) => i.label)).toEqual(["Cocheras", "Clientes", "Tarifas", "Caja"]);
    expect(grupos[2].items.map((i) => i.label)).toEqual(["Usuarios", "Trazabilidad"]);
  });

  it("Configuración es una ruta pero no un ítem del menú (se llega desde el menú de usuario)", () => {
    expect(paths(PRIVATE_ROUTES)).toContain("/configuracion");
    const items = menuGroups(TODOS).flatMap((g) => g.items);
    expect(items.map((i) => i.path)).not.toContain("/configuracion");
  });

  it("un atajo se ve con su permiso y va después del ítem indicado", () => {
    const grupos = menuGroups(TODOS, SHORTCUTS);
    const gestion = grupos.find((g) => g.label === "Gestión");
    expect(gestion.items.map((i) => i.label)).toEqual(["Cocheras", "Clientes", "Tarifas", "Caja", "Atajo de prueba"]);
    expect(gestion.items[4]).toMatchObject({ path: "/ocupaciones?nueva=1", shortcut: true });
  });

  it("3: OPERADOR no ve Administración; Operación y Gestión sí", () => {
    const grupos = menuGroups(OPERADOR, SHORTCUTS);
    expect(grupos.map((g) => g.label)).toEqual(["Operación", "Gestión"]);
  });

  it("4: AUDITOR (sin ocupaciones.crear) no ve Registrar ingreso pero sí Ocupaciones", () => {
    const items = menuGroups(AUDITOR).flatMap((g) => g.items);
    expect(items.map((i) => i.label)).not.toContain("Registrar ingreso");
    expect(items.map((i) => i.label)).toContain("Ocupaciones");
  });

  it("5: sin ninguna ruta, menuGroups da [] e initialRoute da null", () => {
    expect(menuGroups(SUPERADMIN, SHORTCUTS)).toEqual([]);
    expect(menuGroups([], SHORTCUTS)).toEqual([]);
    expect(initialRoute(SUPERADMIN)).toBeNull();
  });

  it("6: initialRoute de los cuatro roles es /dashboard (todos tienen panel.ver)", () => {
    expect(initialRoute(OPERADOR)).toBe("/dashboard");
    expect(initialRoute(AUDITOR)).toBe("/dashboard");
    expect(initialRoute(TODOS)).toBe("/dashboard");
    expect(initialRoute(["panel.ver", "clientes.ver", "usuarios.ver"])).toBe("/dashboard");
  });

  it("un grupo sin ítems accesibles no aparece", () => {
    const grupos = menuGroups(["clientes.ver"], SHORTCUTS);
    expect(grupos.map((g) => g.label)).toEqual(["Gestión"]);
  });

  it("si el ítem 'after' no es visible, el atajo va al principio de su grupo", () => {
    const grupos = menuGroups(["caja.ver", "ocupaciones.crear", "clientes.ver"], [{ ...SHORTCUTS[0], after: "/tarifas" }]);
    expect(grupos[grupos.length - 1].items.map((i) => i.label)[0]).toBe("Atajo de prueba");
  });

  it("Configuración y Usuarios son ítems de Administración y los ven los que tienen su permiso", () => {
    expect(paths(accessibleRoutes(["configuracion.ver"]))).toEqual(["/configuracion"]);
    expect(paths(accessibleRoutes(["usuarios.ver"]))).toEqual(["/usuarios"]);
    expect(paths(accessibleRoutes(AUDITOR))).toContain("/configuracion");
    expect(paths(accessibleRoutes(AUDITOR))).toContain("/usuarios");
  });

  it("OPERADOR no ve /configuracion ni /usuarios", () => {
    expect(paths(accessibleRoutes(OPERADOR))).not.toContain("/configuracion");
    expect(paths(accessibleRoutes(OPERADOR))).not.toContain("/usuarios");
  });

  it("OPERADOR accede a todas las rutas menos /trazabilidad, /configuracion y /usuarios", () => {
    expect(paths(accessibleRoutes(OPERADOR))).toEqual(
      paths(PRIVATE_ROUTES).filter((p) => !["/trazabilidad", "/configuracion", "/usuarios"].includes(p))
    );
  });

  it("AUDITOR accede a todas las rutas menos /registrar-ingreso y no puede gestionar clientes", () => {
    expect(paths(accessibleRoutes(AUDITOR))).toEqual(paths(PRIVATE_ROUTES).filter((p) => p !== "/registrar-ingreso"));
    expect(can(AUDITOR, "clientes.gestionar")).toBe(false);
  });

  it("un usuario con solo tenants.* no accede a ninguna ruta", () => {
    expect(accessibleRoutes(SUPERADMIN)).toEqual([]);
  });

  it("la ruta inicial es la primera accesible del mapa", () => {
    expect(initialRoute(["clientes.ver", "cocheras.ver"])).toBe("/cocheras");
  });
});
