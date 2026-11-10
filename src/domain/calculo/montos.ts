import type { DetalleCalculo, HorasPorTipo, ReglaPago, TipoHora, TramoJornada } from '../tipos';
import { TODOS_LOS_TIPOS_HORA } from '../tipos';
import { minutosADecimal } from '../tiempo/decimal';

const redondear2 = (n: number) => Math.round(n * 100) / 100;

/** hora base = salario mensual / dias / horas-dia. Formula editable (ej. 642 / 30 / 8 = 2.675). */
export function calcularHoraBase(salarioMensual: number, diasMes = 30, horasDia = 8): number {
  if (salarioMensual <= 0) throw new Error('El salario mensual debe ser mayor a cero');
  return salarioMensual / diasMes / horasDia;
}

export function horasVacias(): HorasPorTipo {
  const h = {} as HorasPorTipo;
  for (const t of TODOS_LOS_TIPOS_HORA) h[t] = 0;
  return h;
}

/**
 * Redondeo COMO NOMINA: cada tramo de la jornada se convierte a decimal con la
 * tabla oficial (minutos/60 a 2 decimales) y luego se suman los decimales.
 * Nunca se suman minutos para redondear al final.
 */
export function horasNominaDeTramos(tramos: Pick<TramoJornada, 'minutos' | 'tipoHora'>[]): HorasPorTipo {
  const h = horasVacias();
  for (const t of tramos) h[t.tipoHora] = redondear2(h[t.tipoHora] + minutosADecimal(t.minutos));
  return h;
}

/** Suma las horas-decimal de varias jornadas (cada dia ya redondeado por tramo). */
export function sumarHorasNomina(lista: HorasPorTipo[]): HorasPorTipo {
  const total = horasVacias();
  for (const h of lista) for (const t of TODOS_LOS_TIPOS_HORA) total[t] = redondear2(total[t] + (h[t] ?? 0));
  return total;
}

/** Salario fijo del corte: mensual / 2, o proporcional a los dias del corte (mensual / diasMes x dias). */
export function calcularSalarioCorte(
  salarioMensual: number,
  modo: 'mitad' | 'proporcional',
  diasCorte: number,
  diasMes = 30
): number {
  if (salarioMensual <= 0) return 0;
  return modo === 'mitad' ? redondear2(salarioMensual / 2) : redondear2((salarioMensual / diasMes) * diasCorte);
}

export interface EntradaProyeccion {
  horas: HorasPorTipo;
  horaBase: number;
  reglas: ReglaPago[];
  salarioCorte: number;
}

export interface ProyeccionPago {
  salarioCorte: number;
  lineas: DetalleCalculo[];
  /** Suma de las lineas variables (sin el salario fijo). */
  totalVariable: number;
  bruto: number;
}

/**
 * Proyeccion de pago con la estructura de la boleta:
 *
 *   Bruto = Salario del corte
 *         + Nocturnidad        (h ord. nocturnas x base x 0.25)
 *         + Extras 200 %       (h x base x 2.00)
 *         + Extras 250 %       (h x base x 2.50)
 *         + Recargo asueto     (h x base x 1.00, +0.25 nocturnas)
 *         + Extras en asueto   (h x base x 4.00 / 5.00)
 *         + Dia libre laborado (configurable)
 *
 * Cada linea se redondea a centavos como en la boleta.
 */
export function calcularProyeccionPago({ horas, horaBase, reglas, salarioCorte }: EntradaProyeccion): ProyeccionPago {
  const reglaPorTipo = new Map(reglas.map((r) => [r.tipoHora, r]));
  const lineas: DetalleCalculo[] = [];

  for (const tipoHora of TODOS_LOS_TIPOS_HORA as readonly TipoHora[]) {
    const h = horas[tipoHora] ?? 0;
    if (h <= 0) continue;
    const regla = reglaPorTipo.get(tipoHora);
    if (!regla) throw new Error(`No existe regla de pago configurada para "${tipoHora}"`);
    if (regla.factor <= 0) continue; // ej. ordinaria diurna: ya pagada en el salario
    const monto = redondear2(h * horaBase * regla.factor);
    lineas.push({
      tipoHora,
      nombreLinea: regla.nombreLinea,
      modo: regla.modo,
      horas: h,
      factor: regla.factor,
      articuloLey: regla.articuloLey,
      monto,
      diaCompensatorio: Boolean(regla.diaCompensatorio),
      explicacion: `${h.toFixed(2)} h x ${horaBase.toFixed(3)} x ${regla.factor.toFixed(2)} = ${monto.toFixed(2)}`,
    });
  }

  const totalVariable = redondear2(lineas.reduce((acc, l) => acc + l.monto, 0));
  return { salarioCorte, lineas, totalVariable, bruto: redondear2(salarioCorte + totalVariable) };
}
