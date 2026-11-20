// Detalle de un pago (spec 08, D-FH5): cabecera, importes, quién lo registró, historial, devoluciones, las
// acciones por permiso y el enlace a Trazabilidad. Se abre con SOLO un `pagoId` (contrato con la spec 09,
// D-FH13): carga el pago y, si hace falta, la ocupación (aviso de anular una finalizada). Decide sus acciones
// con `usePermissions()`, no recibe `can`. El backend manda solo el id del usuario, nunca el nombre (C6).
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { showApiError } from "../../api/errors";
import { getOcupacion } from "../../api/ocupacionApi";
import { getPago } from "../../api/pagosApi";
import { EstadoPago, MetodoPago, colorOf, labelOf } from "../../constants/enums";
import { useMe, usePermissions } from "../../auth/usePermissions";
import { formatMoney } from "../../utils/formato";
import { accionesDePago, shouldCloseDetailAfterPago, usuarioLabel } from "../../utils/pagos";
import { buildTrazabilidadPath } from "../../utils/trazabilidadLink";
import { useTenantDates } from "../../utils/useTenantDates";
import AnularPagoDialog from "./AnularPagoDialog";
import DevolucionDialog from "./DevolucionDialog";

function Section({ titulo, children }) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {titulo}
      </Typography>
      {children}
    </Box>
  );
}

function Fila({ label, children }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: "right" }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * @param {{ pagoId: number, onClose: () => void, onChanged?: () => void, ocupacion?: object | null }} props
 *   `onChanged` pide recargar la lista y el detalle de la ocupación después de escribir o de un error por
 *   estado viejo. `ocupacion` es opcional: sin ella se pide con `getOcupacion(pago.ocupacionId)`.
 */
