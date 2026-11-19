import { describe, expect, it } from "vitest";
import {
  ROLES_INVITABLES,
  filterUsuarios,
  shouldReloadAfter,
  sortUsuarios,
  summarizeRoleChange,
  usuarioRowActions,
  validateInvitacion,
} from "../../../src/utils/usuarios.js";

const ok = { nombre: "Ana", email: "ana@x.com", rol: 3 };

describe("validateInvitacion", () => {
  it("recorta nombre y email y arma el cuerpo con rol entero", () => {
    expect(validateInvitacion({ nombre: "  Ana ", email: " ana@x.com ", rol: 3 })).toEqual({
      ok: true,
      body: { nombre: "Ana", email: "ana@x.com", rol: 3 },
    });
  });

  it("valida el nombre: vacío, solo espacios y más de 120", () => {
    for (const nombre of ["", "   "]) {
      const r = validateInvitacion({ ...ok, nombre });
      expect(r.ok).toBe(false);
      expect(r.errors.nombre).toBe("Ingresá el nombre");
    }
    const largo = validateInvitacion({ ...ok, nombre: "a".repeat(121) });
    expect(largo.errors.nombre).toBe("El nombre no puede superar 120 caracteres");
    expect(validateInvitacion({ ...ok, nombre: "a".repeat(120) }).ok).toBe(true);
  });

  it("valida el email: vacío, formato y largo", () => {
    expect(validateInvitacion({ ...ok, email: "" }).errors.email).toBe("Ingresá el email");
    for (const email of ["ana", "ana@", "a b@x.com"]) {
      expect(validateInvitacion({ ...ok, email }).errors.email).toBe("El email no es válido");
    }
    const largo = "a".repeat(201 - "@x.com".length) + "@x.com";
    expect(largo).toHaveLength(201);
    expect(validateInvitacion({ ...ok, email: largo }).errors.email).toBe(
      "El email no puede superar 200 caracteres"
    );
    const justo = "a".repeat(200 - "@x.com".length) + "@x.com";
    expect(validateInvitacion({ ...ok, email: justo }).ok).toBe(true);
  });

  it("el rol solo vale 1, 3, 4 o 5", () => {
    for (const rol of ["", null, undefined, 2, 6, 99]) {
      const r = validateInvitacion({ ...ok, rol });
      expect(r.ok).toBe(false);
      expect(r.errors.rol).toBe("Elegí un rol");
    }
    for (const rol of [1, 3, 4, 5]) expect(validateInvitacion({ ...ok, rol }).ok).toBe(true);
  });

  it("junta los errores de todos los campos", () => {
    const r = validateInvitacion({ nombre: "", email: "x", rol: "" });
    expect(Object.keys(r.errors).sort()).toEqual(["email", "nombre", "rol"]);
  });
});

describe("ROLES_INVITABLES", () => {
  it("son exactamente 1, 3, 4 y 5", () => {
    expect(ROLES_INVITABLES).toEqual([1, 3, 4, 5]);
  });
});

describe("sortUsuarios", () => {
  const lista = [
    { id: 5, nombre: "beto", activo: true },
    { id: 4, nombre: "Zoe", activo: false },
    { id: 3, nombre: "Álvaro", activo: true },
    { id: 2, nombre: "Carla", activo: true },
    { id: 1, nombre: "Ana", activo: false },
    { id: 7, nombre: "Beto", activo: true },
  ];

  it("activos primero, luego por nombre sin tildes ni mayúsculas, desempate por id", () => {
    expect(sortUsuarios(lista).map((u) => u.id)).toEqual([3, 5, 7, 2, 1, 4]);
  });

  it("no muta el arreglo recibido", () => {
    const copia = lista.map((u) => u.id);
    sortUsuarios(lista);
    expect(lista.map((u) => u.id)).toEqual(copia);
  });
});

