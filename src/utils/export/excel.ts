import type ExcelJS from 'exceljs';
import type { ResumenCorte } from '../../aplicacion/resumenCorte';
import type { Fo3106 } from '../../domain/reportes/fo3106';
import { CODIGO_WALMART, porcentajeTotal } from '../../domain/calculo/codigos';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { NOMBRE_TIPO_HORA } from '../nombresTipoHora';
import { formatoHora } from '../fecha';
import { agregarHojaFo3106 } from './fo3106Excel';
import { COLOR, MIME_XLSX, codigosDeJornada, fechaCortaIso, separarCodigo, totalesJornada } from './estiloExport';
import type { ArchivoGenerado } from '../entregarArchivo';

export interface DatosExportacionCorte {
  resumen: ResumenCorte;
  nombreTurnoPorId: Record<number, string>;
  nombreColaborador: string;
  gafete: string;
  etiquetaCorte: string; // ej. "2026-01-14_al_2026-01-28"
  fo3106?: Fo3106 | null;
}

const MONEDA = '"$"#,##0.00';
const HORAS = '0.00';
const argb = (hex: string) => ({ argb: 'FF' + hex });
const relleno = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: argb(hex) });
const linea = { style: 'thin' as const, color: argb(COLOR.grisBorde) };

/** Encabezado de tabla: fondo azul, texto blanco en negrita, centrado. */
function estiloCabecera(fila: ExcelJS.Row): void {
  fila.height = 22;
  fila.eachCell((c) => {
    c.font = { bold: true, color: argb(COLOR.blanco) };
    c.fill = relleno(COLOR.azul);
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { bottom: { style: 'medium', color: argb(COLOR.azulOscuro) } };
  });
}

/** Banda de titulo de cada hoja (azul marino, como la app). */
function banda(hoja: ExcelJS.Worksheet, columnas: number, titulo: string, subtitulo: string): void {
  const ultima = String.fromCharCode(64 + columnas);
  hoja.mergeCells(`A1:${ultima}1`);
  hoja.mergeCells(`A2:${ultima}2`);
  const t = hoja.getCell('A1');
  t.value = titulo;
  t.font = { bold: true, size: 16, color: argb(COLOR.blanco) };
  t.fill = relleno(COLOR.marino);
  t.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(1).height = 34;
  const s = hoja.getCell('A2');
  s.value = subtitulo;
  s.font = { size: 10, color: argb(COLOR.amarillo) };
  s.fill = relleno(COLOR.marino);
  s.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(2).height = 20;
}

