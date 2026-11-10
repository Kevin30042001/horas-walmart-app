import type { DesgloseMinutos, ParametrosTurno } from '../tipos';

export interface JornadaParaTope {
  fecha: string;
  desgloseMinutos: DesgloseMinutos;
  turno: ParametrosTurno;
}

export interface ExcesoSemanal {
  claveSemana: string;
  turnoNombre: string;
  inicioSemana: string;
  totalOrdinarioMin: number;
  capMin: number;
  excesoMin: number;
}

/**
 * Parsea un string "yyyy-MM-dd" como fecha LOCAL (no UTC).
 *
 * OJO: `new Date('2026-01-04')` lo interpreta Javascript como medianoche UTC,
 * asi que en cualquier zona con offset negativo (como America/El_Salvador,
 * UTC-6) ese dia "se corre" un dia hacia atras al leer getDay()/getDate() en
 * hora local -- un domingo se lee como sabado. Por eso NUNCA se usa
 * `new Date(stringFecha)` directo en este dominio; siempre se parsea asi.
 */
function parsearFechaLocal(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio!, mes! - 1, dia!);
}

function formatoFechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function inicioDeSemanaDelTurno(fecha: Date, diaInicioSemana: number): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const diferenciaDias = (d.getDay() - diaInicioSemana + 7) % 7;
  d.setDate(d.getDate() - diferenciaDias);
  return d;
}

/**
 * Agrupa jornadas por (turno + semana propia de ese turno) y calcula el
 * exceso sobre el tope semanal legal (44h Recibo / 39h Despacho por defecto).
 *
 * Al agrupar por turno (no solo por semana calendario), un cambio de turno a
 * mitad de corte NO mezcla los topes: los dias bajo Despacho acumulan contra
 * 39h y los dias bajo Recibo contra 44h, cada bloque por separado, aunque
 * ambos caigan dentro del mismo corte de pago.
 *
 * Esto se entrega como informacion/alerta (Dashboard), no reescribe
 * automaticamente el desglose de minutos de `calcularJornada`: la decision de
 * si el exceso semanal se re-paga como extra es administrativa, no del motor.
 */
export function calcularExcesoSemanal(jornadas: JornadaParaTope[]): ExcesoSemanal[] {
  const grupos = new Map<string, JornadaParaTope[]>();

  for (const jornada of jornadas) {
    const inicioSemana = inicioDeSemanaDelTurno(parsearFechaLocal(jornada.fecha), jornada.turno.diaInicioSemana);
    const clave = `${jornada.turno.nombre}__${formatoFechaLocal(inicioSemana)}`;
    const grupo = grupos.get(clave) ?? [];
    grupo.push(jornada);
    grupos.set(clave, grupo);
  }

  const resultado: ExcesoSemanal[] = [];
  for (const [clave, grupo] of grupos) {
    const primero = grupo[0]!;
    const capMin = primero.turno.horasSemanales * 60;
    const totalOrdinarioMin = grupo.reduce(
      (acc, j) => acc + j.desgloseMinutos.ordinariaDiurna + j.desgloseMinutos.ordinariaNocturna,
      0
    );
    const inicioSemana = inicioDeSemanaDelTurno(parsearFechaLocal(primero.fecha), primero.turno.diaInicioSemana);

    resultado.push({
      claveSemana: clave,
      turnoNombre: primero.turno.nombre,
      inicioSemana: formatoFechaLocal(inicioSemana),
      totalOrdinarioMin,
      capMin,
      excesoMin: Math.max(0, totalOrdinarioMin - capMin),
    });
  }

  return resultado.sort((a, b) => a.inicioSemana.localeCompare(b.inicioSemana));
}
