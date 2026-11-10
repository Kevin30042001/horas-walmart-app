import { describe, expect, it } from 'vitest';
import { calcularProgreso } from './progresoJornada';
import { anclarHorario } from '../domain/horario/ventana';
import { HORARIO_DESPACHO } from '../domain/horario/horarioReal';

const f = (dia: number, h: number, m = 0) => new Date(2026, 0, dia, h, m);
const ventanaLunes = anclarHorario('2026-01-05', HORARIO_DESPACHO[1]!); // 21:00-03:00

describe('progreso en vivo de la jornada', () => {
  it('sin entrada', () => {
    expect(calcularProgreso([], ventanaLunes, f(5, 20)).estado).toBe('sinMarcar');
  });

  it('en receso: el tiempo de receso no cuenta', () => {
    const p = calcularProgreso(
      [
        { tipoEvento: 'entrada', horaReal: f(5, 21) },
        { tipoEvento: 'inicioReceso', horaReal: f(6, 0) },
      ],
      ventanaLunes,
      f(6, 0, 30)
    );
    expect(p.estado).toBe('enReceso');
    expect(p.trabajadoMin).toBe(180);
  });

  it('pasada la salida programada muestra los minutos de extra ("llevas 0:25 de extra")', () => {
    const p = calcularProgreso(
      [
        { tipoEvento: 'entrada', horaReal: f(5, 21) },
        { tipoEvento: 'inicioReceso', horaReal: f(6, 0) },
        { tipoEvento: 'finReceso', horaReal: f(6, 1) },
      ],
      ventanaLunes,
      f(6, 3, 25)
    );
    expect(p.trabajadoMin).toBe(325);
    expect(p.extraMin).toBe(25);
  });

  it('llegar antes de la entrada programada tambien suma extra', () => {
    const p = calcularProgreso([{ tipoEvento: 'entrada', horaReal: f(5, 20, 30) }], ventanaLunes, f(5, 22));
    expect(p.extraMin).toBe(30);
  });
});
