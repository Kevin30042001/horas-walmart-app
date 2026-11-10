import type { ReglaPago } from '../tipos';

/**
 * Reglas de pago por defecto (editables en Configuracion -> Reglas de pago).
 * Cada linea lleva el codigo del sistema de marcacion de Walmart (REG, P0.25,
 * TE2, TE2.5, TE2_H, TE2.5_H, TE4.0, TE5.0).
 * Es solo la semilla de la tabla Dexie `reglasPago`; el motor nunca las usa
 * "quemadas". Nombres de linea iguales a los de la boleta.
 *
 * Verificado contra una boleta real (salario 642, hora base 2.675):
 * Horas Extras 200 % de 1.45 h = 7.76; Extras 250 % Nocturnas de 0.85 h = 5.68.
 */
export const REGLAS_PAGO_DEFECTO: ReglaPago[] = [
  {
    tipoHora: 'ordinariaDiurna',
    nombreLinea: 'REG Horas ordinarias (en el salario)',
    modo: 'recargo',
    factor: 0,
    articuloLey: 'Art. 161 C.T. (ya pagadas en el salario fijo)',
  },
  {
    tipoHora: 'ordinariaNocturna',
    nombreLinea: 'P0.25 Nocturnidad 25 %',
    modo: 'recargo',
    factor: 0.25,
    articuloLey: 'Art. 168 C.T. (recargo nocturno minimo 25 %)',
  },
  {
    tipoHora: 'extraDiurna',
    nombreLinea: 'TE2 Horas Extras 200 %',
    modo: 'completo',
    factor: 2.0,
    articuloLey: 'Art. 169 C.T. (recargo 100 %)',
  },
  {
    tipoHora: 'extraNocturna',
    nombreLinea: 'TE2.5 Extras 250 % Nocturnas',
    modo: 'completo',
    factor: 2.5,
    articuloLey: 'Art. 169 y 168 C.T. (extra + recargo nocturno)',
  },
  {
    tipoHora: 'asuetoDiurna',
    nombreLinea: 'TE2_H Asueto diurno 200 % (recargo 100 %)',
    modo: 'recargo',
    factor: 1.0,
    articuloLey: 'Art. 192 C.T. (salario ordinario + 100 % de recargo)',
  },
  {
    tipoHora: 'asuetoNocturna',
    nombreLinea: 'TE2.5_H Asueto nocturno 250 % (recargo 150 %)',
    modo: 'recargo',
    // Walmart lo paga como TE2.5_H (250 % total, sin P0.25 aparte): el salario
    // ya cubre el 100 %, asi que el recargo es 1.5.
    factor: 1.5,
    articuloLey: 'Art. 192 y 168 C.T. (codigo TE2.5_H)',
  },
  {
    tipoHora: 'asuetoExtraDiurna',
    nombreLinea: 'TE4.0 Extras en asueto 400 %',
    modo: 'completo',
    factor: 4.0,
    articuloLey: 'Art. 192 y 169 C.T. (extra sobre base doble)',
  },
  {
    tipoHora: 'asuetoExtraNocturna',
    nombreLinea: 'TE5.0 Extras en asueto 500 % Nocturnas',
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
