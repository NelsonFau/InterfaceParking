# Detalles de Claude Design (referencia exacta)

> Información de detalle que el usuario le pidió a Claude Design después de la segunda prueba visual (20/11/2026), guardada **tal cual**. Es la referencia exacta: **manda sobre los valores `PROVISORIO` de `src/theme/theme.js` y sobre `docs/diseno/guia-visual.md`** si difieren. Lo que necesita backend o cambia comportamiento (patente, tipo de vehículo, cliente ocasional, abono semanal, zonas, plano posicional, reglas de tarifas) **no se implementa** desde acá: ver la sección "Fuera de alcance" de la spec 13 y el reporte al Orquestador.

---

Construí la app "ParkingControl", un sistema de gestión de garage (Uruguay, español rioplatense con voseo: "Tocá", "Registrá"). Estilo serio y plano, tonos tierra cálidos, sin degradados, sin emoji, sin glassmorphism. Respetá todos los valores exactos que siguen.

## 1. Tipografía
- Fuente única: Red Hat Display (Google Fonts, pesos 400/500/600/700/800), fallback system-ui, sans-serif. Se aplica a todo, incluidos botones e inputs (font-family: inherit).
- Excepción: las patentes y los números de cochera dentro del plano usan 'Geist Mono', monospace.
- Ningún texto baja de 16px. Todos los números llevan font-variant-numeric: tabular-nums.
- Escala:
  - H1 título de pantalla: 30px / 700 / letter-spacing -0.02em / line-height 1.15
  - H2: 22px / 700 / -0.015em / 1.2
  - H3 título de tarjeta: 19px / 700 / -0.01em / 1.3
  - Cuerpo: 16px / 500 / 1.5
  - Cuerpo fuerte: 16px / 600
  - Secundario: 16px / 400 / color muted / 1.5
  - Etiqueta de KPI (caption): 16px / 600 / color muted
  - Número de KPI: 36px / 700 / -0.025em / line-height 1.05
  - Dinero: 19px / 700
  - Logo "ParkingControl": 24px / 800 / -0.03em

## 2. Paleta (tema claro, por defecto)
- page #e6e0d7 (fondo exterior)
- app #F6F3EE (fondo del área de contenido)
- surf #FFFFFF (tarjetas, inputs, modales)
- sunk #F0EBE4 (fondos hundidos, hover)
- act #E9DCCF (seleccionado)
- border #E6DFD5 (bordes suaves)
- strong #CFC4B6 (borde de tarjetas e inputs)
- text #2A2018 · muted #6B5D52 · faint #85766A (placeholders)
- Acento marrón: #6F4E37 (principal), #4A2F1F (oscuro), #D9B99B (claro). Acento suave = #6F4E37 al 9%; línea = #6F4E37 al 19%.
- Estados (texto / fondo / borde):
  - OK #2F6B4A / #EAF3ED / #C5DCCD
  - Aviso #85561A / #F8EFDC / #E6D2A6
  - Error #A03030 / #F8EAE8 / #E8C6C2
  - Neutro #3F4650 / #E9E8E6 / #C2BFBA
  - Info #3B4F6B / #EBF0F6 / #CFD9E5
  - Violeta #5B4A7A / #EEEAF5 / #D6CDE6
  - Default #5F554B / #F1ECE5 / #DDD4C8

Tema oscuro (selector Claro/Oscuro):
- app #1A1A1A · surf #212121 · sunk #2A2A2A · border #333333 · strong #444444 · text #EEF0F8 · muted #A6ABC4 · input #12141C
- Acento en oscuro: #D9B99B. Menú lateral #242424.
- Estados en oscuro: OK #5EE3A1, Aviso #FFC36B, Error #FF7F9B, Info #93A5FF. El fondo de cada estado es su color al 12% y el borde, su color al 30%.

## 3. Estructura general
- Layout de dos columnas: menú lateral fijo a la izquierda y contenido a la derecha con scroll propio.
- Padding del contenido: 24px 36px 40px (en mobile, 16px).
- Separación entre tarjetas: 16px.

