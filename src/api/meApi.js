// GET /api/v1/me: usuario, tenant y permisos del usuario autenticado (D-FA7).
import { http } from "./http";

export async function getMe() {
  const { data } = await http.get("/me");
  return data;
}
