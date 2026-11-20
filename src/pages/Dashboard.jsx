// Panel (`/dashboard`, guía visual 2 y capturas panel.png / panel-plano.png): una sola tarjeta con los 6 indicadores
// de `GET /Panel/resumen` y, debajo, el área del plano. Hasta que esté el PB-24 (plano posicional y niveles) el
// área es la grilla de mosaicos de cocheras, con la leyenda-filtro funcionando con los datos reales. Se omiten el
// selector de nivel y el zoom.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { http } from "../api/http";
import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import CocheraMosaico from "../componentes/cocheras/CocheraMosaico";
import { useCocherasMosaico } from "../componentes/cocheras/useCocherasMosaico";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";
import { SituacionCochera, colorOf, entriesOf, labelOf } from "../constants/enums";
import { COLOR_TONE } from "../theme/theme";
import { contarSituaciones, situacionCochera } from "../utils/cocheras";
import { buildCocheraPath } from "../utils/cocheraLink";
import { formatNumber } from "../utils/formato";

const TODOS = "todos";
const GRID_COLUMNS = { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(6, 1fr)" };

function Indicador({ titulo, valor }) {
  return (
    <Paper variant="tile" sx={{ p: 2 }}>
      <Typography variant="body1" color="text.secondary">
        {titulo}
      </Typography>
      <Typography variant="kpi" component="div" sx={{ mt: 0.5 }}>
        {formatNumber(valor)}
      </Typography>
    </Paper>
  );
}

// Chip de la leyenda-filtro: un cuadradito del color de la situación y el conteo. El elegido va con borde oscuro.
function ChipLeyenda({ etiqueta, cantidad, tono, activo, onClick }) {
  return (
    <Chip
      variant="outlined"
      clickable
      onClick={onClick}
      aria-pressed={activo}
      icon={
        tono ? (
          <Box
            component="span"
            sx={(theme) => ({ width: 12, height: 12, ml: 1, flexShrink: 0, bgcolor: theme.palette.pc.tone[tono].text })}
          />
        ) : undefined
      }
      label={`${etiqueta} · ${formatNumber(cantidad)}`}
      sx={{ height: 32, borderColor: activo ? "text.primary" : undefined }}
    />
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
  const visibles = filtro === TODOS ? conSituacion : conSituacion.filter((x) => x.situacion === filtro);

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
          {visibles.map(({ c }) => (
            <CocheraMosaico key={c.id} cochera={c} now={now} deudaIds={deudaIds} onClick={(id) => navigate(buildCocheraPath(id))} />
          ))}
        </Box>
      );
    }

    plano = (
      <Paper variant="hundido" sx={{ mt: 2, p: 2.5 }}>
        <Stack spacing={2.5}>
          {grilla}
          {items && items.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} aria-label="Leyenda y filtro de cocheras">
              <ChipLeyenda etiqueta="Todos" cantidad={items.length} activo={filtro === TODOS} onClick={() => setFiltro(TODOS)} />
              {entriesOf(SituacionCochera)
                .filter((e) => (cuenta.get(e.value) ?? 0) > 0)
                .map((e) => (
                  <ChipLeyenda
                    key={e.value}
                    etiqueta={labelOf(SituacionCochera, e.value)}
                    cantidad={cuenta.get(e.value)}
                    tono={COLOR_TONE[colorOf(SituacionCochera, e.value)]}
                    activo={filtro === e.value}
                    onClick={() => setFiltro(e.value)}
                  />
                ))}
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  return (
    <Box>
      <EncabezadoPagina titulo="Panel" subtitulo="Estado general del garage en tiempo real." />

      <Tarjeta>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
          }}
        >
          {indicadores.map((i) => (
            <Indicador key={i.titulo} titulo={i.titulo} valor={i.valor} />
          ))}
        </Box>
        {plano}
      </Tarjeta>
    </Box>
  );
}
