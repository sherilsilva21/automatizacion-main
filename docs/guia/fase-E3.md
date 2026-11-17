# Fase E3 — Asistente de IA en la revisión manual (mejora propia)

> Mejora fuera del enunciado del curso. Se hace **después de la Fase D**. La persona sigue siendo la autoridad: la IA **sugiere**, nunca guarda.

**Objetivo.** En el formulario de revisión (Fase 9), un botón **«Sugerir con IA»** que envía el texto leído por el OCR a un modelo de lenguaje y precarga sus sugerencias en los campos vacíos o con error, marcadas como «sugerido por IA». La persona compara con la imagen y guarda con el flujo de siempre.

**Proveedor.** El proyecto ya trae la variable `DEEPSEEK_API_KEY` (opcional, solo servidor). **No escribas la API de memoria**: lee la documentación oficial vigente de DeepSeek (endpoint, nombre del modelo, formato de respuesta en JSON) antes de programar, y usa `fetch` desde el servidor (sin SDK nuevo). Si la variable no existe, el botón no aparece: la aplicación funciona igual que antes.

**Qué construyes.**
- `src/lib/ia/sugerir.ts`: arma el mensaje, llama al modelo con un **tope de 30 s** (`AbortSignal.timeout`) y valida la respuesta con **zod** (mismo formato que `esquemaDatosManuales`, todos los campos opcionales).
- `src/lib/ia/sugerir.test.ts`: pruebas de la parte pura (armar el mensaje, interpretar respuestas válidas, inválidas y con texto extra alrededor del JSON). **Sin llamar al modelo** en las pruebas.
- `POST /api/facturas/[hash]/sugerir` (`maxDuration` 60): exige sesión y que la factura sea del usuario y esté en revisión; descarga la imagen de Blob, vuelve a hacer OCR (añade `texto` a lo que devuelve `leerFactura`) y llama a `sugerir`. Acepta `?rotar=90|180|270` para las facturas giradas (gira con `sharp` antes del OCR, como la ruta de la imagen).
- Cambios en `src/componentes/FormularioFactura.tsx` y en `src/lib/procesamiento/corregir.ts`.

**Cómo funciona.**
1. **Qué se envía:** solo el **texto del OCR**, nunca la imagen ni datos de otras facturas. Avisa en la interfaz: «El texto de esta factura se enviará a un servicio externo de IA».
2. **El texto del OCR es dato no confiable.** Puede contener cualquier cosa (incluso frases como «ignora tus instrucciones»). Por eso el mensaje al modelo separa claramente instrucciones y texto, y **nada de lo que responde el modelo se ejecuta**: solo se valida con zod y se muestra como sugerencia.
3. **En el formulario:** las sugerencias rellenan solo campos vacíos o marcados con motivo (no pisan lo que la persona ya escribió) y se resaltan con el color `manual` y la etiqueta «sugerido por IA». La validación en vivo (`validar`) corre igual; si la IA sugiere algo que no cuadra, aparecen los motivos como con cualquier otro dato.
4. **Al guardar:** la factura registra `asistidaPorIa: true` y `camposSugeridosIa: string[]` (los que la persona aceptó sin cambiar). En las métricas, un contador nuevo `metricas.asistidasIa` (dentro de `manuales`, que ya no se mezclan con «leídas correctamente»). El panel muestra «X de las revisadas a mano usaron sugerencias de IA».
5. **Límites:** como máximo 1 sugerencia en curso por usuario y 30 por hora (contador en memoria de la instancia; es una protección básica, documéntala como tal). Errores del proveedor → «La IA no respondió; completa los campos a mano» (la revisión nunca se bloquea).

**Por qué.** Es la forma responsable de usar IA generativa en una automatización: entra donde el método determinista ya falló, sus respuestas pasan por las mismas validaciones que todo lo demás, una persona decide, y las métricas dicen honestamente cuánto ayudó.

**Verificación.**
- `npm test` pasa con las pruebas nuevas.
- Sin `DEEPSEEK_API_KEY`: el botón no aparece y `probar-revision-ui` sigue pasando.
- Con la variable (en local y **en Vercel**): en 10 facturas en revisión, anota cuántos campos sugirió la IA, cuántos eran correctos comparando con la imagen y cuánto tardó. Pega esa tabla en el informe de la fase: **mide, no supongas**.
- `curl` sin sesión a `/sugerir` → 401; factura ajena → 404; factura aceptada → 409.

**Errores típicos.** Pegar la clave en el código o con prefijo `NEXT_PUBLIC_`; confiar en que el modelo siempre devuelve JSON válido; dejar que la sugerencia sobrescriba lo que la persona ya corrigió; contar las facturas asistidas como «leídas correctamente».

**Pídele a tu IA.** "Explícame qué es la inyección de instrucciones y por qué el texto de una factura podría intentarla. Luego muéstrame qué parte de nuestro diseño hace que no tenga efecto."
