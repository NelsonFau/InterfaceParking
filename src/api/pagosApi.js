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
/**
 * POST /Pagos (`pagos.registrar`): 201 con el pago. Función nueva de la spec 07 (D-FG4); el objeto
 * `pagosApi` de arriba queda como está hasta que la spec 08 migre el archivo entero.
 * `monto` va con hasta 2 decimales, mayor que 0 y como mucho 10.000.000 (`[Dinero]`); `referencia` se omite si no hay.
 * @param {{ ocupacionId: number, monto: number, metodo: number, referencia?: string }} body
 * @returns {Promise<object>}
 */
export async function createPago(body) {
  const { data } = await http.post("/Pagos", body);
  return data;
}
