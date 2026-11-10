import * as XLSX from 'xlsx';
import type { ResumenCorte } from '../../aplicacion/resumenCorte';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { formatoHora } from '../fecha';

export interface DatosExportacionCorte {
  resumen: ResumenCorte;
  nombreTurnoPorId: Record<number, string>;
  nombreColaborador: string;
  gafete: string;
  etiquetaCorte: string; // ej. "2026-01-14_al_2026-01-28"
}

/**
 * Genera el Excel descargable para enviar a los jefes: una hoja de resumen,
 * una con el desglose "por que se pago asi" y una con el detalle dia-por-dia
 * (columnas inspiradas en el formato FO-3106 que ya usan: Fecha, Turno,
 * Horario, Horas, Tipo) para que lo reconozcan de un vistazo.
 */
export function exportarCorteAExcel(datos: DatosExportacionCorte): void {
  const { resumen, nombreTurnoPorId, nombreColaborador, gafete, etiquetaCorte } = datos;
  const libro = XLSX.utils.book_new();

  const hojaResumen = XLSX.utils.aoa_to_sheet([
    ['Mis Horas - Resumen de corte (proyeccion personal, NO es la boleta oficial)'],
    [],
    ['Colaborador', nombreColaborador],
    ['Gafete', gafete],
    ['Corte', etiquetaCorte],
    [],
    ['Salario del corte', resumen.salarioCorte],
    ['Hora base', Math.round(resumen.horaBase * 1000) / 1000],
    ['Ingreso bruto estimado', resumen.ingresoBruto],
    ['Total deducciones estimadas', resumen.totalDeducciones],
    ['Neto estimado', resumen.netoEstimado],
  ]);
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  const filasDetalle = [
    { Linea: 'Salario del corte', 'Horas (decimal nomina)': '', Factor: '', Tipo: 'fijo', Calculo: '', 'Articulo de ley': '', 'Monto estimado': resumen.salarioCorte },
    ...resumen.detalleMontos.map((d) => ({
      Linea: d.nombreLinea,
      'Horas (decimal nomina)': d.horas,
      Factor: d.factor,
      Tipo: d.modo === 'recargo' ? 'recargo sobre salario' : 'pago completo',
      Calculo: d.explicacion,
      'Articulo de ley': d.articuloLey,
      'Monto estimado': d.monto,
    })),
  ];
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasDetalle), 'Por que se pago asi');

  const filasJornadas = resumen.jornadas.map((j) => ({
    Fecha: j.fecha,
    Turno: nombreTurnoPorId[j.turnoId] ?? `Turno #${j.turnoId}`,
    Entrada: formatoHora(j.entradaReal),
    Salida: formatoHora(j.salidaReal),
    'Receso (min)': j.minutosReceso,
    'Horas trabajadas (decimal)': minutosADecimal(j.totalMinutosTrabajados),
    'Jornada legal': j.tipoJornadaLegal,
    Asueto: j.esAsueto ? 'Si' : '',
    'Descanso laborado': j.esDescansoSemanalLaborado ? 'Si' : '',
  }));
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasJornadas), 'Jornadas');

  const filasDeducciones = resumen.detalleDeducciones.map((d) => ({ Deduccion: d.nombre, Monto: d.monto }));
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasDeducciones), 'Deducciones (estimadas)');

  XLSX.writeFile(libro, `MisHoras_${etiquetaCorte}.xlsx`);
}
