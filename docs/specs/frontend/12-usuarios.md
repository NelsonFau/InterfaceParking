# 12 — Usuarios: invitar, cambiar rol, desactivar y reactivar

> Frontend · **Aprobada** (18/11/2026) · `feature/specs-etapa3` (esta spec, rama compartida con otros redactores) y `feature/front-usuarios` (ejecución, en el worktree `../parkingcontrol-front-usuarios`, a crear desde `develop` cuando la 02 y la 04 estén mergeadas) · Última actualización 18/11/2026
>
> Doceava spec del frontend. Es una pantalla **nueva**: hoy el frontend no tiene ninguna forma de ver ni gestionar los usuarios del local (el backend ya expone `/Usuarios`). Depende de la 02 (enums, fechas, patrón de `src/api/`) y, por el enlace "Ver actividad", de la 04 (`buildTrazabilidadPath`). Las dudas del backend (B1 a B6) se relevaron y están en `docs/inventario/backend.md`, `/Usuarios`, "Comportamiento"; esta spec las incorpora.

## 1. Objetivo y alcance

**Objetivo.** Que el dueño del local pueda ver quién tiene acceso, invitar a una persona con un rol, reenviar una invitación, cambiar el rol de alguien, y desactivar o reactivar una cuenta; y que ENCARGADO y AUDITOR vean la lista en solo lectura.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `src/api/usuariosApi.js`: se **agregan** las funciones de escritura al archivo que crea la 04 con `listUsuarios()` | D-FL2 |
| Ruta y menú | `/usuarios`, "Usuarios", permiso `usuarios.ver`, al final del menú | D-FL3 |
| Lista | Tabla con nombre, email, rol, estado, alta; orden, filtro de texto local y switch "Mostrar desactivados" | D-FL4 |
| Invitar | Diálogo con nombre, email y rol (sin preseleccionar, 4 roles) | D-FL5 |
| Invitación no enviada | Aviso persistente con "Reenviar invitación" | D-FL6 |
| Reenviar | Acción en todas las filas activas | D-FL7 |
| Cambiar rol | Diálogo con confirmación "de X a Y" | D-FL8 |
| Desactivar y reactivar | Confirmación solo al desactivar | D-FL9 |
| Fila propia | Sin cambiar rol ni desactivar; chip "Vos" | D-FL10 |
| Trazabilidad | "Ver actividad" por usuario con `auditoria.ver` | D-FL11 |
| Errores | Por `code`, con recarga cuando el estado cambió | D-FL12 |
| Lógica pura | `src/utils/usuarios.js` con Vitest | D-FL13 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Editar nombre o email de un usuario | El backend no lo ofrece |
| Eliminar un usuario | El backend no lo ofrece (solo desactivar) |
| Paginación o filtros en el servidor | `GET /Usuarios` no los tiene; se filtra en el cliente (D-FL4) |
| Marca de "invitación pendiente" en la lista | `Usuario` no la trae (inventario, B6; pedido al backend PB-6); por eso "Reenviar" va en todas las filas activas (D-FL7) |
| Alta de usuarios SUPERADMIN o rol 2 | El backend los rechaza con 400 |
| Editar el perfil propio | Fuera de alcance |
| Rediseño visual | Después, con el diseño nuevo |
| `CLAUDE.md`, línea "Backend endpoints used" | No se toca (decisión del orquestador: la reemplaza la 02) |

**Estado de alcance.** Etapa 3 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02 y la 04 ya mergeadas al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Usuarios` (incluido "Comportamiento") y `/me` | Endpoints, forma de `Usuario`, roles invitables, qué código sale en cada endpoint, orden de validación, desactivar solo local, reenviar sin error a quien ya aceptó, `me.usuarioId == Usuario.id`, email único global | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 3 y 4 | Permisos `usuarios.ver` (DUENO, ENCARGADO, AUDITOR) y `usuarios.gestionar` (DUENO); catálogo de `code` y status | 18/11/2026 |
| `docs/inventario/brechas-front.md`, "Contratos entre specs" | Propiedad de `usuariosApi.js` (la 04 lo crea con `listUsuarios`; la 12 agrega el resto) y contrato `buildTrazabilidadPath` | 18/11/2026 |
| Spec 02 (`02-base-comun.md`), completa | `enums.js` (`RolUsuario`, `labelOf`, `optionsOf`, D-FB11), `formatInstantDate` y `useTenantDates` (D-FB5, D-FB7), patrón de `src/api/` (D-FB14), regla de lint (D-FB9) | 18/11/2026 |
| Spec 03 (`03-tarifas.md`) | Formato de spec y patrón de `shouldReloadAfter` | 18/11/2026 |
| Spec 04 (`04-trazabilidad.md`), D-FD5 y D-FD8 | `buildTrazabilidadPath({ usuarioId })`, `TRAZABILIDAD_PATH`, `listUsuarios()` y el permiso del enlace | 18/11/2026 |
| Spec 01 (`01-autenticacion-y-api.md`) | `ApiError`, `showApiError` (D-FA6), `can` (D-FA10), ARQ-4 | 09/11/2026 |
| Lectura de `src/auth/routes.js`, `src/App.jsx` y `src/constants/errorCodes.js` | Cómo se agrega una página privada; que un código desconocido ya es aviso | 18/11/2026 |
| Respuestas del desarrollador vía Orquestador (18/11/2026) | P1 a P5 (D-FL3, D-FL6 a D-FL11) | 18/11/2026 |

**Referencias externas.** Sin librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Table`, `Menu`, `Dialog`, `Alert`, `Chip`, `Switch`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Pantalla de usuarios | No existe. No hay ruta, ni menú, ni llamada a `/Usuarios` |
| `usuariosApi.js` | No existe en `develop`; lo crea la 04 con `listUsuarios()` |
| `RolUsuario` | Lo crea la 02 en `enums.js` (sin el valor 2) |
| `PRIVATE_ROUTES` | 9 entradas; `/usuarios` no está (la 04 suma `/trazabilidad`) |

