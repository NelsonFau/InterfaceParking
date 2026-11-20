import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { showApiError } from "../api/errors";
import {
  Box,
  Card,
  Typography,
  Stack,
  Skeleton,
  Chip,
  Divider,
} from "@mui/material";

// Cada tarjeta toma el tono de su estado del tema (spec 13, tanda 4): fondo, borde y texto salen de `palette.pc.tone`.
function StatCard({ title, value, hint, tone }) {
  return (
    <Card
      sx={(t) => ({
        p: 2.25,
        bgcolor: t.palette.pc.tone[tone].bg,
        borderColor: t.palette.pc.tone[tone].border,
        color: t.palette.pc.tone[tone].text,
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      })}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Typography variant="body2" sx={{ color: "inherit", fontWeight: 600 }}>
          {title}
        </Typography>

        {hint ? <Chip size="small" label={hint} variant="outlined" /> : null}
      </Stack>

      <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: "inherit" }}>
        {value}
      </Typography>
    </Card>
  );
}

function LoadingDashboard() {
  return (
    <Box
      sx={{
        maxWidth: 980,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: 2,
      }}
    >
      <Stack spacing={2}>
        <Skeleton variant="text" width={240} height={36} />
        <Skeleton variant="text" width={320} height={22} />

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={118} />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

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

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { title: "Total cocheras", value: data.totalCocheras, hint: "Inventario", tone: "de" },
      { title: "Disponibles", value: data.disponiblesAhora, hint: "Ahora", tone: "ok" },
      { title: "Ocupadas", value: data.ocupadasAhora, hint: "Ahora", tone: "oc" },
      { title: "Bloqueadas", value: data.bloqueadas, hint: "Restringidas", tone: "er" },
      { title: "Vencen hoy", value: data.vencenHoy, hint: "Urgente", tone: "wa" },
      { title: "Vencen en 7 días", value: data.vencenEn7Dias, hint: "Próximas", tone: "in" },
    ];
  }, [data]);

  if (!data) return <LoadingDashboard />;

  return (
    <Box
      sx={{
        maxWidth: 980,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: 2,
      }}
    >
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Estado general del garage en tiempo real.
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
        }}
      >
        {stats.slice(0, 4).map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} hint={s.hint} tone={s.tone} />
        ))}

        {/* Segunda fila: centrada y más prolija */}
        <Box
          sx={{
            gridColumn: { xs: "auto", sm: "1 / -1", md: "2 / span 2" },
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          }}
        >
          {stats.slice(4).map((s) => (
            <StatCard key={s.title} title={s.title} value={s.value} hint={s.hint} tone={s.tone} />
          ))}
        </Box>
      </Box>

      {/* Footer mini */}
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 2, color: "text.secondary" }}
      >
        Tip: si ves valores inesperados, revisá Ocupaciones activas y bloqueos.
      </Typography>
    </Box>
  );
}
