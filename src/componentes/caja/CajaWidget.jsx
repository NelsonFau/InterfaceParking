// Tarjeta "Caja" del Monitor operativo (spec 09, D-FI12). Es autónoma: hace sus propios pedidos (`/Caja/actual` y,
// con sesión abierta y `caja.ver_esperado`, `/esperado`) y se refresca con el `reloadKey` del Monitor. Si algo
// falla muestra "No se pudo cargar la caja" con "Reintentar" y NO abre un aviso propio (no pisa D-FE12): el
// resto del Monitor sigue funcionando. La monta quien ya comprobó `can("caja.ver")`.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { getCajaActual, getCajaEsperado } from "../../api/cajaApi";
import { usePermissions } from "../../auth/usePermissions";
import { CAJA_PATH } from "../../auth/routes";
import { ModoCaja, labelOf } from "../../constants/enums";
import { CAJA_ESTADO, avisoDiaAnterior, cajaVista } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { useTenantDates } from "../../utils/useTenantDates";

/**
 * @param {{ reloadKey?: number }} props `reloadKey` es el del Monitor: al cambiar, la tarjeta se vuelve a pedir.
 */
export default function CajaWidget({ reloadKey = 0 }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { formatInstant, instantToDateOnly, today } = useTenantDates();
  const [retryKey, setRetryKey] = useState(0);
  // `{ key, status: "ok" | "error", actual, esperado }`: `key` es el pedido que lo trajo.
  const [result, setResult] = useState(null);
  const requestKey = `${reloadKey}|${retryKey}`;
  const verEsperado = can("caja.ver_esperado");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const actual = await getCajaActual();
        const esperado = actual.sesion && verEsperado ? await getCajaEsperado(actual.sesion.id) : null;
        if (!ignore) setResult({ key: requestKey, status: "ok", actual, esperado });
      } catch {
        if (!ignore) setResult({ key: requestKey, status: "error", actual: null, esperado: null });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [requestKey, verEsperado]);

  const cargando = result === null || result.key !== requestKey;

  function renderCuerpo() {
    if (result === null) return <Skeleton variant="rounded" height={70} />;
    if (result.status === "error") {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setRetryKey((k) => k + 1)} disabled={cargando}>
              Reintentar
            </Button>
          }
        >
          No se pudo cargar la caja
        </Alert>
      );
    }
    const sesion = result.actual.sesion ?? null;
    const vista = cajaVista(result.actual, {
      hoy: today(),
      aperturaDia: sesion ? instantToDateOnly(sesion.fechaApertura) : undefined,
    });
    if (vista === null) return <Alert severity="error">No se pudo cargar la caja</Alert>;
    return (
      <Stack spacing={1}>
        {vista.estado === CAJA_ESTADO.SIN_CAJA ? (
          <Typography>Sin caja abierta</Typography>
        ) : (
          <>
            {vista.estado === CAJA_ESTADO.ABIERTA_DIA_ANTERIOR ? (
              <Alert severity="warning">{avisoDiaAnterior(vista.diaAnterior)}</Alert>
            ) : null}
            <Typography>
              Caja abierta desde {formatInstant(vista.sesion.fechaApertura)} · Fondo inicial{" "}
              {formatMoney(vista.sesion.fondoInicial)}
            </Typography>
            {result.esperado ? (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Efectivo esperado
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {formatMoney(result.esperado.efectivoEsperado)}
                </Typography>
              </Box>
            ) : null}
          </>
        )}
        <Box>
          <Chip size="small" label={labelOf(ModoCaja, vista.modo)} />
        </Box>
      </Stack>
    );
  }

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Caja
            </Typography>
          </Box>
          <Button size="small" onClick={() => navigate(CAJA_PATH)}>
            Ir a Caja
          </Button>
        </Stack>
        {renderCuerpo()}
      </CardContent>
    </Card>
  );
}