## 3. Decisiones

Prefijo **D-FL** ("frontend, usuarios"). Estado: **Confirmada** (la tomó el desarrollador o está fijada por una fuente) o **Propuesta** (se aprueba junto con la spec). Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FL1 (18/11/2026) — Confirmada. Rama, worktree y orden de merge.** Esta spec vive en `feature/specs-etapa3`. La ejecución va en `feature/front-usuarios`, en el worktree `../parkingcontrol-front-usuarios`, desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que la 02 esté mergeada** (usa `enums.js`, `fechas.js`, `paginacion`-independiente, `api/params.js`) **y, por D-FL11, la 04** (usa `buildTrazabilidadPath`). Rebase sobre `develop` antes del PR.
*Motivo:* el enlace "Ver actividad" importa de `src/utils/trazabilidadLink.js`, que crea la 04.

**D-FL2 (18/11/2026) — Confirmada. `usuariosApi.js`: se agregan funciones, no se recrea.** Contrato de `brechas-front.md`: la 04 crea el archivo solo con `listUsuarios()`; **la que se ejecute segunda usa lo que encuentre**. Si al ejecutar el archivo existe, la 12 solo agrega; si no existe (la 12 corre primera, no debería pasar por D-FL1), lo crea completo y la 04 salta su paso. Funciones, con el patrón D-FB14 (`async`, devuelven `data`, no capturan errores, no convierten enums):

| Función | Endpoint | Devuelve |
|---|---|---|
| `listUsuarios()` (ya existe por la 04) | `GET /Usuarios` | `Usuario[]` |
| `createUsuario({ nombre, email, rol })` | `POST /Usuarios` | `{ usuario: Usuario, invitacionEnviada: boolean }` (201) |
| `resendInvitacion(id)` | `POST /Usuarios/{id}/reenviar-invitacion` | `undefined` (204) |
| `updateUsuarioRol(id, rol)` | `PUT /Usuarios/{id}/rol` con `{ rol }` | `Usuario` |
| `deactivateUsuario(id)` | `POST /Usuarios/{id}/desactivar` | `Usuario` |
| `reactivateUsuario(id)` | `POST /Usuarios/{id}/reactivar` | `Usuario` |

`Usuario` = `{ id, nombre, email, rol: int, activo: boolean, fechaCreacion: UtcInstant }`. `createUsuario` verifica que la respuesta traiga `usuario` y `invitacionEnviada` (booleano); si no, `ApiError` con `code: "respuesta_invalida"`. Se prueba con `vi.mock` de `http`.
*Descartado:* recrear el archivo o repetir `listUsuarios`: rompe el contrato con la 04.

### 3.2 Vista

**D-FL3 (18/11/2026) — Confirmada. Ruta, menú y permisos.** Entrada **al final** de `PRIVATE_ROUTES`: `{ path: "/usuarios", label: "Usuarios", permiso: "usuarios.ver" }` (DUENO, ENCARGADO y AUDITOR; OPERADOR no la ve ni en el menú). Se agrega `Usuarios` a `PAGES` en `App.jsx`. Lo que escribe (botón "Invitar usuario", menú de acciones de la fila) se **oculta** sin `usuarios.gestionar` (solo DUENO), con `can(...)`, nunca por rol (ARQ-4). Quien no tiene `usuarios.gestionar` ve la lista en solo lectura. El rol de cada fila se muestra con `labelOf(RolUsuario, rol)`, incluido SUPERADMIN si apareciera.
*Motivo:* la matriz de permisos del inventario (sección 3) y D-FA10. La posición al final es porque es una pantalla de administración.

**D-FL4 (18/11/2026) — Confirmada. Lista.** Se pide `listUsuarios()` una vez al entrar y en "Refrescar" y después de **cualquier** escritura (no se actualiza el estado a mano). Columnas: Nombre, Email, Rol (`labelOf`), Estado (chip "Activo" `success` / "Desactivado" `default`), Alta (`formatInstantDate(fechaCreacion, timeZone)` de `useTenantDates`), y la columna de acciones si corresponde (D-FL7 a D-FL11). Orden en el cliente, en `sortUsuarios`: activos primero, luego por `nombre` sin distinguir mayúsculas ni tildes (`localeCompare("es")`), desempate por `id`. Filtro de texto local por nombre o email (subcadena, sin distinguir mayúsculas ni tildes). Switch "Mostrar desactivados", **activado por defecto**; los desactivados se muestran atenuados. Estados: cargando (esqueleto), vacío ("Todavía no hay usuarios"; no ocurre en la práctica porque está el propio usuario), y error de carga ("No pudimos cargar los usuarios" con "Reintentar", **no** una lista vacía). La respuesta se verifica como arreglo en `listUsuarios` (D-FL2).
*Motivo:* `GET /Usuarios` no pagina ni filtra; un local tiene pocos usuarios. Si crece (P-FL5) se pide paginación al backend.

