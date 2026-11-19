// Ajuste masivo de precios de los contratos mensuales por porcentaje (spec 10, D-FJ8). Tres pasos: datos,
// revisar y excluir, resultado. El backend no simula ni filtra por tipo (F2, F3): la tabla de candidatos es
// una ayuda para excluir, no el alcance, que lo decide el backend. El resultado se muestra tal cual vino.
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Skeleton,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { showApiError } from "../../api/errors";
import { adjustPreciosMensuales, listOcupaciones } from "../../api/ocupacionApi";
import { EstadoOcupacion } from "../../constants/enums";
import {
  MAX_MOTIVO_CONTRATO,
  candidatosMensuales,
  contratoFieldErrors,
  defaultVigenteDesde,
  resultadoLote,
  validateAjusteMasivo,
} from "../../utils/contratos";
import { formatDateOnly } from "../../utils/fechas";
import { formatMoney } from "../../utils/formato";
import { isTruncated } from "../../utils/ocupaciones";
import { useTenantDates } from "../../utils/useTenantDates";

/** El máximo que devuelve `GET /Ocupacion` (el backend recorta a 500 en silencio). */
const TAKE = 500;
const PASOS = ["Datos", "Revisar y excluir", "Resultado"];

/**
 * @param {{ onClose: () => void, onApplied: () => void }} props `onApplied` recarga el listado de la página.
 */
