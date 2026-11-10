import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatosExportacionCorte } from './excel';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { formatoHora, formatoMoneda } from '../fecha';

/**
 * Genera el PDF del corte: encabezado con los datos del colaborador, tabla de
 * jornadas y tabla de montos con su desglose legal. Pensado para respaldar
 * solicitudes de horas extras o reclamos ante el jefe.
 */
export async function exportarCorteAPdf(datos: DatosExportacionCorte): Promise<void> {
  const doc = await construirPdfCorte(datos);
  doc.save(`MisHoras_${datos.etiquetaCorte}.pdf`);
}

/** Convierte una foto WebP en JPEG reducido (jsPDF no dibuja WebP en todos los navegadores). */
async function aMiniaturaJpeg(blob: Blob, ancho = 360): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const escala = ancho / bmp.width;
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/jpeg', 0.7), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

/** Arma el PDF del corte (tambien se usa dentro del ZIP de respaldo). */
export async function construirPdfCorte(datos: DatosExportacionCorte): Promise<jsPDF> {
  const { resumen, nombreTurnoPorId, nombreColaborador, gafete, etiquetaCorte } = datos;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text('Mis Horas - Reporte de corte (proyeccion personal)', 14, 16);
  doc.setFontSize(10);
  doc.text('Este documento NO reemplaza el reloj marcador oficial de la empresa.', 14, 22);
  doc.text(`Colaborador: ${nombreColaborador}   Gafete: ${gafete}`, 14, 29);
  doc.text(`Corte: ${etiquetaCorte}`, 14, 35);

  autoTable(doc, {
    startY: 42,
    head: [['Fecha', 'Turno', 'Entrada', 'Salida', 'Receso', 'Horas', 'Jornada', 'Asueto', 'Descanso']],
    body: resumen.jornadas.map((j) => [
      j.fecha,
      nombreTurnoPorId[j.turnoId] ?? `#${j.turnoId}`,
      formatoHora(j.entradaReal),
      formatoHora(j.salidaReal),
      `${j.minutosReceso}min`,
      minutosADecimal(j.totalMinutosTrabajados).toFixed(2),
      j.tipoJornadaLegal,
      j.esAsueto ? 'Si' : '',
      j.esDescansoSemanalLaborado ? 'Si' : '',
    ]),
    styles: { fontSize: 8 },
  });

  const finTablaJornadas = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: finTablaJornadas + 8,
    head: [['Linea de la boleta', 'Horas', 'Factor', 'Articulo de ley', 'Monto']],
    body: [['Salario del corte', '', '', 'Salario fijo', formatoMoneda(resumen.salarioCorte)]].concat(resumen.detalleMontos.map((d) => [
      d.nombreLinea,
      d.horas.toFixed(2),
      `x${d.factor}`,
      d.articuloLey,
      formatoMoneda(d.monto),
    ])),
    foot: [['', '', '', 'Ingreso bruto estimado', formatoMoneda(resumen.ingresoBruto)]],
    styles: { fontSize: 8 },
  });

  const finTablaMontos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(
    `Deducciones estimadas: ${formatoMoneda(resumen.totalDeducciones)}  |  Neto estimado: ${formatoMoneda(resumen.netoEstimado)}`,
    14,
    finTablaMontos + 8
  );
  doc.setFontSize(7);
  doc.text(
    'Las deducciones (ISSS/AFP/ISR) y el neto son ESTIMADOS, no sustituyen la boleta oficial de pago.',
    14,
    finTablaMontos + 14
  );

  await agregarEvidencias(doc, resumen.jornadas.flatMap((j) => j.registrosIds));
  return doc;
}

const ETIQUETA_EVENTO: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  inicioReceso: 'Inicio receso',
  finReceso: 'Fin receso',
};

/** Pagina de miniaturas de evidencias (fecha, evento y hash corto). */
async function agregarEvidencias(doc: jsPDF, registrosIds: number[]): Promise<void> {
  const { db } = await import('../../data/db');
  const registros = (await db.registros.bulkGet(registrosIds)).filter((r) => r?.fotoId);
  if (registros.length === 0) return;
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Evidencias fotograficas', 14, 16);
  let x = 14;
  let y = 24;
  const anchoMm = 56;
  for (const r of registros) {
    const foto = await db.fotos.get(r!.fotoId!);
    if (!foto) continue;
    const mini = await aMiniaturaJpeg(foto.blobWebp);
    if (!mini) continue;
    const altoMm = Math.min(70, (mini.h / mini.w) * anchoMm);
    if (y + altoMm + 12 > 285) {
      doc.addPage();
      x = 14;
      y = 16;
    }
    doc.addImage(mini.data, 'JPEG', x, y, anchoMm, altoMm);
    doc.setFontSize(7);
    doc.text(`${r!.fecha} - ${ETIQUETA_EVENTO[r!.tipoEvento] ?? r!.tipoEvento} ${formatoHora(r!.horaReal)}`, x, y + altoMm + 4);
    doc.text(`SHA-256 ${foto.hashSha256.slice(0, 16)}...`, x, y + altoMm + 8);
    x += anchoMm + 6;
    if (x + anchoMm > 200) {
      x = 14;
      y += altoMm + 14;
    }
  }
}