### 3.3 Escritura

**D-FL5 (18/11/2026) — Confirmada. Invitar.** Botón "Invitar usuario" (solo `usuarios.gestionar`). Diálogo con:

| Campo | Regla | Mensaje |
|---|---|---|
| `nombre` | `trim`, obligatorio, ≤ 120 | "Ingresá el nombre" / "El nombre no puede superar 120 caracteres" |
| `email` | `trim`, obligatorio, ≤ 200, formato `algo@algo.algo` (chequeo liviano; el backend es la autoridad) | "Ingresá el email" / "El email no es válido" / "El email no puede superar 200 caracteres" |
| `rol` | **sin preseleccionar**, obligatorio, uno de DUENO, ENCARGADO, OPERADOR, AUDITOR | "Elegí un rol" |

El selector usa `optionsOf(RolUsuario, { only: ["DUENO", "ENCARGADO", "OPERADOR", "AUDITOR"] })` (sin SUPERADMIN; el 2 no existe en el enum). `validateInvitacion` (pura) valida y arma el cuerpo `{ nombre, email, rol }` con `nombre` y `email` ya recortados y `rol` entero. El botón se deshabilita mientras envía. En éxito: cierra, recarga y sigue D-FL6. El email es **único global** (una persona, un tenant): un email ya presente en este local da 409 `usuario_ya_existe` y uno que está en otro local da 409 `usuario_ya_registrado`. En ambos casos, y en `identidad_sin_vinculo`, el diálogo **queda abierto** con el aviso (D-FL12).
*Descartado:* preseleccionar un rol (un OPERADOR por defecto invita por descuido; elegir es una acción más pero evita roles equivocados).

**D-FL6 (18/11/2026) — Confirmada. `invitacionEnviada = false`.** El usuario **se creó** pero el mail no salió. La pantalla recarga la lista (el usuario aparece) y muestra arriba un `Alert` `warning` **persistente** (no un toast): "Creamos a {nombre} pero no pudimos enviarle la invitación." con el botón "Reenviar invitación" (llama a `resendInvitacion(usuario.id)`). Se cierra con una "x" o cuando el reenvío sale bien (entonces toast "Invitación enviada"). Si el reenvío falla, el aviso sigue y `showApiError` explica. Con `invitacionEnviada = true`: toast "Invitación enviada a {email}". El aviso es estado de pantalla (en memoria): si se recarga la página se pierde, y la acción "Reenviar" de la fila (D-FL7) lo cubre.
*Motivo:* un toast desaparece y el dueño no sabría que esa persona nunca recibió nada; la API no ofrece borrar el usuario creado, así que el camino es reenviar.
*Descartado:* solo toast (se pierde); intentar borrar el usuario (no existe en la API).

**D-FL7 (18/11/2026) — Confirmada. "Reenviar invitación" en todas las filas activas.** La API no marca quién tiene la invitación pendiente (B6). La acción aparece en el menú de la fila de **todo usuario activo ajeno** (con `usuarios.gestionar`), sin confirmación. **El backend no rechaza a quien ya aceptó: manda el mail igual (204).** Por eso el texto no promete que la persona "tenía la invitación pendiente": el menú dice "Reenviar invitación" y el toast de éxito dice "Le enviamos de nuevo la invitación a {email}". No aparece en filas desactivadas (daría 409 `usuario_ya_desactivado`) ni en la propia. El aviso persistente de D-FL6 usa el mismo `resendInvitacion` y el mismo toast al salir bien.
*Alternativa (descartada por el desarrollador el 18/11/2026):* limitar "Reenviar" a la fila recién creada y al aviso de D-FL6; evita mandar mails de más a quien ya ingresó, pero no cubre invitaciones viejas que nunca llegaron. Se revisa cuando el backend exponga la invitación pendiente (PB-6).
*Descartado:* ofrecerla solo en la fila recién creada (se pierde al recargar y no cubre invitaciones viejas).

**D-FL8 (18/11/2026) — Confirmada. Cambiar rol, con confirmación.** "Cambiar rol" en el menú de la fila (solo `usuarios.gestionar`, solo usuarios activos con rol invitable, nunca la fila propia). Abre un diálogo con el selector de rol (los mismos 4) con el rol actual elegido; "Guardar" se deshabilita si no cambió. Al guardar pasa a un resumen con "Volver" y "Confirmar": "**{nombre}** pasa de **{rolActual}** a **{rolNuevo}**. Sus permisos cambian en su próximo pedido." Al confirmar: `updateUsuarioRol(id, rol)`, toast "Rol actualizado" y recarga. `summarizeRoleChange` (pura) arma los datos.
*Motivo:* cambia permisos de una persona; el resumen evita elegir mal en el selector. "En su próximo pedido" es porque el backend arma los permisos desde la base en cada request (inventario, sección 0).

