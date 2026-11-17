# Pila tecnológica y versiones exactas

| Pieza | Elección (versión del repositorio de referencia) | Por qué / nota |
|---|---|---|
| Hosting | **Vercel**, plan Hobby, proyecto enlazado a GitHub | Cada `git push` despliega. Node 24 (`"engines": { "node": "24.x" }`). |
| Framework | **Next.js 16.4.5**, App Router, TypeScript estricto, React 19.3.0 | Route Handlers como API. Opción `cacheComponents: true`. |
| Archivos | **Vercel Blob** (`@vercel/blob` 2.8.2), store **privado** | Las facturas tienen datos de clientes. El acceso (privado/público) **no se puede cambiar** tras crear el store. El navegador **no** habla con Blob: manda cada imagen a nuestra API, que la valida y es quien escribe en el almacén (`put` desde el servidor). |
| Base de datos | **Cloud Firestore** vía `firebase-admin` 14.5.0, **solo desde el servidor** | NoSQL de documentos. La cuenta de servicio se salta las reglas, por eso las **reglas deben quedar en "denegar todo"**. |
| Autenticación | **Firebase Authentication** (correo y contraseña): `firebase` 13.2.0 en el navegador | El servidor cambia el ID token por una **cookie de sesión** y la verifica en cada ruta. |
| OCR | `tesseract.js` 7.0.0 + `@tesseract.js-data/spa` 1.0.0 | WASM; los datos del idioma vienen del paquete npm (sin descargas de red). |
| Imagen | `sharp` 0.35.5 | Preprocesado para el reintento de OCR. |
| Validación | `zod` 4.6.7 | Instalado para validar entradas; las reglas de negocio de las facturas son funciones puras propias. |
| Excel | `exceljs` 4.4.0 | Celdas numéricas reales con formato de moneda. |
| Estilos | Tailwind CSS 4 | Colores como variables CSS por rol, con modo oscuro. |
| Pruebas | `vitest` 5.1.0; `playwright` 1.65.0 para probar la interfaz con navegador real | |
| Parche necesario | `overrides: { "firebase-admin": { "jwks-rsa": "3.2.2" } }` en `package.json` | Ver Fase A: sin esto, `firebase-admin/auth` no carga en Vercel. |

Comprobar compatibilidad entre `vitest`, `firebase-admin` y `@types/node` (hubo un conflicto de pares con `@types/node@20`; el proyecto usa la serie 24, igual que Node).