### Menú lateral
- Color sólido a todo el alto: #DCCFB8 en claro, #242424 en oscuro. Ancho 260px. En mobile es un drawer de 284px con sombra 0 30px 60px -10px rgba(0,0,0,.5).
- Encabezado: logo "ParkingControl" (24px/800) y debajo el nombre del garage (16px/500). Padding 26px 12px 20px 24px. Línea inferior 1px rgba(42,38,32,.12).
- Ítems agrupados por sección, con títulos de grupo plegables.
- Cada ítem: alto 44px, padding 0 16px, gap 12px, ícono de trazo de 20px (stroke-width 1.75), texto 16px peso 600.
- Ítem activo ("píldora sólida"): radio 12px, fondo rgba(252,248,238,.72), texto #2A2620, peso 700. Hover: fondo rgba(42,38,32,.07).
- Ítems del menú: Panel, Registrar ingreso, Monitor operativo, Cocheras, Ocupaciones, Pagos, Caja, Alertas, Trazabilidad, Tarifas, Clientes, Configuración. Se filtran según los permisos del rol: Dueño, Encargado, Operador, Auditor.

## 4. Componentes

### Tarjeta
- Fondo #FFFFFF, borde 1px #CFC4B6, radio 10px, padding 20–24px, gap interno 12px.
- Sombra: 0 2px 4px rgba(40,25,10,.10), 0 16px 32px -12px rgba(40,25,10,.30).

### Tile de KPI
- Fondo #F6F3EE, borde 1px #E6DFD5, radio 10px, padding 14px 16px (compacto: 10px 12px), gap 6px.
- Arriba la etiqueta (16px/600 muted), abajo el número (36px/700).

### Botones
- Base: alto 42px (mobile 46px, grande 46px), padding 0 18px, radio 12px, 16px peso 600, inline-flex centrado, gap 8px, sin salto de línea, cursor pointer.
- Variantes:
  - Primario: fondo #E9DCCF, texto #4A2F1F, borde 1px #6F4E37
  - Secundario: fondo #F1E6DA, texto #4A2F1F, borde 1px #CDB39A
  - Verde (Registrar pago): #C9D6CC, texto #1F3326, borde 1.5px #4F6B58
  - Finalizar: #D9D2BF, texto #3A3216, borde 1.5px #8A7B4E
  - Rojo (Cancelar): #D8C4C0, texto #431E1A, borde 1.5px #7E4A44
  - Neutro: #DCCFB3, texto #3A2A1C, borde 1.5px #A8956F
  - Ícono redondo (↻): #DDD0B4, texto #000, borde 1px #9A8A6A, radio 999px, cuadrado de 42px, ícono de 22px
  - Link secundario: transparente, color acento, subrayado con offset 3px
  - Deshabilitado: fondo #F0EBE4, texto #6B5D52, borde 1px dashed #CFC4B6, cursor not-allowed. Siempre lleva tooltip con el motivo (ej. "Tu usuario no tiene permiso para…").
- Variante píldora (acciones de las tarjetas de ocupación), radio 999px:
  - Ver: transparente, texto #3A2A1C, borde 1.5px #8A7B5E
  - Registrar pago: #DCE6DF, texto #2C4636, borde #A9BFAF
  - Finalizar: #DDE2EA, texto #2E3A4E, borde #AAB4C4
  - Cancelar reserva: #EADDDC, texto #5A2E2A, borde #C7A9A6

### Inputs
- Alto 42px (textarea mínimo 88px con padding 12px), padding 0 14px, radio 8px, 16px.
- Fondo #FFF, borde 1px #CFC4B6. Error: borde #A03030 y texto de ayuda en #A03030.
- Label arriba (16px/600, margen 6px). Ayuda abajo (16px muted, margen 6px).
- Select con chevron de 16px. Checkbox 20×20. Switch 42×24.

### Chips de estado
- Alto 28px, padding 0 10px, radio 6px, 16px/600, borde 1px.
- Usan texto, fondo y borde del estado. Variante outline: fondo transparente.

### Banners de alerta
- Flex, gap 12px, padding 12px 16px, radio 10px, punto de color de 10×10 a la izquierda.
- Error: texto #A03030, fondo #F8EAE8, borde #E8C6C2. Aviso: texto #85561A, fondo #F8EFDC, borde #E6D2A6.

### Diálogo genérico
- Fondo #FFF, borde 1px #E6DFD5, radio 14px, padding 26px, gap 14px.
- Sombra: 0 24px 48px -20px rgba(60,40,25,.35).
- Título 22px/700. Acciones alineadas a la derecha.

