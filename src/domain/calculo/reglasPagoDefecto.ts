import type { ReglaPago } from '../tipos';

/**
 * Reglas de pago por defecto (editables en Configuracion -> Reglas de pago).
 * Es solo la semilla de la tabla Dexie `reglasPago`; el motor nunca las usa
 * "quemadas". Nombres de linea iguales a los de la boleta.
 *
 * Verificado contra una boleta real (salario 642, hora base 2.675):
 * Horas Extras 200 % de 1.45 h = 7.76; Extras 250 % Nocturnas de 0.85 h = 5.68.
 */
export const REGLAS_PAGO_DEFECTO: ReglaPago[] = [
  {
    tipoHora: 'ordinariaDiurna',
    nombreLinea: 'Horas ordinarias diurnas (en el salario)',
    modo: 'recargo',
    factor: 0,
    articuloLey: 'Art. 161 C.T. (ya pagadas en el salario fijo)',
  },
  {
    tipoHora: 'ordinariaNocturna',
    nombreLinea: 'Nocturnidad 25 %',
    modo: 'recargo',
    factor: 0.25,
    articuloLey: 'Art. 168 C.T. (recargo nocturno minimo 25 %)',
  },
  {
    tipoHora: 'extraDiurna',
    nombreLinea: 'Horas Extras 200 %',
    modo: 'completo',
    factor: 2.0,
    articuloLey: 'Art. 169 C.T. (recargo 100 %)',
  },
  {
    tipoHora: 'extraNocturna',
    nombreLinea: 'Extras 250 % Nocturnas',
    modo: 'completo',
    factor: 2.5,
    articuloLey: 'Art. 169 y 168 C.T. (extra + recargo nocturno)',
  },
  {
    tipoHora: 'asuetoDiurna',
    nombreLinea: 'Recargo asueto 100 %',
    modo: 'recargo',
    factor: 1.0,
    articuloLey: 'Art. 192 C.T. (salario ordinario + 100 % de recargo)',
  },
  {
    tipoHora: 'asuetoNocturna',
    nombreLinea: 'Recargo asueto 100 % + nocturnidad 25 %',
    modo: 'recargo',
    factor: 1.25,
    articuloLey: 'Art. 192 y 168 C.T.',
  },
  {
    tipoHora: 'asuetoExtraDiurna',
    nombreLinea: 'Extras en asueto 400 %',
    modo: 'completo',
    factor: 4.0,
    articuloLey: 'Art. 192 y 169 C.T. (extra sobre base doble)',
  },
  {
    tipoHora: 'asuetoExtraNocturna',
    nombreLinea: 'Extras en asueto 500 % Nocturnas',
    modo: 'completo',
    factor: 5.0,
    articuloLey: 'Art. 192, 169 y 168 C.T.',
  },
  // Dia de descanso semanal laborado (Art. 175 C.T.): recargo del 100 % + dia
  // compensatorio. CONFIRMAR con RRHH: por eso es editable (modo y factor).
  {
    tipoHora: 'descansoLaboradoDiurna',
    nombreLinea: 'Dia libre laborado (recargo 100 %)',
    modo: 'recargo',
    factor: 1.0,
    articuloLey: 'Art. 175 C.T. (configurable)',
    diaCompensatorio: true,
  },
  {
    tipoHora: 'descansoLaboradoNocturna',
    nombreLinea: 'Dia libre laborado nocturno (100 % + 25 %)',
    modo: 'recargo',
    factor: 1.25,
    articuloLey: 'Art. 175 y 168 C.T. (configurable)',
    diaCompensatorio: true,
  },
];
