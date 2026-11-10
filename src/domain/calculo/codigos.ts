import type { ReglaPago, TipoHora } from '../tipos';

/** Codigo del sistema de marcacion de Walmart para cada tipo de hora. */
export const CODIGO_WALMART: Record<TipoHora, string> = {
  ordinariaDiurna: 'REG',
  ordinariaNocturna: 'REG + P0.25',
  extraDiurna: 'TE2',
  extraNocturna: 'TE2.5',
  asuetoDiurna: 'TE2_H',
  asuetoNocturna: 'TE2.5_H',
  asuetoExtraDiurna: 'TE4.0',
  asuetoExtraNocturna: 'TE5.0',
  descansoLaboradoDiurna: 'LIBRE',
  descansoLaboradoNocturna: 'LIBRE + P0.25',
};

/**
 * Porcentaje TOTAL que se paga por la hora (lo que cubre el salario + el
 * recargo, o el pago completo). Ej.: ordinaria nocturna 125 %, extra nocturna
 * 250 %, asueto nocturno 250 %, extra en asueto nocturna 500 %.
 */
export function porcentajeTotal(regla: Pick<ReglaPago, 'modo' | 'factor'>): number {
  const total = regla.modo === 'completo' ? regla.factor : 1 + regla.factor;
  return Math.round(total * 100);
}
