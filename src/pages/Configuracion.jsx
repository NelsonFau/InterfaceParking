import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { getConfiguracion, updateConfiguracion } from "../api/configuracionApi";
import { showApiError } from "../api/errors";
import { useMe, usePermissions } from "../auth/usePermissions";
import { FraccionMes, ModoCaja, ModoMes, labelOf, optionsOf } from "../constants/enums";
import { ZONAS_HORARIAS, labelOfZona } from "../constants/zonasHorarias";
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";
import {
  CONFIG_AYUDA,
  afterSaveError,
  buildUpdateBody,
  diffConfiguracion,
  summarizeChanges,
  toForm,
  validateConfiguracionForm,
} from "../utils/configuracion";

// Campos de cada tarjeta en dos columnas en desktop.
const GRID_CAMPOS = { display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, alignItems: "start" };

const MODO_CAJA_OPTIONS = optionsOf(ModoCaja);
const MODO_MES_OPTIONS = optionsOf(ModoMes);
const FRACCION_MES_OPTIONS = optionsOf(FraccionMes);

// Párrafos del diálogo de confirmación (D-FK8). Las etiquetas salen de labelOfZona y labelOf.
function ConfirmParagraphs({ cambios }) {
  return (
    <Stack spacing={1.5}>
      {cambios.zona ? (
        <Typography>
          Vas a cambiar la zona horaria de <b>{labelOfZona(cambios.zona.de)}</b> a <b>{labelOfZona(cambios.zona.a)}</b>.
          Cambia cómo se interpretan y se muestran todas las fechas y horas del local. No se puede cambiar con una caja
          abierta.
        </Typography>
      ) : null}
      {cambios.modoCaja ? (
        <Typography>
          Vas a cambiar el modo de caja de <b>{labelOf(ModoCaja, cambios.modoCaja.de)}</b> a{" "}
          <b>{labelOf(ModoCaja, cambios.modoCaja.a)}</b>.{" "}
          {cambios.modoCaja.a === ModoCaja.TURNO
            ? "La caja ya no se abre sola: hay que abrirla a mano, y sin caja abierta no se puede cobrar, anular ni devolver."
            : "La caja se abre sola con el primer movimiento del día y hay que cerrarla antes de que termine el día."}{" "}
          No se puede cambiar con una caja abierta.
        </Typography>
      ) : null}
      {cambios.modoMes ? (
        <Typography>
          Vas a cambiar cómo se arman los períodos de los contratos mensuales de{" "}
          <b>{labelOf(ModoMes, cambios.modoMes.de)}</b> a <b>{labelOf(ModoMes, cambios.modoMes.a)}</b>. Afecta solo a
          los contratos nuevos; los que están en curso no cambian.
        </Typography>
      ) : null}
      {cambios.fraccionMes ? (
        <Typography>
          Vas a cambiar cómo se cobra un período incompleto de <b>{labelOf(FraccionMes, cambios.fraccionMes.de)}</b> a{" "}
          <b>{labelOf(FraccionMes, cambios.fraccionMes.a)}</b>. Afecta solo a los contratos nuevos; los que están en
          curso no cambian.
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function Configuracion() {
  const fullScreen = useDialogFullScreen();
  const { can } = usePermissions();
  const { refreshMe } = useMe();
  const canEdit = can("configuracion.editar");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  // Lo último que vino del servidor (con su `version`) y lo que se está editando.
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(null); // null | cambios a confirmar
  const [conflict, setConflict] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const recargar = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setConflict(false);
    setRefreshFailed(false);
    setLoadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getConfiguracion();
        if (ignore) return;
        setOriginal(data);
        setDraft(toForm(data));
      } catch (e) {
        if (ignore) return;
        setOriginal(null);
        setDraft(null);
        setLoadError(true);
        showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [loadKey]);

  const validation = useMemo(() => (draft ? validateConfiguracionForm(draft) : null), [draft]);
  const errors = validation && !validation.ok ? validation.errors : {};
  const hayCambios = original && draft ? Object.keys(diffConfiguracion(original, draft)).length > 0 : false;

  // Una zona guardada fuera de la lista se ofrece como opción extra mientras no se toque (D-FK4).
  const zonaFueraDeLista =
    original && !ZONAS_HORARIAS.some((z) => z.value === original.zonaHoraria) && draft?.zonaHoraria === original.zonaHoraria;

  const set = (campo) => (e) => setDraft((d) => ({ ...d, [campo]: e.target.value }));

  async function guardar() {
    setSaving(true);
    try {
      const res = await updateConfiguracion(buildUpdateBody(original, draft));
      const zonaCambio = res.zonaHoraria !== original.zonaHoraria;
      setConfirmando(null);
      setConflict(false);
      setRefreshFailed(false);
      setOriginal(res);
      setDraft(toForm(res));
      toast.success("Configuración guardada");
      if (zonaCambio) {
        try {
          await refreshMe();
        } catch (e) {
          showApiError(e);
          setRefreshFailed(true);
        }
      }
    } catch (e) {
      const err = showApiError(e);
      setConfirmando(null);
      if (afterSaveError(err.code).ofrecerRecargar) setConflict(true);
    } finally {
      setSaving(false);
    }
  }

  function onGuardar() {
    if (!validation?.ok) return;
    const cambios = summarizeChanges(original, draft);
    if (Object.keys(cambios).length > 0) setConfirmando(cambios);
    else guardar();
  }

  const campoNumero = (campo, label) => (
    <Campo
      key={campo}
      label={label}
      value={draft[campo]}
      onChange={set(campo)}
      disabled={!canEdit || saving}
      error={Boolean(errors[campo])}
      helperText={errors[campo] ?? CONFIG_AYUDA[campo]}
      slotProps={{ htmlInput: { inputMode: "numeric" } }}
    />
  );

  const campoSelect = (campo, label, options, extra = []) => (
    <Campo
      select
      label={label}
      value={draft[campo]}
      onChange={set(campo)}
      disabled={!canEdit || saving}
      error={Boolean(errors[campo])}
      helperText={errors[campo] ?? CONFIG_AYUDA[campo]}
    >
      {[...extra, ...options].map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </Campo>
  );

  let contenido;
  if (loading) {
    contenido = (
      <Stack spacing={1}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Stack>
    );
  } else if (loadError || !draft) {
    contenido = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={recargar}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar la configuración
      </Alert>
    );
  } else {
    const zonaExtra = zonaFueraDeLista
      ? [{ value: original.zonaHoraria, label: `${original.zonaHoraria} (fuera de la lista)` }]
      : [];
    contenido = (
      <Stack spacing={2}>
        {!canEdit ? <Alert severity="info">Solo el dueño puede modificar la configuración</Alert> : null}
        {conflict ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={recargar}>
                Recargar valores
              </Button>
            }
          >
            Otra persona guardó cambios antes que vos. Recargá los valores para ver los vigentes; lo que editaste se
            descarta.
          </Alert>
        ) : null}
        {refreshFailed ? (
          <Alert severity="warning">
            La configuración se guardó, pero no pudimos actualizar la zona horaria en esta sesión. Recargá la página.
          </Alert>
        ) : null}

        <Tarjeta titulo="Local">
          <Box sx={GRID_CAMPOS}>{campoSelect("zonaHoraria", "Zona horaria", ZONAS_HORARIAS, zonaExtra)}</Box>
        </Tarjeta>

        <Tarjeta titulo="Caja">
          <Box sx={GRID_CAMPOS}>{campoSelect("modoCaja", "Modo de caja", MODO_CAJA_OPTIONS)}</Box>
        </Tarjeta>

        <Tarjeta titulo="Ocupaciones">
          <Box sx={GRID_CAMPOS}>
            {campoNumero("toleranciaInicioHoras", "Tolerancia de inicio (horas)")}
            {campoNumero("topePasadoDias", "Tope hacia atrás (días)")}
            {campoNumero("techoFuturoMeses", "Techo hacia adelante (meses)")}
            {campoNumero("graciaHoraMinutos", "Gracia por hora (minutos)")}
          </Box>
        </Tarjeta>

        <Tarjeta titulo="Contratos mensuales">
          <Box sx={GRID_CAMPOS}>
            {campoSelect("modoMes", "Modo del mes", MODO_MES_OPTIONS)}
            {campoSelect("fraccionMes", "Fracción del mes", FRACCION_MES_OPTIONS)}
            {campoNumero("diasGraciaMora", "Días de gracia de mora")}
          </Box>
        </Tarjeta>

        <Tarjeta titulo="Alertas">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Ventana de alertas
          </Typography>
          <Typography>{original.ventanaAlertasDias} días</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {CONFIG_AYUDA.ventanaAlertasDias}
          </Typography>
        </Tarjeta>

        {canEdit ? (
          <Stack direction="row" spacing={1.25} justifyContent="flex-end">
            <Button variant="contorno" onClick={() => setDraft(toForm(original))} disabled={saving || !hayCambios}>
              Descartar cambios
            </Button>
            <Button variant="marron" onClick={onGuardar} disabled={saving || !hayCambios || !validation?.ok}>
              Guardar
            </Button>
          </Stack>
        ) : null}
      </Stack>
    );
  }

  return (
    <Box>
      <EncabezadoPagina titulo="Configuración" subtitulo="Parámetros del local." />

      {contenido}

      {confirmando ? (
        <Dialog open onClose={saving ? undefined : () => setConfirmando(null)} fullScreen={fullScreen} fullWidth maxWidth="sm">
          <DialogTitle>Confirmar cambios</DialogTitle>
          <DialogContent dividers>
            <ConfirmParagraphs cambios={confirmando} />
          </DialogContent>
          <DialogActions>
            <Button variant="contorno" onClick={() => setConfirmando(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="marron" onClick={guardar} disabled={saving}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  );
}