**D-FL9 (18/11/2026) — Confirmada. Desactivar y reactivar.**
- **Desactivar** (activos, nunca la fila propia): diálogo de confirmación "¿Desactivar a {nombre}? No va a poder ingresar al sistema hasta que lo reactives." con "Cancelar" y "Desactivar". `deactivateUsuario(id)`, toast "Usuario desactivado", recarga.
- **Reactivar** (desactivados): **sin** confirmación (es reversible y devuelve acceso). `reactivateUsuario(id)`, toast "Usuario reactivado", recarga. Reactivar solo pone `activo = true`: la persona conserva su acceso y **no** se le reenvía ninguna invitación.
- Desactivar es **solo local** (no toca Auth0): el pedido siguiente de esa persona recibe 403 `usuario_inactivo` y ve la pantalla `AccountBlocked` (spec 01). El texto de la confirmación no promete más que eso.
- Los botones se deshabilitan mientras la llamada está en curso.

**D-FL10 (18/11/2026) — Confirmada. Fila propia.** La fila cuyo `id` es `me.usuarioId` (el mismo id que `Usuario.id`, B5) muestra el chip "Vos" y **no ofrece** "Cambiar rol", "Desactivar" ni "Reenviar" (se ocultan, no se deshabilitan). Se mapea igual `operacion_sobre_uno_mismo` por si el id no coincide. `ultimo_dueno` **solo se mapea**: no se calcula en el cliente. Como el backend valida primero `operacion_sobre_uno_mismo`, si el último dueño es uno mismo sale ese código; `ultimo_dueno` solo puede salir sobre **otro** dueño, y quien gestiona es un DUENO activo, así que en la práctica solo aparece por una carrera (dos dueños que se desactivan entre sí a la vez). `usuarioRowActions(usuario, { meId, canManage })` (pura) devuelve qué acciones corresponden a cada fila.

**D-FL11 (18/11/2026) — Confirmada. "Ver actividad".** Por fila, con `can("auditoria.ver")` (DUENO y AUDITOR), un enlace "Ver actividad" a `buildTrazabilidadPath({ usuarioId: usuario.id })` (de `src/utils/trazabilidadLink.js`, D-FD5; nunca se arma el texto a mano). Aparece en **todas** las filas, incluidas las desactivadas y la propia, y es independiente de `usuarios.gestionar` (un AUDITOR lo ve aunque la pantalla sea de solo lectura). ENCARGADO no lo ve. **Consecuencia:** la 12 se mergea después de la 04.
*Motivo:* la actividad de alguien que ya no trabaja es justo lo que se busca (D-FD8).

### 3.4 Errores y código

**D-FL12 (18/11/2026) — Confirmada. Errores por `code`.** Todos los `catch` llaman a `showApiError(e)` (el `title` del backend tal cual, sin agregar entradas a `errorCodes.js`: un código desconocido ya es aviso). La spec define qué pasa **después**, en `shouldReloadAfter(code)` (pura). Status y endpoints, del inventario (`/Usuarios`, "Comportamiento"): todos los `usuario_*` y `operacion_sobre_uno_mismo` son 409; `usuario_no_encontrado` es 404; el backend valida en este orden: 404 → `operacion_sobre_uno_mismo` → estado → `ultimo_dueno` → 403.

| `code` | Cuándo (endpoint) | Después |
|---|---|---|
| `usuario_ya_existe` (409) | **Invitar** con un email ya presente en este local | Sin recarga. El diálogo **sigue abierto** para corregir |
| `usuario_ya_registrado` (409) | **Invitar** con un email que está en **otro** local (email único global) | Sin recarga. El diálogo sigue abierto |
| `identidad_sin_vinculo` (409) | **Invitar**: Auth0 ya tenía una identidad con ese email sin usuario vinculado. El dueño no lo resuelve | Sin recarga. Aviso con el `title` **tal cual** (manda a soporte); el diálogo sigue abierto |
| `usuario_ya_desactivado` (409) | **Desactivar** a quien ya lo está (otra pestaña) o **reenviar** a un desactivado | Recarga |
| `usuario_ya_activo` (409) | **Reactivar** a quien ya está activo | Recarga |
| `usuario_no_encontrado` (404) | Cualquier acción sobre un id que ya no existe (también de otro tenant) | Recarga |
| `operacion_sobre_uno_mismo` (409) | **Cambiar rol** o **desactivar** el propio usuario (también si el propio es el último dueño) | Sin recarga |
| `ultimo_dueno` (409) | **Cambiar rol** (bajar al último DUENO activo) o **desactivar**; cuenta solo DUENO activos | Sin recarga (los datos no cambiaron) |
| `proveedor_identidad_no_disponible` (503, con `Retry-After`) | Auth0 caído al **invitar** o **reenviar** | **Recarga** (al invitar no se sabe si el usuario llegó a crearse). El reintento es **manual**, nunca automático |
| `datos_invalidos` (400) | Cuerpo inválido (incluye rol no invitable) | Sin recarga: el cliente ya valida los mismos límites |
| `sin_permiso` (403) | Permisos cambiados a mitad de sesión | Sin recarga |

`usuario_inactivo` (403) lo maneja `http.js` con `AccountBlocked` (spec 01): es lo que ve alguien al que desactivaron mientras tenía la sesión abierta.
*Motivo:* en los códigos con recarga el estado que ve el usuario quedó viejo; el aviso sigue teniendo un solo dueño (el backend).

