# Procesador de facturas

Aplicación web (Next.js 16, desplegada en Vercel) que automatiza el procesamiento de facturas electrónicas colombianas: eliges una carpeta de imágenes, la app las sube a **Vercel Blob**, las lee con **OCR** (tesseract.js), extrae y valida los campos (IVA, impoconsumo, dígito de verificación del NIT…), los guarda en **Firestore**, calcula **métricas** por lote y genera un **Excel** por lote. Las facturas que la máquina no puede aceptar pasan a una **revisión manual** con la imagen al lado. El acceso se controla con **Firebase Authentication**.

Proyecto de la clase *Tendencias en desarrollo de software* (tema: **automatización**).

## Ejecutar en local

```bash
npm install
cp .env.example .env                 # rellénalo con tus credenciales; nunca subas .env a Git
npx tsx scripts/probar-conexion.ts   # debe imprimir Firestore OK, Auth OK, Blob OK
npm run dev                          # http://localhost:3000
```

Comprobaciones antes de cada commit: `npm run lint`, `npx tsc --noEmit`, `npm test`.

## Estructura

```
src/app/                  páginas y API (Route Handlers)
src/componentes/          interfaz
src/lib/                  OCR, validación, procesamiento por lotes, Excel, Firebase, Blob
scripts/                  verificaciones y herramientas
```

## Operación

- **Variables de entorno**: las mismas de `.env.example` en Vercel (Production, Preview y Development), pegadas **sin comillas**. En Vercel, `@vercel/blob` se autentica con OIDC y elige el almacén por `BLOB_STORE_ID`: si ese valor no corresponde al store conectado al proyecto, todo acceso a Blob responde 500 aunque en local funcione.
- **Duración de las funciones** (plan Hobby, máximo 300 s): `lote`, `finalizar`, `regenerar-excel` y `datos/borrar` 300 s; `iniciar` e `imagenes` 60 s.
- **Política de los blobs**: las imágenes y los Excel de lotes antiguos se eliminarán automáticamente pasado un plazo (tarea programada, pendiente de implementar). Mientras tanto, la limpieza es manual: `npx tsx scripts/limpiar-lotes.ts <idLote>` para lotes concretos, o «Borrar todo» entre prácticas (borra Firestore y Blob de todos los usuarios; es irreversible).

## Diseño

Los colores son tokens por rol en `src/app/globals.css`, con modo claro y oscuro.
