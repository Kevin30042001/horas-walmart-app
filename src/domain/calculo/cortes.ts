function formatoFechaLocal(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Si el dia deseado no existe en el mes (ej. 30 de febrero), usa el ultimo dia disponible. */
function diaValidoDelMes(anio: number, mesIndiceCero: number, diaDeseado: number): Date {
  const ultimoDiaDelMes = new Date(anio, mesIndiceCero + 1, 0).getDate();
  return new Date(anio, mesIndiceCero, Math.min(diaDeseado, ultimoDiaDelMes));
}

/** Cortes por dia del mes (ej. corta el 4 y el 19). */
export interface ReglaCortePorDia {
  tipo?: 'diaDelMes';
  /**
   * Cortes de cada mes: el periodo TERMINA el `diaCorte` y se paga el
   * `diaPago` (del mismo mes si es despues del corte, si no del mes siguiente).
   * El periodo empieza el dia siguiente al corte anterior.
   */
  cortes: { diaCorte: number; diaPago: number }[];
}

/**
 * Cortes de duracion fija (como los explico RRHH): cada corte dura
 * `duracionDias` (15) y el siguiente empieza al dia siguiente, asi que las
 * fechas se van corriendo (5-19, 20-3 si el mes tiene 31 dias, 4-18...).
 * Se paga el siguiente dia de pago (14 o 28) que quede al menos
 * `diasMinimosAntesDePago` dias despues del corte.
 */
export interface ReglaCorteDuracion {
  tipo: 'duracion';
  /** Un dia en que empezo un corte real (yyyy-MM-dd); los demas se encadenan desde ahi. */
  inicioReferencia: string;
  duracionDias: number;
  diasPago: number[];
  diasMinimosAntesDePago: number;
}

export type ReglaCorte = ReglaCortePorDia | ReglaCorteDuracion;

/** Regla por defecto: cortes de 15 dias desde el 5 de octubre de 2026, pagos 14 y 28. */
export const REGLA_CORTES_15_DIAS: ReglaCorteDuracion = {
  tipo: 'duracion',
  inicioReferencia: '2026-10-05',
  duracionDias: 15,
  diasPago: [14, 28],
  diasMinimosAntesDePago: 7,
};

/**
 * Calendario de Walmart: pagos los 14 y 28. El pago del 14 cubre del 20 del
 * mes anterior al 4; el del 28, del 5 al 19. Los dias de corte pueden variar
 * un poco (17-19 / 4-6): por eso es editable y cada corte se ajusta a mano.
 */
export const REGLA_CORTES_WALMART: ReglaCortePorDia = {
  cortes: [
    { diaCorte: 4, diaPago: 14 },
    { diaCorte: 19, diaPago: 28 },
  ],
};

export interface PeriodoCorteGenerado {
  fechaInicio: string;
  fechaCorte: string;
  fechaPago: string;
}

/**
 * Genera los periodos de corte que se cruzan con [desde, hasta] segun la
 * regla. Es el punto de partida: cada corte queda como fila editable.
 */
export function generarCortes(desde: Date, hasta: Date, regla: ReglaCorte): PeriodoCorteGenerado[] {
  return regla.tipo === 'duracion' ? generarPorDuracion(desde, hasta, regla) : generarPorDiaDelMes(desde, hasta, regla);
}

/** Primer dia de pago (ej. 14 o 28) en o despues de `desde`. */
function siguienteDiaDePago(desde: Date, diasPago: number[]): Date {
  const dias = [...diasPago].sort((a, b) => a - b);
  for (let m = 0; m < 3; m++) {
    for (const dia of dias) {
      const candidato = diaValidoDelMes(desde.getFullYear(), desde.getMonth() + m, dia);
      if (candidato.getTime() >= desde.getTime()) return candidato;
    }
  }
  return desde;
}

function generarPorDuracion(desde: Date, hasta: Date, regla: ReglaCorteDuracion): PeriodoCorteGenerado[] {
  const [a, m, d] = regla.inicioReferencia.split('-').map(Number);
  const referencia = new Date(a!, m! - 1, d!);
  const dur = Math.max(1, Math.round(regla.duracionDias));
  const inicioRango = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const finRango = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());

  // Cuantos cortes atras/adelante de la referencia esta `desde` (con fechas locales, sin horas).
  const diasDesdeReferencia = Math.round((inicioRango.getTime() - referencia.getTime()) / 86_400_000);
  let n = Math.floor(diasDesdeReferencia / dur);
  const periodos: PeriodoCorteGenerado[] = [];
  for (let guardia = 0; guardia < 2000; guardia++, n++) {
    const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() + n * dur);
    const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + dur - 1);
    if (inicio.getTime() > finRango.getTime()) break;
    if (fin.getTime() < inicioRango.getTime()) continue;
    const minimoPago = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() + regla.diasMinimosAntesDePago);
    periodos.push({
      fechaInicio: formatoFechaLocal(inicio),
      fechaCorte: formatoFechaLocal(fin),
      fechaPago: formatoFechaLocal(siguienteDiaDePago(minimoPago, regla.diasPago)),
    });
  }
  return periodos;
}

function generarPorDiaDelMes(desde: Date, hasta: Date, regla: ReglaCortePorDia): PeriodoCorteGenerado[] {
  const reglas = [...regla.cortes].sort((a, b) => a.diaCorte - b.diaCorte);
  if (reglas.length === 0) return [];

  // Lista de fechas de corte (con su regla) desde un mes antes hasta un mes despues del rango.
  const cortes: { fecha: Date; diaPago: number; diaCorte: number }[] = [];
  for (let m = new Date(desde.getFullYear(), desde.getMonth() - 1, 1); m <= new Date(hasta.getFullYear(), hasta.getMonth() + 2, 1); m.setMonth(m.getMonth() + 1)) {
    for (const r of reglas) cortes.push({ fecha: diaValidoDelMes(m.getFullYear(), m.getMonth(), r.diaCorte), ...r });
  }
  cortes.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const inicioRango = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
  const finRango = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()).getTime();
  const periodos: PeriodoCorteGenerado[] = [];
  for (let i = 1; i < cortes.length; i++) {
    const anterior = cortes[i - 1]!.fecha;
    const { fecha: fin, diaPago, diaCorte } = cortes[i]!;
    const inicio = new Date(anterior.getFullYear(), anterior.getMonth(), anterior.getDate() + 1);
    if (fin.getTime() < inicioRango || inicio.getTime() > finRango) continue;
    const mesPago = diaPago > diaCorte ? fin.getMonth() : fin.getMonth() + 1;
    const pago = diaValidoDelMes(fin.getFullYear(), mesPago, diaPago);
    periodos.push({ fechaInicio: formatoFechaLocal(inicio), fechaCorte: formatoFechaLocal(fin), fechaPago: formatoFechaLocal(pago) });
  }
  return periodos;
}

/**
 * Corte de "Tu proximo pago": el de fecha de pago mas cercana desde hoy
 * (incluido). Ej.: el 10/11 es el corte 20/10-04/11 que se paga el 14/11,
 * aunque hoy ya este corriendo el corte 05/11-19/11.
 */
export function elegirCorteDelProximoPago<T extends { fechaPago: string; fechaInicio: string }>(cortes: T[], hoy: string): T | undefined {
  const ordenados = [...cortes].sort((a, b) => a.fechaPago.localeCompare(b.fechaPago));
  return ordenados.find((c) => c.fechaPago >= hoy) ?? ordenados.at(-1);
}
