# Fase D — Despliegue y operación en Vercel

**Objetivo.** Dejar el sistema listo para que otras personas lo usen sin sorpresas. Se va cumpliendo desde la Fase 1; esta lista debe estar **completa al final**.

**Lista de comprobación.**
1. **Variables de entorno** definidas en Production, Preview y Development; ningún secreto en el repositorio (`git log -p --all -S "BEGIN PRIVATE KEY" --oneline` solo debe encontrar el valor **falso** de `.env.example`).
2. **`maxDuration`** configurado según el plan Hobby (máximo 300 s): `lote` y `finalizar` 300, `iniciar` 60, `datos/borrar` 300. El tamaño de lote (4) y la concurrencia (3) se justifican con las mediciones de la Fase 5.
3. **Autenticación en producción**: ninguna ruta de API responde sin sesión (comprueba con `curl` cada ruta: todas deben dar 401); `USUARIOS_PERMITIDOS` y el resto de variables están en Vercel; las **reglas de Firestore siguen en "denegar todo"** (`npx tsx scripts/verificar-reglas.ts`).
4. **Política de los blobs**: decide y documenta qué pasa con las imágenes y Excel de lotes antiguos (borrarlos tras un tiempo, o con «Borrar todo» entre prácticas). Los blobs ocupan almacenamiento del plan.
5. **Logs**: revisa los *runtime logs* de Vercel tras una corrida completa y reporta cualquier 504, 413, 500 o error de cuota de Firestore.
6. **Nota de cuota**: anota lo que gastó la corrida (Blob, CPU activa en Vercel; lecturas, escrituras y borrados en Firestore; usuarios en Authentication). Ver `docs/guia/cuotas.md`.
7. **Aceptación final con la carpeta completa en la URL de producción**: se procesan las 1000 facturas; entre aceptadas, revisión y errores suman **1000**; «Clientes en la base» muestra **850** (después de revisar a mano las 40 facturas con problema deliberado); cada lote tiene su Excel descargable; **reprocesar la misma carpeta no duplica nada**.

**Verificación.** Corrida completa en producción sin errores en los logs, y una nota con el uso de cuota que dejó. Si dispones del `verdad.json` del conjunto, compara la base con él (exactitud por campo, aceptadas con error no detectado, clientes que no existen en la verdad: deben ser 0). *El repositorio de referencia no incluye un comando `verificar`; `scripts/leer-carpeta.ts` mide la extracción sin base de datos y es un buen punto de partida si quieres escribirlo.*
