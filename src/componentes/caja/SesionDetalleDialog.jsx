// Detalle de una sesión de caja (spec 09, D-FI10, D-FI11): cabecera, resumen (el esperado en vivo si está
// abierta; el último CIERRE si está cerrada), eventos, movimientos (solo con la sesión cerrada) y acciones por
// permiso. Los movimientos se muestran como los manda el backend: sin sumar, sin ordenar y sin paginar (PB-16).
// El backend manda solo el id del usuario (PB-17): se muestra "Vos" o "Usuario #id".
import { useEffect, useRef, useState } from "react";
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
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getCajaActual, getCajaSesion } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { useMe, usePermissions } from "../../auth/usePermissions";
import {
  EstadoCajaSesion,
  MetodoPago,
  TipoEventoCaja,
  TipoMovimientoCaja,
  colorOf,
  labelOf,
} from "../../constants/enums";
import {
  accionesDeSesion,
  cierreVigente,
  eventoCampos,
  shouldCloseDetailAfterCaja,
} from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { usuarioLabel } from "../../utils/pagos";
import { buildTrazabilidadPath } from "../../utils/trazabilidadLink";
import { useTenantDates } from "../../utils/useTenantDates";
import PagoDetalleDialog from "../pagos/PagoDetalleDialog";
import { useDialogFullScreen } from "../useDialogFullScreen";
import CerrarCajaDialog from "./CerrarCajaDialog";
import Dif from "./DiferenciaTexto";
import ReabrirCajaDialog from "./ReabrirCajaDialog";
import TotalesPorMetodo from "./TotalesPorMetodo";
import { useCajaEsperado } from "./useCajaEsperado";

function Section({ titulo, children }) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
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
      <Typography variant="body2" sx={{ textAlign: "right" }} component="div">
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * @param {{ sesionId: number, onClose: () => void, onChanged?: () => void }} props
 *   `onChanged` avisa a la pantalla que la caja cambió (cerrar, reabrir o anular/devolver desde un pago de un
 *   movimiento) para que recargue la pestaña "Caja actual" y el historial.
 */
