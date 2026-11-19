import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  createUsuario,
  deactivateUsuario,
  listUsuarios,
  reactivateUsuario,
  resendInvitacion,
  updateUsuarioRol,
} from "../../../src/api/usuariosApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listUsuarios", () => {
  it("hace GET /Usuarios y devuelve data", async () => {
    const data = [{ id: 1 }];
    http.get.mockResolvedValue({ data });
    await expect(listUsuarios()).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Usuarios");
  });
});

describe("createUsuario", () => {
  const body = { nombre: "Ana", email: "ana@x.com", rol: 3 };

  it("hace POST /Usuarios con el cuerpo y devuelve { usuario, invitacionEnviada }", async () => {
    const data = { usuario: { id: 9, ...body, activo: true }, invitacionEnviada: false };
    http.post.mockResolvedValue({ data });
    await expect(createUsuario(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Usuarios", body);
  });

  it("una respuesta sin usuario lanza respuesta_invalida", async () => {
    http.post.mockResolvedValue({ data: { invitacionEnviada: true } });
    const err = await createUsuario(body).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("una invitacionEnviada que no es booleano lanza respuesta_invalida", async () => {
    http.post.mockResolvedValue({ data: { usuario: { id: 1 }, invitacionEnviada: "si" } });
    const err = await createUsuario(body).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(createUsuario(body)).rejects.toBe(boom);
  });
});

describe("resendInvitacion", () => {
  it("hace POST /Usuarios/7/reenviar-invitacion y devuelve undefined", async () => {
    http.post.mockResolvedValue({ data: "" });
    await expect(resendInvitacion(7)).resolves.toBeUndefined();
    expect(http.post).toHaveBeenCalledWith("/Usuarios/7/reenviar-invitacion");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(resendInvitacion(7)).rejects.toBe(boom);
  });
});

describe("updateUsuarioRol", () => {
  it("hace PUT /Usuarios/7/rol con { rol } y devuelve el Usuario", async () => {
    const data = { id: 7, rol: 4 };
    http.put.mockResolvedValue({ data });
    await expect(updateUsuarioRol(7, 4)).resolves.toBe(data);
    expect(http.put).toHaveBeenCalledWith("/Usuarios/7/rol", { rol: 4 });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(updateUsuarioRol(7, 4)).rejects.toBe(boom);
  });
});

describe("deactivateUsuario y reactivateUsuario", () => {
  it("desactivar hace POST /Usuarios/7/desactivar y devuelve el Usuario", async () => {
    const data = { id: 7, activo: false };
    http.post.mockResolvedValue({ data });
    await expect(deactivateUsuario(7)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Usuarios/7/desactivar");
  });

  it("reactivar hace POST /Usuarios/7/reactivar y devuelve el Usuario", async () => {
    const data = { id: 7, activo: true };
    http.post.mockResolvedValue({ data });
    await expect(reactivateUsuario(7)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Usuarios/7/reactivar");
  });

  it("no capturan errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(deactivateUsuario(7)).rejects.toBe(boom);
    await expect(reactivateUsuario(7)).rejects.toBe(boom);
  });
});
