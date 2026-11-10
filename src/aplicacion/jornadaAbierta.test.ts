import { describe, expect, it } from 'vitest';
import { encontrarJornadaAbierta, fechaParaNuevaMarca } from './jornadaAbierta';
import { siguienteAccion } from './estadoDelDia';
import { resolverReceso } from '../domain/calculo/receso';
import { calcularJornada } from '../domain/calculo/motor';
import type { RegistroRow } from '../data/db';

function f(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 0, dia, hora, minuto, 0, 0);
}

function marca(fecha: string, tipoEvento: RegistroRow['tipoEvento'], horaReal: Date): RegistroRow {
  return {
    fecha,
    turnoId: 1,
    tipoEvento,
    horaReal,
    horaPlanificada: null,
    origen: 'manual',
    nota: '',
    fotoId: null,
    confirmadoPorUsuario: true,
  };
}

describe('jornada abierta (turno nocturno que cruza la medianoche)', () => {
  const entradaLunes = marca('2026-01-05', 'entrada', f(5, 21));

  it('despues de medianoche, la marca sigue perteneciendo a la jornada del LUNES', () => {
    expect(encontrarJornadaAbierta([entradaLunes], f(6, 0, 5))).toBe('2026-01-05');
    expect(fechaParaNuevaMarca([entradaLunes], f(6, 0, 5))).toBe('2026-01-05');
  });

  it('una entrada de hace mas de 16 h ya no se considera abierta', () => {
    expect(encontrarJornadaAbierta([entradaLunes], f(6, 14))).toBeNull();
    expect(fechaParaNuevaMarca([entradaLunes], f(6, 14))).toBe('2026-01-06');
  });

  it('una jornada con salida ya no esta abierta', () => {
    const salida = marca('2026-01-05', 'salida', f(6, 3));
    expect(encontrarJornadaAbierta([entradaLunes, salida], f(6, 3, 30))).toBeNull();
  });

  it('a las 00:05 del martes NO pide "Marcar entrada" otra vez', () => {
    const estado = siguienteAccion([entradaLunes], { tieneReceso: true });
    expect(estado.principal).not.toBe('entrada');
  });

  it('caso completo: lunes 21:00 -> receso 00:00-01:00 -> salida 03:00 = una jornada del lunes con 5 h', () => {
    const registros: RegistroRow[] = [entradaLunes];
    for (const [tipo, hora] of [
      ['inicioReceso', f(6, 0)],
      ['finReceso', f(6, 1)],
      ['salida', f(6, 3)],
    ] as const) {
      registros.push(marca(fechaParaNuevaMarca(registros, hora), tipo, hora));
    }
    expect(new Set(registros.map((r) => r.fecha))).toEqual(new Set(['2026-01-05']));

    const r = calcularJornada({
      fecha: '2026-01-05',
      entrada: f(5, 21),
      salida: f(6, 3),
      receso: { inicio: f(6, 0), fin: f(6, 1) },
      turno: { nombre: 'DESPACHO', horasSemanales: 39, diaInicioSemana: 0 },
    });
    expect(r.totalMinutosTrabajados).toBe(300);
  });
});

describe('siguienteAccion: el receso es opcional', () => {
  const entrada = marca('2026-01-10', 'entrada', f(10, 14));

  it('sabado de Recibo (sin receso): solo sugiere salida, nunca receso', () => {
    const estado = siguienteAccion([entrada], { tieneReceso: false });
    expect(estado.principal).toBe('salida');
    expect(estado.secundarias).not.toContain('inicioReceso');
  });

  it('con receso en el horario: "Marcar salida" siempre esta disponible', () => {
    const estado = siguienteAccion([entrada], { tieneReceso: true });
    expect([estado.principal, ...estado.secundarias]).toContain('salida');
    expect([estado.principal, ...estado.secundarias]).toContain('inicioReceso');
  });

  it('cerca de la hora del receso programado, el receso pasa a ser la accion principal', () => {
    const estado = siguienteAccion([entrada], {
      tieneReceso: true,
      recesoProgramado: { inicio: f(10, 16), fin: f(10, 17) },
      ahora: f(10, 15, 55),
    });
    expect(estado.principal).toBe('inicioReceso');
    expect(estado.secundarias).toContain('salida');
  });

  it('en receso: principal terminar receso, y salida sigue disponible', () => {
    const estado = siguienteAccion([entrada, marca('2026-01-10', 'inicioReceso', f(10, 16))], { tieneReceso: true });
    expect(estado.principal).toBe('finReceso');
    expect(estado.secundarias).toContain('salida');
  });

  it('con salida marcada la jornada esta completa', () => {
    const estado = siguienteAccion([entrada, marca('2026-01-10', 'salida', f(10, 18))], { tieneReceso: false });
    expect(estado.principal).toBeNull();
  });
});

describe('resolverReceso: receso asumido', () => {
  it('si no marque el receso pero el horario lo tiene, se descuenta la ventana programada', () => {
    const r = resolverReceso(null, { inicio: f(6, 0), fin: f(6, 1) }, f(5, 21), f(6, 3));
    expect(r.asumido).toBe(true);
    expect(r.receso).toEqual({ inicio: f(6, 0), fin: f(6, 1) });
  });

  it('si marque el receso, se usa el real', () => {
    const real = { inicio: f(6, 0, 10), fin: f(6, 1, 5) };
    const r = resolverReceso(real, { inicio: f(6, 0), fin: f(6, 1) }, f(5, 21), f(6, 3));
    expect(r).toEqual({ receso: real, asumido: false });
  });

  it('si sali antes del receso programado, no se descuenta nada', () => {
    const r = resolverReceso(null, { inicio: f(6, 0), fin: f(6, 1) }, f(5, 21), f(5, 23, 30));
    expect(r).toEqual({ receso: null, asumido: false });
  });

  it('si sali a mitad del receso programado, solo se descuenta la parte trabajada', () => {
    const r = resolverReceso(null, { inicio: f(6, 0), fin: f(6, 1) }, f(5, 21), f(6, 0, 30));
    expect(r.receso).toEqual({ inicio: f(6, 0), fin: f(6, 0, 30) });
  });

  it('sin receso en el horario y sin marcar: nada', () => {
    expect(resolverReceso(null, null, f(10, 14), f(10, 18))).toEqual({ receso: null, asumido: false });
  });
});