### Carga y estados vacíos
- Skeleton: barras con fondo #F0EBE4 y animación pc (opacidad 1 → 0.5 → 1, 1.4s ease-in-out infinite).
- Spinner: 40px, borde de 4px en acento suave, borde superior en #6F4E37, gira 0.9s linear.
- Vacío y Error: mensaje en tarjeta. El error trae un botón "Reintentar".

## 5. Pantalla Panel (Dashboard)
- Encabezado: H1 "Panel" y subtítulo "Estado general del garage en tiempo real.".
- Debajo, UNA sola tarjeta que contiene, en este orden:
  1. Una fila horizontal con 6 tiles de KPI: Total cocheras 48 · Disponibles 21 · Ocupadas 19 · Bloqueadas 2 · Vencen hoy 4 · Vencen en 7 días 9. Siempre en una sola fila: cada tile es flex 1 0 110px con min-width 110px. Si no entran, la fila hace scroll horizontal; nunca pasa a otra línea.
  2. El plano del garage, dentro de la misma tarjeta, sin barra de "Ocupación / Buscar patente" arriba.
- Arriba a la derecha del plano: selector de nivel (select con formato "PB · 36/50", ocupadas/total).
- Debajo del plano: leyenda de filtros (ver 6.3).

## 6. Plano del garage (SVG)
- Vista cenital: piso de hormigón, muros, columnas, rampas, portones de ENTRADA/SALIDA, garita, flechas de circulación, líneas de cajón y autos dibujados desde arriba en cada lugar ocupado.
- Número de cochera en Geist Mono. Tipos de lugar: Fijo de abonado, Rotativo (por hora), Moto, Accesible. Hay lugares en tándem: el de atrás queda bloqueado por el de adelante.

### 6.1 Colores de estado de cochera
- Libre #5F8A72
- Por mes #516D90 (NO usar la palabra "Abonado" en la UI, siempre "Por mes")
- Por hora #A17C4B
- Reservado #776D94
- Por mes con deuda #A0564E
- Bloqueado #7A746C

### 6.2 Click en una cochera
- Toda el área del lugar es clickeable (cursor pointer): el auto, el cajón y el número. No hace falta apuntar al número.
- Al tocar, la cochera queda seleccionada con un contorno amarillo #FFD400 de 3.5px y se abre un modal centrado sobre el plano:
  - Posición absoluta centrada, ancho min(440px, 100% − 32px), alto máximo 100% − 32px, z-index 30.
  - Fondo blanco al 55% con backdrop-filter blur(24px) saturate(180%) (en oscuro rgba(33,33,33,.6)).
  - Borde 1px rgba(255,255,255,.85), radio 24px.
  - Sombra: 0 30px 70px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.9).
  - Padding 20px 22px.
- Contenido del modal:
  - Fila superior: número de cochera (34px/600, line-height 1). Al lado, un chip de estado: fondo surf, borde 1px border, radio 8px, padding 4px 12px, punto de 7px con el color del estado y el nombre del estado. A la derecha, botón cerrar "×": círculo de 44px, fondo #F0EBE4, 20px.
  - Subtítulo: "<Nivel> · <Tipo de lugar>", 16px muted, margen superior 4px.
  - Grilla de datos: repeat(auto-fit, minmax(140px,1fr)), gap 10px 20px. Cada dato tiene la etiqueta en muted y el valor en bold 16px.
  - Botones de acción: min-height 52px, padding 0 20px, radio 8px, 17px/500, fondo acento #6F4E37, texto blanco, ancho flexible.
