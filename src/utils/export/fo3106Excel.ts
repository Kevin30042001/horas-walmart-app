import * as XLSX from 'xlsx';
import type { Fo3106 } from '../../domain/reportes/fo3106';

const COLUMNAS = [
  'Fecha',
  'Tipo de Preautorización',
  'Gafete',
  'Asociado',
  'Jornada',
  'De',
  'A',
  'Tiempo en nómina',
  'Tarea realizada',
  'Firma Jefe',
  'Firma Asociado',
];

/** Construye la hoja FO-3106 con el mismo layout que el formato en papel/Excel. */
export function hojaFo3106(fo: Fo3106): XLSX.WorkSheet {
  const filas: (string | number)[][] = [
    [fo.encabezado.codigo],
    [],
    [fo.encabezado.titulo],
    ['División:', fo.encabezado.division],
    ['Departamento:', fo.encabezado.departamento],
    ['Período del:', fo.encabezado.periodo],
    [],
    ['Fecha', 'Tipo de Preautorización', 'Gafete', 'Asociado', 'Jornada', 'Horario extraordinario', '', 'Tiempo en nómina', 'Tarea realizada', 'Firma Jefe', 'Firma Asociado'],
    ['', '', '', '', '', 'De', 'A', '', '', '', ''],
    ...fo.filas.map((f) => [f.fecha, f.tipo, f.gafete, f.asociado, f.jornada, f.de, f.a, f.tiempoNomina, f.tarea, '', '']),
    ['TOTAL', '', '', '', '', '', '', fo.total, '', '', ''],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const filaEncabezado = 7;
  hoja['!merges'] = [
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: filaEncabezado, c: 5 }, e: { r: filaEncabezado, c: 6 } },
    ...[0, 1, 2, 3, 4, 7, 8, 9, 10].map((c) => ({ s: { r: filaEncabezado, c }, e: { r: filaEncabezado + 1, c } })),
  ];
  hoja['!cols'] = [12, 36, 11, 30, 11, 7, 7, 12, 22, 16, 16].map((wch) => ({ wch }));
  return hoja;
}

/** Descarga el FO-3106 del corte como .xlsx. */
export function exportarFo3106(fo: Fo3106, etiquetaCorte: string): void {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaFo3106(fo), 'Preautorizacion HE');
  XLSX.writeFile(libro, `FO-3106_${etiquetaCorte}.xlsx`);
}

export { COLUMNAS as COLUMNAS_FO3106 };
