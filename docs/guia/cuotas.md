# Cuotas y costos (plan gratuito)

Cifras de referencia; **verifícalas en la documentación vigente de cada servicio** (los límites cambian).

| Recurso | Dato |
|---|---|
| Firestore (plan gratuito) | 50 000 lecturas al día (dato del curso); también hay límites diarios de escrituras y de borrados (del orden de decenas de miles; verifícalos) |
| Una factura procesada | ~5 lecturas y ~6 escrituras (Fase 6) |
| 1000 facturas | ≈ 5 000 lecturas y ≈ 6 000 escrituras (estimado, no medido al detalle) |
| Borrar los datos de 1000 facturas | ≈ 4 000 borrados (facturas, índices, clientes y cola) + las lecturas para listarlos |
| Un `count()` de Firestore | como mínimo 1 lectura |
| Panel de métricas | 1 lectura por lote + 1 |
| Vercel Hobby | `maxDuration` 300 s, 1 vCPU, cuerpo de petición de 4,5 MB, paquete de la función 250 MB sin comprimir |