export default function AjusteMasivoDialog({ onClose, onApplied }) {
  const { today, formatInstant } = useTenantDates();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({ vigenteDesde: defaultVigenteDesde(today()), porcentaje: "", motivo: "" }));
  const [errors, setErrors] = useState({});
  // `{ status: "loading" | "ok" | "error", items, truncated }` o null mientras no se pidió.
  const [lista, setLista] = useState(null);
  const [loadKey, setLoadKey] = useState(0);
  const [excluidos, setExcluidos] = useState(() => new Set());
  const [entiendo, setEntiendo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(null);

  // La lista de candidatos se pide al entrar al paso 2 (y al reintentar).
  useEffect(() => {
    if (loadKey === 0) return undefined;
    let ignore = false;
    (async () => {
      try {
        const data = await listOcupaciones({ estado: EstadoOcupacion.ACTIVA, take: TAKE });
        if (ignore) return;
        setLista({ status: "ok", items: candidatosMensuales(data), truncated: isTruncated([data], TAKE) });
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setLista({ status: "error", items: [], truncated: false });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [loadKey]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function pedirLista() {
    setLista({ status: "loading", items: [], truncated: false });
    setLoadKey((k) => k + 1);
  }

  function siguiente() {
    const r = validateAjusteMasivo(form);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setStep(1);
    if (lista?.status !== "ok") pedirLista();
  }

  function toggle(id) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function aplicar() {
    const ids = (lista?.items ?? []).map((o) => o.id).filter((id) => excluidos.has(id));
    const r = validateAjusteMasivo({ ...form, excluir: ids });
    if (!r.ok) {
      setErrors(r.errors);
      setStep(0);
      return;
    }
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      setResultado(resultadoLote(await adjustPreciosMensuales(r.body)));
      setStep(2);
    } catch (e) {
      const err = showApiError(e);
      const { fields } = contratoFieldErrors(err);
      if (Object.keys(fields).length > 0) {
        // Un ajuste que falla no aplica nada (todo o nada): vuelve al paso 1 con lo escrito y las casillas.
        setErrors(fields);
        setStep(0);
      }
    } finally {
      setSaving(false);
    }
  }

  function cerrar() {
    if (resultado) onApplied();
    onClose();
  }

  const items = lista?.items ?? [];
  const nExcluidos = items.filter((o) => excluidos.has(o.id)).length;

  let cuerpo;
  let acciones;
  if (step === 0) {
    cuerpo = (
      <Stack spacing={2}>
        <TextField
          label="Rige desde"
          type="date"
          value={form.vigenteDesde}
          onChange={(e) => set("vigenteDesde", e.target.value)}
          error={Boolean(errors.vigenteDesde)}
          helperText={errors.vigenteDesde ?? "Tiene que ser posterior a hoy"}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          label="Porcentaje"
          value={form.porcentaje}
          onChange={(e) => set("porcentaje", e.target.value)}
          error={Boolean(errors.porcentaje)}
          helperText={errors.porcentaje ?? "De −50 a 100, hasta 2 decimales. Positivo sube el precio y negativo lo baja"}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          autoFocus
          fullWidth
        />
        <TextField
          label="Motivo"
          value={form.motivo}
          onChange={(e) => set("motivo", e.target.value)}
          error={Boolean(errors.motivo)}
          helperText={errors.motivo ?? `${form.motivo.length}/${MAX_MOTIVO_CONTRATO}`}
          multiline
          minRows={2}
          fullWidth
        />
      </Stack>
    );
    acciones = (
      <>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={siguiente} sx={{ fontWeight: 900 }}>
          Siguiente
        </Button>
      </>
    );
  } else if (step === 1) {
    if (!lista || lista.status === "loading") {
      cuerpo = (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={32} />
          <Skeleton variant="rounded" height={120} />
        </Stack>
      );
    } else if (lista.status === "error") {
      cuerpo = (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={pedirLista}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar los contratos
        </Alert>
      );
    } else {
      cuerpo = (
        <Stack spacing={1.5}>
          <Typography variant="body2">
            Se ajustan los mensuales activos, sin fin o con fin posterior a {formatDateOnly(form.vigenteDesde)},{" "}
            <strong>excepto</strong> los {nExcluidos} que excluyas; hasta {items.length} contratos candidatos.
          </Typography>
          {lista.truncated ? (
            <Alert severity="warning">Puede haber más contratos que los listados: los que no veas también se ajustan</Alert>
          ) : null}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cochera</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell align="center">Excluir</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>#{o.cocheraNumero}</TableCell>
                  <TableCell>{o.clienteNombre}</TableCell>
                  <TableCell>{o.fin ? formatInstant(o.fin) : "Sin fin"}</TableCell>
                  <TableCell align="center">
                    <Checkbox
                      size="small"
                      checked={excluidos.has(o.id)}
                      onChange={() => toggle(o.id)}
                      disabled={saving}
                      slotProps={{ input: { "aria-label": `Excluir la ocupación ${o.id}` } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <FormControlLabel
            control={<Checkbox checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} disabled={saving} />}
            label="Entiendo que el ajuste no se puede deshacer"
          />
        </Stack>
      );
    }
    acciones = (
      <>
        <Button onClick={() => setStep(0)} disabled={saving}>
          Volver
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={aplicar}
          disabled={saving || lista?.status !== "ok" || !entiendo}
          sx={{ fontWeight: 900 }}
        >
          Aplicar ajuste
        </Button>
      </>
    );
  } else {
    cuerpo = resultado.vacio ? (
      <Alert severity="info">No había contratos para ajustar</Alert>
    ) : (
      <Stack spacing={1.5}>
        <Alert severity="success">Se ajustaron {resultado.cantidad} contratos</Alert>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ocupación #</TableCell>
              <TableCell align="right">Precio anterior</TableCell>
              <TableCell align="right">Precio nuevo</TableCell>
              <TableCell>Desde</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resultado.contratos.map((c) => (
              <TableRow key={c.ocupacionId}>
                <TableCell>{c.ocupacionId}</TableCell>
                <TableCell align="right">{formatMoney(c.precioAnterior)}</TableCell>
                <TableCell align="right">{formatMoney(c.precioNuevo)}</TableCell>
                <TableCell>{formatDateOnly(c.vigenteDesde)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    );
    acciones = (
      <Button variant="contained" onClick={cerrar}>
        Cerrar
      </Button>
    );
  }

  return (
    <Dialog open onClose={saving ? undefined : step === 2 ? cerrar : onClose} fullWidth maxWidth="md">
      <DialogTitle>Ajustar precios mensuales</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          {PASOS.map((p) => (
            <Step key={p}>
              <StepLabel>{p}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {cuerpo}
      </DialogContent>
      <DialogActions>{acciones}</DialogActions>
    </Dialog>
  );
}
