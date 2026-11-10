import type { TipoHora } from '../domain/tipos';

/** Nombres legibles para mostrar en UI y exportadores (presentacion, no dominio). */
export const NOMBRE_TIPO_HORA: Record<TipoHora, string> = {
  ordinariaDiurna: 'Ordinaria diurna',
  ordinariaNocturna: 'Ordinaria nocturna (recargo 25%)',
  extraDiurna: 'Extra diurna (100%)',
  extraNocturna: 'Extra nocturna',
  asuetoDiurna: 'Asueto diurna',
  asuetoNocturna: 'Asueto nocturna',
  asuetoExtraDiurna: 'Asueto extra diurna',
  asuetoExtraNocturna: 'Asueto extra nocturna',
  descansoLaboradoDiurna: 'Descanso laborado diurna',
  descansoLaboradoNocturna: 'Descanso laborado nocturna',
};
