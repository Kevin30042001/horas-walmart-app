import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatosExportacionCorte } from './excel';
import type { ArchivoGenerado } from '../entregarArchivo';
import { CODIGO_WALMART, porcentajeTotal } from '../../domain/calculo/codigos';
import { formatoHora, formatoMoneda } from '../fecha';
import { COLOR, codigosDeJornada, fechaCortaIso, rgb, separarCodigo, totalesJornada } from './estiloExport';

const MARGEN = 14;
const ANCHO = 210;

/**
 * PDF del corte con diseno moderno: encabezado azul marino con la chispa,
 * tarjetas de neto / bruto / deducciones / horas, boleta estimada, jornadas
 * (asuetos en amarillo) y evidencias. Pensado para respaldar horas extras.
 */
export async function generarPdfCorte(datos: DatosExportacionCorte): Promise<ArchivoGenerado> {
  const doc = await construirPdfCorte(datos);
  return { blob: doc.output('blob'), nombre: `MisHoras_${datos.etiquetaCorte}.pdf` };
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

/** Chispa de seis rayos (lineas gruesas con punta redonda). */
function chispa(doc: jsPDF, cx: number, cy: number, r: number): void {
  doc.setDrawColor(...rgb(COLOR.amarillo));
  doc.setLineCap('round');
  doc.setLineWidth(r * 0.32);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    doc.line(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  doc.setLineCap('butt');
}

function encabezado(doc: jsPDF, titulo: string, derecha: string[]): void {
  doc.setFillColor(...rgb(COLOR.marino));
  doc.rect(0, 0, ANCHO, 30, 'F');
  doc.setFillColor(...rgb(COLOR.amarillo));
  doc.rect(0, 30, ANCHO, 1.2, 'F');
  chispa(doc, MARGEN + 6, 15, 6);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Mis Horas', MARGEN + 16, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...rgb(COLOR.amarillo));
  doc.text(titulo, MARGEN + 16, 20);
  doc.setTextColor(255, 255, 255);
  derecha.forEach((t, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.setFontSize(i === 0 ? 10 : 8.5);
    doc.text(t, ANCHO - MARGEN, 12 + i * 5.5, { align: 'right' });
  });
}

function tarjeta(doc: jsPDF, x: number, y: number, w: number, titulo: string, valor: string, fondo: string, tinta: string, sub?: string): void {
  doc.setFillColor(...rgb(fondo));
  doc.roundedRect(x, y, w, 24, 3, 3, 'F');
  doc.setTextColor(...rgb(tinta));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(titulo.toUpperCase(), x + 4, y + 7);
  doc.setFontSize(14);
  doc.text(valor, x + 4, y + 16);
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(sub, x + 4, y + 21);
  }
}

function seccion(doc: jsPDF, y: number, texto: string): number {
  doc.setTextColor(...rgb(COLOR.tenue));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(texto.toUpperCase(), MARGEN, y);
  doc.setDrawColor(...rgb(COLOR.amarillo));
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y + 1.8, MARGEN + 12, y + 1.8);
  return y + 5;
}

const finTabla = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

