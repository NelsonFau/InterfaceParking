// Pestaña "Caja actual" (spec 09, D-FI5): el estado de la caja según el modo (DIARIA o TURNO), el esperado en
// vivo, y abrir o cerrar según permiso. El modo sale SOLO de `GET /Caja/actual`. El aviso de "día anterior" es de
// solo lectura: el backend es la autoridad (`caja_dia_anterior_abierta`) y acá no se bloquea nada.
import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { getCajaActual } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { usePermissions } from "../../auth/usePermissions";
import { ModoCaja, labelOf } from "../../constants/enums";
import { CAJA_ESTADO, accionesDeCaja, avisoDiaAnterior, cajaVista } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { useTenantDates } from "../../utils/useTenantDates";
import AbrirCajaDialog from "./AbrirCajaDialog";
import CerrarCajaDialog from "./CerrarCajaDialog";
import TotalesPorMetodo from "./TotalesPorMetodo";
import { useCajaEsperado } from "./useCajaEsperado";

/**
 * @param {{ refreshKey?: number, onChanged?: () => void, onVerDetalle: (sesionId: number) => void }} props
 *   `refreshKey` lo sube quien sabe que la caja cambió (otro diálogo); `onChanged` avisa que este panel la cambió.
 */
export default function CajaActualPanel({ refreshKey = 0, onChanged, onVerDetalle }) {
  const { can } = usePermissions();
  const { formatInstant, instantToDateOnly, today } = useTenantDates();
  const [reloadKey, setReloadKey] = useState(0);
  // `{ key, status: "ok" | "error", data }`: `key` es el pedido que lo trajo.
  const [result, setResult] = useState(null);
  const [dialogo, setDialogo] = useState(null); // null | "abrir" | "cerrar"
  const requestKey = `${refreshKey}|${reloadKey}`;

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getCajaActual();
        if (!ignore) setResult({ key: requestKey, status: "ok", data });
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setResult({ key: requestKey, status: "error", data: null });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [requestKey]);

  const actual = result?.status === "ok" ? result.data : null;
  const sesion = actual?.sesion ?? null;
  const vista = cajaVista(actual, {
    hoy: today(),
    aperturaDia: sesion ? instantToDateOnly(sesion.fechaApertura) : undefined,
  });
  const acciones = accionesDeCaja(vista, can);
  const esperado = useCajaEsperado(sesion?.id, acciones.verEsperado && sesion !== null, requestKey);

  const reload = () => setReloadKey((k) => k + 1);
  // Quien nos monta sube `refreshKey` y eso recarga este panel; sin él, se recarga solo.
  const cambio = () => (onChanged ? onChanged() : reload());
  const cargando = result === null || result.key !== requestKey;

  if (result === null) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    );
  }

  if (result.status === "error" && vista === null) {
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

  if (vista === null) {
    return <Alert severity="error">No pudimos interpretar la respuesta de la caja</Alert>;
  }

  const sinCaja = vista.estado === CAJA_ESTADO.SIN_CAJA;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Caja actual
          </Typography>
          <Chip size="small" label={labelOf(ModoCaja, vista.modo)} />
        </Stack>
        <Button variant="outlined" size="small" onClick={reload} disabled={cargando}>
          Actualizar
        </Button>
      </Stack>

      {result.status === "error" ? (
        <Alert severity="warning">No pudimos actualizar la caja. Reintentá con 'Actualizar'.</Alert>
      ) : null}

      {sinCaja ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography>
                {vista.modo === ModoCaja.DIARIA
                  ? "Todavía no hay caja hoy. Se abre sola con el primer cobro; abrila a mano si querés declarar el fondo."
                  : "No hay un turno abierto. Abrí la caja para poder cobrar."}
              </Typography>
              {vista.fondoPropuesto !== null && vista.fondoPropuesto !== undefined ? (
                <Typography variant="body2" color="text.secondary">
                  Fondo propuesto (el que quedó del último cierre): {formatMoney(vista.fondoPropuesto)}
                </Typography>
              ) : null}
              {acciones.abrir ? (
                <Box>
                  <Button variant="contained" onClick={() => setDialogo("abrir")} sx={{ fontWeight: 900 }}>
                    Abrir caja
                  </Button>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1.5}>
              {vista.estado === CAJA_ESTADO.ABIERTA_DIA_ANTERIOR ? (
                <Alert
                  severity="warning"
                  action={
                    acciones.cerrar ? (
                      <Button color="inherit" size="small" onClick={() => setDialogo("cerrar")}>
                        Cerrar caja
                      </Button>
                    ) : undefined
                  }
                >
                  {avisoDiaAnterior(vista.diaAnterior)}
                </Alert>
              ) : null}

              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>
                    Caja #{vista.sesion.id} · Abierta desde {formatInstant(vista.sesion.fechaApertura)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fondo inicial: {formatMoney(vista.sesion.fondoInicial)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => onVerDetalle(vista.sesion.id)}>
                    Ver detalle
                  </Button>
                  {acciones.cerrar ? (
                    <Button variant="contained" onClick={() => setDialogo("cerrar")} sx={{ fontWeight: 900 }}>
                      Cerrar caja
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              {acciones.verEsperado ? (
                <>
                  <Divider />
                  {esperado.status === "error" ? (
                    <Typography variant="body2" color="warning.main">
                      No pudimos cargar el esperado
                    </Typography>
                  ) : esperado.data === null ? (
                    <Skeleton variant="rounded" height={90} />
                  ) : (
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Efectivo esperado
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {formatMoney(esperado.data.efectivoEsperado)}
                      </Typography>
                      <TotalesPorMetodo totales={esperado.data.totales} />
                    </Stack>
                  )}
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      )}

      {dialogo === "abrir" ? (
        <AbrirCajaDialog
          modo={vista.modo}
          fondoPropuesto={vista.fondoPropuesto}
          onClose={() => setDialogo(null)}
          onChanged={cambio}
        />
      ) : null}
      {dialogo === "cerrar" && vista.sesion ? (
        <CerrarCajaDialog
          sesion={vista.sesion}
          onClose={() => setDialogo(null)}
          onChanged={cambio}
        />
      ) : null}
    </Stack>
  );
}
