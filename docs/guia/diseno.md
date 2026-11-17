# Sistema de diseño y UX — «Libro de cuentas»

Léelo antes de crear o modificar cualquier componente. Reemplaza el punto 8 («Diseño») de la Fase 8.

## Idea

La aplicación trata papeles contables: facturas, sellos, cifras. El lenguaje visual toma de ahí su
carácter: fondo frío como papel de libro contable (no crema), texto en **tinta azul oscura**, cifras
siempre tabulares y alineadas a la derecha, y estados que se leen como **sellos** sobre la factura.
Lo memorable es una sola cosa: el **sello de estado** en el detalle y en la revisión de una factura.
Todo lo demás es sobrio.

## Paleta por rol (los valores viven en `src/app/globals.css`)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `papel` | `#F5F7F6` | `#0E1417` | fondo de la página |
| `superficie` | `#FFFFFF` | `#151D21` | paneles, tablas, formularios |
| `superficie-2` | `#ECF0EE` | `#1C262B` | cabeceras de tabla, filas alternas, zonas de soltar |
| `linea` | `#D5DDD9` | `#2A373D` | bordes y divisores |
| `tinta` | `#14212B` | `#E4EAE7` | texto principal |
| `tinta-suave` | `#56636D` | `#9AA8A2` | texto secundario, etiquetas |
| `acento` | `#1E3F8A` | `#8FA9F0` | botón principal, enlaces, foco, barras de proveedores |
| `aceptada` | `#18794E` | `#5CC793` | leída correctamente |
| `revision` | `#A15C07` | `#E9B04D` | espera a una persona (no es un fracaso) |
| `error` | `#B42318` | `#F2877C` | fallo técnico, acción destructiva |
| `manual` | = `acento` | = `acento` | corregida a mano (la «tinta» de una persona) |
| `duplicada` | = `tinta-suave` | = `tinta-suave` | ya estaba en la base |

Cada color de estado tiene su versión `-suave` (fondo de insignias y alertas), calculada con `color-mix`.
Todos los pares texto/fondo cumplen **WCAG AA** (≥ 4,5:1) en ambos modos.

**Cambio de criterio respecto a la versión anterior:** ya no hay «bueno/malo». Una factura en revisión
no es un error: es trabajo pendiente para una persona. Por eso tiene su propio color (ámbar) y el rojo
queda reservado para errores técnicos y para «Borrar todo».

### Mapa de estados (único en toda la app)

| Estado | Color | Icono | Texto |
|---|---|---|---|
| `aceptada` | `aceptada` | marca de verificación | Leída correctamente |
| `revision` | `revision` | reloj de arena | Pendiente de revisión |
| corregida a mano | `manual` | pluma | Revisada a mano |
| `duplicada` | `tinta-suave` | dos hojas | Ya estaba en la base |
| `error` | `error` | triángulo | No se pudo leer |

Define este mapa **una vez** (`src/componentes/estado.ts`) y úsalo en insignias, tablas, métricas y Excel.
Nunca solo color: siempre icono + texto.

## Tipografía

- **IBM Plex Sans** para toda la interfaz, autoalojada con `next/font/local` (el build no tiene acceso a
  Google Fonts). Pesos 400, 500 y 600.
- **IBM Plex Mono** solo para identificadores reales: NIT, CUFE, número de factura, hash.
- Cifras con `font-variant-numeric: tabular-nums` y alineadas a la derecha en tablas.
- Escala: 12 · 14 · 16 (base) · 20 · 25 · 31 px. Títulos en frase normal (sin mayúsculas sostenidas).
- Importes con `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })`
  en un solo helper (`formato.ts`).

## Espaciado, forma y elevación

- Escala de 4 px (4, 8, 12, 16, 24, 32, 48).
- Radios con jerarquía: 6 px en controles, 10 px en paneles, 999 px solo en insignias.
- Sombras casi nulas: los paneles se separan por borde `linea`, no por sombra.
- Ancho máximo del contenido: 1200 px; tablas con scroll horizontal propio en pantallas estrechas.

## Estados de cada pantalla (obligatorio)

Toda vista que cargue datos muestra los cuatro: **cargando** (esqueleto con la forma real, no un spinner
centrado), **vacío** (qué hacer: «Aún no hay lotes. Elige una carpeta de facturas para empezar»),
**error** (qué pasó y cómo seguir, sin disculpas) y **con datos**.

## Componentes base (`src/componentes/ui.tsx`)

`Boton` (principal, secundario, peligro, fantasma; con estado `cargando`), `Insignia` (lee el mapa de
estados), `Tarjeta`, `Medidor` (porcentaje + barra + «n de N»), `Tabla` (cabecera fija, cifras a la
derecha, fila completa clicable), `Dialogo` (foco atrapado, Escape cierra), `Aviso` (éxito, revisión,
error) y `Esqueleto`. Ningún componente de página define colores propios.

## Microcopia

- Los botones dicen lo que pasa: «Subir y procesar», «Guardar corrección», «Descargar Excel».
- La misma acción conserva su nombre en todo el flujo (botón «Guardar corrección» → aviso «Corrección guardada»).
- Las cifras se explican donde aparecen: «Leídas correctamente: pasaron todas las validaciones».

## Accesibilidad y movimiento

Foco visible (anillo `acento` de 2 px con separación), navegación completa con teclado, `aria-live`
en el avance de los lotes, objetivos táctiles ≥ 40 px, `prefers-reduced-motion` respetado. El único
movimiento propio: la barra de avance y el sello al guardar una corrección.

## Tema

Sigue al sistema por defecto y permite forzarlo con un selector (Claro · Oscuro · Sistema) que pone
`data-theme` en `<html>`. Para evitar el parpadeo, un script en línea en el `<head>` aplica la preferencia
guardada antes de pintar.

## Verificación

1. `npx tsx scripts/revisar-ui.ts <url> <capturas>` (Playwright): recorre login, procesar, métricas,
   detalle y revisión en **claro y oscuro**, a **375 px y 1280 px**; guarda capturas; falla si hay
   desbordes horizontales o errores de consola.
2. `@axe-core/playwright` en esas mismas páginas: **0 violaciones** serias o críticas.
3. `grep -rnE "#[0-9a-fA-F]{3,6}|(bg|text|border)-(red|green|amber|blue|gray|slate)-[0-9]" src/componentes src/app --include=*.tsx`
   no devuelve nada (todo color pasa por tokens).
4. Lighthouse en producción: Accesibilidad ≥ 95.
