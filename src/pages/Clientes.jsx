import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";

function ActivoChip({ activo }) {
  return (
    <Chip
      size="small"
      label={activo ? "Activo" : "Inactivo"}
      color={activo ? "success" : "default"}
      variant={activo ? "filled" : "outlined"}
    />
  );
}

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [q, setQ] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);

  // paginación real
  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // dialog create/edit
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null); // null => crear
  const [saving, setSaving] = useState(false);

  // form
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  function resetForm() {
    setNombreCompleto("");
    setDocumento("");
    setTelefono("");
    setEmail("");
  }

  function abrirCrear() {
    setEdit(null);
    resetForm();
    setOpen(true);
  }

  function abrirEditar(c) {
    setEdit(c);
    setNombreCompleto(c?.nombreCompleto ?? "");
    setDocumento(c?.documento ?? "");
    setTelefono(c?.telefono ?? "");
    setEmail(c?.email ?? "");
    setOpen(true);
  }

  async function cargar(p = page) {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      const term = q.trim();
      if (term) params.set("q", term);

      params.set("page", String(p));
      params.set("pageSize", String(pageSize));

      // si NO quiero ver inactivos => solo activos
      // si verInactivos === true => no mandamos activos => activos=null => trae todos
      if (!verInactivos) params.set("activos", "true");

      const res = await http.get(`/Cliente?${params.toString()}`);

      // Esperamos: { page, pageSize, total, items }
      const data = res.data ?? {};

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);

      // si la API te devuelve la página real, la tomamos (opcional)
      if (typeof data.page === "number" && data.page > 0) setPage(data.page);
      if (typeof data.pageSize === "number" && data.pageSize > 0) setPageSize(data.pageSize);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude cargar clientes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // cuando cambian filtros o pageSize, volvemos a página 1
  useEffect(() => {
    setPage(1);
  }, [q, verInactivos, pageSize]);

  // cuando cambia la page (o filtros/pageSize), cargamos
  useEffect(() => {
    cargar(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, verInactivos, pageSize]);

  async function guardar() {
    const payloadBase = {
      nombreCompleto: nombreCompleto.trim(),
      documento: documento.trim(),
      telefono: telefono.trim(),
      email: email.trim() ? email.trim() : null,
    };

    if (!payloadBase.nombreCompleto) return toast.error("Falta Nombre completo");
    if (!payloadBase.documento) return toast.error("Falta Documento");
    if (!payloadBase.telefono) return toast.error("Falta Teléfono");

    try {
      setSaving(true);

      if (!edit) {
        await http.post("/Cliente", payloadBase);
        toast.success("Cliente creado");
      } else {
        // Update requiere Activo (según tu DTO), mantenemos el actual
        await http.put(`/Cliente/${edit.id}`, {
          ...payloadBase,
          activo: edit.activo ?? true,
        });
        toast.success("Cliente actualizado");
      }

      setOpen(false);

      // recargamos la misma página
      await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude guardar el cliente";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(c) {
    const ok = window.confirm(`¿Desactivar a "${c?.nombreCompleto}"?`);
    if (!ok) return;

    try {
      await http.patch(`/Cliente/${c.id}/desactivar`);
      toast.success("Cliente desactivado");
      await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude desactivar el cliente";
      toast.error(msg);
    }
  }

  async function reactivar(c) {
    const ok = window.confirm(`¿Reactivar a "${c?.nombreCompleto}"?`);
    if (!ok) return;

    try {
      await http.patch(`/Cliente/${c.id}/reactivar`);
      toast.success("Cliente reactivado");
      await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude reactivar el cliente";
      toast.error(msg);
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5">Clientes</Typography>

        <Button variant="contained" onClick={abrirCrear}>
          Nuevo cliente
        </Button>

        <Button variant="outlined" onClick={() => cargar(page)} disabled={loading}>
          Refrescar
        </Button>

        <TextField
          size="small"
          label="Buscar (nombre/doc/tel/email)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 280 }}
        />

        <FormControlLabel
          control={
            <Switch checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
          }
          label="Ver inactivos"
        />
      </Stack>

      {!loading && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {items.length} de {total} · Página {page} / {totalPages}
          </Typography>

          <Button
            variant="outlined"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>

          <Button
            variant="outlined"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>

          {/* opcional: pageSize rápido */}
          <TextField
            size="small"
            label="Page size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) || 10)}
            sx={{ width: 120 }}
          />
        </Stack>
      )}

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <Stack spacing={1.2}>
          {items.map((c) => (
            <Card key={c.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack spacing={0.3}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={800}>{c.nombreCompleto}</Typography>
                      <ActivoChip activo={c.activo} />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Doc: {c.documento} · Tel: {c.telefono}
                      {c.email ? ` · Email: ${c.email}` : ""}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => abrirEditar(c)}>
                      Editar
                    </Button>

                    {c.activo ? (
                      <Button color="error" variant="contained" onClick={() => desactivar(c)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button color="success" variant="contained" onClick={() => reactivar(c)}>
                        Reactivar
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!items.length && (
            <Typography color="text.secondary">No hay clientes para mostrar.</Typography>
          )}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                fullWidth
              />

              <TextField
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="Email (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            {edit && (
              <>
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Estado:
                  </Typography>
                  <ActivoChip activo={edit.activo} />
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
