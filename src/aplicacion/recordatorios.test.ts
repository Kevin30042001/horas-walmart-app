import { describe, expect, it } from 'vitest';
import { planificarRecordatorios, RECORDATORIOS_DEFECTO, type EntradaPlan } from './recordatorios';
import { HORARIO_DESPACHO } from '../domain/horario/horarioReal';

const hora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const horarioDe = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a!, m! - 1, d!).getDay();
  return HORARIO_DESPACHO.find((h) => h.diaSemana === dia) ?? null;
};

const base: EntradaPlan = {
  ahora: new Date(2026, 0, 5, 12), // lunes mediodia
  dias: 2,
  config: { ...RECORDATORIOS_DEFECTO, activos: true },
  horarioDe,
  fechasConEntrada: new Set(),
  fechasConSalida: new Set(),
  jornadaAbierta: null,
  horasMaxJornadaAbierta: 16,
  hora,
};

describe('recordatorios locales', () => {
  it('desactivados: no programa nada', () => {
    expect(planificarRecordatorios({ ...base, config: RECORDATORIOS_DEFECTO })).toHaveLength(0);
  });

  it('15 min antes de la entrada (lunes 21:00 -> 20:45) y 20 min despues de la salida (03:00 -> 03:20)', () => {
    const r = planificarRecordatorios(base);
    expect(r[0]!.en).toEqual(new Date(2026, 0, 5, 20, 45));
    expect(r[0]!.cuerpo).toContain('21:00');
    expect(r[1]!.en).toEqual(new Date(2026, 0, 6, 3, 20));
  });

  it('si ya marque la entrada, no recuerda la entrada de ese dia', () => {
    const r = planificarRecordatorios({ ...base, ahora: new Date(2026, 0, 5, 20, 50), fechasConEntrada: new Set(['2026-01-05']) });
    expect(r.some((x) => x.titulo.includes('empieza') && x.en.getDate() === 5)).toBe(false);
    expect(r.some((x) => x.titulo.includes('salida'))).toBe(true);
  });

  it('el sabado de Despacho (libre) no genera recordatorios', () => {
    const r = planificarRecordatorios({ ...base, ahora: new Date(2026, 0, 10, 8), dias: 1 });
    expect(r.filter((x) => x.en.getDate() === 10)).toHaveLength(0);
  });

  it('jornada abierta: aviso 1 h antes de que deje de considerarse abierta', () => {
    const r = planificarRecordatorios({
      ...base,
      dias: 0,
      jornadaAbierta: { fecha: '2026-01-05', entrada: new Date(2026, 0, 5, 8) },
    });
    expect(r.find((x) => x.titulo === 'Jornada sin salida')!.en).toEqual(new Date(2026, 0, 5, 23));
  });

  it('ids estables por fecha y tipo (para reemplazar sin duplicar)', () => {
    const r = planificarRecordatorios(base);
    expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
    expect(r[0]!.id).toBe(202601051);
  });
});