export default function SesionDetalleDialog({ sesionId, onClose, onChanged }) {
  const fullScreen = useDialogFullScreen();
  const { formatInstant } = useTenantDates();
  const { can } = usePermissions();
  const { me } = useMe();
  const meUsuarioId = me?.usuarioId ?? null;

  const [reloadKey, setReloadKey] = useState(0);
  // `{ key, status: "ok" | "error", detalle, actual }`: `key` es el pedido que lo trajo.
  const [result, setResult] = useState(null);
  const [accion, setAccion] = useState(null); // null | "cerrar" | "reabrir"
  const [pagoId, setPagoId] = useState(null);
  const requestKey = `${sesionId}|${reloadKey}`;
  // Los callbacks cambian en cada render de quien nos monta: el pedido depende solo de la clave.
  const callbacks = useRef({ onChanged, onClose });
  useEffect(() => {
    callbacks.current = { onChanged, onClose };
  });

  useEffect(() => {
    let ignore = false;
    (async () => {
      // La caja actual solo sirve para saber si hay otra abierta (Reabrir) y el modo (texto del aviso): si
      // falla, el detalle se ve igual y decide el backend.
      const [detalle, actual] = await Promise.allSettled([getCajaSesion(sesionId), getCajaActual()]);
      if (ignore) return;
      if (detalle.status === "rejected") {
        const err = showApiError(detalle.reason);
        setResult({ key: requestKey, status: "error", detalle: null, actual: null });
        if (shouldCloseDetailAfterCaja(err.code)) {
          callbacks.current.onChanged?.();
          callbacks.current.onClose();
        }
        return;
      }
      setResult({
        key: requestKey,
        status: "ok",
        detalle: detalle.value,
        actual: actual.status === "fulfilled" ? actual.value : null,
      });
    })();
    return () => {
      ignore = true;
    };
  }, [sesionId, requestKey]);

  const detalle = result?.status === "ok" ? result.detalle : null;
  const sesion = detalle?.sesion ?? null;
  const abierta = sesion?.estado === EstadoCajaSesion.ABIERTA;
  const esperado = useCajaEsperado(sesion?.id, abierta && can("caja.ver_esperado"), requestKey);
  const hayAbierta = Boolean(result?.actual?.sesion);
  const acciones = accionesDeSesion(sesion, { hayAbierta }, can);
  const reload = () => setReloadKey((k) => k + 1);
  const cargando = result === null || result.key !== requestKey;

  function renderResumen() {
    if (abierta) {
      return (
        <Stack spacing={1}>
          {can("caja.ver_esperado") ? (
            esperado.status === "error" ? (
              <Typography variant="body2" color="warning.main">
                No pudimos cargar el esperado
              </Typography>
            ) : esperado.data === null ? (
              <Skeleton variant="rounded" height={80} />
            ) : (
              <>
                <Fila label="Efectivo esperado">
                  <b>{formatMoney(esperado.data.efectivoEsperado)}</b>
                </Fila>
                <TotalesPorMetodo totales={esperado.data.totales} />
              </>
            )
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Los movimientos se ven cuando la caja se cierra
          </Typography>
        </Stack>
      );
    }
    const cierre = cierreVigente(detalle.historial);
    if (!cierre) {
      return (
        <Typography variant="body2" color="text.secondary">
          Esta sesión no tiene un cierre registrado.
        </Typography>
      );
    }
    return (
      <Stack spacing={0.5}>
        <Fila label="Cierre">{formatInstant(cierre.fecha)}</Fila>
        <Fila label="Efectivo contado">{formatMoney(cierre.efectivoContado)}</Fila>
        <Fila label="Efectivo esperado">{formatMoney(cierre.efectivoEsperado)}</Fila>
        <Fila label="Diferencia">
          <Dif diferencia={cierre.diferencia} />
        </Fila>
        <Fila label="Fondo siguiente">{formatMoney(cierre.fondoSiguiente)}</Fila>
        {cierre.observacion ? <Fila label="Observación">{cierre.observacion}</Fila> : null}
        <Box sx={{ pt: 1 }}>
          <TotalesPorMetodo totales={cierre.totales} />
        </Box>
      </Stack>
    );
  }

  function renderEventos() {
    return (
      <Stack spacing={1} divider={<Divider flexItem />}>
        {detalle.historial.map((h, i) => {
          const { campos, distinto, observacion } = eventoCampos(h);
          return (
            <Box key={`${h.tipo}-${h.fecha}-${i}`}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {labelOf(TipoEventoCaja, h.tipo)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatInstant(h.fecha)} · {usuarioLabel(h.usuarioId, meUsuarioId)}
                </Typography>
                {h.automatica ? <Chip size="small" label="Automática" /> : null}
              </Stack>
              {campos.map((c) => (
                <Fila key={c.key} label={c.label}>
                  {c.key === "diferencia" ? <Dif diferencia={c.value} /> : c.money ? formatMoney(c.value) : c.value}
                </Fila>
              ))}
              {distinto ? (
                <Typography variant="caption" color="warning.main">
                  Distinto del que quedó
                </Typography>
              ) : null}
              {observacion ? <Fila label="Observación">{observacion}</Fila> : null}
            </Box>
          );
        })}
      </Stack>
    );
  }

  function renderMovimientos() {
    const movs = detalle.movimientos;
    if (!Array.isArray(movs) || movs.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No hubo movimientos
        </Typography>
      );
    }
    return (
      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Método</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Pago</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movs.map((m, i) => (
              <TableRow key={`${m.tipo}-${m.pagoId}-${i}`}>
                <TableCell>{formatInstant(m.fecha)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={labelOf(TipoMovimientoCaja, m.tipo)}
                      color={colorOf(TipoMovimientoCaja, m.tipo)}
                    />
                    {m.tipo === TipoMovimientoCaja.ANULACION && m.dePagoDeOtraSesion ? (
                      <Chip size="small" variant="outlined" label="Pago de otra sesión" />
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>{labelOf(MetodoPago, m.metodo)}</TableCell>
                <TableCell align="right">{formatMoney(m.monto)}</TableCell>
                <TableCell>{usuarioLabel(m.usuarioId, meUsuarioId)}</TableCell>
                <TableCell>
                  {can("pagos.ver") ? (
                    <Link component="button" type="button" variant="body2" onClick={() => setPagoId(m.pagoId)}>
                      #{m.pagoId}
                    </Link>
                  ) : (
                    `#${m.pagoId}`
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  function renderCuerpo() {
    if (result === null) {
      return (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
        </Stack>
      );
    }
    if (detalle === null) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload} disabled={cargando}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar la caja
        </Alert>
      );
    }
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={labelOf(EstadoCajaSesion, sesion.estado)}
            color={colorOf(EstadoCajaSesion, sesion.estado)}
          />
          <Typography variant="body2" color="text.secondary">
            Abierta el {formatInstant(sesion.fechaApertura)} · Fondo inicial {formatMoney(sesion.fondoInicial)}
          </Typography>
        </Stack>
        <Section titulo="Resumen">{renderResumen()}</Section>
        <Section titulo="Eventos">{renderEventos()}</Section>
        {!abierta ? <Section titulo="Movimientos">{renderMovimientos()}</Section> : null}
      </Stack>
    );
  }

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
        <DialogTitle>Caja #{sesionId}</DialogTitle>
        <DialogContent dividers>{renderCuerpo()}</DialogContent>
        <DialogActions>
          {detalle && acciones.trazabilidad ? (
            <Button variant="contorno" component={RouterLink} to={buildTrazabilidadPath({ cajaSesionId: sesionId })}>
              Ver trazabilidad
            </Button>
          ) : null}
          {detalle && acciones.reabrir ? (
            <Button variant="contorno" color="warning" onClick={() => setAccion("reabrir")}>
              Reabrir
            </Button>
          ) : null}
          {detalle && acciones.cerrar ? (
            <Button variant="marron" onClick={() => setAccion("cerrar")}>
              Cerrar caja
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button variant="contorno" onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {accion === "cerrar" && sesion ? (
        <CerrarCajaDialog
          sesion={sesion}
          onClose={() => setAccion(null)}
          onChanged={() => {
            reload();
            onChanged?.();
          }}
          onError={(err) => {
            if (shouldCloseDetailAfterCaja(err.code)) onClose();
          }}
        />
      ) : null}
      {accion === "reabrir" && sesion ? (
        <ReabrirCajaDialog
          sesion={sesion}
          modo={result?.actual?.modo}
          onClose={() => setAccion(null)}
          onChanged={() => {
            reload();
            onChanged?.();
          }}
          onError={(err) => {
            if (shouldCloseDetailAfterCaja(err.code)) onClose();
          }}
        />
      ) : null}
      {pagoId !== null ? (
        <PagoDetalleDialog
          pagoId={pagoId}
          onClose={() => setPagoId(null)}
          // La anulación y la devolución caen en la sesión ACTUAL, no en la del pago: el detalle de esta sesión
          // cerrada no cambia. Solo se avisa para que se actualice la caja actual (D-FI11).
          onChanged={() => onChanged?.()}
        />
      ) : null}
    </>
  );
}
