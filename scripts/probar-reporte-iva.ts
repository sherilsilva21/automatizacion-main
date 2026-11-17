// Fase E2 · prueba de integración (Firestore real) del reporte de IVA por periodo. Sin OCR ni imágenes: guarda
// facturas con datos conocidos por el mismo camino que el pipeline (guardarFactura) y la revisión (corregirFactura).
// Comprueba: la suma de los periodos = «lo procesado»; las de revisión no entran; corregir la fecha mueve el importe
// de periodo; la hoja «IVA por periodo» del Excel cuadra con los contadores; recalcular reconstruye lo mismo.
// LIMPIA solo lo que crea (scripts/limpiar-lotes.ts).
//   npx tsx scripts/probar-reporte-iva.ts
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { Timestamp } from "firebase-admin/firestore";

try { process.loadEnvFile(".env"); } catch { /* sin .env */ }

import { generarExcel, periodosDeFacturas } from "../src/lib/excel/generar";
import { firestore } from "../src/lib/firebase/admin";
import { COLECCIONES, TERMINADO, type ArchivoCola, type Factura, type Importes, type Proceso } from "../src/lib/modelo/tipos";
import { calcularDv } from "../src/lib/ocr/nit";
import type { ParcialFactura } from "../src/lib/ocr/tipos";
import { colaArchivos } from "../src/lib/procesamiento/cola";
import type { DatosManuales } from "../src/lib/procesamiento/correccion";
import { corregirFactura } from "../src/lib/procesamiento/corregir";
import { guardarFactura } from "../src/lib/procesamiento/guardar";
import { metricasDesdeEventos, sumarMetricas, type EventoMetrica } from "../src/lib/procesamiento/metricas";
import { refProceso } from "../src/lib/procesamiento/proceso";
import { limpiarLotes } from "./limpiar-lotes";

const UID = "prueba-reporte-iva";
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
let fallos = 0;
const chequear = (titulo: string, ok: boolean, detalle = "") => { console.log(`  ${ok ? "✓" : "✗"} ${titulo}${ok || !detalle ? "" : ` — ${detalle}`}`); if (!ok) fallos++; };
const sumaTotales = (porPeriodo: Record<string, Importes> | undefined) => Object.values(porPeriodo ?? {}).reduce((a, p) => a + p.total, 0);

/** Datos completos y coherentes (pasan todas las validaciones): 1 ítem, IVA 19 % y, si se pide, impoconsumo 4 %. */
function datos(sufijo: string, fecha: string, subtotal: number, conInc = false): DatosManuales {
  const documento = String(700000000 + Math.floor(Math.random() * 99999999)); // cliente que no existe en la base
  const iva = Math.round(subtotal * 0.19), impoconsumo = conInc ? Math.round(subtotal * 0.04) : 0;
  return {
    numero: `FE-E2${sufijo}`, fecha, proveedor: "Proveedor de Prueba E2 S.A.S.", nitProveedor: "890903938", dvProveedor: calcularDv("890903938"),
    clienteDocumento: documento, clienteDv: calcularDv(documento), clienteNombre: "Cliente de Prueba E2 S.A.S.",
    items: [{ descripcion: conInc ? "Plan de datos móviles" : "Servicio de prueba", cantidad: 1, precioUnitario: subtotal, subtotal }],
    subtotal, iva, impoconsumo, total: subtotal + iva + impoconsumo,
  };
}
const parcial = (d: DatosManuales, sinCliente = false): ParcialFactura => ({
  ...d, clienteDocumento: sinCliente ? null : d.clienteDocumento, clienteDv: sinCliente ? null : d.clienteDv,
  impoconsumo: d.impoconsumo > 0 ? d.impoconsumo : null, mencionaImpoconsumo: d.impoconsumo > 0,
});

