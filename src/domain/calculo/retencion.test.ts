import { describe, expect, it } from 'vitest';
import { filtrarCandidatosAPurgar } from './retencion';

describe('filtrarCandidatosAPurgar', () => {
  const hoy = '2026-06-30';

  it('excluye jornadas protegidas sin importar que tan viejas sean', () => {
    const jornadas = [{ id: 1, fecha: '2026-01-01', protegida: true }];
    expect(filtrarCandidatosAPurgar(jornadas, 60, hoy)).toHaveLength(0);
  });

  it('excluye jornadas dentro del periodo de retencion', () => {
    const jornadas = [{ id: 1, fecha: '2026-06-15', protegida: false }]; // hace 15 dias
    expect(filtrarCandidatosAPurgar(jornadas, 60, hoy)).toHaveLength(0);
  });

  it('incluye jornadas no protegidas mas viejas que el limite', () => {
    const jornadas = [{ id: 1, fecha: '2026-01-01', protegida: false }]; // hace ~180 dias
    expect(filtrarCandidatosAPurgar(jornadas, 60, hoy)).toHaveLength(1);
  });
});
