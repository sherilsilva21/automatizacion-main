# Mediciones de referencia (fuente única)

Son de un conjunto concreto; mide siempre con el tuyo.

**Qué exactitud esperar.** Medida en el repositorio de referencia **sobre las 1000 facturas del curso** (solo extracción, sin base de datos): **875 aceptadas automáticamente (88 %) y 125 a revisión** (40 de ellas son los casos problemáticos deliberados, que siempre van a revisión; el resto, 85, son lecturas que el OCR no logró); de las 875 aceptadas, **872 totalmente correctas y 3 con un error que la validación no detectó**. Con otros conjuntos de facturas la cifra varió entre 82 % y 98 %, y una muestra de 100 del mismo conjunto dio 85 %: una muestra pequeña engaña. El 100 % no existe con OCR sobre imágenes degradadas, y por eso existe la **revisión manual** (Fase 9). Los motivos de revisión más comunes: documento del cliente no leído, proveedor no leído e ítems que no suman el subtotal. Una factura "aceptada" solo significa que pasó todas las validaciones; un error que cuadre aritméticamente (por ejemplo, un dígito mal leído en el número de factura) puede pasar. **Mide con tu conjunto; no supongas.**

**Tiempos medidos** (Vercel Hobby, 3 lotes concurrentes de 4 archivos): ~1,5 s por factura en promedio (10 facturas en 15 s; 200 en ~7 min incluyendo la subida); **1000 facturas ≈ 25 a 35 minutos**. El arranque en frío del primer lote tarda unos 9 s.
