import type ExcelJS from 'exceljs';
import type { Fo3106 } from '../../domain/reportes/fo3106';
import { TIPO_PREAUTORIZACION } from '../../domain/reportes/fo3106';
import { COLOR, MIME_XLSX, descargarBlob } from './estiloExport';

const borde = { style: 'thin' as const, color: { argb: 'FF' + COLOR.grisBorde } };
const BORDES = { top: borde, left: borde, bottom: borde, right: borde };

/**
 * Hoja FO-3106 con el layout del formato oficial (encabezado, columnas y
 * TOTAL), con estilo: encabezado azul, filas alternadas y feriados en amarillo.
 * No agrega nada si no hay filas (no se generan hojas en blanco).
 */
export function agregarHojaFo3106(libro: ExcelJS.Workbook, fo: Fo3106, nombre = 'FO-3106'): ExcelJS.Worksheet | null {
  if (fo.filas.length === 0) return null;
  const hoja = libro.addWorksheet(nombre, {
    views: [{ state: 'frozen', ySplit: 9, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  hoja.columns = [15, 34, 11, 30, 11, 9, 9, 12, 22, 16, 16].map((width) => ({ width }));

  hoja.mergeCells('A1:K1');
  const titulo = hoja.getCell('A1');
  titulo.value = `${fo.encabezado.codigo}   ${fo.encabezado.titulo}`;
  titulo.font = { bold: true, size: 14, color: { argb: 'FF' + COLOR.blanco } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR.marino } };
  titulo.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(1).height = 30;

  const datos: [string, string][] = [
    ['División:', fo.encabezado.division],
    ['Departamento:', fo.encabezado.departamento],
    ['Período del:', fo.encabezado.periodo],
  ];
  datos.forEach(([k, v], i) => {
    const fila = 3 + i;
    hoja.getCell(`A${fila}`).value = k;
    hoja.getCell(`A${fila}`).font = { bold: true, color: { argb: 'FF' + COLOR.tenue } };
    hoja.mergeCells(`B${fila}:D${fila}`);
    hoja.getCell(`B${fila}`).value = v;
    hoja.getCell(`B${fila}`).font = { bold: true, color: { argb: 'FF' + COLOR.marino } };
  });

  // Encabezado de dos filas (Horario extraordinario: De / A), como el formato en papel.
  const cab = ['Fecha', 'Tipo de Preautorización', 'Gafete', 'Asociado', 'Jornada', 'Horario extraordinario', '', 'Tiempo en nómina', 'Tarea realizada', 'Firma Jefe', 'Firma Asociado'];
  hoja.getRow(8).values = cab;
  hoja.getRow(9).values = ['', '', '', '', '', 'De', 'A', '', '', '', ''];
  hoja.mergeCells('F8:G8');
  for (const c of ['A', 'B', 'C', 'D', 'E', 'H', 'I', 'J', 'K']) hoja.mergeCells(`${c}8:${c}9`);
  for (const r of [8, 9]) {
    hoja.getRow(r).eachCell({ includeEmpty: true }, (celda) => {
      celda.font = { bold: true, color: { argb: 'FF' + COLOR.blanco } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR.azul } };
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      celda.border = BORDES;
    });
  }
  hoja.getRow(8).height = 30;
  hoja.getRow(9).height = 18;

  fo.filas.forEach((f, i) => {
    const fila = hoja.addRow([f.fecha, f.tipo, f.gafete, f.asociado, f.jornada, f.de, f.a, f.tiempoNomina, f.tarea, '', '']);
    const feriado = f.tipo === TIPO_PREAUTORIZACION.feriados;
    const fondo = feriado ? COLOR.amarilloSuave : i % 2 ? COLOR.gris : COLOR.blanco;
    fila.eachCell({ includeEmpty: true }, (celda, col) => {
      celda.border = BORDES;
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fondo } };
      celda.alignment = { vertical: 'middle', horizontal: [2, 4, 9].includes(col) ? 'left' : 'center' };
    });
    fila.getCell(8).numFmt = '0.00';
    fila.getCell(8).font = { bold: true };
    fila.getCell(5).font = { bold: true, color: { argb: 'FF' + (f.jornada === 'NOCTURNA' ? COLOR.azulOscuro : COLOR.naranja) } };
  });

  const total = hoja.addRow(['TOTAL', '', '', '', '', '', '', fo.total, '', '', '']);
  hoja.mergeCells(`A${total.number}:G${total.number}`);
  total.eachCell({ includeEmpty: true }, (celda) => {
    celda.font = { bold: true, color: { argb: 'FF' + COLOR.blanco } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR.marino } };
    celda.border = BORDES;
    celda.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  total.getCell(8).numFmt = '0.00';
  total.height = 22;

  const nota = hoja.addRow([]);
  hoja.addRow(['Generado con Mis Horas (control personal, no oficial). Tiempo en nómina = minutos / 60 a 2 decimales por tramo.']);
  hoja.getCell(`A${nota.number + 1}`).font = { italic: true, size: 9, color: { argb: 'FF' + COLOR.tenue } };
  return hoja;
}

/** Descarga el FO-3106 del corte como .xlsx. */
export async function exportarFo3106(fo: Fo3106, etiquetaCorte: string): Promise<boolean> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Mis Horas';
  if (!agregarHojaFo3106(libro, fo, 'Preautorizacion HE')) return false;
  const buffer = await libro.xlsx.writeBuffer();
  descargarBlob(new Blob([buffer], { type: MIME_XLSX }), `FO-3106_${etiquetaCorte}.xlsx`);
  return true;
}
