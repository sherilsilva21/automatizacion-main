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

## Diseño

Los colores son tokens por rol en `src/app/globals.css`, con modo claro y oscuro.
