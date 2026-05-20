import { http } from "./http";

export const pagosApi = {
  crear: (payload) => http.post("/Pagos", payload),

  getCajaDiaria: (fecha) =>
    http.get("/Pagos/caja-diaria", {
      params: { fecha },
    }),

  anular: (pagoId, motivo) =>
    http.patch(`/Pagos/${pagoId}/anular`, {
      motivo,
    }),
};