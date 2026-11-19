import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  createUsuario,
  deactivateUsuario,
  listUsuarios,
  reactivateUsuario,
  resendInvitacion,
  updateUsuarioRol,
} from "../api/usuariosApi";
import { showApiError } from "../api/errors";
import { useMe, usePermissions } from "../auth/usePermissions";
import { RolUsuario, labelOf, optionsOf } from "../constants/enums";
import { buildTrazabilidadPath } from "../utils/trazabilidadLink";
import { useTenantDates } from "../utils/useTenantDates";
import {
  ROLES_INVITABLES_KEYS,
  filterUsuarios,
  shouldReloadAfter,
  sortUsuarios,
  summarizeRoleChange,
  usuarioRowActions,
  validateInvitacion,
} from "../utils/usuarios";

const ROL_OPTIONS = optionsOf(RolUsuario, { only: ROLES_INVITABLES_KEYS });
const msgReenvio = (email) => `Le enviamos de nuevo la invitación a ${email}`;

// Diálogo "Invitar usuario" (D-FL5): el rol arranca sin elegir y los errores se ven al tocar el campo o al enviar.
function InvitarDialog({ onClose, onDone, onError }) {
  const [form, setForm] = useState({ nombre: "", email: "", rol: "" });
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  const r = validateInvitacion(form);
  const errors = r.ok ? {} : r.errors;
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const touch = (campo) => () => setTouched((t) => ({ ...t, [campo]: true }));
  const err = (campo) => (touched[campo] ? errors[campo] : undefined);

  async function enviar() {
    if (!r.ok) {
      setTouched({ nombre: true, email: true, rol: true });
      return;
    }
    try {
      setSaving(true);
      const res = await createUsuario(r.body);
      onDone(res);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Invitar usuario</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={set("nombre")}
            onBlur={touch("nombre")}
            error={Boolean(err("nombre"))}
            helperText={err("nombre")}
            autoFocus
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            onBlur={touch("email")}
            error={Boolean(err("email"))}
            helperText={err("email")}
            fullWidth
          />
          <TextField
            select
            label="Rol"
            value={form.rol}
            onChange={set("rol")}
            onBlur={touch("rol")}
            error={Boolean(err("rol"))}
            helperText={err("rol")}
            fullWidth
          >
            {ROL_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={enviar} disabled={saving}>
          Invitar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Diálogo "Cambiar rol" (D-FL8): selector y, después, resumen "de X a Y" para confirmar.
function RolDialog({ usuario, onClose, onDone, onError }) {
  const [rol, setRol] = useState(usuario.rol);
  const [confirmando, setConfirmando] = useState(false);
  const [saving, setSaving] = useState(false);

  const resumen = summarizeRoleChange(usuario, Number(rol));

  async function confirmar() {
    try {
      setSaving(true);
      await updateUsuarioRol(usuario.id, resumen.a);
      onDone("Rol actualizado");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{`Cambiar rol de ${usuario.nombre}`}</DialogTitle>
      <DialogContent dividers>
        {confirmando ? (
          <Typography>
            <b>{resumen.nombre}</b> pasa de <b>{labelOf(RolUsuario, resumen.de)}</b> a{" "}
            <b>{labelOf(RolUsuario, resumen.a)}</b>. Sus permisos cambian en su próximo pedido.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Rol" value={rol} onChange={(e) => setRol(e.target.value)} fullWidth>
              {ROL_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {confirmando ? (
          <>
            <Button onClick={() => setConfirmando(false)} disabled={saving}>
              Volver
            </Button>
            <Button variant="contained" onClick={confirmar} disabled={saving}>
              Confirmar
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="contained" onClick={() => setConfirmando(true)} disabled={!resumen.cambia}>
              Guardar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Confirmación de "Desactivar" (D-FL9). Desactivar es solo local: no se promete más que eso.
function DesactivarDialog({ usuario, onClose, onDone, onError }) {
  const [saving, setSaving] = useState(false);

  async function desactivar() {
    try {
      setSaving(true);
      await deactivateUsuario(usuario.id);
      onDone("Usuario desactivado");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{`¿Desactivar a ${usuario.nombre}?`}</DialogTitle>
      <DialogContent dividers>
        <Typography>No va a poder ingresar al sistema hasta que lo reactives.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" color="error" onClick={desactivar} disabled={saving}>
          Desactivar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Usuarios() {
  const { can } = usePermissions();
  const { me } = useMe();
  const { formatInstantDate } = useTenantDates();
  // Lo que escribe se oculta por permiso (D-FL3); nunca se decide por rol (ARQ-4).
  const canManage = can("usuarios.gestionar");
  const canTrazabilidad = can("auditoria.ver");
  const meId = me?.usuarioId ?? null;

  // `null` = todavía no cargado: nunca se muestra como "no hay usuarios" (D-FL4).
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [texto, setTexto] = useState("");
  const [mostrarDesactivados, setMostrarDesactivados] = useState(true);

  // Diálogo abierto: null | { tipo: "invitar" } | { tipo: "rol" | "desactivar", usuario }.
  const [dialog, setDialog] = useState(null);
  // Menú de acciones de una fila: null | { anchor, usuario }.
  const [menu, setMenu] = useState(null);
  // Invitación creada pero no enviada (D-FL6): estado de pantalla, se pierde al recargar la página.
  const [aviso, setAviso] = useState(null);
  const [busy, setBusy] = useState(false);

  const recargar = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setListKey((k) => k + 1);
  }, []);

  // La lista se pide de nuevo después de cualquier escritura (D-FL4). `ignore` descarta una respuesta tardía.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listUsuarios();
        if (ignore) return;
        setItems(data);
      } catch (e) {
        if (ignore) return;
        setItems(null);
        setLoadError(true);
        showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [listKey]);

  const visibles = useMemo(
    () => (items ? sortUsuarios(filterUsuarios(items, { texto, mostrarDesactivados })) : []),
    [items, texto, mostrarDesactivados]
  );

  // Errores de una escritura (D-FL12): aviso con el `title`; si el estado quedó viejo, recarga y se cierra
  // el diálogo. Sin recarga el diálogo sigue abierto para corregir. Con Auth0 caído (503) el diálogo también
  // sigue abierto: el reintento es manual y así no se pierde lo escrito.
  function manejarError(e) {
    const err = showApiError(e);
    if (shouldReloadAfter(err.code)) {
      if (err.code !== "proveedor_identidad_no_disponible") setDialog(null);
      recargar();
    }
    return err;
  }

  function terminar(mensaje) {
    toast.success(mensaje);
    setDialog(null);
    recargar();
  }

  function invitacionCreada({ usuario, invitacionEnviada }) {
    setDialog(null);
    recargar();
    if (invitacionEnviada) {
      setAviso(null);
      toast.success(`Invitación enviada a ${usuario.email}`);
    } else {
      setAviso({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });
    }
  }

  async function reenviar(usuario) {
    if (busy) return;
    try {
      setBusy(true);
      await resendInvitacion(usuario.id);
      toast.success(msgReenvio(usuario.email));
      setAviso((a) => (a && a.id === usuario.id ? null : a));
    } catch (e) {
      // Si el reenvío falla, el aviso sigue y `showApiError` explica.
      const err = showApiError(e);
      if (shouldReloadAfter(err.code)) recargar();
    } finally {
      setBusy(false);
    }
  }

  async function reactivar(usuario) {
    if (busy) return;
    try {
      setBusy(true);
      await reactivateUsuario(usuario.id);
      toast.success("Usuario reactivado");
      recargar();
    } catch (e) {
      const err = showApiError(e);
      if (shouldReloadAfter(err.code)) recargar();
    } finally {
      setBusy(false);
    }
  }

  const cerrarMenu = () => setMenu(null);
  const accionMenu = (fn) => {
    const usuario = menu.usuario;
    cerrarMenu();
    fn(usuario);
  };
  const accionesMenu = menu ? usuarioRowActions(menu.usuario, { meId, canManage }) : null;

  let contenido;
  if (loading) {
    contenido = (
      <Stack spacing={1}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={40} />
        ))}
      </Stack>
    );
  } else if (loadError || !items) {
    contenido = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={recargar}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar los usuarios
      </Alert>
    );
  } else if (items.length === 0) {
    contenido = <Typography color="text.secondary">Todavía no hay usuarios</Typography>;
  } else if (visibles.length === 0) {
    contenido = <Typography color="text.secondary">No hay usuarios con ese filtro.</Typography>;
  } else {
    contenido = (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Alta</TableCell>
              {canManage || canTrazabilidad ? <TableCell align="right">Acciones</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((u) => {
              const acc = usuarioRowActions(u, { meId, canManage });
              const hayMenu = acc.cambiarRol || acc.desactivar || acc.reenviar || acc.reactivar;
              return (
                <TableRow key={u.id} hover sx={{ opacity: u.activo ? 1 : 0.55 }}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{u.nombre}</span>
                      {acc.esPropio ? <Chip size="small" label="Vos" color="primary" variant="outlined" /> : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{labelOf(RolUsuario, u.rol)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={u.activo ? "Activo" : "Desactivado"}
                      color={u.activo ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>{formatInstantDate(u.fechaCreacion)}</TableCell>
                  {canManage || canTrazabilidad ? (
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {canTrazabilidad ? (
                        <Button size="small" component={RouterLink} to={buildTrazabilidadPath({ usuarioId: u.id })}>
                          Ver actividad
                        </Button>
                      ) : null}
                      {hayMenu ? (
                        <IconButton
                          size="small"
                          aria-label={`Acciones de ${u.nombre}`}
                          onClick={(e) => setMenu({ anchor: e.currentTarget, usuario: u })}
                          disabled={busy}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Usuarios
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Quiénes tienen acceso al local.
        </Typography>
      </Stack>

      {aviso ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" alignItems="center">
              <Button color="inherit" size="small" onClick={() => reenviar(aviso)} disabled={busy}>
                Reenviar invitación
              </Button>
              <IconButton color="inherit" size="small" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
                ×
              </IconButton>
            </Stack>
          }
        >
          Creamos a {aviso.nombre} pero no pudimos enviarle la invitación.
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Button variant="contained" onClick={recargar} disabled={loading} sx={{ borderRadius: 2, fontWeight: 800 }}>
          Refrescar
        </Button>
        {canManage ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setDialog({ tipo: "invitar" })}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Invitar usuario
          </Button>
        ) : null}
        <TextField
          size="small"
          label="Buscar por nombre o email"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ width: { xs: "100%", sm: 280 } }}
        />
        <FormControlLabel
          control={
            <Switch checked={mostrarDesactivados} onChange={(e) => setMostrarDesactivados(e.target.checked)} />
          }
          label="Mostrar desactivados"
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {contenido}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={cerrarMenu}>
        {accionesMenu?.reenviar ? (
          <MenuItem onClick={() => accionMenu(reenviar)}>Reenviar invitación</MenuItem>
        ) : null}
        {accionesMenu?.cambiarRol ? (
          <MenuItem onClick={() => accionMenu((usuario) => setDialog({ tipo: "rol", usuario }))}>
            Cambiar rol
          </MenuItem>
        ) : null}
        {accionesMenu?.desactivar ? (
          <MenuItem onClick={() => accionMenu((usuario) => setDialog({ tipo: "desactivar", usuario }))}>
            Desactivar
          </MenuItem>
        ) : null}
        {accionesMenu?.reactivar ? <MenuItem onClick={() => accionMenu(reactivar)}>Reactivar</MenuItem> : null}
      </Menu>

      {/* DIÁLOGOS DE ESCRITURA. Se montan al abrirse: el formulario arranca limpio cada vez. */}
      {dialog?.tipo === "invitar" && canManage ? (
        <InvitarDialog onClose={() => setDialog(null)} onDone={invitacionCreada} onError={manejarError} />
      ) : null}
      {dialog?.tipo === "rol" && canManage ? (
        <RolDialog usuario={dialog.usuario} onClose={() => setDialog(null)} onDone={terminar} onError={manejarError} />
      ) : null}
      {dialog?.tipo === "desactivar" && canManage ? (
        <DesactivarDialog
          usuario={dialog.usuario}
          onClose={() => setDialog(null)}
          onDone={terminar}
          onError={manejarError}
        />
      ) : null}
    </Box>
  );
}