/** Arma el PDF del corte (tambien se usa dentro del ZIP de respaldo). */
export async function construirPdfCorte(datos: DatosExportacionCorte): Promise<jsPDF> {
  const { resumen, nombreTurnoPorId, nombreColaborador, gafete, etiquetaCorte } = datos;
  const corte = resumen.corte;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  encabezado(doc, 'Reporte de corte · proyección personal', [
    corte ? `Paga ${fechaCortaIso(corte.fechaPago)}` : etiquetaCorte,
    corte ? `Corte ${fechaCortaIso(corte.fechaInicio)} al ${fechaCortaIso(corte.fechaCorte)}` : '',
  ]);

  // Colaborador
  doc.setTextColor(...rgb(COLOR.marino));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(nombreColaborador, MARGEN, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...rgb(COLOR.tenue));
  doc.text(`Gafete ${gafete || '—'}  ·  Hora base $${resumen.horaBase.toFixed(3)}  ·  ${resumen.jornadas.length} jornadas`, MARGEN, 46);

  // Tarjetas
  const horas = resumen.jornadas.reduce((a, j) => a + totalesJornada(j).total, 0);
  const extras = resumen.jornadas.reduce((a, j) => a + totalesJornada(j).extras + totalesJornada(j).asueto, 0);
  const w = (ANCHO - MARGEN * 2 - 9) / 4;
  tarjeta(doc, MARGEN, 51, w, 'Neto estimado', formatoMoneda(resumen.netoEstimado), COLOR.azul, COLOR.blanco);
  tarjeta(doc, MARGEN + (w + 3), 51, w, 'Bruto', formatoMoneda(resumen.ingresoBruto), COLOR.azulSuave, COLOR.marino, `Salario ${formatoMoneda(resumen.salarioCorte)}`);
  tarjeta(doc, MARGEN + (w + 3) * 2, 51, w, 'Deducciones', formatoMoneda(resumen.totalDeducciones), COLOR.gris, COLOR.marino, 'ISSS · AFP · ISR (estimado)');
  tarjeta(doc, MARGEN + (w + 3) * 3, 51, w, 'Horas', `${horas.toFixed(2)} h`, COLOR.amarilloSuave, COLOR.marino, `${extras.toFixed(2)} h extra / asueto`);

  // Boleta
  let y = seccion(doc, 85, 'Desglose tipo boleta');
  const filasBoleta: string[][] = [['Salario del corte', 'SAL', '', '', formatoMoneda(resumen.salarioCorte)]];
  const asuetoFila = new Set<number>();
  resumen.detalleMontos.forEach((l) => {
    const [codigo, concepto] = separarCodigo(l.nombreLinea);
    if (l.tipoHora.startsWith('asueto')) asuetoFila.add(filasBoleta.length);
    filasBoleta.push([concepto, codigo || CODIGO_WALMART[l.tipoHora], l.horas.toFixed(2), `${porcentajeTotal(l)} %`, formatoMoneda(l.monto)]);
  });
  const filaBruto = filasBoleta.length;
  filasBoleta.push(['Bruto', '', '', '', formatoMoneda(resumen.ingresoBruto)]);
  for (const d of resumen.detalleDeducciones) filasBoleta.push([`(-) ${d.nombre}`, '', '', '', `-${formatoMoneda(d.monto)}`]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    theme: 'plain',
    head: [['Concepto', 'Código', 'Horas', '% total', 'Monto']],
    body: filasBoleta,
    foot: [['NETO ESTIMADO', '', '', '', formatoMoneda(resumen.netoEstimado)]],
    styles: { fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, textColor: rgb(COLOR.marino), lineColor: rgb(COLOR.grisBorde) },
    headStyles: { fillColor: rgb(COLOR.azul), textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: rgb(COLOR.marino), textColor: 255, fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    didParseCell: (c) => {
      if (c.section === 'head' || c.section === 'foot') {
        if (c.column.index >= 2) c.cell.styles.halign = 'right';
        return;
      }
      c.cell.styles.lineWidth = { bottom: 0.2 };
      if (asuetoFila.has(c.row.index)) c.cell.styles.fillColor = rgb(COLOR.amarilloSuave);
      if (c.row.index === filaBruto) {
        c.cell.styles.fillColor = rgb(COLOR.azulSuave);
        c.cell.styles.fontStyle = 'bold';
      }
      if (c.row.index > filaBruto) c.cell.styles.textColor = rgb(COLOR.tenue);
    },
  });

  // Jornadas
  if (resumen.jornadas.length > 0) {
    y = finTabla(doc) + 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y = seccion(doc, y, 'Jornadas del corte');
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN, top: 20 },
      theme: 'plain',
      head: [['Fecha', 'Turno', 'Entrada', 'Salida', 'Horas', 'Extras', 'Códigos']],
      body: resumen.jornadas.map((j) => {
        const t = totalesJornada(j);
        return [
          fechaCortaIso(j.fecha) + (j.esAsueto ? `\n${j.nombreAsueto ?? 'Asueto'}` : ''),
          nombreTurnoPorId[j.turnoId] ?? `#${j.turnoId}`,
          formatoHora(j.entradaReal),
          formatoHora(j.salidaReal),
          t.total.toFixed(2),
          t.extras + t.asueto > 0 ? (t.extras + t.asueto).toFixed(2) : '—',
          codigosDeJornada(j) || '—',
        ];
      }),
      styles: { fontSize: 8, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 }, textColor: rgb(COLOR.marino), lineColor: rgb(COLOR.grisBorde) },
      headStyles: { fillColor: rgb(COLOR.azul), textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: rgb(COLOR.gris) },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' } },
      didParseCell: (c) => {
        if (c.section !== 'body') return;
        c.cell.styles.lineWidth = { bottom: 0.2 };
        const j = resumen.jornadas[c.row.index];
        if (j?.esAsueto) c.cell.styles.fillColor = rgb(COLOR.amarilloSuave);
        if (c.column.index === 5 && c.cell.raw !== '—') {
          c.cell.styles.textColor = rgb(COLOR.naranja);
          c.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  await agregarEvidencias(doc, resumen.jornadas.flatMap((j) => j.registrosIds));
  pieDePagina(doc);
  return doc;
}

/** Pie en todas las paginas: aviso de proyeccion + numero de pagina. */
function pieDePagina(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const generado = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...rgb(COLOR.grisBorde));
    doc.setLineWidth(0.3);
    doc.line(MARGEN, 284, ANCHO - MARGEN, 284);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...rgb(COLOR.tenue));
    doc.text('Mis Horas · uso personal, no oficial · proyección estimada: no reemplaza la boleta ni el reloj marcador oficial', MARGEN, 289);
    doc.text(`Generado ${generado} · Página ${i} de ${total}`, ANCHO - MARGEN, 289, { align: 'right' });
  }
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
  encabezado(doc, 'Evidencias fotográficas', [`${registros.length} foto(s)`]);
  let x = MARGEN;
  let y = 40;
  const anchoMm = 56;
  for (const r of registros) {
    const foto = await db.fotos.get(r!.fotoId!);
    if (!foto) continue;
    const mini = await aMiniaturaJpeg(foto.blobWebp);
    if (!mini) continue;
    const altoMm = Math.min(70, (mini.h / mini.w) * anchoMm);
    if (y + altoMm + 12 > 280) {
      doc.addPage();
      x = MARGEN;
      y = 20;
    }
    doc.setFillColor(...rgb(COLOR.gris));
    doc.roundedRect(x - 1.5, y - 1.5, anchoMm + 3, altoMm + 13, 2, 2, 'F');
    doc.addImage(mini.data, 'JPEG', x, y, anchoMm, altoMm);
    doc.setTextColor(...rgb(COLOR.marino));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`${fechaCortaIso(r!.fecha)} · ${ETIQUETA_EVENTO[r!.tipoEvento] ?? r!.tipoEvento} ${formatoHora(r!.horaReal)}`, x, y + altoMm + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...rgb(COLOR.tenue));
    doc.text(`SHA-256 ${foto.hashSha256.slice(0, 20)}…`, x, y + altoMm + 8.5);
    x += anchoMm + 6;
    if (x + anchoMm > ANCHO - MARGEN + 1) {
      x = MARGEN;
      y += altoMm + 18;
    }
  }
}
