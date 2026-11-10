import { describe, expect, it } from 'vitest';
import { decidirLimpieza, filtrarCandidatosAPurgar } from './retencion';

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

describe('limpieza automatica con aviso de 7 dias', () => {
  const hoy = '2026-06-30';
  const vieja = { id: 1, fecha: '2026-04-20', protegida: false, corteId: 5 }; // 71 dias
  const casi = { id: 2, fecha: '2026-05-05', protegida: false, corteId: 6 }; // 56 dias: se limpia en 4

  it('sin nada cerca de la retencion: no hace nada', () => {
    const r = decidirLimpieza({ jornadas: [{ id: 3, fecha: '2026-06-20', protegida: false }], diasRetencion: 60, hoyIso: hoy, avisoDesde: null });
    expect(r.accion).toBe('nada');
  });

  it('7 dias antes: avisa (y ofrece respaldo), no borra', () => {
    const r = decidirLimpieza({ jornadas: [casi], diasRetencion: 60, hoyIso: hoy, avisoDesde: null });
    expect(r.accion).toBe('avisar');
    expect(r.proximos).toHaveLength(1);
    expect(r.candidatos).toHaveLength(0);
  });

  it('nunca borra sin haber avisado antes (app sin abrir por meses)', () => {
    const r = decidirLimpieza({ jornadas: [vieja], diasRetencion: 60, hoyIso: hoy, avisoDesde: null });
    expect(r.accion).toBe('avisar');
  });

  it('si el aviso se mostro hace 7+ dias, limpia', () => {
    const r = decidirLimpieza({ jornadas: [vieja], diasRetencion: 60, hoyIso: hoy, avisoDesde: '2026-06-22' });
    expect(r.accion).toBe('limpiar');
    expect(r.candidatos.map((j) => j.id)).toEqual([1]);
  });

  it('si el aviso es reciente, sigue avisando', () => {
    const r = decidirLimpieza({ jornadas: [vieja], diasRetencion: 60, hoyIso: hoy, avisoDesde: '2026-06-27' });
    expect(r.accion).toBe('avisar');
  });

  it('un corte protegido no se borra', () => {
    const r = decidirLimpieza({ jornadas: [vieja], diasRetencion: 60, hoyIso: hoy, cortesProtegidos: [5], avisoDesde: '2026-06-01' });
    expect(r.accion).toBe('nada');
  });
});
