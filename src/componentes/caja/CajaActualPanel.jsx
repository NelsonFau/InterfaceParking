// Pestaña "Caja actual" (spec 09, D-FI5): el estado de la caja según el modo (DIARIA o TURNO), el esperado en
// vivo, y abrir o cerrar según permiso. El modo sale SOLO de `GET /Caja/actual`. El aviso de "día anterior" es de
// solo lectura: el backend es la autoridad (`caja_dia_anterior_abierta`) y acá no se bloquea nada.
import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { getCajaActual } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { usePermissions } from "../../auth/usePermissions";
import { EstadoCajaSesion, ModoCaja, labelOf } from "../../constants/enums";
import { CAJA_ESTADO, accionesDeCaja, avisoDiaAnterior, cajaVista } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { useTenantDates } from "../../utils/useTenantDates";
import Tarjeta from "../ui/Tarjeta";
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
  const chipModo = <Chip size="small" variant="outlined" label={labelOf(ModoCaja, vista.modo)} />;

  return (
    <Stack spacing={2}>
      {result.status === "error" ? (
        <Alert severity="warning">No pudimos actualizar la caja. Reintentá con el botón de actualizar.</Alert>
      ) : null}

      {sinCaja ? (
        <Tarjeta
          titulo={
            <Stack direction="row" spacing={1.5} alignItems="center">
              <span>{vista.modo === ModoCaja.DIARIA ? "Diaria · sin sesión" : "Por turno · sin sesión"}</span>
              {chipModo}
            </Stack>
          }
          acciones={<Chip size="small" label="Sin sesión" />}
        >
          <Stack spacing={1.5}>
            <Typography>
              {vista.modo === ModoCaja.DIARIA
                ? "Todavía no hay caja hoy. Se abre sola con el primer cobro; abrila a mano si querés declarar el fondo."
                : "No hay un turno abierto. Abrí la caja para poder cobrar."}
            </Typography>
            {vista.fondoPropuesto !== null && vista.fondoPropuesto !== undefined ? (
              <Typography>Fondo propuesto: {formatMoney(vista.fondoPropuesto)}</Typography>
            ) : null}
            {acciones.abrir ? (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="arena" onClick={() => setDialogo("abrir")}>
                  Abrir caja
                </Button>
              </Box>
            ) : null}
          </Stack>
        </Tarjeta>
      ) : (
        <Tarjeta
          titulo={
            <Stack direction="row" spacing={1.5} alignItems="center">
              <span>Caja actual</span>
              {chipModo}
            </Stack>
          }
          acciones={<Chip size="small" color="success" label={labelOf(EstadoCajaSesion, EstadoCajaSesion.ABIERTA)} />}
        >
          <Stack spacing={2}>
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

            {acciones.verEsperado ? (
              esperado.status === "error" ? (
                <Typography variant="body2" color="warning.main">
                  No pudimos cargar el esperado
                </Typography>
              ) : esperado.data === null ? (
                <Skeleton variant="rounded" height={90} />
              ) : (
                <TotalesPorMetodo totales={esperado.data.totales} />
              )
            ) : null}

            <Typography variant="body2">
              Caja #{vista.sesion.id} · Abierta desde {formatInstant(vista.sesion.fechaApertura)} · Fondo inicial{" "}
              {formatMoney(vista.sesion.fondoInicial)}
            </Typography>

            {acciones.verEsperado && esperado.data ? (
              <Typography variant="body2">Efectivo esperado: {formatMoney(esperado.data.efectivoEsperado)}</Typography>
            ) : null}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="pill" onClick={() => onVerDetalle(vista.sesion.id)}>
                Ver detalle
              </Button>
              {acciones.cerrar ? (
                <Button variant="pill" color="info" onClick={() => setDialogo("cerrar")}>
                  Cerrar caja
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Tarjeta>
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