Los códigos de cuenta bloqueada (403 `usuario_inactivo`, etc.) los maneja `http.js` y muestran `AccountBlocked`: es el caso del usuario que **se desactiva a sí mismo desde otra pestaña**, no de esta pantalla.
*Descartado:* agregar los códigos a `errorCodes.js`: no cambian el tratamiento.

**D-FL13 (18/11/2026) — Confirmada. Lógica pura en `src/utils/usuarios.js`, con Vitest.** Exporta `ROLES_INVITABLES`, `validateInvitacion`, `sortUsuarios`, `filterUsuarios`, `usuarioRowActions`, `summarizeRoleChange` y `shouldReloadAfter`. Sin React, sin estado, sin leer la fecha del sistema. `Usuarios.jsx` queda como orquestador de estado y diálogos (el listado, el diálogo de invitar, y los diálogos de rol y desactivar pueden ser componentes chicos en `src/componentes/`, a criterio del ejecutor, sin cambiar los nombres de `usuarios.js`).
*Motivo:* regla D-FA4; sin Testing Library, lo que no se puede romper se prueba en funciones puras.

## 4. Desvíos y pendientes

### 4.1 Desvíos

Ninguno: es una pantalla nueva. (La spec 01 no preveía `/Usuarios`.)

### 4.2 Pendientes

**Cerrados.**

| Id | Pendiente | Resolución |
|---|---|---|
| P-FL1 | **Cerrado (18/11/2026).** B1 a B6 (significado de `usuario_ya_existe` y `usuario_ya_registrado`, `identidad_sin_vinculo`, alcance de `ultimo_dueno`, status, comportamiento de reenviar y desactivar, `me.usuarioId`, invitación pendiente) | Relevados del código del backend por el Orquestador e incorporados al inventario (`/Usuarios`, "Comportamiento") y a D-FL5, D-FL7, D-FL9, D-FL10 y D-FL12 |

