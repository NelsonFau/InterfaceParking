// Panel (`/dashboard`, guía visual 2 y capturas panel.png / panel-plano.png): una sola tarjeta con los 6 indicadores
// de `GET /Panel/resumen` y, debajo, el área del plano. Hasta que esté el PB-24 (plano posicional y niveles) el
// área es la grilla de mosaicos de cocheras, con la leyenda-filtro funcionando con los datos reales. Se omiten el
// selector de nivel y el zoom.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, ButtonBase, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { http } from "../api/http";
import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import CocheraMosaico from "../componentes/cocheras/CocheraMosaico";
import { useCocherasMosaico } from "../componentes/cocheras/useCocherasMosaico";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";
import { SituacionCochera, entriesOf, labelOf } from "../constants/enums";
import { LEGEND_RADIUS, SWATCH_RADIUS } from "../theme/theme";
import { claveCochera, contarSituaciones, situacionCochera } from "../utils/cocheras";
import { buildCocheraPath } from "../utils/cocheraLink";
import { formatNumber } from "../utils/formato";

const TODOS = "todos";
const GRID_COLUMNS = { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(6, 1fr)" };

function Indicador({ titulo, valor }) {
  return (
    <Paper variant="tile" sx={{ flex: "1 0 110px", minWidth: 110 }}>
      <Typography variant="kpiLabel" color="text.secondary">
        {titulo}
      </Typography>
      <Typography variant="kpi">{formatNumber(valor)}</Typography>
    </Paper>
  );
}

// Chip de la leyenda-filtro (detalles 6.3): cuadradito del color de la situación, texto de 16 px y el conteo.
// El elegido va con fondo de tarjeta y borde del acento; los demás, transparentes.
function ChipLeyenda({ etiqueta, cantidad, color, activo, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={activo}
      sx={(theme) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: `${LEGEND_RADIUS}px`,
        border: "1px solid",
        borderColor: activo ? "primary.main" : "transparent",
        bgcolor: activo ? "background.paper" : "transparent",
        font: "inherit",
        fontSize: "1rem",
        fontWeight: 600,
        color: "text.primary",
        "&:hover": { bgcolor: activo ? "background.paper" : theme.palette.pc.sunk },
      })}
    >
      <Box
        component="span"
        sx={(theme) => ({
          width: 14,
          height: 14,
          flexShrink: 0,
          borderRadius: `${SWATCH_RADIUS}px`,
          bgcolor: color(theme),
        })}
      />
      {`${etiqueta} · ${formatNumber(cantidad)}`}
    </ButtonBase>
  );
}

function CargandoPanel() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="text" width={240} height={44} />
      <Skeleton variant="text" width={320} height={24} />
      <Skeleton variant="rounded" height={420} />
    </Stack>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const puedeVerCocheras = can("cocheras.ver");
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState(TODOS);
  const { items, deudaIds, loading, error, now, reload } = useCocherasMosaico();

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get("/Panel/resumen");
        setData(res.data);
      } catch (e) {
        showApiError(e);
      }
    })();
  }, []);

  const indicadores = useMemo(() => {
    if (!data) return [];
    return [
      { titulo: "Total cocheras", valor: data.totalCocheras },
      { titulo: "Disponibles", valor: data.disponiblesAhora },
      { titulo: "Ocupadas", valor: data.ocupadasAhora },
      { titulo: "Bloqueadas", valor: data.bloqueadas },
      { titulo: "Vencen hoy", valor: data.vencenHoy },
      { titulo: "Vencen en 7 días", valor: data.vencenEn7Dias },
    ];
  }, [data]);

  // Situación de cada cochera, una sola vez: la usan la leyenda y el filtro.
  const conSituacion = useMemo(
    () =>
      (items ?? [])
        .map((c) => ({ c, situacion: situacionCochera(c, now, deudaIds) }))
        .sort((a, b) => a.c.numero - b.c.numero),
    [items, now, deudaIds],
  );
  const cuenta = useMemo(() => contarSituaciones(conSituacion.map((x) => x.situacion)), [conSituacion]);

  if (!data) return <CargandoPanel />;

  let plano = null;
  if (puedeVerCocheras) {
    let grilla;
    if (loading) {
      grilla = (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={104} />
          ))}
        </Box>
      );
    } else if (error || !items) {
      grilla = (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar las cocheras
        </Alert>
      );
    } else if (items.length === 0) {
      grilla = <Typography color="text.secondary">Todavía no hay cocheras.</Typography>;
    } else {
      grilla = (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
          {conSituacion.map(({ c, situacion }) => (
            <CocheraMosaico
              key={c.id}
              cochera={c}
              now={now}
              deudaIds={deudaIds}
              resalte={filtro === TODOS ? undefined : situacion === filtro ? "resaltado" : "atenuado"}
              onClick={(id) => navigate(buildCocheraPath(id))}
            />
          ))}
        </Box>
      );
    }

    plano = (
      <Box sx={{ mt: 2 }}>
        <Paper variant="hundido" sx={{ p: 2.5 }}>
          {grilla}
        </Paper>
        {items && items.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 2 }} aria-label="Leyenda y filtro de cocheras">
            <ChipLeyenda
              etiqueta="Todos"
              cantidad={items.length}
              color={(theme) => theme.palette.pc.accent}
              activo={filtro === TODOS}
              onClick={() => setFiltro(TODOS)}
            />
            {entriesOf(SituacionCochera)
              .filter((e) => (cuenta.get(e.value) ?? 0) > 0)
              .map((e) => (
                <ChipLeyenda
                  key={e.value}
                  etiqueta={labelOf(SituacionCochera, e.value)}
                  cantidad={cuenta.get(e.value)}
                  color={(theme) => theme.palette.pc.cochera[claveCochera(e.value)]}
                  activo={filtro === e.value}
                  onClick={() => setFiltro(e.value)}
                />
              ))}
          </Stack>
        ) : null}
      </Box>
    );
  }

  return (
    <Box>
      <EncabezadoPagina titulo="Panel" subtitulo="Estado general del garage en tiempo real." />

      <Tarjeta>
        <Box sx={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {indicadores.map((i) => (
            <Indicador key={i.titulo} titulo={i.titulo} valor={i.valor} />
          ))}
        </Box>
        {plano}
      </Tarjeta>
    </Box>
  );
}
