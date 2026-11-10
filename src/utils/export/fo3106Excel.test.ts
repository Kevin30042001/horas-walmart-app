import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { hojaFo3106 } from './fo3106Excel';
import { TIPO_PREAUTORIZACION, type Fo3106 } from '../../domain/reportes/fo3106';

describe('hoja FO-3106 en Excel', () => {
  it('respeta el layout del formato: encabezado, columnas, filas y TOTAL', () => {
    const fo: Fo3106 = {
      encabezado: {
        codigo: 'FO-3106',
        titulo: 'Formato Pre-autorizacion de Horas Extras, días libres y Feriados',
        division: 'LOG',
        departamento: 'PROTECCION DE ACTIVOS',
        periodo: '06/08/2026 al 18/08/2026',
      },
      filas: [
        {
          fecha: '07/08/2026',
          tipo: TIPO_PREAUTORIZACION.horasExtras,
          gafete: '8923795',
          asociado: 'Asociado',
          jornada: 'NOCTURNA',
          de: '04:00',
          a: '05:11',
          tiempoNomina: 1.18,
          tarea: 'Procesos QA',
        },
      ],
      total: 1.18,
    };
    const filas = XLSX.utils.sheet_to_json<(string | number)[]>(hojaFo3106(fo), { header: 1, defval: '' });
    expect(filas[0]![0]).toBe('FO-3106');
    expect(filas[5]).toEqual(['Período del:', '06/08/2026 al 18/08/2026']);
    expect(filas[7]!.slice(0, 8)).toEqual(['Fecha', 'Tipo de Preautorización', 'Gafete', 'Asociado', 'Jornada', 'Horario extraordinario', '', 'Tiempo en nómina']);
    expect(filas[9]!.slice(0, 9)).toEqual(['07/08/2026', 'Preautorización Horas Extras', '8923795', 'Asociado', 'NOCTURNA', '04:00', '05:11', 1.18, 'Procesos QA']);
    expect(filas[10]![0]).toBe('TOTAL');
    expect(filas[10]![7]).toBe(1.18);
  });
});
