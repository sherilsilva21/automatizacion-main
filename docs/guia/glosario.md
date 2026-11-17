# Glosario

- **NIT / CC**: número de identificación tributaria (empresas) o cédula (personas). **DV**: dígito de verificación del NIT (algoritmo de la DIAN).
- **DIAN**: autoridad tributaria de Colombia. **Factura electrónica**: factura con número con prefijo, resolución de numeración y **CUFE** (código único, hash de 96 caracteres).
- **IVA**: impuesto al valor agregado, 19 % general. **INC / impoconsumo**: impuesto nacional al consumo, 4 % en telefonía móvil y datos.
- **COP**: pesos colombianos (en el proyecto, enteros sin decimales).
- **OCR**: reconocimiento óptico de caracteres: convertir la imagen de una factura en texto.
- **Lote**: en esta aplicación, una subida (un proceso) con su cola, su Excel y sus métricas.
- **Cola de trabajo**: la lista de archivos por procesar, guardada en Firestore.
- **Arrendamiento (lease)**: marca de tiempo que "reserva" un archivo mientras alguien lo procesa; si la función se cae, caduca y otro lo toma.
- **Idempotente**: se puede repetir sin cambiar el resultado (procesar dos veces la misma carpeta no duplica nada).
- **Hash (SHA-256)**: huella de 64 caracteres de un archivo; la misma imagen siempre da el mismo hash.
- **Transacción**: grupo de lecturas y escrituras que se aplican completas o no se aplican.
- **Cookie de sesión**: archivo pequeño que el navegador envía en cada petición para probar quién eres; aquí la crea el servidor y el navegador no puede leerla (`httpOnly`).
- **Motor**: el componente del navegador que va pidiendo al servidor que procese lotes.