function hojaResumen(libro: ExcelJS.Workbook, datos: DatosExportacionCorte): void {
  const { resumen, nombreColaborador, gafete } = datos;
  const corte = resumen.corte;
  const hoja = libro.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  hoja.columns = [{ width: 4 }, { width: 34 }, { width: 12 }, { width: 11 }, { width: 11 }, { width: 16 }];
  banda(hoja, 6, 'Mis Horas · Resumen del corte', 'Proyección personal — no es la boleta oficial de pago');

  // Datos del colaborador
  const info: [string, string][] = [
    ['Colaborador', nombreColaborador],
    ['Gafete', gafete || '—'],
    ['Corte', corte ? `${fechaCortaIso(corte.fechaInicio)} al ${fechaCortaIso(corte.fechaCorte)}` : datos.etiquetaCorte],
    ['Fecha de pago', corte ? fechaCortaIso(corte.fechaPago) : '—'],
    ['Hora base', `$${resumen.horaBase.toFixed(3)}`],
  ];
  info.forEach(([k, v], i) => {
    const r = 4 + i;
    hoja.getCell(`B${r}`).value = k;
    hoja.getCell(`B${r}`).font = { color: argb(COLOR.tenue) };
    hoja.mergeCells(`C${r}:F${r}`);
    hoja.getCell(`C${r}`).value = v;
    hoja.getCell(`C${r}`).font = { bold: true, color: argb(COLOR.marino) };
  });

  // Tarjetas KPI
  const kpis: [string, number, string, string][] = [
    ['Neto estimado', resumen.netoEstimado, COLOR.azul, COLOR.blanco],
    ['Bruto', resumen.ingresoBruto, COLOR.azulSuave, COLOR.marino],
    ['Deducciones', resumen.totalDeducciones, COLOR.gris, COLOR.marino],
  ];
  const filaKpi = 10;
  const posiciones = ['B', 'C', 'E'];
  const finales = ['B', 'D', 'F'];
  kpis.forEach(([titulo, valor, fondo, tinta], i) => {
    if (posiciones[i] !== finales[i]) {
      hoja.mergeCells(`${posiciones[i]}${filaKpi}:${finales[i]}${filaKpi}`);
      hoja.mergeCells(`${posiciones[i]}${filaKpi + 1}:${finales[i]}${filaKpi + 1}`);
    }
    const t = hoja.getCell(`${posiciones[i]}${filaKpi}`);
    t.value = titulo.toUpperCase();
    t.font = { bold: true, size: 9, color: argb(tinta) };
    t.fill = relleno(fondo);
    t.alignment = { indent: 1, vertical: 'bottom' };
    const v = hoja.getCell(`${posiciones[i]}${filaKpi + 1}`);
    v.value = valor;
    v.numFmt = MONEDA;
    v.font = { bold: true, size: 18, color: argb(tinta) };
    v.fill = relleno(fondo);
    v.alignment = { indent: 1, vertical: 'middle' };
  });
  hoja.getRow(filaKpi).height = 20;
  hoja.getRow(filaKpi + 1).height = 32;

  // Desglose tipo boleta
  const inicio = 14;
  hoja.getCell(`B${inicio - 1}`).value = 'DESGLOSE TIPO BOLETA';
  hoja.getCell(`B${inicio - 1}`).font = { bold: true, size: 10, color: argb(COLOR.tenue) };
  estiloCabecera(hoja.addRow(['', 'Concepto', 'Código', 'Horas', '% total', 'Monto']));
  hoja.getRow(inicio).getCell(1).fill = { type: 'pattern', pattern: 'none' };
  hoja.getRow(inicio).getCell(1).border = {};

  const filaDato = (valores: (string | number | null)[], opciones: { fondo?: string; negrita?: boolean; tinta?: string } = {}) => {
    const f = hoja.addRow(['', ...valores]);
    for (let c = 2; c <= 6; c++) {
      const celda = f.getCell(c);
      celda.border = { bottom: linea };
      if (opciones.fondo) celda.fill = relleno(opciones.fondo);
      celda.font = { bold: opciones.negrita, color: argb(opciones.tinta ?? COLOR.marino) };
      celda.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : c === 3 ? 'center' : 'right', indent: c === 2 ? 1 : 0 };
    }
    f.getCell(4).numFmt = HORAS;
    f.getCell(6).numFmt = MONEDA;
    f.height = 20;
    return f;
  };

  filaDato(['Salario del corte', 'SAL', null, null, resumen.salarioCorte]);
  resumen.detalleMontos.forEach((l, i) => {
    const [codigo, concepto] = separarCodigo(l.nombreLinea);
    const asueto = l.tipoHora.startsWith('asueto');
    const f = filaDato([concepto, codigo || CODIGO_WALMART[l.tipoHora], l.horas, `${porcentajeTotal(l)} %`, l.monto], {
      fondo: asueto ? COLOR.amarilloSuave : i % 2 ? COLOR.gris : undefined,
    });
    f.getCell(2).note = `${l.explicacion}\n${l.articuloLey}${l.diaCompensatorio ? '\n+ dia compensatorio' : ''}`;
  });
  filaDato(['Bruto', '', null, null, resumen.ingresoBruto], { fondo: COLOR.azulSuave, negrita: true });
  for (const d of resumen.detalleDeducciones) filaDato([`(-) ${d.nombre}`, '', null, null, -d.monto], { tinta: COLOR.tenue });
  const neto = filaDato(['NETO ESTIMADO', '', null, null, resumen.netoEstimado], { fondo: COLOR.azul, negrita: true, tinta: COLOR.blanco });
  neto.height = 26;
  neto.getCell(6).font = { bold: true, size: 13, color: argb(COLOR.blanco) };

  const nota = hoja.addRow([]);
  hoja.getCell(`B${nota.number + 1}`).value =
    '% total = lo que se paga por esa hora (salario + recargo, o pago completo). Pasa el mouse sobre cada concepto para ver su cálculo.';
  hoja.getCell(`B${nota.number + 1}`).font = { italic: true, size: 9, color: argb(COLOR.tenue) };
}