**Del desarrollador o de otras specs (no frenan la ejecución).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FL3 | **PB-6, pedido al backend:** exponer en `Usuario` si la invitación sigue pendiente (hoy no hay ningún dato, B6; y reenviar a quien ya aceptó manda el mail igual). Con eso "Reenviar" se mostraría solo donde aplica (alternativa de D-FL7) | — |
| P-FL4 | Editar nombre o email y eliminar: el backend no lo ofrece. Si el producto lo pide, se pide al backend | — |
| P-FL5 | Lista sin paginar: si un tenant crece, pedir paginación al backend | — |
| P-FL6 | Mostrar el ícono o chip del rol con color (`colorOf`): `RolUsuario` no define colores en la 02; hoy el rol va como texto | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FL-L1 | Que la 02 y la 04 estén mergeadas en `develop`: existen `src/constants/enums.js` (con `RolUsuario`), `src/utils/fechas.js`, `src/utils/useTenantDates.js`, `src/utils/trazabilidadLink.js` y `src/api/usuariosApi.js` con `listUsuarios` | Si falta algo, **frenar** y avisar al Orquestador: no se implementa nada de la 02 ni de la 04 desde acá |
| P-FL-L2 | La forma real de `useMe().me` (que traiga `usuarioId`) y de `useTenantDates()` (`timeZone`) | Ajustar el uso y anotarlo. Si `me.usuarioId` no existe, **frenar** |
| P-FL-L3 | Que `rol` llegue como **entero** en `/Usuarios` y que `RolUsuario` tenga DUENO 1, ENCARGADO 3, OPERADOR 4, AUDITOR 5 | Si llega como texto, **frenar** (cambia `enums.js`) |
| P-FL-L4 | Si `usuariosApi.js` ya tiene otras funciones o otro estilo | Seguir el estilo de lo que haya; no reescribir `listUsuarios` |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Lógica pura de usuarios | `src/utils/usuarios.js` | D-FL4, D-FL5, D-FL8, D-FL10, D-FL12, D-FL13 |
| Pantalla | `src/pages/Usuarios.jsx` | D-FL3 a D-FL11 |
| Tests | `test/unit/utils/usuarios.test.js`, `test/unit/api/usuariosApi.test.js` | D-FL2, D-FL13 |
| Manual de esta spec | `docs/manual/frontend/12-usuarios.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/api/usuariosApi.js` | Se **agregan** `createUsuario`, `resendInvitacion`, `updateUsuarioRol`, `deactivateUsuario`, `reactivateUsuario`; `listUsuarios` queda como está | D-FL2 |
| `src/auth/routes.js` | Entrada `/usuarios` al final de `PRIVATE_ROUTES` | D-FL3 |
| `src/App.jsx` | `"/usuarios": Usuarios` en `PAGES` y su import | D-FL3 |
| `test/unit/auth/routes.test.js` | Casos de `/usuarios`: aparece con `usuarios.ver` (DUENO, ENCARGADO, AUDITOR) y no sin ese permiso; es la última entrada de `PRIVATE_ROUTES`. Se conservan los casos de las otras specs | D-FL3 |
| `docs/specs/README.md` | Estado de la fila 12 (lo actualiza el Orquestador al aprobar; el ejecutor lo pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada.

### 5.4 No se tocan

`src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js` (D-FL12), `src/constants/enums.js` (lo define la 02), `src/utils/trazabilidadLink.js` (lo define la 04) y **`CLAUDE.md`** (la línea de endpoints la reemplaza la 02).

## 6. Pasos

**Reglas de todos los pasos.**
- **REGLA DE RUTEO (obligatoria).** No se corren comandos de terminal y no se le pregunta nada al usuario en este chat. Todo lo que haga falta pasa por el chat "Orquestador" por SendMessage: comandos (exactos y con su carpeta) para que alguien los corra, confirmaciones de cierre de paso y de commit, dudas del backend, avisos y decisiones que la spec no prevé; con la opción recomendada y las alternativas. Se espera su respuesta.
- Un paso por vez, un commit por paso, en `feature/front-usuarios` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde (los corre quien el Orquestador indique, por la regla de ruteo), el paso tildado en esta spec, el manual al día y el commit confirmado por el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo son los P-FL-L.
- Antes del PR: rebase sobre `develop`. **En `src/auth/routes.js`, `src/App.jsx` y `test/unit/auth/routes.test.js`, al resolver un conflicto de rebase se conservan TODAS las entradas de las otras specs**, y cada spec que suma una ruta actualiza el test para su ruta (acá, `/usuarios`).

### Paso 0 — Precondiciones y worktree

- [ ] **0.1** Confirmar que la 02 y la 04 están mergeadas en `develop` y resolver **P-FL-L1**. Si no, frenar.
- [ ] **0.2** Desde `parkingcontrol-front`, pedir al Orquestador: `git worktree add ../parkingcontrol-front-usuarios -b feature/front-usuarios develop`. En el worktree, copiar el `.env` (no está versionado) y `npm install`. Resolver **P-FL-L2**, **P-FL-L3** y **P-FL-L4**.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — Lógica pura

- [ ] **1.1** Crear `src/utils/usuarios.js` con las funciones de D-FL13 y `test/unit/utils/usuarios.test.js`.

  *Aceptación:* `npm test` pasa con estos casos:

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `validateInvitacion({ nombre: "  Ana ", email: " ana@x.com ", rol: 3 })` | `ok`, cuerpo `{ nombre: "Ana", email: "ana@x.com", rol: 3 }` |
  | 2 | Nombre `""`, `"   "` y de 121 caracteres | Error de `nombre` con el mensaje de D-FL5; 120 caracteres pasa |
  | 3 | Email `""`, `"ana"`, `"ana@"`, `"a b@x.com"` y de 201 caracteres | Error de `email` (obligatorio, formato o largo); 200 caracteres válidos pasa |
  | 4 | Rol `""`, `null`, `2`, `6` y `99` | Error "Elegí un rol" (solo valen 1, 3, 4 y 5) |
  | 5 | `ROLES_INVITABLES` | Exactamente 1, 3, 4 y 5 |
  | 6 | `sortUsuarios` con activos, desactivados y nombres con tilde y mayúsculas | Activos primero, luego por nombre (`Álvaro` antes de `Beto`), desempate por `id`; no muta el arreglo recibido |
  | 7 | `filterUsuarios(lista, { texto: "ana", mostrarDesactivados: false })` | Coincide por nombre o email, sin distinguir mayúsculas ni tildes; sin los desactivados |
  | 8 | `filterUsuarios` con `texto` vacío y `mostrarDesactivados: true` | Devuelve todos |
  | 9 | `usuarioRowActions(u, { meId: 1, canManage: true })` para un activo ajeno con rol invitable | `{ cambiarRol, desactivar, reenviar }` verdaderos, `reactivar` falso |
  | 10 | Lo mismo para un **desactivado** ajeno | Solo `reactivar` |
  | 11 | Lo mismo para la **fila propia** (`u.id === meId`) | `esPropio` verdadero; sin `cambiarRol`, `desactivar`, `reenviar` ni `reactivar` |
  | 12 | `canManage: false` | Ninguna acción de escritura |
  | 13 | Usuario con rol 6 (SUPERADMIN) activo ajeno | Sin `cambiarRol` |
  | 14 | `summarizeRoleChange(u, 5)` con `u.rol = 3` | `{ nombre, de: 3, a: 5, cambia: true }`; con `a === u.rol`, `cambia: false` |
  | 15 | `shouldReloadAfter` | Verdadero para `usuario_ya_desactivado`, `usuario_ya_activo`, `usuario_no_encontrado`, `proveedor_identidad_no_disponible`; falso para `usuario_ya_existe`, `usuario_ya_registrado`, `operacion_sobre_uno_mismo`, `ultimo_dueno`, `identidad_sin_vinculo`, `datos_invalidos`, `sin_permiso`, un código desconocido y `undefined` |
  | 16 | `usuarioRowActions` para un **desactivado** ajeno | Sin `reenviar` (daría `usuario_ya_desactivado`) |

  `npm run lint` y `npm run build` pasan.

### Paso 2 — Módulo de API

- [ ] **2.1** Agregar a `src/api/usuariosApi.js` las funciones de D-FL2 (sin tocar `listUsuarios`) y crear `test/unit/api/usuariosApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* `npm test` pasa con: `createUsuario` hace `POST /Usuarios` con el cuerpo recibido y devuelve `{ usuario, invitacionEnviada }`; una respuesta sin `usuario` o con `invitacionEnviada` no booleano lanza `ApiError` con `code: "respuesta_invalida"`; `resendInvitacion(7)` hace `POST /Usuarios/7/reenviar-invitacion` y devuelve `undefined`; `updateUsuarioRol(7, 4)` hace `PUT /Usuarios/7/rol` con `{ rol: 4 }`; `deactivateUsuario(7)` y `reactivateUsuario(7)` hacen `POST /Usuarios/7/desactivar` y `/reactivar` y devuelven el `Usuario`; ninguna función captura errores (un rechazo de `http` se propaga). `npm run lint` y `npm run build` pasan.

### Paso 3 — Ruta, menú y lista de solo lectura

- [ ] **3.1** Agregar la entrada `/usuarios` a `PRIVATE_ROUTES` (al final), la página a `PAGES` en `App.jsx` y los casos de `/usuarios` a `test/unit/auth/routes.test.js` (D-FL3).
- [ ] **3.2** Crear `src/pages/Usuarios.jsx` con la carga (`listUsuarios`), la tabla, el orden, el filtro de texto, el switch y los estados de cargando, vacío y error con "Reintentar" (D-FL4). Sin acciones todavía.

  *Aceptación (manual, con el backend de `develop`):* (1) con `dueno@demo.test`, `encargado@demo.test` y el usuario AUDITOR, el menú muestra "Usuarios" al final y la pantalla lista a todos con rol y alta correctos (sin corrimiento de día); (2) con `operado@demo.test` no hay ítem de menú y entrar a `/usuarios` muestra "No tenés permiso"; (3) los desactivados aparecen atenuados y el switch los oculta; (4) el filtro encuentra por nombre y por email sin distinguir tildes; (5) con el backend apagado se ve "No pudimos cargar los usuarios" y "Reintentar", no una lista vacía; (6) el rol se ve con `labelOf` (Dueño, Encargado, …). `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 4 — Invitar y reenviar

- [ ] **4.1** Diálogo "Invitar usuario" con `validateInvitacion` y rol sin preseleccionar; el botón solo con `can("usuarios.gestionar")` (D-FL5).
- [ ] **4.2** Aviso persistente de `invitacionEnviada = false` con "Reenviar invitación" y toast en el caso `true` (D-FL6).
- [ ] **4.3** Menú de la fila con "Reenviar invitación" para activos ajenos (D-FL7). Errores por `code` con `shouldReloadAfter` (D-FL12).

  *Aceptación (manual, con `dueno@demo.test`):* (1) invitar con datos válidos manda `POST /Usuarios` con `{ nombre, email, rol }` (rol entero, textos recortados), responde 201, el usuario aparece en la lista y hay un toast de éxito; (2) nombre vacío, email inválido y rol sin elegir no llegan a la red y muestran el mensaje de D-FL5; (3) el selector no ofrece SUPERADMIN; (4) invitar un email repetido muestra el `title` de `usuario_ya_existe` y el diálogo sigue abierto; (5) con `invitacionEnviada: false` (simularlo con una respuesta forzada en DevTools o con Auth0 sin configurar) se ve el aviso persistente y "Reenviar invitación" llama a `POST /Usuarios/{id}/reenviar-invitacion` (204); (6) invitar un email que está en **otro** local muestra el `title` de `usuario_ya_registrado` y el diálogo sigue abierto; "Reenviar" a un usuario que ya ingresó **no** da error (204) y muestra "Le enviamos de nuevo la invitación a {email}"; (7) con `encargado@demo.test` no se ve "Invitar usuario" ni menú de acciones; (8) un `POST /Usuarios` forzado con `encargado@demo.test` desde DevTools muestra el `title` de `sin_permiso` y la pantalla sigue. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 5 — Rol, desactivar, reactivar y "Ver actividad"

- [ ] **5.1** "Cambiar rol" con resumen de confirmación (D-FL8).
- [ ] **5.2** "Desactivar" con confirmación y "Reactivar" sin ella (D-FL9).
- [ ] **5.3** Fila propia: chip "Vos" y sin acciones de escritura (D-FL10).
- [ ] **5.4** "Ver actividad" con `buildTrazabilidadPath({ usuarioId })` y `can("auditoria.ver")` (D-FL11).

  *Aceptación (manual, con `dueno@demo.test`):* (1) "Cambiar rol" muestra "de X a Y", "Guardar" está deshabilitado si no cambió, y al confirmar hace `PUT /Usuarios/{id}/rol` con `{ rol }`, la lista refleja el nuevo rol y no hay doble clic posible; (2) "Desactivar" pide confirmación, hace `POST /Usuarios/{id}/desactivar` y la fila pasa a "Desactivado"; "Cancelar" no llama a la red; (3) "Reactivar" funciona sin confirmación y devuelve la fila a "Activo"; (4) la fila propia tiene el chip "Vos" y no ofrece cambiar rol, desactivar ni reenviar; (5) forzar un `PUT /rol` o `POST /desactivar` sobre uno mismo desde DevTools muestra el `title` de `operacion_sobre_uno_mismo`; (6) desactivar o bajar de rol al único dueño (si hay forma de armarlo en el entorno) muestra el `title` de `ultimo_dueno` y la lista no cambia; (7) desactivar a alguien que otra pestaña ya desactivó muestra el `title` de `usuario_ya_desactivado` y la lista se recarga; (8) "Ver actividad" lleva a `/trazabilidad?usuarioId=N` y la pantalla de Trazabilidad abre filtrada por ese usuario; el enlace **no** aparece con `encargado@demo.test` ni con un usuario sin `auditoria.ver`; (9) con el usuario AUDITOR la pantalla es de solo lectura pero **sí** muestra "Ver actividad". `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Documentación y cierre

- [ ] **6.1** Crear `docs/manual/frontend/12-usuarios.md`: qué hace cada acción, la tabla de permisos, qué hace cada `code` de error, el caso `invitacionEnviada = false` y cómo reenviar, y qué significa cada estado de la fila.
- [ ] **6.2** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; `git diff develop -- CLAUDE.md` vacío; una búsqueda de `rol ===`, `rol ==` y `.rol` en `src/pages/Usuarios.jsx` y `src/utils/usuarios.js` no encuentra decisiones por rol (solo `labelOf`); una búsqueda de `localStorage` y `toLocale` en esos dos archivos no da coincidencias.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | `/usuarios` con `dueno@demo.test` | `GET /Usuarios` responde 200; lista con rol, estado y alta; botón "Invitar usuario" y menú de acciones |
| 3 | `/usuarios` con `encargado@demo.test` y con AUDITOR | Lista de solo lectura, sin botón ni menú de escritura; AUDITOR ve "Ver actividad", ENCARGADO no |
| 4 | `/usuarios` con `operado@demo.test` | Sin ítem de menú; la ruta muestra "No tenés permiso" |
| 5 | Invitar con datos válidos | `POST /Usuarios` 201; el usuario aparece; toast |
| 6 | Invitar con `invitacionEnviada: false` | Aviso persistente con "Reenviar invitación" |
| 7 | Invitar un email repetido | Aviso con el `title` de `usuario_ya_existe`; el diálogo sigue abierto |
| 8 | Cambiar rol de otro usuario | Resumen "de X a Y"; `PUT /rol` con entero; la lista se actualiza |
| 9 | Desactivar y reactivar | Confirmación solo al desactivar; la fila cambia de estado |
| 10 | Fila propia | Chip "Vos"; sin acciones de escritura |
| 11 | Acciones sobre uno mismo y sobre el último dueño (forzadas) | Aviso con el `title`; sin cambios en la lista |
| 12 | Dos pestañas: desactivar a quien ya está desactivado | Aviso y recarga |
| 13 | "Ver actividad" | Abre `/trazabilidad?usuarioId=N` filtrado |
| 14 | Backend apagado | "No pudimos cargar los usuarios" con "Reintentar" |
| 15 | `git diff develop -- CLAUDE.md` | Vacío |

**No verificable en el producto sin preparar el entorno:** `invitacionEnviada: false` real (requiere Auth0 o el mail caídos), `proveedor_identidad_no_disponible` y `ultimo_dueno` (requieren armar el estado). Los cubre el mapeo por `code` de los tests del paso 1.

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador confirmó las cinco decisiones de producto (P1 a P5, vía Orquestador), la forma de la lista y D-FL7 ("Reenviar" en todas las filas activas, con el texto "Le enviamos de nuevo la invitación a {email}", porque el backend no rechaza a quien ya aceptó). El relevamiento del backend (B1 a B6) está incorporado (P-FL1 cerrado). Todas las decisiones D-FL están Confirmadas. Falta que la 02 y la 04 estén mergeadas para poder ejecutar.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-usuarios` (rama `feature/front-usuarios`), creado desde `develop`. **Solo puede arrancar con la 02 y la 04 mergeadas** (P-FL-L1). Un chat para todos los pasos:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 6 | Sonnet | bajo–medio | Pantalla con lógica pura chica y decisiones tomadas. Frena al terminar cada paso. Si P-FL-L1, P-FL-L2 o P-FL-L3 no dan, **frena** y avisa al Orquestador: no implementa nada de la 02 ni de la 04 ni cambia `enums.js` |

**Prompt para el chat de ejecución:**

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-usuarios` (rama `feature/front-usuarios`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md` (sobre todo "Adding a private page"), `docs/specs/frontend/02-base-comun.md` (secciones 3 y 5.4) y `docs/specs/frontend/12-usuarios.md`. Ejecutá **los pasos de la 12**, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FL-L1: si la 02 o la 04 no están mergeadas en `develop`, frená. `src/api/usuariosApi.js` lo crea la 04 con `listUsuarios()`: **agregá** las demás funciones sin recrearlo. **REGLA DE RUTEO:** no corras comandos de terminal y no le preguntes nada al usuario en tu chat. Todo lo que necesites pasa por el chat "Orquestador" por SendMessage: comandos (exactos y con su carpeta), confirmaciones de cierre de paso y de commit, dudas del backend, avisos y decisiones que la spec no prevé, con la opción recomendada y las alternativas. Esperá su respuesta. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md`. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 1 a 3 y 6; Sonnet con esfuerzo medio para los pasos 4 y 5 (diálogos con confirmación y manejo de errores por `code`). Se sube a Opus solo si aparece una decisión que la spec no previó (por ejemplo, que el backend cambie el modelo de invitaciones).
