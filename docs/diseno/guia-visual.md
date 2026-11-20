# Guía visual de "Parking Oficial" (revisión de la spec 13, 20/11/2026)

La primera ejecución de la spec 13 (PR #22) no se parece al diseño, porque el ejecutor nunca vio las pantallas. Esta guía las describe a partir de las capturas reales de la vista "Parking Oficial" (proyecto de Claude Design "App de gestión de garage Uruguay"). **Manda la captura.** Ante cualquier duda, abrí la imagen con Read y copiá lo que se ve. Si esta guía y la captura no coinciden, vale la captura. Si la captura y la spec 13 no coinciden, también vale la captura, salvo en las reglas de la sección 0.

## Capturas (`docs/diseno/`)
| Pantalla | Archivo |
|---|---|
| Panel (Dashboard) | `panel.png` (arriba) y `panel-plano.png` (plano, leyenda y zoom) |
| Registrar ingreso | `registrar-ingreso.png` |
| Monitor operativo | `monitor.png` |
| Ocupaciones | `ocupaciones.png` |
| Alertas operativas | `alertas.png` |
| Cocheras | `cocheras.png` |
| Clientes | `clientes.png` |
| Tarifas | `tarifas.png` |
| Caja | `caja.png` |
| Usuarios | `usuarios.png` |
| Trazabilidad | `trazabilidad.png` |
| Cómo se ve HOY la app (mal) | `app-actual-dashboard.png`, `app-actual-ocupaciones.png` |

Configuración, los diálogos, la vista mobile y el modo oscuro no tienen captura. Para esos casos aplicá los mismos patrones de la sección 1.

## 0. Reglas que no cambian (mandan sobre la captura)
- No cambia la lógica, los permisos, los endpoints ni los textos que vienen de la API.
- Las reglas de `CLAUDE.md` se mantienen igual:
  - `can()`.
  - `showApiError`.
  - Fechas en la zona del tenant.
  - `formatMoney`.
  - Sin `localStorage`.
  - Sin `toLocale*`.
  - Colores solo desde el tema.
- **Datos que el sistema hoy no tiene** (los pide el backend como PB-24 en adelante). No se inventan ni se simulan:
  - Patente.
  - Tipo de vehículo.
  - Cliente ocasional sin registrar ("Nombre de pila").
  - Abono semanal.
  - Zonas o niveles.
  - El plano posicional.

  Donde el diseño los muestra, la pantalla sale **sin ese campo** y el resto queda igual, con el espacio reacomodado. Cada omisión se anota en la tabla de la sección 3.
- Los datos de las capturas son de muestra ("Valentina Pérez", "Charlie's Parking"). En la app se muestran los datos reales.

## 1. Patrones globales (se aplican a todas las pantallas)

### 1.1 Modo y tema
- **Modo claro por defecto.** El modo oscuro solo se activa con el selector. Ya **no** se sigue al sistema operativo, porque esa fue la causa de que la app arrancara en oscuro.
- **Selector:** un control segmentado **"Claro | Oscuro"** abajo de todo en el menú lateral. Es una cápsula con fondo un poco más oscuro que el menú, y la opción elegida es una píldora clara. El estado vive en memoria y no se guarda (ARQ-1).
- Se quita la opción "Automático" y se quita el selector del menú de usuario.
- **Pesos tipográficos.** Los del diseño son más livianos que los de hoy:
  - Títulos de página: Red Hat Display ~32 px, peso 500.
  - Títulos de tarjeta: ~17 px, peso 500 a 600.
  - Cuerpo: 15 a 16 px, peso 400.
  - Números grandes: peso 500, no 800.
  - En ninguna parte del diseño aparecen pesos 800 o 900.
- **Fondo de página:** `#F6F3EE`. Las tarjetas son blancas, con radio 10, borde de 1 px `#E6DFD5` y una sombra suave pero visible abajo, del orden de `0 2px 6px rgba(60,40,25,.08)`.

### 1.2 Shell (estructura de la pantalla en desktop)
- **Menú lateral** (`#DCCFB8`, ~260 px, alto completo, **sin** sombra ni flotación):
  - **Arriba:** "ParkingControl" (~24 px, peso 600) y, debajo, el **nombre del local** (`me.tenant`, ~15 px). Después va un divisor fino.
  - **Grupos:** "OPERACIÓN", "GESTIÓN" y "ADMINISTRACIÓN", en mayúsculas, con letter-spacing amplio (~0.15em), peso 600, ~15 px y chevron a la derecha (se pliegan). Debajo de cada encabezado va un divisor fino.
  - **Ítems:**
    - Texto plano de ~16 px, peso 400, con padding vertical generoso.
    - **Sin puntos de color**, así que `navStyle.js` deja de usarse para el menú.
    - **Ítem activo:** una píldora clara (`#F6F1E8`) de radio ~10 que ocupa el ancho del menú, con el texto en peso 500.
  - **Orden del diseño:**
    - Operación: Panel, Registrar ingreso, Monitor operativo, Ocupaciones, Alertas operativas.
    - Gestión: Cocheras, Clientes, Tarifas, Caja.
    - Administración: Usuarios, Trazabilidad.
  - **"Panel":** el ítem se llama "Panel", como en el diseño. Es el mismo `/dashboard`: cambia solo el texto del ítem y de las migas.
  - **Configuración** no está en el menú: se llega desde el menú de usuario (ver abajo).
  - **Abajo de todo:** el selector "Claro | Oscuro". No va el usuario ni el engranaje (eso se va arriba).
- **Barra superior del contenido** (desktop): una banda a todo el ancho (`#E6E3DE`, ~64 px de alto).
  - **A la izquierda**, las migas: "Grupo / Pantalla". El grupo va en gris y la pantalla un poco más oscura, separados por " / " (barra, no "›").
  - **A la derecha**, el **usuario**:
    - Un círculo blanco con las iniciales (peso 600).
    - El nombre (~15 px) con el rol debajo (gris).
    - Un chevron que abre un menú con **"Configuración"** (solo con `configuracion.ver`) y **"Salir"**.
- **Contenido:**
  - Padding de ~36 px a los costados, **a todo el ancho**. No hay `maxWidth` ni contenido centrado: hoy el Dashboard y Ocupaciones salen angostos y al medio, y eso está mal.
  - El título de la página va con el subtítulo gris debajo (~15 px).
  - Las acciones de la página van **a la derecha, en la misma fila que el título**.
- **Mobile** (< 900 px): barra superior con hamburguesa, las migas y el usuario. El menú lateral pasa a drawer con el mismo contenido.

### 1.3 Botones (hay cuatro familias; mirá `ocupaciones.png`, `clientes.png` y `alertas.png`)
| Familia | Aspecto | Dónde |
|---|---|---|
| **Principal "arena"** | Fondo `#E8D9C3` aprox., borde 1 px marrón claro (`#B9A68C` aprox.), texto oscuro, radio ~10 y peso 500 | "Nueva ocupación", "Ajustar precios mensuales", "Agregar cocheras", "Nuevo cliente", "Nueva tarifa", "Invitar usuario", "Aplicar", "Buscar", "Limpiar" de Trazabilidad |
| **Acción en píldora** | Radio completo (píldora), borde 1 px y fondo **teñido según la acción**, texto oscuro y peso 500 | **Neutro** ("Ver", "Editar", "Cambiar precio"): blanco con borde oscuro. **Verde** ("Registrar pago"). **Azul grisáceo** ("Finalizar", "Cerrar caja"). **Rosa o rojo** ("Cancelar reserva", "Desactivar", "Resolver alerta"). **Arena** ("Ver ocupación", "Ver detalle", "Ver todas", "Ir a Caja") |
| **Contorno** | Blanco, borde 1 px gris, radio ~8 | "Limpiar" (Ocupaciones), "Cancelar" (Registrar ingreso) |
| **Marrón lleno** | Fondo `#6F4E37`, texto blanco | Botón final de un formulario ("Confirmar ingreso", que en gris queda deshabilitado) y la opción elegida de los controles segmentados |

- **Refrescar:** un botón **circular arena** de ~40 px con el ícono ↻. Va junto a las acciones de la página.
- **Enlaces de acción secundarios:** texto subrayado sin botón. Por ejemplo "Ver caja" y "Ver trazabilidad" en Alertas, "Ver actividad" en Usuarios, "Ver detalle" en Trazabilidad y "Quitar" en rojo en Tarifas.
- Implementalo con `variants` de `MuiButton` en el tema, por ejemplo `variant="arena"` y `variant="pill"` con `color`, no con `sx` sueltos en cada página.

### 1.4 Campos y filtros
- **La etiqueta va ARRIBA del campo**, como texto de ~15 px y peso 500. No se usa la etiqueta flotante de MUI dentro del borde.
- Los campos son blancos, con borde 1 px `#CFC4B6`, radio ~6 y altura compacta (~36 a 40 px). Los selects llevan chevron fino.
- El texto de ayuda va debajo, en gris y a ~13 px (por ejemplo, "Activas con fin dentro de ese plazo…").
- Hacé **un componente reutilizable** (por ejemplo `Campo`, con la etiqueta arriba y un `TextField` o `select` sin `label` interno) y usalo en todos los filtros y formularios.
- **Los filtros van dentro de una tarjeta blanca.**
  - Cuando la tarjeta tiene título ("Filtros" en Ocupaciones), los botones van arriba a la derecha.
  - Cuando no lo tiene, como en Trazabilidad, los botones van al final de la fila.
  - Los campos se reparten en **una fila** en desktop.

### 1.5 Chips de estado
- Son rectangulares, de radio ~4, ~13 px y peso 400 a 500, con **fondo teñido, borde 1 px del mismo tono y texto del tono**. No son píldoras grandes.
- **Tonos:**
  - Verde: "En curso", "Activo", "Vigente", "Abierta".
  - Ámbar: "Vencida".
  - Azul grisáceo: "Reserva", "Finalizada", "Programada".
  - Blanco con borde: el tipo ("Hora", "Día", "Mes", "Diaria").
  - Gris: "Desactivado".
- Los tonos salen de `palette.pc.tone` (ok, wa, er, oc, in, vi, pk, de). Ajustá el mapeo de `colorOf` y `COLOR_TONE` para que cada estado dé el tono de la captura.

### 1.6 Tablas
- La fila de encabezado va con fondo `#F0EBE4` (hundido) y texto gris de ~15 px y peso 400.
- Las filas son blancas, con divisor fino entre ellas. No llevan bordes verticales ni cebra.
- La tabla va dentro de una tarjeta blanca con padding.

### 1.7 Paginación
- Es texto, no `TablePagination`: "1–3 de 3 ‹ Anterior · Siguiente ›". "Anterior" y "Siguiente" son enlaces y quedan grises cuando no aplican.
- En Clientes va una tarjeta propia, con "Mostrando 10 de 37 · Página 1 / 4 ‹ Anterior · Siguiente ›" y "Page size" a la derecha.

### 1.8 Controles segmentados
- Son una cápsula con fondo arena claro (`#EFE6DA` aprox.).
- La opción elegida va en marrón lleno (`#6F4E37`) con texto blanco.
- Ejemplos: "Caja actual | Historial", "Hora | Día", "Claro | Oscuro" (el del menú es la variante clara).
- **Reemplazan a las `Tabs` de MUI** en Caja y Cocheras.

## 2. Pantalla por pantalla

### Panel (`/dashboard`, capturas `panel.png` y `panel-plano.png`)
- **Arriba**, el título "Panel" y el subtítulo "Estado general del garage en tiempo real.".
- **Una sola tarjeta blanca grande a todo el ancho**, que contiene todo lo demás:
  1. **Fila de 6 mosaicos de indicadores** en 6 columnas iguales:
     - Los mosaicos son hundidos (`#F3EFE9`), con borde fino y radio 8.
     - Cada uno lleva la etiqueta gris de ~16 px ("Total cocheras", "Disponibles", "Ocupadas", "Bloqueadas", "Vencen hoy", "Vencen en 7 días") y el número grande (~34 px, peso 500, color de texto normal, **sin tonos de color**).
     - **No hay chips** ("Inventario", "Ahora", "Urgente") ni tarjetas teñidas.
     - Los números son los mismos que el Dashboard ya trae de la API.
  2. **Área del plano**, debajo:
     - Recuadro hundido con radio 10.
     - Arriba a la derecha, el selector de nivel ("PB · 36/50").
     - En el centro, el plano.
     - Abajo a la derecha, los botones "Ver todo", "−" y "+" (zoom, blancos con borde).
     - Abajo a la izquierda, la **leyenda-filtro**: chips con un cuadradito de color y el conteo ("Todos · 100", "Libre · 23", "Por mes · 40", "Por hora · 28", "Reservado · 4", "Por mes con deuda · 5"). El elegido va con borde oscuro.
- **Hasta que esté el PB-24** (el plano posicional y los niveles van en la tanda 5):
  - En el área del plano va la **grilla de mosaicos de cocheras**, con el mismo estilo que Cocheras.
  - Abajo, la **leyenda-filtro funcionando**: cada chip filtra los mosaicos y el conteo sale de los datos reales. Esto ya se puede hacer con `GET /Cochera` y la regla "con deuda" de D-FM16.
  - Se omiten el selector de nivel y el zoom.
- **La variante "OCUPACIÓN 73/100 + Buscar patente"** que apareció en una captura anterior no se usa.

### Registrar ingreso (`/registrar-ingreso`, captura `registrar-ingreso.png`): PANTALLA NUEVA
- Es una página propia, no el diálogo. Ruta nueva en `PRIVATE_ROUTES`, grupo Operación, permiso `ocupaciones.crear`.
- El ítem del menú lleva a esta página. El atajo `?nueva=1` deja de usarse desde el menú, pero sigue funcionando.
- **Usa `createOcupacion` y las mismas validaciones que el alta de Ocupaciones:**
  - Reutilizá la lógica pura existente.
  - Errores con `showApiError`.
  - Al confirmar, toast de éxito y navegación a Ocupaciones o al detalle, según lo que haga hoy el alta.
- **Grilla de tarjetas numeradas** (círculo marrón con el número, título y subtítulo gris):
  1. **Tipo de registro**: dos tarjetas seleccionables.
     - **"Ingreso rápido"** (por hora o por día) cubre los tipos HORA y DÍA.
     - **"Abono"** cubre el tipo MES. El texto dice "Mensual. Requiere un cliente registrado. Se cobra por adelantado.": se quita "Semanal", porque no existe (PB-27).
     - La tarjeta elegida va con fondo arena claro y borde marrón.
  2. **Cliente**:
     - **"Nombre de pila" se omite** (cliente ocasional, PB-26), así que el control segmentado también.
     - Va el **autocomplete de cliente** de hoy (`ClienteAutocomplete`), con la etiqueta "Cliente habitual".
     - Hoy el cliente es obligatorio, como en el alta.
  3. **Vehículo** (patente y tipo): **se omite entera** (PB-25). La grilla se reacomoda a 4 tarjetas.
  4. **Espacio**:
     - El subtítulo dice "N libres".
     - Las cocheras disponibles vienen de `listCocherasDisponibles`, como en el alta.
     - Cada cochera es un **botón de chip verde teñido** ("#12"), y la elegida va en verde lleno.
     - Sin zonas, así que va un solo grupo "Cocheras" (PB-24 o PB-28 traerá las zonas).
  5. **Tarifa y horario**:
     - Segmentado **"Hora | Día"** solo con "Ingreso rápido". Con "Abono" el tipo es Mes.
     - "Fecha y hora de ingreso" en dos campos, fecha y hora, con el valor por defecto "ahora" en la zona del tenant.
     - Se convierte con `localInputToInstant`.
- **Tarjeta "Resumen"** a todo el ancho:
  - **A la izquierda**, un recuadro arena claro con "Precio por unidad", el precio grande (~32 px) de la tarifa vigente del tipo elegido (`tarifaApi`) y una línea gris con la regla de cobro, que sale de la configuración que el front ya conoce. Si no la conoce, solo "se cobra al salir" o "se cobra por adelantado".
  - **A la derecha**, pares clave-valor con divisor: Registro, Cliente, Espacio, Tarifa, Ingreso. Va con "—" cuando falta un dato.
  - **Abajo a la derecha**, "Cancelar" (contorno, vuelve atrás) y "Confirmar ingreso" (marrón lleno, deshabilitado hasta que estén todos los datos obligatorios).
- **Reservas, retroactivas y tarifa excepcional** se siguen haciendo desde "Nueva ocupación" en Ocupaciones. Esta página es el flujo rápido.

### Monitor operativo (`monitor.png`)
- **Encabezado:**
  - Título y subtítulo.
  - A la derecha, el botón circular ↻ y "Ver alertas" (arena).
  - Debajo, a la derecha, "Actualizado: dd/mm/aaaa HH:mm" en gris.
- **Error de actualización:** una **línea de texto roja** bajo el subtítulo ("No se pudo actualizar. Reintentá con 'Actualizar'"), no un `Alert` en caja.
- **Tres tarjetas blancas**, una debajo de otra, cada una con título y subtítulo gris:
  - **"Indicadores"** ("Alertas y riesgo operativo"):
    - Mosaicos en una grilla de 3 columnas, con fondo hundido (`#F3EFE9`), borde fino y radio 8.
    - Cada mosaico tiene la etiqueta, el número grande (~26 px, peso 500) y un texto chico gris.
    - Son los indicadores que el Monitor ya tiene.
  - **"Alertas críticas recientes"** ("Casos que deberían revisarse primero."):
    - Mosaicos de dos columnas, con "Crítica · fecha", el título y el mensaje gris.
    - "Ver todas" (píldora arena) abajo a la derecha.
  - **"Caja"**: es el `CajaWidget`.
    - Arriba, el chip del modo ("Diaria") y, a la derecha, el chip de estado ("Abierta").
    - Después "Sesión actual", la línea "Caja abierta desde … · Fondo inicial …" y "Efectivo esperado $ …" con el monto en negrita.
    - "Ir a Caja" (píldora arena) abajo a la derecha.
    - Si falla, la misma tarjeta muestra "Caja" y un texto gris con el error y "Reintentar".
- **Sin acordeones.**

### Ocupaciones (`ocupaciones.png`)
- **Encabezado:** a la derecha, "Nueva ocupación" y "Ajustar precios mensuales" (arena) y el ↻ circular. Cada uno respeta su permiso.
- **Tarjeta "Filtros":**
  - Título a la izquierda, "Limpiar" (contorno) y "Aplicar" (arena) a la derecha.
  - Una fila con Estado, Cochera, "Filtrar por cliente", "Vence en (días)" (con su ayuda debajo), "Inicio desde", "Fin hasta" (con su ayuda debajo) y "Cantidad máxima". Las etiquetas van arriba.
- **Debajo:** "Resultados: N · Vencidas: N" (el número en marrón y el resto en gris).
- **Una tarjeta blanca por ocupación, a todo el ancho:**
  - **Fila 1:**
    - Círculo con el número de cochera, teñido según el estado: ámbar si está vencida, azul si es reserva, verde si está en curso y gris si está finalizada.
    - "Cochera #12" (peso 500).
    - Chip de estado y chip de tipo.
  - **Fila 2**, gris: "Cliente: … · Inicio … · Fin …".
  - **Fila 3**, oscura: las cifras ("Hasta ahora (unidad en curso): $ … · Pagado: $ … · Saldo: $ …"), con los mismos textos de hoy.
  - **Fila 4**, píldoras: "Ver" (neutra), "Registrar pago" (verde), "Finalizar" (azul grisáceo) y "Cancelar reserva" (rosa), según el permiso y la condición de hoy.
- **Diálogos:** el mismo lenguaje, con etiquetas arriba, botones del pie a la derecha y el principal en marrón lleno.

### Alertas operativas (`alertas.png`)
- **Encabezado:** ↻ a la derecha y "Actualizado: …" debajo.
- **Tarjeta de filtros:** una fila con Estado, Severidad, Tipo, Desde y Hasta, más los **chips de filtro activos** debajo ("Ocupación 482 ×", "Caja 57 ×") cuando se llega con un vínculo.
- **Debajo:** "N alertas".
- **Una tarjeta por alerta, partida en dos:**
  - **Panel izquierdo** (~110 px, fondo teñido por severidad: rosa en Crítica y Alta, gris en Media y Baja):
    - La severidad en color y peso 500.
    - El estado con un punto ("● Abierta" o "● Resuelta" en verde).
    - El chip "Dinero" si es una alerta de dinero.
  - **Borde de la tarjeta:** rojo fino en Crítica.
  - **Cuerpo:**
    - Título (peso 500), mensaje y una línea gris "Ocupación #482 · Creada …".
    - Un divisor.
    - Las acciones: "Ver ocupación" (píldora arena), "Ver caja" y "Ver trazabilidad" (enlaces subrayados) y, a la derecha, "Resolver alerta" (píldora rosa).
  - **Sin permiso de dinero:**
    - "Resolver alerta" se ve deshabilitado, con borde punteado.
    - Arriba a la derecha va un chip chico "Sin permiso para resolver alertas de dinero".
  - **Alerta resuelta:** un recuadro verde teñido con "Resuelta el … por … · comentario".
- **Abajo:** la paginación en texto.

### Cocheras (`cocheras.png`)
- **Encabezado:** título "Cocheras" y subtítulo "Visualización rápida del estado de cada cochera.".
- **Fila de acciones:** ↻, "Agregar cocheras" (arena) y "Buscar por número" (etiqueta arriba, campo a todo el ancho).
- **Debajo:** "Total: N cocheras".
- **Mosaicos en grilla de 6 columnas** en desktop:
  - Cada mosaico es una tarjeta de radio 10, con **fondo y borde teñidos por la situación**:
    - **Libre:** verde.
    - **Ocupada por mes:** gris pizarra.
    - **Ocupada por hora o por día:** azul.
    - **Reservada:** violeta.
    - **Con deuda:** rojo (mensual con saldo o vencida, como dice D-FM16).
    - **Bloqueada:** usá el tono `er` o `de` y anotalo; no hay captura.
  - **Fila 1:** "#12" en el color del tono, peso 500 y ~20 px, y a la derecha un chip blanco con borde: "Libre", "Por mes", "Por hora", "Por día", "Reservado", "Con deuda" o "Bloqueada".
  - **Fila 2:** el nombre del cliente, o "—" si está libre.
  - **Fila 3**, gris: "Desde HH:mm" (inicio), "Desde HH:mm · Hasta HH:mm" en una reserva, o "—".
  - La patente del diseño se omite (PB-25).
  - **Clic:** abre el detalle de la cochera de hoy.
- **Pestañas:** la vista "Tarjetas" de hoy pasa a ser **estos mosaicos**. La pestaña "Plano" queda para el plano posicional (tanda 5).
  - Mientras tanto, se ven solo los mosaicos y no hay pestañas.
  - El agrupado por nivel ("PB 50 cocheras") espera al PB-24.

### Clientes (`clientes.png`)
- **Encabezado:** título "Clientes (Activos)" (o "(Inactivos)" según el filtro de hoy) y subtítulo.
- **Fila:** "Nuevo cliente" (arena), ↻ y "Buscar (nombre/doc/tel)" (etiqueta arriba, a todo el ancho).
- **Tarjeta de paginación:** "Mostrando 10 de 37 · Página 1 / 4 ‹ Anterior · Siguiente ›" y "Page size" a la derecha.
- **Tarjetas en 2 columnas:**
  - Un **avatar circular con las iniciales**, teñido con un tono por cliente (derivado del id, por ejemplo `TONE_KEYS[id % n]`).
  - El nombre (peso 500, ~19 px) y el chip "Activo" a la derecha.
  - La línea "Doc: … · Tel: … · Email: …".
  - "Editar" (píldora neutra) y "Desactivar" (píldora rosa), que abre el `ConfirmDialog`. Con un cliente inactivo va "Reactivar".

### Tarifas (`tarifas.png`)
- **Encabezado:** ↻ y "Nueva tarifa" (arena).
  - Si hoy no existe una acción equivalente, **no se agrega**: el botón solo aparece si mapea a una acción existente. Anotalo.
- **Tarjeta "Tarifas vigentes",** con una fila por tipo (Hora, Día, Mes) y divisor entre filas:
  - El nombre a la izquierda.
  - El precio a la derecha (peso 500, o "—" si no hay) y "Cambiar precio" (píldora neutra).
  - Debajo, "Vigente desde dd/mm/aaaa" en gris, o "Sin tarifa vigente".
  - Si hay una programada, una línea con el chip "Programada", "Desde dd/mm/aaaa: $ …" y "Quitar" (enlace rojo) a la derecha.
- **Tarjeta "Historial":**
  - El título y, a la derecha, el select "Tipo" con la etiqueta arriba.
  - La tabla con Precio, Período, Estado (chip) y acciones en enlaces ("Editar · Quitar"), según lo que existe hoy.

### Caja (`caja.png`)
- **Encabezado:** título "Caja" y ↻ a la derecha.
- **Debajo:** el segmentado **"Caja actual | Historial"**, que reemplaza a las Tabs.
- **Tarjeta "Caja actual":**
  - Arriba, el chip del modo ("Diaria") al lado del título y el chip de estado ("Abierta") a la derecha.
  - La **tabla de totales** (Método, Cobros, Anulaciones, Devoluciones) con el encabezado hundido.
  - "Abierta desde … · Fondo inicial $ …" y "Efectivo esperado: $ …".
  - A la derecha, "Ver detalle" (píldora arena) y "Cerrar caja" (píldora azul grisácea), según el permiso.
- **Sin sesión:** la misma tarjeta, con el título "Diaria · sin sesión" o "Por turno · sin sesión" y el chip "Sin sesión" a la derecha. Lleva el texto de hoy, "Fondo propuesto: $ …" y "Abrir caja" (arena) abajo a la derecha.
- **La sección "Variantes" de la captura es un muestrario del diseño:** NO se copia. Se muestra solo el estado real.
- **Historial:** el filtro en tarjeta y la tabla con el estilo 1.6.

### Usuarios (`usuarios.png`)
- **Fila:** ↻, "Invitar usuario" (arena) y "Buscar por nombre o email" (a todo el ancho).
- **Debajo:** el switch marrón "Mostrar desactivados".
- **Tarjeta con la tabla:** Nombre, Email, Rol, Estado (chip), Alta y Acciones ("Ver actividad" como enlace, "·" y el menú ⋮).
- **Usuario desactivado:** la fila completa va en gris claro.

### Trazabilidad (`trazabilidad.png`)
- **Tarjeta de filtros, en una fila:** Desde, Hasta, "Ocupación (ID)", "Pago (ID)", "Sesión de caja (ID)", Usuario, Fuente, "Buscar" (arena) y "Limpiar" (arena).
- **Debajo:** "N eventos".
- **Tarjeta con la tabla:**
  - Columnas: Fecha (con segundos), Fuente (chip teñido), Acción (chip teñido), Quién ("Vos", "Usuario #4" o el chip "Automática"), Objeto (**chip con borde**, clickeable: "Pago #318", "Ocupación #482", "Caja #57"), Resumen y "Ver detalle" (enlace).
  - Paginación en texto.

### Configuración (sin captura)
- Mismo lenguaje: título, subtítulo y una tarjeta por sección, con las etiquetas arriba de los campos y "Guardar" en marrón lleno abajo a la derecha.
- Se llega desde el menú de usuario.

## 3. Omisiones por datos que no existen (anotar en la spec 13 como DV-FM)
| En el diseño | Qué se hace ahora | Pedido |
|---|---|---|
| Plano posicional y niveles ("PB · 36/50") | Grilla de mosaicos | PB-24 |
| Patente ("Buscar patente", patente en los mosaicos), tipo de vehículo | Se omite | PB-25 |
| Cliente ocasional ("Nombre de pila") | Solo cliente habitual | PB-26 |
| Abono semanal | Solo mensual | PB-27 |
| Zonas (Zona A, Zona B) en Registrar ingreso | Un solo grupo "Cocheras" | PB-28 (o dentro del PB-24) |

## 4. Verificación
- **Automática:** `npm test`, `npm run lint` y `npm run build` en verde.
- **Visual, a cargo del usuario:** con `npm run dev` y el backend levantado, cada pantalla en modo claro tiene que verse como su captura de `docs/diseno/`. También se revisan el modo oscuro con el selector y el ancho de 360 px.
