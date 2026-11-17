# Fase 2 — Modelo de datos (Firestore)

**Objetivo.** Diseñar las colecciones y dejar las reglas de Firestore cerradas.

**Qué construyes.** `src/lib/firebase/admin.ts` (inicializa `firebase-admin` una vez; solo servidor), `src/lib/modelo/tipos.ts` y `scripts/verificar-reglas.ts`.

**Firestore es de documentos, no relacional.** Aquí el diseño parte de qué consultas hacen falta y de cómo garantizar **unicidad** (no hay `UNIQUE`): se usa el valor único como **ID del documento** y se crea dentro de una **transacción**.

| Colección | ID del documento | Campos principales |
|---|---|---|
| `clientes` | el documento (NIT/CC sin puntos ni guion ni DV) → no puede haber dos | `documento`, `dv`, `nombre`, `creadoEn`, `primerProcesoId` |
| `facturas` | **SHA-256 de la imagen** (existe siempre, aunque el OCR falle) → el mismo archivo nunca se guarda dos veces | `numero`, `fecha` (emisión, `yyyy-mm-dd`), `proveedor`, `nitProveedor`, `clienteDocumento` (`null` si no pasó el DV), `clienteNombre`, `subtotal`, `iva`, `impoconsumo`, `total` (enteros COP), `estado` (`aceptada`\|`revision`), `motivos[]`, `archivo`, `blobPathname`, `confianzaOcr`, `procesoId`, `uid`, `creadoEn`, `items[]` (embebidos: `descripcion`, `cantidad`, `precioUnitario`, `subtotal`); y, desde la Fase 9, `dvProveedor`, `clienteDv`, `clienteDocumentoLeido`, `corregidaManualmente`, `corregidaPor`, `motivosOriginales`, `validacionesIgnoradas` |
| `indices_numero` | el número de factura (`FE-000123`) | `{ hashArchivo }` — hace único el número; se crea en la misma transacción que la factura |
| `procesos` (un **lote**) | id automático | `uid`, `carpeta`, `estado` (`subiendo`\|`ejecutando`\|`terminado`), `totalArchivos`, `inicio`, `fin`, `rutaExcel`, `finalizandoDesde`, `metricas` (Fase 8) |
| `procesos/{id}/archivos` (la **cola de trabajo**) | el nombre del blob | `blobPathname`, `nombre`, `estado`, `resultado` (`aceptada`\|`revision`\|`duplicada`\|`error`), `clienteNuevo`, `clienteExistente`, `hashArchivo`, `intentos`, `error`, **`disponibleDesde`** |

`disponibleDesde` (milisegundos de época) es un **arrendamiento**: `0` mientras espera, `ahora + 5 min` mientras alguien lo procesa (caduca solo si la función se cae) y `Number.MAX_SAFE_INTEGER` cuando termina. Así la cola se consulta con **un solo campo** (`where("disponibleDesde", "<=", ahora)`) y no hace falta un índice compuesto.

**Reglas de seguridad:** **denegar todo** (`allow read, write: if false;`). Todo el acceso pasa por el servidor. Comprueba que no queden las reglas del "modo de prueba", que dejan la base abierta y caducan a los 30 días.

**Por qué.** El ID de la factura es el hash del archivo porque siempre existe y hace imposible duplicar. El ID del cliente es su documento porque el OCR altera los nombres: **un cliente se identifica por documento, nunca por nombre**. Los ítems van embebidos porque siempre se leen junto con la factura y son pocos.

**Verificación.** `npx tsx scripts/probar-conexion.ts` sigue en verde. `npx tsx scripts/verificar-reglas.ts` hace peticiones **anónimas** a Firestore (solo con la `apiKey` pública) y debe recibir **403** en lectura y escritura de `clientes`, `facturas` y `procesos`.

**Errores típicos.** Una consulta que combina filtros o un filtro con una agregación puede pedir un **índice compuesto**: Firestore devuelve un enlace para crearlo en el mensaje de error (ejemplo: `sum()` filtrado por `procesoId`). Importes como decimales o texto: usa enteros.

**Pídele a tu IA.** "Explícame con un ejemplo por qué usar el hash como ID del documento impide duplicados, y qué pasaría si dos lotes intentaran crear la misma factura a la vez."
