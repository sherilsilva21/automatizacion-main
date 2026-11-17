# Procesador de facturas

Aplicación web (Next.js 16, desplegada en Vercel) que automatiza el procesamiento de facturas electrónicas colombianas: eliges una carpeta de imágenes, la app las sube a **Vercel Blob**, las lee con **OCR** (tesseract.js), extrae y valida los campos (IVA, impoconsumo, dígito de verificación del NIT…), los guarda en **Firestore**, calcula **métricas** por lote y genera un **Excel** por lote. Las facturas que la máquina no puede aceptar pasan a una **revisión manual** con la imagen al lado. El acceso se controla con **Firebase Authentication**.

Proyecto de la clase *Tendencias en desarrollo de software* (tema: **automatización**).

## Trabajar con un agente de IA

- **Claude Code** lee [`CLAUDE.md`](CLAUDE.md) y aplica los permisos de [`.claude/settings.json`](.claude/settings.json) (por ejemplo, no puede leer `.env`).
- **Otros agentes** leen [`AGENTS.md`](AGENTS.md), con el mismo contenido.
- Ambos son cortos a propósito: el detalle de cada fase está en [`docs/guia/`](docs/guia/) y el agente lo abre solo cuando se trabaja esa fase.

Para empezar una sesión, dile al agente: *«Lee CLAUDE.md. Hoy trabajamos la Fase N.»* Orden de las fases: 0 cuentas → 1 proyecto base → 2 modelo de datos → A autenticación → 4 extractor → 5 OCR en Vercel → 3 subida → 6 lotes y guardado → 7 Excel → 8 interfaz y métricas → 9 revisión manual → D operación. Después, cuatro mejoras propias: E1 fotos con la cámara → E2 reporte de IVA por bimestre → E3 asistente de IA en la revisión → E4 modo demo de solo lectura. Si eres la persona que guía al agente, lee primero [`docs/guia/estudiante.md`](docs/guia/estudiante.md).

## Ejecutar en local

```bash
npm install
cp .env.example .env                 # rellénalo (docs/guia/fase-0.md explica cada variable; nunca subas .env a Git)
npx tsx scripts/probar-conexion.ts   # debe imprimir Firestore OK, Auth OK, Blob OK
npm run dev                          # http://localhost:3000
```

Comprobaciones antes de cada commit: `npm run lint`, `npx tsc --noEmit`, `npm test`.

## Estructura

```
CLAUDE.md / AGENTS.md     reglas e índice para el agente (cortos)
.claude/settings.json     permisos de Claude Code
docs/guia/                una guía por fase y por tema (arquitectura, diseño, problemas, cuotas…)
src/app/                  páginas y API (Route Handlers)
src/componentes/          interfaz
src/lib/                  OCR, validación, procesamiento por lotes, Excel, Firebase, Blob
scripts/                  verificaciones y herramientas (ver docs/guia/comandos.md)
```

## Diseño

Los colores son tokens por rol en `src/app/globals.css`, con modo claro y oscuro. La guía está en [`docs/guia/diseno.md`](docs/guia/diseno.md).
