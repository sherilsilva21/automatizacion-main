# Fase 7 — Excel en Blob

**Objetivo.** Al finalizar el lote, generar un Excel **a partir de la base de datos** (no de la memoria) y dejarlo descargable.

**Qué construyes.** `src/lib/excel/generar.ts`, el paso final de `src/lib/procesamiento/finalizar.ts` y `src/app/api/procesos/[id]/excel/route.ts`.

**Pasos.**
1. Lee la cola del lote → los `hashArchivo` distintos → `getAll` de esas facturas (incluye las "duplicadas" de reprocesos, así el Excel de un reproceso no sale vacío) → `getAll` de los clientes de esas facturas.
2. Hojas: **Facturas** (archivo, número, fecha, proveedor, NIT proveedor, documento cliente, cliente, valor antes de IVA, IVA, impoconsumo, total, estado, motivos, confianza OCR), **Ítems** (número de factura, descripción, cantidad, precio unitario, subtotal), **Clientes** (documento, nombre, número de facturas, total comprado) y **Resumen** (carpeta, total de archivos, aceptadas, en revisión, duplicadas, con error, clientes nuevos y existentes, duración).
3. Importes como **números** con formato `"$"#,##0` (nunca texto); fechas como **fechas** reales con formato `yyyy-mm-dd`; encabezados en negrita con filtro automático y fila fija.
4. Se genera en memoria (`Buffer`) y se sube a Blob en `procesos/<id>/resultado_AAAA-MM-DD_HHmm.xlsx` con la **hora de Colombia** (`America/Bogota`), así no se pisan ejecuciones anteriores. El pathname se guarda en `procesos.rutaExcel`.
5. El store es privado: `GET /api/procesos/[id]/excel` lee el blob con el SDK y lo devuelve como descarga (`content-disposition: attachment`).

**Por qué.** Generarlo desde la base garantiza que el Excel muestra lo guardado. Con 1000 filas el modo normal de `exceljs` basta; no hace falta *streaming*.

**Verificación.** Descargar el Excel desde la interfaz; la **suma de la columna Total coincide con la agregación `sum()` de Firestore** sobre `facturas`. (Un `sum()` filtrado por lote pide un índice compuesto; el script de referencia suma sobre toda la colección, válido cuando solo están los datos de la prueba.) Las celdas de importes deben ser numéricas.

**Errores típicos.** Importes guardados como texto; fechas con zona horaria equivocada; olvidar que el Excel de un reproceso debe incluir las duplicadas.

**Pídele a tu IA.** "Abre el Excel generado y dime cómo comprobar, desde código, que las celdas de importes son números y no texto."
