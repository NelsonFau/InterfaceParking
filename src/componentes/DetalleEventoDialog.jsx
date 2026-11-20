// Diálogo "Ver detalle" de un evento de Trazabilidad (spec 04, D-FD9, D-FD10).
// AUDITORIA: tabla Campo / Antes / Después con lo cambiado resaltado, y "Ver JSON" con los objetos crudos.
// PAGO, DEVOLUCION, CAJA y ALERTA: pares campo y valor. Los datos del `antes` y el `despues` pueden incluir
// datos personales (P-9 del backend): se muestran tal cual llegan, solo a quien ve esta pantalla, y no se
// guardan en el navegador ni se mandan a la consola.
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { AccionTrazabilidad, Fuente, colorOf, labelOf } from "../constants/enums";
import { auditoriaDetalle, canonicalKey, detallePares, formatValor, humanizeKey } from "../utils/trazabilidadEvento";
import { useTenantDates } from "../utils/useTenantDates";
import { useDialogFullScreen } from "./useDialogFullScreen";

// Tono del tema (`palette.pc.tone`) de cada estado de un campo.
const ESTADO_TONO = { cambiado: "wa", agregado: "ok", quitado: "er" };
const ESTADO_TEXTO = { cambiado: "Cambiado", agregado: "Agregado", quitado: "Quitado" };

const PRE_SX = {
  m: 0,
  p: 1.5,
  bgcolor: "action.hover",
  fontSize: 12.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 320,
  overflow: "auto",
};

function Pre({ titulo, children }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" gutterBottom>
        {titulo}
      </Typography>
      <Paper component="pre" variant="outlined" sx={PRE_SX}>
        {children}
      </Paper>
    </Box>
  );
}

function TablaDiferencias({ filas, soloCambiados, timeZone }) {
  const visibles = soloCambiados ? filas.filter((f) => f.estado !== "igual") : filas;
  if (visibles.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 1 }}>
        No hay campos cambiados.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Campo</TableCell>
          <TableCell>Antes</TableCell>
          <TableCell>Después</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {visibles.map((f) => {
          const color = ESTADO_TONO[f.estado];
          return (
            <TableRow key={f.campo} sx={color ? { bgcolor: (t) => t.palette.pc.tone[color].bg } : undefined}>
              <TableCell sx={{ verticalAlign: "top" }}>
                <Typography variant="body2" fontWeight={color ? 600 : 400}>
                  {humanizeKey(f.campo)}
                </Typography>
                {color && (
                  <Typography variant="caption" color="text.secondary">
                    {ESTADO_TEXTO[f.estado]}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ verticalAlign: "top", wordBreak: "break-word" }}>
                {f.estado === "agregado" ? "—" : formatValor(f.antes, timeZone)}
              </TableCell>
              <TableCell sx={{ verticalAlign: "top", wordBreak: "break-word" }}>
                {f.estado === "quitado" ? "—" : formatValor(f.despues, timeZone)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DetalleAuditoria({ detalle, timeZone }) {
  const [soloCambiados, setSoloCambiados] = useState(true);
  const [verJson, setVerJson] = useState(false);
  const aud = auditoriaDetalle(detalle);

  if (aud.modo === "texto") {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          No se pudieron interpretar los datos como JSON; se muestran tal cual.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Pre titulo="Antes">{aud.antes ?? "—"}</Pre>
          <Pre titulo="Después">{aud.despues ?? "—"}</Pre>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <FormControlLabel
          control={<Switch checked={soloCambiados} onChange={(e) => setSoloCambiados(e.target.checked)} />}
          label="Solo los cambiados"
        />
        <Button size="small" onClick={() => setVerJson((v) => !v)}>
          {verJson ? "Ocultar JSON" : "Ver JSON"}
        </Button>
      </Stack>
      {aud.filas.length === 0 ? (
        <Typography color="text.secondary">Este evento no trae datos.</Typography>
      ) : (
        <TablaDiferencias filas={aud.filas} soloCambiados={soloCambiados} timeZone={timeZone} />
      )}
      {verJson && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Pre titulo="Antes">{JSON.stringify(detalle?.antes ?? null, null, 2)}</Pre>
          <Pre titulo="Después">{JSON.stringify(detalle?.despues ?? null, null, 2)}</Pre>
        </Stack>
      )}
    </Stack>
  );
}

function DetallePares({ evento, timeZone }) {
  const pares = detallePares(evento, timeZone);
  if (pares.length === 0) {
    return <Typography color="text.secondary">Este evento no trae datos.</Typography>;
  }
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 3, rowGap: 1 }}>
      {pares.map((p) => (
        <Box key={p.clave} sx={{ display: "contents" }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {p.etiqueta}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: "break-word" }}>
            {p.valor}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Ids del evento que figuran en el encabezado, con su etiqueta. */
function idsRelacionados(evento) {
  const out = [];
  if (evento.ocupacionId != null) out.push(`Ocupación #${evento.ocupacionId}`);
  if (evento.pagoId != null) out.push(`Pago #${evento.pagoId}`);
  if (evento.cajaSesionId != null) out.push(`Caja #${evento.cajaSesionId}`);
  if (evento.alertaId != null) out.push(`Alerta #${evento.alertaId}`);
  if (evento.entidad && evento.entidadId != null) out.push(`${evento.entidad} · ${evento.entidadId}`);
  return out;
}

/**
 * @param {{ evento: object | null, onClose: () => void }} props `evento` nulo = cerrado.
 */
export default function DetalleEventoDialog({ evento, onClose }) {
  const { formatInstant, timeZone } = useTenantDates();
  const fullScreen = useDialogFullScreen();
  const fuente = canonicalKey(evento?.fuente);
  const accion = canonicalKey(evento?.accion);
  const ids = evento ? idsRelacionados(evento) : [];

  return (
    <Dialog open={Boolean(evento)} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="md">
      <DialogTitle>Detalle del evento</DialogTitle>
      <DialogContent dividers>
        {evento && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {formatInstant(evento.fecha, { seconds: true })}
              </Typography>
              <Chip size="small" label={labelOf(Fuente, fuente)} color={colorOf(Fuente, fuente)} />
              <Chip
                size="small"
                label={labelOf(AccionTrazabilidad, accion)}
                color={colorOf(AccionTrazabilidad, accion)}
              />
              <Typography variant="body2" color="text.secondary">
                {evento.usuarioNombre
                  ? `por ${evento.usuarioNombre}`
                  : evento.automatica
                    ? "Automática"
                    : evento.usuarioId != null
                      ? `por Usuario #${evento.usuarioId}`
                      : ""}
              </Typography>
            </Stack>
            {ids.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ids.map((t) => (
                  <Chip key={t} size="small" variant="outlined" label={t} />
                ))}
              </Stack>
            )}
            {fuente === "AUDITORIA" ? (
              <DetalleAuditoria detalle={evento.detalle} timeZone={timeZone} />
            ) : (
              <DetallePares evento={evento} timeZone={timeZone} />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