- Datos y acciones según el estado:
  - Libre: Estado "Disponible". Si tiene abonado asignado, también: Abonado asignado, Patente y Abono ("Al día" o "Con deuda (N meses)"). Acción: "Registrar entrada acá" (abre el ingreso con la cochera y la patente precargadas).
  - Reservado: Reservado a, Desde las, Patente. Acción: "Liberar reserva" (fondo #7860B5).
  - Por hora: Patente, Entrada ("hoy HH:MM"), Transcurrido ("2 h 15 min"), Cliente ("Por hora · ticket #1060"), Tarifa acumulada en $. Acción: "Registrar salida".
  - Por mes: Patente, Entrada, Transcurrido, Cliente ("Por mes · Nombre"), Tarifa acumulada "Incluida en el abono". Acción: "Registrar salida".
  - Por mes con deuda: igual que Por mes, pero en lugar de la tarifa muestra Deuda en $ (meses adeudados × abono). Acción: "Registrar salida".
- Se cierra con "×". Al tocar otra cochera se reemplaza el contenido.
- En mobile, el modal pasa a ser una bottom sheet: blanca, radio 22px 22px 0 0, máximo 66% del alto, con un tirador de 46×5px y el título "Lugar X · Estado". Abre y cierra con transform translateY(.25s ease).

### 6.3 Leyenda / filtros del plano
- Fila de chips: "Todos · 100", "Libre · 23", "Por mes · 40", "Por hora · 28", "Reservado · 4", "Por mes con deuda · 5". Cada chip tiene un cuadrado de color de 14px con radio 3px, el texto en 16px y el conteo real.
- Chip seleccionado: fondo surf y borde 1px del color acento (#6F4E37), radio 8px. Los demás: fondo y borde transparentes.
- Comportamiento:
  - "Todos": el plano se ve normal, sin ningún color extra.
  - Un estado seleccionado: las cocheras de ese estado se pintan con su color en tono suave (relleno al 32% de opacidad y borde de 1.5px al 70%, radio 2px, pointer-events none). Por ejemplo, con Libre las libres quedan verde suave, no chillón. Las cocheras de otros estados se atenúan con un velo #EFEDE8 al 72%.
- Búsqueda de patente (desde 2 caracteres): las coincidencias se marcan con relleno blanco al 25% y borde blanco, y el resto se atenúa.

## 7. Alertas operativas y titileo
- Cada alerta es una tarjeta: fondo surf, radio 10px, overflow hidden. Sombra: 0 2px 4px rgba(40,25,10,.08), 0 16px 32px -14px rgba(40,25,10,.26). Si es Crítica y está abierta, el borde es #A03030 al 55%; si no, el borde es border. Las resueltas van con opacidad .92.
- Franja lateral izquierda de 150px (en mobile pasa arriba, en fila). Lleva el fondo y el borde del tono de la severidad, padding 18px. Adentro:
  - Severidad en 20px/800, color del tono.
  - Estado "Abierta"/"Resuelta" con un punto de 9px.
- Punto de estado:
  - Abierta: color de la severidad y halo box-shadow 0 0 0 4px (mismo color al 18%).
  - TITILEO: animación pcBlink, @keyframes pcBlink { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.25; transform:scale(.8) } }. Crítica: 1s ease-in-out infinite. Resto de severidades abiertas: 1.8s ease-in-out infinite. Resuelta: punto verde #2F6B4A, sin animación.
  - Respetar prefers-reduced-motion: animation-duration 0s.
- Cuerpo (padding 16px 22px): título del tipo (H3), mensaje (16px/1.5), meta "Ocupación #482 · Creada 15/11/2026 11:20" (15px muted) y chip "Dinero" si involucra plata.
- Botones: "Ver ocupación" (neutro, hover #CFC0A0) y luego "Ver caja" y "Ver trazabilidad" como links subrayados. "Resolver alerta" en rojo: si el rol no tiene permiso, va deshabilitado con la nota "Sin permiso para resolver alertas de dinero".
- Severidades: Crítica, Alta y Media usan el tono de error o de aviso; Baja usa #8D969C.
- Tipos: Ocupación vencida sin cierre, Ocupación finalizada sin pago, Pago menor al esperado, Pago registrado tarde.

## 8. Reglas de negocio de tarifas
- Hora $100. Se cobra por fracción de 15 min = $25. Tope diario $600 (día completo). Abono mensual $4.500.
- Cálculo: días completos × $600 + min($600, ceil(minutos restantes / 15) × $25). Mínimo, una fracción.
- Dinero en formato uruguayo: "$ 1.200,00". Fechas "19/11/2026 10:15".

## 9. Tono de los textos
- Claros y directos, en voseo. Los errores explican qué pasó y qué hacer ("No pudimos cargar las cocheras." + "Reintentar").
- Etiquetas cortas. Nada de relleno.