describe("filterUsuarios", () => {
  const lista = [
    { id: 1, nombre: "Ana Pérez", email: "ana@x.com", activo: true },
    { id: 2, nombre: "Beto", email: "BANANA@x.com", activo: true },
    { id: 3, nombre: "Anabel", email: "anabel@x.com", activo: false },
    { id: 4, nombre: "Carla", email: "carla@x.com", activo: true },
  ];

  it("busca por nombre o email sin distinguir mayúsculas ni tildes y oculta desactivados", () => {
    const r = filterUsuarios(lista, { texto: "ANA", mostrarDesactivados: false });
    expect(r.map((u) => u.id)).toEqual([1, 2]);
    expect(filterUsuarios(lista, { texto: "perez", mostrarDesactivados: true }).map((u) => u.id)).toEqual([1]);
  });

  it("sin texto y con desactivados devuelve todos", () => {
    expect(filterUsuarios(lista, { texto: "", mostrarDesactivados: true })).toHaveLength(4);
    expect(filterUsuarios(lista, { texto: "   ", mostrarDesactivados: true })).toHaveLength(4);
  });
});

describe("usuarioRowActions", () => {
  const ctx = { meId: 1, canManage: true };
  const ajeno = { id: 2, rol: 4, activo: true };

  it("activo ajeno con rol invitable: cambiar rol, desactivar y reenviar", () => {
    expect(usuarioRowActions(ajeno, ctx)).toEqual({
      esPropio: false,
      cambiarRol: true,
      desactivar: true,
      reenviar: true,
      reactivar: false,
    });
  });

  it("desactivado ajeno: solo reactivar (sin reenviar)", () => {
    const r = usuarioRowActions({ ...ajeno, activo: false }, ctx);
    expect(r).toEqual({ esPropio: false, cambiarRol: false, desactivar: false, reenviar: false, reactivar: true });
  });

  it("fila propia: esPropio y ninguna acción de escritura", () => {
    const r = usuarioRowActions({ id: 1, rol: 1, activo: true }, ctx);
    expect(r).toEqual({ esPropio: true, cambiarRol: false, desactivar: false, reenviar: false, reactivar: false });
  });

  it("sin canManage no hay acciones de escritura", () => {
    const r = usuarioRowActions(ajeno, { meId: 1, canManage: false });
    expect(r).toEqual({ esPropio: false, cambiarRol: false, desactivar: false, reenviar: false, reactivar: false });
  });

  it("activo ajeno con rol 6 (SUPERADMIN): sin cambiar rol", () => {
    expect(usuarioRowActions({ ...ajeno, rol: 6 }, ctx).cambiarRol).toBe(false);
  });

  it("sin meId conocido ninguna fila es propia", () => {
    expect(usuarioRowActions(ajeno, { meId: null, canManage: true }).esPropio).toBe(false);
  });
});

describe("summarizeRoleChange", () => {
  it("arma de, a y cambia", () => {
    const u = { nombre: "Ana", rol: 3 };
    expect(summarizeRoleChange(u, 5)).toEqual({ nombre: "Ana", de: 3, a: 5, cambia: true });
    expect(summarizeRoleChange(u, 3).cambia).toBe(false);
  });
});

describe("shouldReloadAfter", () => {
  it("recarga cuando el estado quedó viejo", () => {
    for (const c of [
      "usuario_ya_desactivado",
      "usuario_ya_activo",
      "usuario_no_encontrado",
      "proveedor_identidad_no_disponible",
    ]) {
      expect(shouldReloadAfter(c)).toBe(true);
    }
  });

  it("no recarga en el resto", () => {
    for (const c of [
      "usuario_ya_existe",
      "usuario_ya_registrado",
      "operacion_sobre_uno_mismo",
      "ultimo_dueno",
      "identidad_sin_vinculo",
      "datos_invalidos",
      "sin_permiso",
      "algo_raro",
      undefined,
    ]) {
      expect(shouldReloadAfter(c)).toBe(false);
    }
  });
});