function hojaJornadas(libro: ExcelJS.Workbook, datos: DatosExportacionCorte): void {
  const { resumen, nombreTurnoPorId } = datos;
  if (resumen.jornadas.length === 0) return;
  const hoja = libro.addWorksheet('Jornadas', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  hoja.columns = [16, 12, 10, 10, 9, 10, 11, 10, 10, 34, 26].map((width) => ({ width }));
  banda(hoja, 11, 'Jornadas del corte', 'Asuetos resaltados en amarillo · horas en decimal de nómina');
  const cab = hoja.getRow(4);
  cab.values = ['Fecha', 'Turno', 'Entrada', 'Salida', 'Receso', 'Total h', 'Ordinarias', 'Extras', 'Asueto', 'Códigos', 'Asueto / notas'];
  estiloCabecera(cab);

  let tot = { total: 0, ordinarias: 0, extras: 0, asueto: 0 };
  resumen.jornadas.forEach((j, i) => {
    const t = totalesJornada(j);
    tot = { total: tot.total + t.total, ordinarias: tot.ordinarias + t.ordinarias, extras: tot.extras + t.extras, asueto: tot.asueto + t.asueto };
    const nota = [j.esAsueto ? j.nombreAsueto ?? 'Asueto' : '', j.esDescansoSemanalLaborado ? 'Día libre laborado' : '', j.recesoAsumido ? 'Receso asumido' : '']
      .filter(Boolean)
      .join(' · ');
    const f = hoja.addRow([
      fechaCortaIso(j.fecha),
      nombreTurnoPorId[j.turnoId] ?? `#${j.turnoId}`,
      formatoHora(j.entradaReal),
      formatoHora(j.salidaReal),
      j.minutosReceso ? `${j.minutosReceso} min` : '—',
      t.total,
      t.ordinarias,
      t.extras || null,
      t.asueto || null,
      codigosDeJornada(j) || '—',
      nota,
    ]);
    const fondo = j.esAsueto ? COLOR.amarilloSuave : i % 2 ? COLOR.gris : COLOR.blanco;
    f.eachCell({ includeEmpty: true }, (c, col) => {
      c.fill = relleno(fondo);
      c.border = { bottom: linea };
      c.alignment = { vertical: 'middle', horizontal: col >= 10 ? 'left' : col >= 6 ? 'right' : 'center', indent: col >= 10 ? 1 : 0 };
      c.font = { color: argb(COLOR.marino), bold: col === 6 };
    });
    for (const col of [6, 7, 8, 9]) f.getCell(col).numFmt = HORAS;
    if (t.extras) f.getCell(8).font = { bold: true, color: argb(COLOR.naranja) };
    f.height = 18;
  });
  const r = (n: number) => Math.round(n * 100) / 100;
  const total = hoja.addRow(['TOTAL', '', '', '', '', r(tot.total), r(tot.ordinarias), r(tot.extras), r(tot.asueto), '', '']);
  total.eachCell({ includeEmpty: true }, (c, col) => {
    c.fill = relleno(COLOR.marino);
    c.font = { bold: true, color: argb(COLOR.blanco) };
    c.alignment = { horizontal: col >= 6 && col <= 9 ? 'right' : 'center', vertical: 'middle' };
  });
  for (const col of [6, 7, 8, 9]) total.getCell(col).numFmt = HORAS;
  total.height = 22;
  hoja.autoFilter = { from: 'A4', to: `K${total.number - 1}` };
}

function hojaTramos(libro: ExcelJS.Workbook, datos: DatosExportacionCorte): void {
  const { resumen } = datos;
  const tramos = resumen.jornadas.flatMap((j) => (j.tramos ?? []).map((t) => ({ j, t })));
  if (tramos.length === 0) return;
  const reglas = new Map(resumen.detalleMontos.map((l) => [l.tipoHora, l]));
  const hoja = libro.addWorksheet('Por que se pago asi', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  hoja.columns = [16, 9, 9, 12, 9, 34, 9, 12].map((width) => ({ width }));
  banda(hoja, 8, 'Por qué se pagó así', 'Cada tramo de cada jornada con su código de Walmart, % y monto que suma al salario');
  const cab = hoja.getRow(4);
  cab.values = ['Jornada', 'De', 'A', 'Código', '% total', 'Tipo de hora', 'Horas', 'Suma $'];
  estiloCabecera(cab);
  tramos.forEach(({ j, t }, i) => {
    const regla = reglas.get(t.tipoHora);
    const horas = minutosADecimal(t.minutos);
    const monto = regla ? Math.round(horas * resumen.horaBase * regla.factor * 100) / 100 : 0;
    const f = hoja.addRow([
      fechaCortaIso(j.fecha),
      formatoHora(t.inicio),
      formatoHora(t.fin),
      CODIGO_WALMART[t.tipoHora],
      regla ? `${porcentajeTotal(regla)} %` : t.tipoHora.startsWith('ordinariaDiurna') ? '100 %' : '',
      t.recesoPagado ? 'Receso pagado por caer en asueto' : NOMBRE_TIPO_HORA[t.tipoHora],
      horas,
      monto || null,
    ]);
    const asueto = t.tipoHora.startsWith('asueto');
    const fondo = asueto ? COLOR.amarilloSuave : i % 2 ? COLOR.gris : COLOR.blanco;
    f.eachCell({ includeEmpty: true }, (c, col) => {
      c.fill = relleno(fondo);
      c.border = { bottom: linea };
      c.alignment = { vertical: 'middle', horizontal: col === 6 ? 'left' : col >= 7 ? 'right' : 'center' };
      c.font = { color: argb(COLOR.marino) };
    });
    f.getCell(4).font = { bold: true, color: argb(asueto ? COLOR.naranja : t.categoria === 'extra' ? COLOR.naranja : COLOR.azulOscuro) };
    f.getCell(7).numFmt = HORAS;
    f.getCell(8).numFmt = MONEDA;
  });
}

/**
 * Libro completo del corte con diseno (tambien va dentro del ZIP de respaldo).
 * Solo se crean las hojas que tienen datos: Resumen siempre; Jornadas, Por que
 * se pago asi y FO-3106 solo si hay jornadas, tramos o filas.
 */
export async function construirLibroCorte(datos: DatosExportacionCorte): Promise<ExcelJS.Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Mis Horas';
  libro.created = new Date();
  hojaResumen(libro, datos);
  hojaJornadas(libro, datos);
  hojaTramos(libro, datos);
  if (datos.fo3106) agregarHojaFo3106(libro, datos.fo3106);
  return libro;
}

export async function libroCorteABuffer(datos: DatosExportacionCorte): Promise<ArrayBuffer> {
  const libro = await construirLibroCorte(datos);
  return (await libro.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function generarExcelCorte(datos: DatosExportacionCorte): Promise<ArchivoGenerado> {
  const buffer = await libroCorteABuffer(datos);
  return { blob: new Blob([buffer], { type: MIME_XLSX }), nombre: `MisHoras_${datos.etiquetaCorte}.xlsx` };
}
