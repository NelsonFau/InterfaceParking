import { http } from "./http";

export const operationalAlertsApi = {
  getAll: (params) => http.get("/operational-alerts", { params }),

  resolve: (id, comentario) =>
    http.patch(`/operational-alerts/${id}/resolver`, { comentario }),
};