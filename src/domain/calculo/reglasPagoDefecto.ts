import type { ReglaPago } from '../tipos';

/**
 * Matriz de factores por defecto (editable en Configuracion -> Reglas de pago).
 * Nunca se usa directamente "quemada" en el motor: esto es el valor semilla
 * que se guarda en la tabla Dexie `reglasPago`.
 *
 * Factores sobre la hora base DIURNA, verificados contra una boleta real:
 *  - extraDiurna 2.00 y extraNocturna 2.50 calzan exacto con las lineas
 *    "Horas Extras 200%" / "Extras 250% Nocturnas" de la boleta de ejemplo.
 */
export const REGLAS_PAGO_DEFECTO: ReglaPago[] = [
  { tipoHora: 'ordinariaDiurna', factor: 1.0, articuloLey: 'Art. 161 C.T.' },
  { tipoHora: 'ordinariaNocturna', factor: 1.25, articuloLey: 'Art. 161 y 168 C.T. (recargo nocturno 25%)' },
  { tipoHora: 'extraDiurna', factor: 2.0, articuloLey: 'Art. 169 C.T. (recargo 100%)' },
  { tipoHora: 'extraNocturna', factor: 2.5, articuloLey: 'Art. 169 y 168 C.T. (extra + recargo nocturno)' },
  { tipoHora: 'asuetoDiurna', factor: 2.0, articuloLey: 'Art. 192 C.T. (ordinario + 100% recargo)' },
  { tipoHora: 'asuetoNocturna', factor: 2.5, articuloLey: 'Art. 192 y 168 C.T.' },
  { tipoHora: 'asuetoExtraDiurna', factor: 4.0, articuloLey: 'Art. 192 C.T. (extra calculada sobre base doble)' },
  { tipoHora: 'asuetoExtraNocturna', factor: 5.0, articuloLey: 'Art. 192 y 168 C.T.' },
  // Dia de descanso semanal laborado (Art. 172/175 C.T.): factor configurable,
  // se deja igual al de asueto por defecto -- CONFIRMAR con RRHH si tu division
  // paga distinto; por eso vive en una tabla editable y no quemado en el motor.
  { tipoHora: 'descansoLaboradoDiurna', factor: 2.0, articuloLey: 'Art. 172/175 C.T. (configurable)' },
  { tipoHora: 'descansoLaboradoNocturna', factor: 2.5, articuloLey: 'Art. 172/175 y 168 C.T. (configurable)' },
];