export default function PagoDetalleDialog({ pagoId, onClose, onChanged, ocupacion }) {
  const fullScreen = useDialogFullScreen();
  const { formatInstant } = useTenantDates();
  const { can } = usePermissions();
  const { me } = useMe();
  // `{ key, status: "ok" | "error", data }`: `key` es el pedido que lo trajo (como en el detalle de la ocupación).
  const [result, setResult] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [ocupacionPropia, setOcupacionPropia] = useState(null);
  const [accion, setAccion] = useState(null); // null | "anular" | "devolver"
  const requestKey = `${pagoId}|${reloadKey}`;

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getPago(pagoId);
        if (ignore) return;
        setResult({ key: requestKey, status: "ok", data });
      } catch (e) {
        if (ignore) return;
        const err = showApiError(e);
        setResult({ key: requestKey, status: "error", data: null });
        // Un pago que ya no existe: se recarga la lista y se cierra.
        if (shouldCloseDetailAfterPago(err.code)) {
          onChanged?.();
          onClose();
        }
      }
    })();
    return () => {
      ignore = true;
    };
    // `onChanged` y `onClose` cambian en cada render de quien lo abre: el pago se pide por id o recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const pago = result?.status === "ok" && result.data.id === pagoId ? result.data : null;
  const failed = result?.key === requestKey && result.status === "error";
  const ocupacionId = pago?.ocupacionId;

  // La ocupación, solo si no la pasaron: sirve para el aviso de anular. Si falla, no hay aviso.
  useEffect(() => {
    if (ocupacion || ocupacionId == null) return undefined;
    let ignore = false;
    (async () => {
      try {
        const o = await getOcupacion(ocupacionId);
        if (!ignore) setOcupacionPropia(o);
      } catch {
        if (!ignore) setOcupacionPropia(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [ocupacion, ocupacionId, reloadKey]);

  const ocupacionUsada = ocupacion ?? ocupacionPropia;
  const acciones = pago ? accionesDePago(pago, can) : null;
  const meUsuarioId = me?.usuarioId ?? null;

  function recargar() {
    setReloadKey((k) => k + 1);
  }

  // Lo que un diálogo de acción le pide a este detalle: recargar el pago y avisar a quien lo abrió.
  function alCambiar() {
    recargar();
    onChanged?.();
  }

  // Un error de una acción: si el pago ya no existe, se cierra también el detalle. Las recargas por estado
  // viejo las pidió el propio diálogo de la acción con `onChanged`.
  function alFallar(err) {
    if (shouldCloseDetailAfterPago(err.code)) onClose();
  }

  let cuerpo;
  if (pago) {
    const estado = { label: labelOf(EstadoPago, pago.estado), color: colorOf(EstadoPago, pago.estado) };
    const historial = Array.isArray(pago.historial) ? pago.historial : [];
    const devoluciones = Array.isArray(pago.devoluciones) ? pago.devoluciones : [];
    cuerpo = (
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
          <Typography variant="h6">
            Pago #{pago.id}
          </Typography>
          <Chip size="small" label={estado.label} color={estado.color} />
          <Chip size="small" variant="outlined" label={`Ocupación #${pago.ocupacionId}`} />
        </Stack>

        <Divider />

        <Section titulo="Importes">
          <Stack spacing={0.5}>
            <Fila label="Monto">{formatMoney(pago.monto)}</Fila>
            <Fila label="Devuelto">{formatMoney(pago.montoDevuelto)}</Fila>
            <Fila label="Método">{labelOf(MetodoPago, pago.metodo)}</Fila>
            <Fila label="Fecha de pago">{formatInstant(pago.fechaPago)}</Fila>
            <Fila label="Referencia">{pago.referencia || "—"}</Fila>
          </Stack>
        </Section>

        <Section titulo="Registro">
          <Typography variant="body2">Registrado por {usuarioLabel(pago.registradoPorUsuarioId, meUsuarioId)}</Typography>
        </Section>

        <Section titulo="Historial">
          {historial.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin movimientos
            </Typography>
          ) : (
            <Stack spacing={0.75} component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {historial.map((h, i) => (
                <Box component="li" key={`${h.estado}-${h.fecha}-${i}`}>
                  <Typography variant="body2">
                    <b>{labelOf(EstadoPago, h.estado)}</b> · {formatInstant(h.fecha)} · {usuarioLabel(h.usuarioId, meUsuarioId)}
                  </Typography>
                  {h.motivo ? (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      Motivo: {h.motivo}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
        </Section>

        <Section titulo="Devoluciones">
          {devoluciones.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin devoluciones
            </Typography>
          ) : (
            <Stack spacing={0.75} component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {devoluciones.map((d) => (
                <Box component="li" key={d.id}>
                  <Typography variant="body2">
                    <b>{formatMoney(d.monto)}</b> · {labelOf(MetodoPago, d.metodo)} · {formatInstant(d.fecha)} ·{" "}
                    {usuarioLabel(d.usuarioId, meUsuarioId)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                    Motivo: {d.motivo}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Section>

        {acciones.anularBloqueadoPorDevoluciones ? (
          <Alert severity="info">Tiene devoluciones; no se puede anular.</Alert>
        ) : null}

        {can("auditoria.ver") ? (
          <Box>
            <Button size="small" component={RouterLink} to={buildTrazabilidadPath({ pagoId: pago.id })}>
              Ver trazabilidad
            </Button>
          </Box>
        ) : null}
      </Stack>
    );
  } else if (failed) {
    cuerpo = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={recargar}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar el pago.
      </Alert>
    );
  } else {
    cuerpo = (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={32} />
        <Skeleton variant="rounded" height={90} />
        <Skeleton variant="rounded" height={70} />
      </Stack>
    );
  }

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <DialogTitle>Detalle del pago</DialogTitle>
        <DialogContent dividers>{cuerpo}</DialogContent>
        <DialogActions>
          {acciones?.anular ? (
            <Button color="error" variant="contained" onClick={() => setAccion("anular")}>
              Anular pago
            </Button>
          ) : null}
          {acciones?.devolver ? (
            <Button color="warning" variant="contained" onClick={() => setAccion("devolver")}>
              Devolver
            </Button>
          ) : null}
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Los diálogos de acción se abren solo desde los botones (que ya filtran por permiso) y se manejan
          solos: no dependen de `acciones` después, porque tras escribir el pago se recarga. */}
      {accion === "anular" && pago ? (
        <AnularPagoDialog
          pago={pago}
          ocupacion={ocupacionUsada}
          onClose={() => setAccion(null)}
          onChanged={alCambiar}
          onError={alFallar}
        />
      ) : null}

      {accion === "devolver" && pago ? (
        <DevolucionDialog
          ocupacionId={pago.ocupacionId}
          pagoId={pago.id}
          onClose={() => setAccion(null)}
          onChanged={alCambiar}
          onError={alFallar}
        />
      ) : null}
    </>
  );
}
