# Fase 1 — Proyecto base y primer despliegue

**Objetivo.** Un proyecto Next.js limpio, configurado para lo que viene, **desplegado ya** (así los problemas de despliegue aparecen pronto y no al final).

**Qué construyes.** `package.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx` trivial y `src/app/api/salud/route.ts`.

**Pasos.**
1. `npx create-next-app@latest` con TypeScript, ESLint, Tailwind, App Router, carpeta `src/` y alias de importación `@/*` → `src/*`. Revisa lo que genera antes de añadir nada.
2. Quita `next/font/google` (el entorno de build no siempre tiene acceso) y los archivos de ejemplo que no uses.
3. Fija Node: `"engines": { "node": "24.x" }` (que coincida con tu Node local).
4. En `next.config.ts`: `cacheComponents: true`, `serverExternalPackages: ["tesseract.js"]` y `outputFileTracingIncludes` (se completa en la Fase 5). `firebase-admin` y `sharp` **ya vienen excluidos por defecto**.
5. Instala dependencias con versiones exactas (`docs/guia/pila.md`). Al instalar `firebase-admin`, añade desde ya el `overrides` de `jwks-rsa` (ver Fase A).
6. `/api/salud`: ruta de diagnóstico que devuelve solo booleanos y nombres (nunca valores): si los datos de idioma de tesseract están en la función, si `sharp` carga y qué variables de entorno faltan. Usa `await connection()` para que se ejecute en cada petición.
7. Haz push y mira el despliegue.

**Por qué.** `serverExternalPackages` evita que el empaquetador rompa paquetes con hilos o WASM. `/api/salud` convierte "no sé qué pasa en Vercel" en un JSON legible.

**Verificación.** `npm run dev` abre la página; `npm run build` termina sin errores; el despliegue de Vercel queda en verde y su URL abre la página.

**Errores típicos.** `export const dynamic = "force-dynamic"` da error con `cacheComponents` (usa `await connection()`); una variable de entorno nueva no llega porque no hubo Redeploy.

**Pídele a tu IA.** "Antes de configurar `next.config.ts`, lee `node_modules/next/dist/docs/` sobre `cacheComponents`, `serverExternalPackages` y `outputFileTracingIncludes` y dime qué cambia respecto a lo que tú recuerdas."
