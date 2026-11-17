# Fase E2 — Reporte de IVA por bimestre (mejora propia)

> Mejora fuera del enunciado del curso. Se hace **después de la Fase D**.

**Objetivo.** Una página **«Reportes»** que muestre, por bimestre (ene–feb, mar–abr, …, nov–dic), la base gravable, el IVA, el impoconsumo y el total de las facturas procesadas, con un gráfico y una hoja nueva en el Excel. Es lo que un contador necesita para preparar la declaración de IVA.

**Contexto tributario (verifícalo con un contador).** La periodicidad de la declaración de IVA depende del contribuyente (bimestral o cuatrimestral según sus ingresos). El reporte agrupa por **bimestre** y deja la duración del periodo como constante en `src/lib/ocr/constantes.ts` (`MESES_POR_PERIODO_IVA = 2`) para poder cambiarla. Se usa la **fecha de emisión** de la factura.

**Qué construyes.**
- `src/lib/reportes/periodos.ts` (puro, con pruebas): `periodoDe(fecha: string): string` → `"2026-B3"` y `nombrePeriodo("2026-B3")` → `"Mayo – junio 2026"`.
- Contadores nuevos en `src/lib/procesamiento/metricas.ts`: `metricas.porPeriodo[clave]` con `n`, `subtotal`, `iva`, `impoconsumo` y `total` (tipo en `src/lib/modelo/tipos.ts`, opcional para no romper lotes viejos).
- `src/app/reportes/page.tsx` + `src/componentes/ReporteIva.tsx`, y la pestaña «Reportes» en `MenuSuperior.tsx`.
- Una hoja **«IVA por periodo»** en `src/lib/excel/generar.ts`.

**Cómo funciona.**
1. **Igual que las métricas por proveedor:** el evento `factura` y el evento `manual` llevan ahora la `fecha`. `cambiosDe` suma a `porPeriodo` **solo** las facturas aceptadas por la máquina y las revisadas a mano (lo mismo que «lo procesado»); las que siguen en revisión no entran. Una factura sin fecha legible no suma a ningún periodo.
2. Si una persona corrige la **fecha** en la revisión manual, `cambiosManual` resta los importes del periodo viejo y los suma al nuevo (como ya hace con el NIT del proveedor).
3. Todo se aplica con `FieldValue.increment` **dentro de la misma transacción** que guarda la factura (`guardar.ts` y `corregir.ts`). Abrir el reporte sigue costando **1 lectura por lote**: reutiliza `GET /api/metricas` y suma con `sumarMetricas` (amplíala para `porPeriodo`).
4. **Lotes procesados antes de esta fase** no tienen `porPeriodo`: `scripts/recalcular-metricas.ts` debe reconstruirlo (amplía `metricasDesdeEventos`). La página avisa «N lotes no tienen datos por periodo; recalcúlalos» en lugar de mostrar ceros que parezcan reales.
5. **Gráfico sin dependencias nuevas:** barras en SVG hechas a mano (IVA por periodo), con colores de los tokens (`acento`), etiquetas con el importe y una tabla debajo con las cifras exactas (el gráfico nunca es la única fuente).
6. Selector de año; botón «Descargar este reporte» que genera un Excel solo con la hoja de periodos (ruta nueva `GET /api/reportes/iva?anio=2026`, exige sesión).

**Por qué.** Muestra que el sistema no solo lee facturas: produce información que alguien usa para una obligación real. Y reutiliza el patrón más valioso del proyecto (contadores dentro de la transacción), así que cuesta casi nada en cuota.

**Verificación.**
- `npm test`: pruebas de `periodoDe` (bordes: 28 y 29 de febrero, 31 de diciembre, fecha inválida → `null`), de `cambiosDe` con `porPeriodo` y de `cambiosManual` cambiando la fecha.
- Procesa un lote pequeño y comprueba que **la suma de todos los periodos = «Lo procesado»** del panel de métricas (mismo total, mismo IVA). Escríbelo como comprobación en `scripts/probar-pipeline.ts` o en un script nuevo que limpie lo que crea.
- Corrige a mano la fecha de una factura a otro bimestre y comprueba que el importe se movió de periodo.

**Errores típicos.** Calcular el periodo con `new Date("2026-03-01")` (se interpreta en UTC y puede caer en el mes anterior en Colombia): trabaja con el texto `yyyy-mm-dd`; olvidar los eventos manuales (el reporte no cuadraría con «Lo procesado»); claves de mapa con caracteres que Firestore interpreta en rutas (usa `FieldPath`, como con el NIT).

**Pídele a tu IA.** "Antes de escribir código, muéstrame qué cambios produce `cambiosDe` para una factura aceptada del 15 de marzo y qué produce `cambiosManual` si después le cambio la fecha al 2 de mayo."
