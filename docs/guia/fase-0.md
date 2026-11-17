# Fase 0 — Cuentas y conexiones (PREGUNTAR, no asumir)

**Objetivo.** Tener todos los servicios creados y el archivo `.env` completo, y comprobar que el computador se conecta a los tres: Firestore, Authentication y Blob. Va **antes de escribir cualquier código de base de datos o de Blob**. El estudiante crea los recursos; la IA solo lo guía y **nunca inventa ni escribe a mano valores de credenciales**.

**Pasos.**
1. Repositorio en GitHub (vacío o con el proyecto base). Pregunta al estudiante la URL.
2. Cuenta de **Vercel** (plan Hobby) e importar el repositorio como proyecto (cada `git push` despliega).
3. Proyecto de **Firebase** (https://console.firebase.google.com):
   - **Firestore Database** → modo **producción**; elige una región cercana a las funciones de Vercel (por defecto Washington D.C., `iad1`). **La ubicación no se puede cambiar después.**
   - **Authentication → Método de acceso →** habilitar **Correo electrónico/contraseña**.
   - **Configuración del proyecto → Tus apps →** crear una **app web** (da la configuración pública).
   - **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada** (un JSON secreto). De él solo se necesitan **tres campos**; no copies el resto.
4. En Vercel: **Storage → Blob →** crear un store **privado** y conectarlo al proyecto (esto crea `BLOB_READ_WRITE_TOKEN` en Vercel).
5. Copia `.env.example` a `.env` y rellénalo. Los **nombres** son estos (los valores son tuyos y nunca se suben a Git):

| Variable | De dónde sale | Pública |
|---|---|---|
| `BLOB_STORE_ID`, `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → tu store (o `vercel env pull`) | No |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | configuración de la app web de Firebase | Sí, por diseño |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | del JSON de la cuenta de servicio (`project_id`, `client_email`, `private_key`) | **No, solo servidor** |
| `USUARIOS_PERMITIDOS` | correos autorizados, separados por comas (ver Fase A) | No |
| `DEEPSEEK_API_KEY` | opcional; el flujo no la usa | No |

   La clave privada lleva los saltos de línea escritos como `\n` literales y va **entre comillas dobles en `.env`**. En el **panel de Vercel** pega los valores **sin comillas** (allí las comillas se guardan tal cual y rompen el valor).
6. Define **las mismas variables en Vercel** (Settings → Environment Variables) para Production, Preview y Development. **Las variables solo se aplican a despliegues nuevos**: después de cambiarlas, haz Redeploy.
7. Comprueba que `.env*` está en `.gitignore` (con `!.env.example`) con `git check-ignore .env` **antes** de crear el archivo.
8. Escribe `scripts/probar-conexion.ts`: escribe, lee y borra un documento temporal en Firestore; lista usuarios de Authentication; lista el almacén de Blob; imprime "OK" o el error de cada uno **sin imprimir secretos**.
9. Crea un usuario de prueba: en la consola (Authentication → Usuarios) o con `scripts/crear-usuario.ts` (lee `CORREO` y `CLAVE` de variables de entorno, así la contraseña no queda en ningún archivo).

**Por qué.** Los tres servicios son la base de todo; si fallan, los errores de fases posteriores son imposibles de interpretar. La clave privada da **acceso de administrador** a tu proyecto de Firebase (se salta las reglas de seguridad): por eso vive solo en el servidor.

**Verificación.** `npx tsx scripts/probar-conexion.ts` imprime `Firestore OK`, `Auth OK` y `Blob OK`. No continúes hasta que funcione.

**Errores típicos.** Clave privada con saltos de línea mal escritos (debe ser `\n` literal entre comillas dobles); Firestore sin crear o con la API deshabilitada en Google Cloud; variables definidas en el entorno equivocado de Vercel; token de Blob ausente en local; comillas pegadas en el panel de Vercel.

**Pídele a tu IA.** "Guíame paso a paso para crear Firebase y Blob. No me pidas que te pegue ningún valor secreto; solo dime dónde copiarlo y cómo comprobar que quedó bien con `probar-conexion.ts`."
