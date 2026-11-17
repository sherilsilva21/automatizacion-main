# Arquitectura

### Qué vas a construir (resultado final)

```
 navegador                                   Vercel (funciones)                       servicios
┌───────────────────────┐   una imagen por   ┌──────────────────────────┐
│ 1. eliges la carpeta  │   petición         │ POST …/imagenes          │
│ 2. se divide en lotes │ ─────────────────► │ valida: sesión, lote,    │
│ 3. subes cada imagen  │                    │ tamaño, tipo real        │ ───────►  Vercel Blob (privado)
│    (a través de la API)│                   └──────────────────────────┘
│ 4. POST …/iniciar     │ ─────────────────► crea la cola en Firestore   ───────►  Firestore
│                       │                                                          (clientes, facturas,
│ MOTOR (segundo plano) │   3 llamadas       ┌──────────────────────────┐          índices, procesos,
│ llama a …/lote en     │ ─────────────────► │ POST …/lote              │          métricas)
│ paralelo (x3)         │   concurrentes     │ reclama 4 archivos       │ ◄──────►
│                       │                    │ descarga de Blob ◄───────┼───────►  Vercel Blob
│ 5. POST …/finalizar   │ ─────────────────► │ OCR → extraer → validar  │
│                       │                    │ guarda (transacción)     │
│ 6. ve métricas, tabla,│ ◄───────────────── │ genera Excel ────────────┼───────►  Vercel Blob (Excel)
│    descarga el Excel  │                    └──────────────────────────┘
└───────────────────────┘     (el navegador NUNCA habla directo con Blob ni con Firestore;
                                todas las rutas exigen sesión de Firebase Auth)
```

Funciones finales: inicio de sesión (correo y contraseña); subir una carpeta de hasta 1000 facturas que se divide en **lotes**; procesamiento automático en segundo plano con avance en vivo (incluye antes de IVA, IVA, impoconsumo y total acumulados); un **Excel por lote**; **panel de métricas** (facturas leídas correctamente vs mal leídas, por lote o en total, y totales por razón social); tabla de resultados con la imagen original de cada factura; un **formulario de revisión manual** para ingresar o corregir a mano las facturas que la máquina no pudo aceptar (cierra el ciclo de validación humana); y un botón para borrar todos los datos de prueba.

# Por qué el diseño es así (restricciones de Vercel)

Entender estas cuatro restricciones explica casi todas las decisiones del proyecto:

1. **No hay un proceso que viva mucho tiempo.** Las funciones son efímeras (Hobby: máximo 300 s por invocación). Un "trabajo en segundo plano" en memoria del servidor no funciona. Por eso el avance se guarda en la base de datos y el trabajo se reparte en **lotes pequeños e idempotentes** (se pueden repetir sin duplicar nada) que un **motor en el navegador** va pidiendo.
2. **El cuerpo de una petición no pasa de 4,5 MB.** Por eso cada imagen viaja en **su propia petición** a nuestra API (una factura pesa unos 100 KB; el servidor rechaza lo que pase de 4 MB). Decisión consciente: la API valida cada archivo y el navegador nunca recibe permisos sobre el almacén. Contrapartida: una invocación por imagen y un tope de tamaño; con archivos de decenas de MB habría que reconsiderarlo (la alternativa, subida directa con un token de un solo uso, evita el límite pero entrega permisos al navegador).
3. **El sistema de archivos es de solo lectura** (salvo `/tmp`). Todo lo persistente va a Blob o a Firestore. Un servidor en la nube tampoco puede escribir en el disco del usuario: el Excel se guarda en Blob y se descarga desde la interfaz.
4. **1 vCPU en Hobby.** Un pool propio de hilos no acelera nada; el paralelismo se logra con **varias invocaciones concurrentes** de la función (el motor lanza 3 llamadas `lote` a la vez y Vercel crea una instancia por cada una).

Consecuencia de seguridad: al no existir un explorador de carpetas del servidor desaparece el riesgo de recorrer su disco, pero aparece otro: cualquiera con la URL podría gastar cuota de Blob, Firestore y CPU. Por eso la autenticación se construye **antes** de la subida (Fase A) y todas las rutas la exigen; y por eso el servidor valida cada imagen (tamaño, tipo real y que se pueda leer) antes de guardarla.

## 5. Mapa del repositorio

```
src/app/                       páginas y Route Handlers (la API)
  page.tsx                     «Procesar facturas» (subida por lotes)
  metricas/page.tsx            panel de métricas
  revision/page.tsx            lista de facturas pendientes de revisión
  revision/[hash]/page.tsx     formulario de revisión manual (imagen + datos)
  procesos/[id]/page.tsx       detalle de un lote (avance, Excel, tabla de facturas)
  login/page.tsx               inicio de sesión
  api/sesion/route.ts          login/logout: ID token → cookie de sesión
  api/procesos/route.ts        crea un lote / lista los del usuario
  api/procesos/[id]/…          imagenes (sube y valida), iniciar, lote, finalizar, excel, facturas, estado
  api/metricas/route.ts        métricas de todos los lotes (1 lectura por lote)
  api/facturas/route.ts        facturas pendientes de revisión humana
  api/facturas/[hash]/route.ts detalle y guardado de la revisión manual (PUT)
  api/facturas/[hash]/imagen/  sirve la imagen original desde el Blob privado
  api/datos/borrar/route.ts    «Borrar todo» (confirmación escrita)
  api/salud/route.ts           diagnóstico del despliegue (exige sesión)
src/proxy.ts                   redirección optimista a /login si no hay cookie
src/componentes/               Motor, MenuSuperior, NuevoProceso, PanelMetricas, VistaProceso, ui…
src/lib/firebase/              admin.ts (servidor) y cliente.ts (navegador, solo Auth)
src/lib/auth/sesion.ts         cookie de sesión y exigirUsuario(request)
src/lib/modelo/tipos.ts        tipos de las colecciones de Firestore
src/lib/ocr/                   motor (tesseract), extractor, validador, nit, leer-factura
src/lib/procesamiento/         cola, lote, guardar, iniciar, finalizar, metricas, avance
src/lib/excel/generar.ts       generación del Excel
src/lib/blob.ts, rutas.ts      utilidades de Blob (servidor) y de rutas de archivos
src/lib/imagen.ts              validación pura de imágenes por sus bytes (con pruebas)
scripts/                       verificaciones y herramientas (ver docs/guia/comandos.md)
docs/guia/                     la guía por fases y temas (la lee el agente según el índice de CLAUDE.md)
.claude/settings.json          permisos de Claude Code (bloquea leer .env y git push --force)
```
