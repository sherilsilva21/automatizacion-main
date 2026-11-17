# Fase A — Autenticación con Firebase (correo y contraseña; antes de subir nada)

**Objetivo.** Que solo las personas autorizadas usen la aplicación, y que cada lote, factura y archivo pertenezca a un `uid`: un usuario solo ve lo suyo.

**Qué construyes.** `src/lib/firebase/cliente.ts` (Auth en el navegador), `src/lib/auth/sesion.ts` (cookie y `exigirUsuario`), `src/app/api/sesion/route.ts`, `src/app/login/page.tsx`, `src/proxy.ts` y `scripts/crear-usuario.ts`.

**Cómo funciona (flujo).**
1. **Navegador**: `/login` llama `signInWithEmailAndPassword` de `firebase/auth` (con las variables `NEXT_PUBLIC_*`) y obtiene un **ID token**. No hay página de registro.
2. El navegador envía el token a `POST /api/sesion`. El servidor: `verifyIdToken` → comprueba que el correo está en `USUARIOS_PERMITIDOS` (si no, **403**) → `createSessionCookie(idToken, { expiresIn: 5 días })` → fija la cookie `sesion` con `httpOnly`, `secure` (solo en producción), `sameSite: "lax"`, `path: "/"`. Después el navegador cierra la sesión de Firebase (`signOut`): **la sesión real vive en la cookie del servidor**.
3. `DELETE /api/sesion` borra la cookie (cerrar sesión). `GET /api/sesion` devuelve el correo (lo usa el menú).
4. **`exigirUsuario(request)`** lee la cookie y la verifica con `verifySessionCookie(cookie, true)` (el `true` comprueba revocación) y la lista de correos; devuelve `{ uid, email }` o una respuesta **401**. Se usa así en **todas** las rutas: `const u = await exigirUsuario(request); if (u instanceof Response) return u;`.
5. **`src/proxy.ts`** (antes `middleware.ts`) hace solo una comprobación **optimista**: si no hay cookie, redirige las páginas a `/login`. La verificación real está en cada Route Handler, porque el proxy no es el lugar para verificaciones completas. Su `matcher` excluye `/login`, `/api`, `_next/static`, `_next/image` y el favicon.
6. Un lote ajeno responde **404** (no se revela que existe).

**Por qué `USUARIOS_PERMITIDOS` si ya usamos Firebase Auth.** Firebase Auth hace la **autenticación** (¿quién eres?: verifica la contraseña, que jamás está en variables). La lista hace la **autorización** (¿puedes usar esta app?). Se necesita porque la `apiKey` de Firebase es pública y el **registro libre está abierto**: con solo esa clave cualquiera puede crear una cuenta en tu proyecto y obtener un token válido (se comprobó creando y borrando una cuenta). Sin la lista, cualquiera podría gastar tu cuota de Blob, Firestore y CPU. Sin la variable definida, **nadie entra** (falla cerrado). Alternativa: desactivar el registro en la consola de Firebase (puede requerir Identity Platform; verifica el ajuste vigente). El código tolera comillas y espacios alrededor de cada correo.

**Verificación.**
- Sin cookie: `curl -i http://localhost:3000/api/procesos` → **401**; abrir `/` redirige a `/login`.
- Login con el usuario de prueba → entra; `GET /api/sesion` devuelve su correo; cerrar sesión → vuelve a dar 401.
- Un correo que no está en la lista → **403**. Un token inventado → **401**.
- **Repite estas pruebas contra la URL desplegada** (el siguiente error solo aparece allí).

**Error real de esta fase (solo en Vercel).** `firebase-admin@14.5.0` trae `jwks-rsa@4` → `jose@6`, que es **solo ESM**; en las funciones de Vercel el `require()` de ese módulo falla con `ERR_REQUIRE_ESM` y **todas** las rutas que importan `firebase-admin/auth` responden **500** (en local con Node 24 sí funciona, por eso las pruebas locales pasan). Solución: en `package.json`, `"overrides": { "firebase-admin": { "jwks-rsa": "3.2.2" } }` (esa versión usa `jose@4`, dual CJS/ESM) y `npm install`. Revisa si se puede quitar cuando `firebase-admin` lo corrija.

**Otros errores típicos.** Login correcto pero 403: `USUARIOS_PERMITIDOS` no está definida en ese entorno de Vercel, tiene comillas pegadas, o no hubo Redeploy. La cookie con `secure: true` no se guarda en `http://localhost`: actívala solo cuando `NODE_ENV === "production"`.

**Pídele a tu IA.** "Dibújame el recorrido de un login (navegador → Firebase → servidor → cookie) y dime qué parte verifica cada cosa. Luego implementa solo `exigirUsuario` y úsala en una ruta de prueba."
