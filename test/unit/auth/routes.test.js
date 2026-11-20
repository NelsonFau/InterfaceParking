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

// El atajo "Registrar ingreso" (D-FM10), tal como lo arma el menú.
const SHORTCUTS = [
  {
    path: buildNuevaOcupacionPath(),
    label: "Registrar ingreso",
    permiso: "ocupaciones.crear",
    group: "Operación",
    after: "/dashboard",
  },
];

describe("routes", () => {
  it("1: el mapa tiene las 11 rutas privadas con su permiso y un grupo válido", () => {
    expect(PRIVATE_ROUTES).toHaveLength(11);
    expect(PRIVATE_ROUTES.map((r) => [r.path, r.permiso]).sort()).toEqual(
      [
        ["/dashboard", "panel.ver"],
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

  it("2: menuGroups con todos los permisos: tres grupos en orden y el atajo entre Dashboard y Monitor", () => {
    const grupos = menuGroups(TODOS, SHORTCUTS);
    expect(grupos.map((g) => g.label)).toEqual(["Operación", "Gestión", "Administración"]);
    expect(grupos[0].items.map((i) => i.label)).toEqual([
      "Dashboard",
      "Registrar ingreso",
      "Monitor operativo",
      "Ocupaciones",
      "Alertas operativas",
    ]);
    expect(grupos[0].items[1]).toMatchObject({ path: "/ocupaciones?nueva=1", shortcut: true });
    expect(grupos[1].items.map((i) => i.label)).toEqual(["Cocheras", "Clientes", "Tarifas", "Caja"]);
    expect(grupos[2].items.map((i) => i.label)).toEqual(["Usuarios", "Trazabilidad", "Configuración"]);
  });

  it("3: OPERADOR no ve Administración; Operación y Gestión sí", () => {
    const grupos = menuGroups(OPERADOR, SHORTCUTS);
    expect(grupos.map((g) => g.label)).toEqual(["Operación", "Gestión"]);
  });

  it("4: AUDITOR (sin ocupaciones.crear) no ve el atajo pero sí Ocupaciones", () => {
    const items = menuGroups(AUDITOR, SHORTCUTS).flatMap((g) => g.items);
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
    const grupos = menuGroups(["ocupaciones.ver", "ocupaciones.crear"], SHORTCUTS);
    expect(grupos[0].items.map((i) => i.label)).toEqual(["Registrar ingreso", "Ocupaciones"]);
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

  it("AUDITOR accede a todas las rutas pero no puede gestionar clientes", () => {
    expect(paths(accessibleRoutes(AUDITOR))).toEqual(paths(PRIVATE_ROUTES));
    expect(can(AUDITOR, "clientes.gestionar")).toBe(false);
  });

  it("un usuario con solo tenants.* no accede a ninguna ruta", () => {
    expect(accessibleRoutes(SUPERADMIN)).toEqual([]);
  });

  it("la ruta inicial es la primera accesible del mapa", () => {
    expect(initialRoute(["clientes.ver", "cocheras.ver"])).toBe("/cocheras");
  });
});
