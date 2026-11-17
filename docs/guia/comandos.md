# Comandos y scripts

| Comando | Para qué |
|---|---|
| `npm run dev` / `npm run build` / `npm run start` | desarrollo, compilación de producción y servidor de producción local |
| `npm run lint` · `npx tsc --noEmit` · `npm test` | las tres comprobaciones previas a cada commit |
| `npx tsx scripts/probar-conexion.ts` | Firestore, Auth y Blob responden (Fase 0) |
| `npx tsx scripts/verificar-reglas.ts` | las reglas de Firestore están cerradas (Fase 2) |
| `CORREO=… CLAVE=… npx tsx scripts/crear-usuario.ts` | crea un usuario de Firebase Auth sin dejar la contraseña en un archivo |
| `npx tsx scripts/ocr-muestras.ts <imágenes> <salida>` | guarda el texto del OCR de cada imagen en 3 modos (material para el extractor) |
| `npx tsx scripts/leer-carpeta.ts <imágenes> <verdad.json>` | mide el extractor sobre una carpeta (sin base de datos) |
| `npx tsx scripts/comparar-extraccion.ts <textos> <verdad.json>` | compara el extractor con los textos de OCR guardados |
| `npx tsx scripts/probar-pipeline.ts <imágenes> <verdad.json>` | prueba de servidor: Blob + cola + lotes + Excel + idempotencia (limpia lo que crea) |
| `CORREO=… CLAVE=… npx tsx scripts/probar-http.ts <url> <imágenes>` | recorrido completo **por HTTP** contra local o producción (limpia lo que crea) |
| `CORREO=… CLAVE=… npx tsx scripts/probar-ui.ts <url> <imágenes> <porLote> <capturas>` | prueba de la interfaz con navegador real (`--sin-procesar` para medir solo la subida) |
| `npx tsx scripts/probar-correccion.ts <verdad.json>` | prueba de integración (Firestore real) de la revisión manual: transacción, índices, cliente y contadores (limpia lo que crea) |
| `CORREO=… CLAVE=… npx tsx scripts/probar-revision-ui.ts <url> <imágenes> <verdad.json> <capturas>` | prueba de la revisión manual con navegador real y datos reales (limpia lo que crea) |
| `npx tsx scripts/limpiar-lotes.ts <idLote> …` | borra **solo** los lotes indicados |
| `npx tsx scripts/recalcular-metricas.ts <idLote>` | reconstruye las métricas de un lote |
