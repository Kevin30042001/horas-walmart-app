import { describe, expect, it } from 'vitest';
import { calcularDeducciones, calcularIsrPorTabla, calcularPorcentajeConTope } from './deducciones';
import type { ReglaDeduccion } from '../tipos';

describe('calcularPorcentajeConTope', () => {
  it('aplica el porcentaje sobre el monto completo si no hay tope', () => {
    expect(calcularPorcentajeConTope(321, 3, null)).toBeCloseTo(9.63, 2);
  });

  it('respeta el tope de cotizacion cuando el monto lo supera', () => {
    expect(calcularPorcentajeConTope(2000, 3, 1000)).toBeCloseTo(30, 2);
  });
});

describe('calcularIsrPorTabla', () => {
  const tramos: ReglaDeduccion['tramosIsr'] = [
    { desde: 0, hasta: 261.9, cuotaFija: 0, porcentajeExceso: 0 },
    { desde: 261.91, hasta: 915.81, cuotaFija: 0, porcentajeExceso: 10 },
    { desde: 915.82, hasta: null, cuotaFija: 65.39, porcentajeExceso: 20 },
  ];

  it('no retiene nada dentro del tramo exento', () => {
    expect(calcularIsrPorTabla(200, tramos)).toBe(0);
  });

  it('calcula cuota fija + porcentaje sobre el excedente en un tramo intermedio', () => {
    const resultado = calcularIsrPorTabla(500, tramos);
    expect(resultado).toBeCloseTo((500 - 261.91) * 0.1, 2);
  });

  it('retorna 0 si no hay tabla configurada', () => {
    expect(calcularIsrPorTabla(500, null)).toBe(0);
  });
});

describe('calcularDeducciones', () => {
  it('ignora las reglas inactivas y suma solo las activas', () => {
    const reglas: ReglaDeduccion[] = [
      { nombre: 'ISSS', tipo: 'porcentaje', valorPorcentaje: 3, tramosIsr: null, tope: 1000, activo: true },
      { nombre: 'AFP Confia', tipo: 'porcentaje', valorPorcentaje: 7.25, tramosIsr: null, tope: null, activo: true },
      { nombre: 'Impuesto de Renta', tipo: 'tabla', valorPorcentaje: null, tramosIsr: null, tope: null, activo: false },
    ];
    const { detalle, totalDeducciones } = calcularDeducciones(321, reglas);
    expect(detalle).toHaveLength(2);
    expect(detalle.find((d) => d.nombre === 'Impuesto de Renta')).toBeUndefined();
    expect(totalDeducciones).toBeGreaterThan(0);
  });
});
