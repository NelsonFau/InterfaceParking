import { describe, expect, it } from "vitest";
import { can, canAny } from "../../../src/auth/permissions.js";
import { AUDITOR, OPERADOR } from "./rolePermissions.fixture.js";

describe("can", () => {
  it("es verdadero si el permiso está en la lista", () => {
    expect(can(OPERADOR, "clientes.gestionar")).toBe(true);
  });

  it("AUDITOR no puede gestionar clientes", () => {
    expect(can(AUDITOR, "clientes.gestionar")).toBe(false);
  });

  it("sin lista de permisos es falso", () => {
    expect(can(undefined, "clientes.ver")).toBe(false);
    expect(can(null, "clientes.ver")).toBe(false);
  });
});

describe("canAny", () => {
  it("es verdadero si alguno de la lista está", () => {
    expect(canAny(AUDITOR, ["clientes.gestionar", "auditoria.ver"])).toBe(true);
  });

  it("es falso si ninguno está o la lista está vacía", () => {
    expect(canAny(OPERADOR, ["auditoria.ver", "tarifas.editar"])).toBe(false);
    expect(canAny(OPERADOR, [])).toBe(false);
  });
});