async function main(): Promise<void> {
  const db = firestore();
  const proceso: Proceso = { uid: UID, carpeta: "prueba-reporte-iva", estado: "terminado", totalArchivos: 4, inicio: Timestamp.now(), fin: Timestamp.now(), rutaExcel: null };
  const procesoId = (await db.collection(COLECCIONES.procesos).add(proceso)).id;
  const suf = procesoId.slice(0, 6);
  const metricas = async () => sumarMetricas([((await refProceso(procesoId).get()).data() as Proceso).metricas]);
  try {
    // A, B y C: aceptadas por la máquina en 3 bimestres (B el 1 de marzo: borde de la zona horaria). D: en revisión.
    const fA = datos(`${suf}1`, "2026-01-20", 100000), fB = datos(`${suf}2`, "2026-03-01", 200000), fC = datos(`${suf}3`, "2026-06-30", 300000, true);
    const fD = datos(`${suf}4`, "2026-07-15", 400000);
    const hashes = [1, 2, 3, 4].map((n) => sha(`reporte-iva-${procesoId}-${n}`));
    for (const n of ["a", "b", "c", "d"]) {
      const cola: ArchivoCola = { blobPathname: `procesos/${procesoId}/${n}.png`, nombre: `${n}.png`, estado: "procesando", resultado: null, clienteNuevo: false, intentos: 1, error: null, disponibleDesde: TERMINADO };
      await colaArchivos(procesoId).doc(`${n}.png`).set(cola);
    }
    const base = { procesoId, uid: UID, blobPathname: "x" };
    await guardarFactura({ ...base, archivoId: "a.png", nombre: "a.png", hash: hashes[0], parcial: parcial(fA), motivos: [], confianza: 95 });
    await guardarFactura({ ...base, archivoId: "b.png", nombre: "b.png", hash: hashes[1], parcial: parcial(fB), motivos: [], confianza: 95 });
    await guardarFactura({ ...base, archivoId: "c.png", nombre: "c.png", hash: hashes[2], parcial: parcial(fC), motivos: [], confianza: 95 });
    await guardarFactura({ ...base, archivoId: "d.png", nombre: "d.png", hash: hashes[3], parcial: parcial(fD, true), motivos: ["Falta el documento del cliente"], confianza: 70 });

    console.log("1. Facturas guardadas por la máquina (3 aceptadas en 3 bimestres, 1 en revisión)");
    let m = await metricas();
    chequear(`periodos: ${Object.keys(m.porPeriodo ?? {}).sort().join(", ")} (se esperan 2026-B1, 2026-B2, 2026-B3)`, Object.keys(m.porPeriodo ?? {}).sort().join() === "2026-B1,2026-B2,2026-B3");
    chequear("el 1 de marzo cae en mar–abr (2026-B2), no en ene–feb", m.porPeriodo?.["2026-B2"]?.total === fB.total);
    chequear("el impoconsumo de C quedó en su periodo (2026-B3)", m.porPeriodo?.["2026-B3"]?.impoconsumo === fC.impoconsumo && fC.impoconsumo > 0);
    chequear("la factura en revisión NO entra a ningún periodo (jul–ago vacío)", !m.porPeriodo?.["2026-B4"]);
    chequear(`suma de periodos ${sumaTotales(m.porPeriodo)} = lo procesado ${m.aceptadas.total + m.manuales.total}`, sumaTotales(m.porPeriodo) === m.aceptadas.total + m.manuales.total);

    console.log("\n2. Una persona revisa D a mano (fecha 15 de julio)");
    let r = await corregirFactura({ hash: hashes[3], uid: UID, email: "prueba@ejemplo.com", datos: fD, confirmado: false });
    chequear("se guarda sin confirmar (todas las validaciones pasan)", r.ok, JSON.stringify(r));
    m = await metricas();
    chequear("entra a jul–ago (2026-B4) con su total", m.porPeriodo?.["2026-B4"]?.n === 1 && m.porPeriodo?.["2026-B4"]?.total === fD.total);
    chequear(`suma de periodos ${sumaTotales(m.porPeriodo)} = lo procesado ${m.aceptadas.total + m.manuales.total}`, sumaTotales(m.porPeriodo) === m.aceptadas.total + m.manuales.total);

    console.log("\n3. La persona corrige la FECHA de D al 2 de noviembre (otro bimestre)");
    r = await corregirFactura({ hash: hashes[3], uid: UID, email: "prueba@ejemplo.com", datos: { ...fD, fecha: "2026-11-02" }, confirmado: false });
    chequear("se guarda", r.ok, JSON.stringify(r));
    m = await metricas();
    chequear("sale completa de jul–ago (2026-B4 queda en 0 facturas y $0)", m.porPeriodo?.["2026-B4"]?.n === 0 && m.porPeriodo?.["2026-B4"]?.total === 0);
    chequear("entra completa a nov–dic (2026-B6)", m.porPeriodo?.["2026-B6"]?.n === 1 && m.porPeriodo?.["2026-B6"]?.total === fD.total);
    chequear("sigue siendo UNA factura manual", m.manuales.n === 1);
    chequear(`suma de periodos ${sumaTotales(m.porPeriodo)} = lo procesado ${m.aceptadas.total + m.manuales.total}`, sumaTotales(m.porPeriodo) === m.aceptadas.total + m.manuales.total);

    console.log("\n4. Excel del lote y recálculo");
    const facturas = (await db.collection(COLECCIONES.facturas).where("procesoId", "==", procesoId).get()).docs.map((d) => d.data() as Factura);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarExcel(procesoId, proceso, new Date())) as unknown as ExcelJS.Buffer);
    const hoja = libro.getWorksheet("IVA por periodo");
    chequear("el Excel tiene la hoja «IVA por periodo»", Boolean(hoja), libro.worksheets.map((w) => w.name).join(", "));
    const filas: string[] = [];
    let totalExcel = NaN;
    hoja?.eachRow((fila, n) => {
      if (n === 1) return;
      const v = (fila.values as unknown[]).slice(1);
      filas.push(`${v[0]} ${v[2] ?? ""} ${v[6] ?? ""}`.trim());
      if (v[0] === "Total") totalExcel = Number(v[6]);
    });
    console.log(`    filas: ${filas.join(" | ")}`);
    chequear(`total del Excel ${totalExcel} = suma de los contadores ${sumaTotales(m.porPeriodo)}`, totalExcel === sumaTotales(m.porPeriodo));
    const desdeBD = Object.fromEntries(periodosDeFacturas(facturas));
    const sinVacios = Object.fromEntries(Object.entries(m.porPeriodo ?? {}).filter(([, p]) => p.n > 0));
    chequear("los periodos calculados desde las facturas (Excel) = los contadores", JSON.stringify(desdeBD, Object.keys(desdeBD).sort()) === JSON.stringify(sinVacios, Object.keys(desdeBD).sort()) && Object.keys(desdeBD).length === Object.keys(sinVacios).length);
    const eventos: EventoMetrica[] = facturas.map((f) => ({ tipo: "factura", estado: f.estado, subtotal: f.subtotal, iva: f.iva, impoconsumo: f.impoconsumo, total: f.total, clienteNuevo: false, nitProveedor: f.nitProveedor, proveedor: f.proveedor, fecha: f.fecha }));
    chequear("recalcular desde las facturas (scripts/recalcular-metricas.ts) reconstruye los mismos totales por periodo",
      sumaTotales(metricasDesdeEventos(eventos).porPeriodo) === sumaTotales(m.porPeriodo) && Boolean(metricasDesdeEventos(eventos).porPeriodo?.["2026-B6"]));
  } finally {
    await limpiarLotes([procesoId]);
    console.log("\nDatos de prueba eliminados.");
  }
  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} comprobación(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
