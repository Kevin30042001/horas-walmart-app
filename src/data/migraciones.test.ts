import { describe, expect, it } from 'vitest';
import { migrarHorarioV1, recesoMinutosAVentana } from './migraciones';
import { HORARIO_DESPACHO } from '../domain/horario/horarioReal';

describe('migracion de horarios v1 -> v2', () => {
  it('Despacho sin editar se reemplaza por el horario real', () => {
    const v1 = [0, 1, 2, 3, 4, 5].map((d) => ({ diaSemana: d, horaEntrada: '20:00', horaSalida: '04:00', recesoMin: 60 }));
    const r = migrarHorarioV1('DESPACHO', v1);
    expect(r.editadoAMano).toBe(false);
    expect(r.horario).toEqual(HORARIO_DESPACHO);
  });

  it('Despacho editado a mano se conserva y se marca para preguntar', () => {
    const v1 = [{ diaSemana: 1, horaEntrada: '22:00', horaSalida: '06:00', recesoMin: 60 }];
    const r = migrarHorarioV1('DESPACHO', v1);
    expect(r.editadoAMano).toBe(true);
    expect(r.horario[0]!.horaEntrada).toBe('22:00');
    expect(r.horario[0]!.receso).toEqual({ inicio: '01:30', fin: '02:30' });
  });

  it('un turno propio solo convierte el receso, sin marcar pendiente', () => {
    const r = migrarHorarioV1('MIXTO', [{ diaSemana: 2, horaEntrada: '08:00', horaSalida: '17:00', recesoMin: 0 }]);
    expect(r.editadoAMano).toBe(false);
    expect(r.horario[0]!.receso).toBeNull();
  });

  it('receso en minutos se centra en la mitad del turno', () => {
    expect(recesoMinutosAVentana({ diaSemana: 1, horaEntrada: '10:00', horaSalida: '19:00', recesoMin: 30 })).toEqual({
      inicio: '14:15',
      fin: '14:45',
    });
  });
});
