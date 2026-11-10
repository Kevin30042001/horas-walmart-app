import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { agregarHojaFo3106 } from './fo3106Excel';
import { construirLibroCorte, type DatosExportacionCorte } from './excel';
import { TIPO_PREAUTORIZACION, type Fo3106 } from '../../domain/reportes/fo3106';
import { desgloseVacio } from '../../domain/calculo/motor';
import { horasVacias } from '../../domain/calculo/montos';
import type { JornadaRow } from '../../data/db';

const fo: Fo3106 = {
  encabezado: {
    codigo: 'FO-3106',
    titulo: 'Formato Pre-autorizacion de Horas Extras, días libres y Feriados',
    division: 'LOG',
    departamento: 'PROTECCION DE ACTIVOS',
    periodo: '20/10/2026 al 04/11/2026',
  },
  filas: [
    { fecha: '02/11/2026', tipo: TIPO_PREAUTORIZACION.feriados, gafete: '1', asociado: 'Asociado', jornada: 'NOCTURNA', de: '21:00', a: '00:00', tiempoNomina: 3, tarea: 'Procesos QA' },
    { fecha: '03/11/2026', tipo: TIPO_PREAUTORIZACION.horasExtras, gafete: '1', asociado: 'Asociado', jornada: 'NOCTURNA', de: '04:00', a: '05:17', tiempoNomina: 1.28, tarea: 'Procesos QA' },
  ],
  total: 4.28,
};

function datosCorte(jornadas: JornadaRow[], fo3106: Fo3106 | null): DatosExportacionCorte {
  return {
    resumen: {
      corte: { id: 1, fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14', estado: 'abierto' },
      desgloseTotal: desgloseVacio(),
      horasTotal: horasVacias(),
      horaBase: 2.675,
      salarioCorte: 321,
      detalleMontos: [],
      ingresoBruto: 321,
      detalleDeducciones: [{ nombre: 'ISSS', monto: 9.63 }],
      totalDeducciones: 9.63,
      netoEstimado: 311.37,
      jornadas,
    },
    nombreTurnoPorId: { 1: 'DESPACHO' },
    nombreColaborador: 'Asociado',
    gafete: '1',
    etiquetaCorte: 'x',
    fo3106,
  };
}

describe('Excel con diseno', () => {
  it('FO-3106: encabezado, columnas, filas y TOTAL con el layout del formato', () => {
    const libro = new ExcelJS.Workbook();
    const hoja = agregarHojaFo3106(libro, fo)!;
    expect(String(hoja.getCell('A1').value)).toContain('FO-3106');
    expect(hoja.getCell('B5').value).toBe('20/10/2026 al 04/11/2026');
    expect(hoja.getCell('B8').value).toBe('Tipo de Preautorización');
    expect(hoja.getCell('F9').value).toBe('De');
    expect(hoja.getRow(10).getCell(2).value).toBe(TIPO_PREAUTORIZACION.feriados);
    expect(hoja.getRow(11).getCell(8).value).toBe(1.28);
    expect(hoja.getRow(12).getCell(1).value).toBe('TOTAL');
    expect(hoja.getRow(12).getCell(8).value).toBe(4.28);
    // feriado resaltado en amarillo
    expect((hoja.getRow(10).getCell(1).fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFFF4D1');
  });

  it('FO-3106 sin filas: no crea una hoja vacia', () => {
    const libro = new ExcelJS.Workbook();
    expect(agregarHojaFo3106(libro, { ...fo, filas: [], total: 0 })).toBeNull();
    expect(libro.worksheets).toHaveLength(0);
  });

  it('libro del corte sin jornadas ni extras: solo la hoja Resumen (nada de hojas en blanco)', async () => {
    const libro = await construirLibroCorte(datosCorte([], { ...fo, filas: [], total: 0 }));
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen']);
  });

  it('libro del corte con FO-3106: incluye la hoja FO-3106', async () => {
    const libro = await construirLibroCorte(datosCorte([], fo));
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen', 'FO-3106']);
    const resumen = libro.getWorksheet('Resumen')!;
    expect(String(resumen.getCell('A1').value)).toContain('Resumen del corte');
  });
});
