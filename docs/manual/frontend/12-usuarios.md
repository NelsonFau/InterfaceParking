# Manual — 12 Usuarios

> Cómo funciona la pantalla de Usuarios: ver quién tiene acceso, invitar, reenviar invitaciones, cambiar rol, desactivar y reactivar. Spec: `docs/specs/frontend/12-usuarios.md`. Backend: `docs/inventario/backend.md`, `/Usuarios` (incluido "Comportamiento"); código: `Service/UsuarioService.cs`.

## Resumen

`/usuarios` (menú "Usuarios", al final) lista a todos los usuarios del local con nombre, email, rol, estado y fecha de alta (en la zona del local). Quien tiene `usuarios.gestionar` (solo DUENO) además puede invitar y operar sobre cada fila. ENCARGADO y AUDITOR ven la lista en solo lectura. OPERADOR no ve el ítem de menú.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/usuariosApi.js` | `listUsuarios` (spec 04), `createUsuario`, `resendInvitacion`, `updateUsuarioRol`, `deactivateUsuario`, `reactivateUsuario`. No capturan errores; `createUsuario` y `listUsuarios` verifican la forma de la respuesta (`respuesta_invalida`) |
| `src/utils/usuarios.js` | Lógica pura: `validateInvitacion`, `sortUsuarios`, `filterUsuarios`, `usuarioRowActions`, `summarizeRoleChange`, `shouldReloadAfter`, `ROLES_INVITABLES` |
| `src/pages/Usuarios.jsx` | Orquestador de estado, tabla y diálogos |

## Permisos

| Qué | Permiso | Quién |
|---|---|---|
| Entrar a la pantalla y ver la lista | `usuarios.ver` | DUENO, ENCARGADO, AUDITOR |
| "Invitar usuario" y menú de acciones de la fila | `usuarios.gestionar` | DUENO |
| "Ver actividad" | `auditoria.ver` | DUENO, AUDITOR |

Todo se oculta por permiso (`can`), nunca por rol.

## La lista

Se pide una vez al entrar, con "Refrescar" y después de **cualquier** escritura. Orden en el cliente: activos primero, luego por nombre sin distinguir mayúsculas ni tildes, desempate por id. El filtro de texto busca por nombre o email; el switch "Mostrar desactivados" está activado por defecto y los desactivados se ven atenuados. Si la carga falla se ve "No pudimos cargar los usuarios" con "Reintentar" (no una lista vacía).

| Estado de la fila | Significado | Acciones (con `usuarios.gestionar`) |
|---|---|---|
| Activo (ajeno) | Puede ingresar | Reenviar invitación, Cambiar rol, Desactivar |
| Desactivado | No puede ingresar; el próximo pedido recibe 403 `usuario_inactivo` | Reactivar |
| Chip "Vos" | Es tu propia cuenta (`me.usuarioId` = `Usuario.id`) | Ninguna de escritura |

## Acciones

- **Invitar usuario.** Nombre (≤ 120), email (≤ 200, formato liviano) y rol **sin preseleccionar** (Dueño, Encargado, Operador, Auditor; nunca Superadmin). Los textos se recortan y el rol va como entero. Los mensajes de error aparecen al salir del campo o al enviar.
- **Reenviar invitación.** Está en el menú de **todo usuario activo ajeno**, sin confirmación. La API no marca quién tiene la invitación pendiente y el backend **no rechaza a quien ya aceptó**: manda el mail igual (204). Por eso el toast dice "Le enviamos de nuevo la invitación a {email}". No aparece en desactivados ni en la fila propia.
- **Cambiar rol.** Selector con el rol actual; "Guardar" se deshabilita si no cambió y pasa a un resumen "{nombre} pasa de X a Y. Sus permisos cambian en su próximo pedido." con "Volver" y "Confirmar".
- **Desactivar.** Pide confirmación. Es solo local: no toca Auth0. **Reactivar** no pide confirmación y solo pone `activo = true` (no reenvía ninguna invitación).
- **Ver actividad.** Enlace a `buildTrazabilidadPath({ usuarioId })` en todas las filas, incluidas las desactivadas y la propia.

## Invitación no enviada (`invitacionEnviada = false`)

El usuario **se creó** pero el mail no salió (la API responde 201). La lista se recarga (el usuario aparece) y arriba queda un aviso persistente: "Creamos a {nombre} pero no pudimos enviarle la invitación.", con "Reenviar invitación" y una "x". El aviso se cierra al reenviar bien o con la "x"; si el reenvío falla, sigue y se muestra el error. Es estado de pantalla: si se recarga la página se pierde, y entonces sirve "Reenviar invitación" desde el menú de la fila. Con `invitacionEnviada = true` solo hay un toast "Invitación enviada a {email}".

## Errores por `code`

Siempre se muestra el `title` de la API (`showApiError`). `shouldReloadAfter(code)` decide qué pasa después.

| `code` | Cuándo | Después |
|---|---|---|
| `usuario_ya_existe` (409) | Invitar un email ya presente en este local | Diálogo abierto, sin recarga |
| `usuario_ya_registrado` (409) | Invitar un email de **otro** local (el email es único global) | Diálogo abierto, sin recarga |
| `identidad_sin_vinculo` (409) | Invitar: Auth0 ya tenía esa identidad sin usuario vinculado; hay que contactar a soporte | Diálogo abierto, sin recarga |
| `usuario_ya_desactivado` / `usuario_ya_activo` (409) | Estado distinto al que se veía (otra pestaña); también reenviar a un desactivado | Recarga (se cierra el diálogo) |
| `usuario_no_encontrado` (404) | El id ya no existe | Recarga (se cierra el diálogo) |
| `operacion_sobre_uno_mismo` (409) | Cambiar rol o desactivar el propio usuario | Sin recarga |
| `ultimo_dueno` (409) | Bajar de rol o desactivar al último DUENO activo (solo se mapea, no se calcula) | Sin recarga |
| `proveedor_identidad_no_disponible` (503) | Auth0 caído al invitar o reenviar | Recarga; el diálogo sigue abierto y el reintento es manual |
| `datos_invalidos` (400), `sin_permiso` (403) | Cuerpo inválido; permisos cambiados | Sin recarga |

`usuario_inactivo` (403) lo maneja `http.js` con la pantalla `AccountBlocked`.

## Cómo probarlo a mano

Con el backend en marcha: `dueno@demo.test` (todo), `encargado@demo.test` y el AUDITOR (solo lectura; AUDITOR ve "Ver actividad"), `operado@demo.test` (sin ítem de menú; la ruta muestra "No tenés permiso"). `invitacionEnviada: false` real, `proveedor_identidad_no_disponible` y `ultimo_dueno` requieren preparar el entorno; los cubre el mapeo por `code` de los tests de `test/unit/utils/usuarios.test.js`.
