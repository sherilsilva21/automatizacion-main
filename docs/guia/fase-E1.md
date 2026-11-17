# Fase E1 — Fotos con la cámara del celular (mejora propia)

> Mejora fuera del enunciado del curso. Se hace **después de la Fase D**, sin cambiar nada de lo que ya funciona.

**Objetivo.** Que desde un teléfono se puedan **tomar fotos** de facturas en papel y procesarlas con el mismo flujo de siempre (lote → subida por la API → OCR → revisión). La API no cambia: lo nuevo vive en el navegador.

**Qué construyes.** `src/lib/navegador/comprimir-imagen.ts` (función que se ejecuta en el navegador, con pruebas de su parte pura en `comprimir-imagen.test.ts`) y un tercer botón **«Tomar fotos»** en `src/componentes/NuevoProceso.tsx`.

**Pasos.**
1. **Botón.** `<input type="file" accept="image/*" capture="environment">` envuelto en una `<label>` con aspecto de botón (igual que los otros dos). Muéstralo solo en pantallas táctiles (`matchMedia("(pointer: coarse)")`), leído **dentro de un efecto o un callback**, no al renderizar (regla de React 19).
2. **Bandeja de fotos.** Cada foto se agrega a una lista con miniatura, número y botón «Quitar». Debajo, «Procesar estas N fotos» crea **un lote** con ellas usando exactamente el mismo camino que «Elegir archivos».
3. **Comprimir antes de subir (obligatorio).** Una foto de celular pesa entre 3 y 12 MB y el servidor rechaza lo que pase de 4 MB (Fase 3). En el navegador: `createImageBitmap(archivo, { imageOrientation: "from-image" })` (respeta la orientación EXIF), dibujar en un `<canvas>` con el lado mayor en **2000 px** como máximo y exportar a JPEG calidad 0,85 con `canvas.toBlob`. Resultado esperado: 300–800 KB. Nombre: `foto_AAAAMMDD_HHmmss_N.jpg`.
4. **Función pura con pruebas:** `medidasDestino(ancho, alto, ladoMax)` devuelve las medidas nuevas conservando la proporción (no amplía imágenes pequeñas). Es lo único que se prueba con vitest; el resto depende del navegador.
5. **Formatos.** Si el navegador entrega HEIC (iPhone), el `canvas` lo convierte a JPEG; si no puede decodificarlo, muestra «Este formato no se puede leer; cambia la cámara a "Más compatible"» en vez de subirlo y recibir un 415.

**Por qué.** No tocar el servidor es la decisión clave: toda la validación (tamaño, tipo real por bytes, que se pueda decodificar) ya existe y sigue protegiendo la API. Comprimir en el cliente ahorra datos móviles y Blob, y evita el límite de 4,5 MB de Vercel.

**Qué esperar (sé honesto).** Una foto con perspectiva, sombras o arrugas se lee **peor** que una imagen escaneada: espera más facturas en revisión. Eso no es un fallo: la revisión manual existe para esto.

**Verificación.**
- `npm test` pasa con las pruebas nuevas de `medidasDestino`.
- En un teléfono real, contra la **URL desplegada**: tomar 3 fotos de facturas impresas, procesarlas y ver el lote en «Métricas». Anota el peso original y el comprimido de cada foto.
- En el escritorio el botón no aparece; «Elegir carpeta» y «Elegir archivos» funcionan igual que antes.

**Errores típicos.** Llamar `matchMedia` al renderizar (error de hidratación o de lint); olvidar `imageOrientation` (fotos de lado); subir la foto original sin comprimir (413).

**Pídele a tu IA.** "Explícame por qué comprimimos en el navegador y no en el servidor, y qué pasaría con el límite de 4,5 MB de Vercel si no lo hiciéramos."
