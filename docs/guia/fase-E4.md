# Fase E4 — Modo demo de solo lectura (mejora propia)

> Mejora fuera del enunciado del curso. Va **la última** porque debe proteger todas las rutas que escriben, incluidas las de E1–E3.

**Objetivo.** Un botón **«Ver demo»** en `/login` que permita a cualquier persona (por ejemplo, quien revisa tu portafolio) recorrer la aplicación con datos reales ya procesados **sin poder subir, procesar, corregir ni borrar nada**.

**Diseño.**
- Un usuario de Firebase Auth exclusivo para la demo (créalo con `scripts/crear-usuario.ts`). Su correo va en la variable nueva `DEMO_CORREO`.
- La demo **muestra los lotes de otro usuario** (el tuyo): su `uid` va en `DEMO_UID_DATOS`. Así no hay que copiar datos (las facturas tienen el hash como ID y no se pueden duplicar).
- Agrega ambas variables a `.env.example` (valores falsos) y a Vercel. Sin ellas, el botón no aparece.

**Qué construyes.**
- `src/lib/auth/sesion.ts`: `Usuario` gana `rol: "completo" | "lectura"`. Si el correo de la cookie es `DEMO_CORREO`, `usuarioDeSesion` devuelve `{ uid: DEMO_UID_DATOS, email, rol: "lectura" }` (el correo demo **no** necesita estar en `USUARIOS_PERMITIDOS`; ajusta también `POST /api/sesion`, que hoy rechaza con 403 cualquier correo fuera de esa lista). Función nueva `exigirEscritura(request)`: igual que `exigirUsuario`, pero responde **403** «Modo demo: solo lectura» si el rol es `lectura`.
- `POST /api/sesion/demo`: crea un *custom token* del usuario demo con `firebase-admin` (`createCustomToken`); el navegador hace `signInWithCustomToken`, obtiene el ID token y sigue el flujo normal de `POST /api/sesion`. **La contraseña del usuario demo nunca se publica.**
- `GET /api/sesion` devuelve también el `rol`; la interfaz lo usa para ocultar o deshabilitar.

**Pasos.**
1. Cambia `exigirUsuario` por `exigirEscritura` en **todas** las rutas que escriben o gastan recursos: `POST /api/procesos`, `…/imagenes`, `…/iniciar`, `…/lote`, `…/finalizar`, `…/regenerar-excel`, `PUT /api/facturas/[hash]`, `POST /api/facturas/[hash]/sugerir` (E3, cuesta dinero), `/api/datos/borrar` y `DELETE` de cualquier cosa. Haz la lista con `grep -rn "export async function \(POST\|PUT\|PATCH\|DELETE\)" src/app/api` y revisa cada una.
2. **Interfaz:** con rol `lectura`, el **Motor no arranca** (si no, intentaría procesar tus lotes en curso y recibiría 403), se ocultan «Subir y procesar», «Borrar todo», «Regenerar el Excel» y «Guardar» en la revisión (el formulario se ve, en solo lectura), y una franja fija arriba dice «Estás viendo una demo de solo lectura» con «Salir».
3. **Cuidar la cuota:** la demo puede abrirla cualquiera. Prepara un lote de demo **pequeño** (≈ 100 facturas) y limita: sesión demo de 2 horas (no 5 días), y que la lista de facturas de un lote y la de revisión se lean como máximo 50 por página. Anota en `docs/guia/cuotas.md` cuánto cuesta una visita típica.
4. **La demo no debe ver a nadie más:** con `DEMO_UID_DATOS` solo ve los lotes de ese usuario; los demás siguen dando 404.

**Por qué.** El acceso por lista de correos protege tu cuota, pero también impide que alguien vea tu trabajo. Un rol de solo lectura **verificado en el servidor** (no solo botones ocultos) resuelve las dos cosas. Ocultar botones es comodidad; el 403 del servidor es la seguridad.

**Verificación.**
- `scripts/probar-demo.ts` (nuevo): inicia sesión demo por HTTP y comprueba **403** en cada ruta de escritura de la lista del paso 1 y **200** en las de lectura (`/api/metricas`, `/api/procesos`, detalle de un lote, Excel, imagen de una factura). Debe leer la lista de rutas de un arreglo para que agregar una ruta nueva sin protegerla haga fallar la prueba.
- Con navegador real, contra la **URL desplegada**: «Ver demo» → métricas, detalle, Excel descargable, formulario de revisión sin botón «Guardar»; 0 errores de consola (en especial, ningún 403 del Motor).
- Tu usuario normal sigue funcionando igual (corre `probar-http.ts` y `probar-ui.ts`).

**Errores típicos.** Proteger solo la interfaz y no la API; olvidar una ruta de escritura (por eso la prueba recorre una lista); dejar el Motor activo en la demo; publicar la contraseña del usuario demo en el README.

**Pídele a tu IA.** "Antes de cambiar nada, lista todas las rutas de `src/app/api` con su método y dime cuáles escriben, cuáles gastan CPU o dinero y cuáles solo leen."
