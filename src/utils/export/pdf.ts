import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatosExportacionCorte } from './excel';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { NOMBRE_TIPO_HORA } from '../nombresTipoHora';
import { formatoHora, formatoMoneda } from '../fecha';

/**
 * Genera el PDF del corte: encabezado con los datos del colaborador, tabla de
 * jornadas y tabla de montos con su desglose legal. Pensado para respaldar
 * solicitudes de horas extras o reclamos ante el jefe.
 */
export function exportarCorteAPdf(datos: DatosExportacionCorte): void {
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

  doc.save(`MisHoras_${etiquetaCorte}.pdf`);
}
