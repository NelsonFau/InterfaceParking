// Detalle de una ocupación (spec 07, D-FG13, D-FG15): cabecera, cliente, período, tarifa, cuenta,
// contrato mensual, pagos y enlaces, con las acciones de la fase según permisos (D-FG8). Se abre con
// `/ocupaciones?id=N`. Lo que el backend calcula (tope, pagado, saldo, saldo a favor) se muestra tal cual.
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { showApiError } from "../../api/errors";
import { getOcupacion } from "../../api/ocupacionApi";
import { FraccionMes, ModoMes, TipoOcupacion, labelOf } from "../../constants/enums";
import { FASE, accionesDeOcupacion, faseChip, ocupacionFase } from "../../utils/ocupaciones";
import { buildAlertasDeOcupacionPath } from "../../utils/ocupacionLink";
import { formatMoney } from "../../utils/formato";
import { buildTrazabilidadPath } from "../../utils/trazabilidadLink";
import { useTenantDates } from "../../utils/useTenantDates";
import CuentaOcupacion from "./CuentaOcupacion";

function Section({ titulo, children }) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
        {titulo}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * @param {{ id: number, reloadKey: number, now: Date, can: (permiso: string) => boolean,
 *   onClose: () => void, onError: (apiError: import("../../api/errors").ApiError) => void,
 *   onLoaded?: (detalle: object) => void,
 *   onAction: (accion: "pago" | "finalizar" | "cancelar", detalle: object) => void }} props
 *   `reloadKey` cambia cada vez que hay que volver a pedir el detalle (después de una escritura).
 */
export default function OcupacionDetalleDialog({ id, reloadKey, now, can, onClose, onError, onLoaded, onAction }) {
  const { formatInstant } = useTenantDates();
  // `{ key, status: "ok" | "error", data }`: `key` es el pedido que lo trajo. Mientras no coincida con
  // el actual, se muestran esqueletos (o los datos viejos, si hay, para no parpadear al recargar).
  const [result, setResult] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestKey = `${id}|${reloadKey}|${retryKey}`;

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getOcupacion(id);
        if (ignore) return;
        setResult({ key: requestKey, status: "ok", data });
        // La página usa las cifras frescas del detalle para los diálogos de acción abiertos desde acá.
        onLoaded?.(data);
      } catch (e) {
        if (ignore) return;
        const err = showApiError(e);
        setResult({ key: requestKey, status: "error", data: null });
        onError(err);
      }
    })();
    return () => {
      ignore = true;
    };
    // `onError` y `onLoaded` cambian en cada render de la página: el detalle se pide por id, recarga o reintento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const d = result?.status === "ok" && result.data.id === id ? result.data : null;
  const failed = result?.key === requestKey && result.status === "error";
  const fase = d ? ocupacionFase(d, now) : null;
  const chip = fase ? faseChip(fase) : null;
  const acciones = d ? accionesDeOcupacion(d, now, can) : null;
  const esReserva = fase === FASE.RESERVA;

  let cuerpo;
  if (d) {
    const detalleMes = d.tipo === TipoOcupacion.MES;
    cuerpo = (
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Ocupación #{d.id}
          </Typography>
          <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 700 }} />
          <Chip size="small" variant="outlined" label={labelOf(TipoOcupacion, d.tipo)} />
          <Chip size="small" variant="outlined" label={`Cochera #${d.cocheraNumero}`} />
        </Stack>

        <Divider />

        <Section titulo="Cliente">
          <Typography variant="body2">{d.clienteNombre}</Typography>
          <Typography variant="body2" color="text.secondary">
            Documento: {d.clienteDocumento || "—"} · Teléfono: {d.clienteTelefono || "—"}
          </Typography>
        </Section>

        <Section titulo="Período">
          <Typography variant="body2">
            {esReserva ? "Empieza" : "Inicio"}: {formatInstant(d.inicio)}
          </Typography>
          <Typography variant="body2">{d.fin ? `Fin: ${formatInstant(d.fin)}` : "Sin hora de fin"}</Typography>
          {d.finReal ? <Typography variant="body2">Fin real: {formatInstant(d.finReal)}</Typography> : null}
        </Section>

        <Section titulo="Tarifa">
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
            <Typography variant="body2">Precio unitario: {formatMoney(d.precioUnitarioAplicado)}</Typography>
            {d.esTarifaExcepcional ? <Chip size="small" color="warning" label="Tarifa excepcional" /> : null}
          </Stack>
          {d.esTarifaExcepcional && d.motivoTarifaExcepcional ? (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              Motivo: {d.motivoTarifaExcepcional}
            </Typography>
          ) : null}
        </Section>

        <Section titulo="Cuenta">
          <CuentaOcupacion ocupacion={d} fase={fase} />
        </Section>

        {detalleMes ? (
          // La spec 10 agrega acá el ajuste de precio y la baja programada.
          <Section titulo="Contrato mensual">
            <Typography variant="body2">
              Modo de mes: {labelOf(ModoMes, d.modoMes)} · Fracción: {labelOf(FraccionMes, d.fraccionMes)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Congelados al crear
            </Typography>
          </Section>
        ) : null}

        {/* Punto de montaje de la spec 08: acá va PagosSeccion (lista de pagos, detalle, devoluciones). */}
        <Section titulo="Pagos">
          <Box data-section="pagos" />
        </Section>

        {can("auditoria.ver") || can("alertas.ver") ? (
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            {can("auditoria.ver") ? (
              <Button size="small" component={RouterLink} to={buildTrazabilidadPath({ ocupacionId: d.id })}>
                Ver trazabilidad
              </Button>
            ) : null}
            {can("alertas.ver") ? (
              <Button size="small" component={RouterLink} to={buildAlertasDeOcupacionPath(d.id)}>
                Ver alertas
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    );
  } else if (failed) {
    cuerpo = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => setRetryKey((k) => k + 1)}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar la ocupación.
      </Alert>
    );
  } else {
    cuerpo = (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={32} />
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={110} />
      </Stack>
    );
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalle de la ocupación</DialogTitle>
      <DialogContent dividers>{cuerpo}</DialogContent>
      <DialogActions>
        {acciones?.registrarPago ? (
          <Button color="success" variant="contained" onClick={() => onAction("pago", d)} sx={{ fontWeight: 900 }}>
            Registrar pago
          </Button>
        ) : null}
        {acciones?.cancelarReserva ? (
          <Button color="error" variant="contained" onClick={() => onAction("cancelar", d)} sx={{ fontWeight: 900 }}>
            Cancelar reserva
          </Button>
        ) : null}
        {acciones?.finalizar ? (
          <Button color="success" variant="contained" onClick={() => onAction("finalizar", d)} sx={{ fontWeight: 900 }}>
            Finalizar
          </Button>
        ) : null}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
