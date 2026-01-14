import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Skeleton,
  Chip,
  Divider,
} from "@mui/material";
import toast from "react-hot-toast";

function StatCard({ title, value, hint }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "0 6px 18px rgba(0,0,0,.06)",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {title}
        </Typography>

        {hint ? (
          <Chip
            size="small"
            label={hint}
            sx={{ bgcolor: "action.hover", fontWeight: 600 }}
          />
        ) : null}
      </Stack>

      <Typography
        variant="h3"
        sx={{
          mt: 1,
          fontWeight: 800,
          letterSpacing: -0.5,
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
    </Paper>
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
        toast.error("No pude cargar el resumen");
        console.error(e);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { title: "Total cocheras", value: data.totalCocheras, hint: "Inventario" },
      { title: "Disponibles", value: data.disponiblesAhora, hint: "Ahora" },
      { title: "Ocupadas", value: data.ocupadasAhora, hint: "Ahora" },
      { title: "Bloqueadas", value: data.bloqueadas, hint: "Restringidas" },
      { title: "Vencen hoy", value: data.vencenHoy, hint: "Urgente" },
      { title: "Vencen en 7 días", value: data.vencenEn7Dias, hint: "Próximas" },
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
          <StatCard key={s.title} title={s.title} value={s.value} hint={s.hint} />
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
            <StatCard key={s.title} title={s.title} value={s.value} hint={s.hint} />
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
