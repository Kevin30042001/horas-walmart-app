function formatoFechaLocal(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Si el dia deseado no existe en el mes (ej. 30 de febrero), usa el ultimo dia disponible. */
function diaValidoDelMes(anio: number, mesIndiceCero: number, diaDeseado: number): Date {
  const ultimoDiaDelMes = new Date(anio, mesIndiceCero + 1, 0).getDate();
  return new Date(anio, mesIndiceCero, Math.min(diaDeseado, ultimoDiaDelMes));
}

export interface ReglaCorte {
  /**
   * Cortes de cada mes: el periodo TERMINA el `diaCorte` y se paga el
   * `diaPago` (del mismo mes si es despues del corte, si no del mes siguiente).
   * El periodo empieza el dia siguiente al corte anterior.
   */
  cortes: { diaCorte: number; diaPago: number }[];
}

/**
 * Calendario de Walmart: pagos los 14 y 28. El pago del 14 cubre del 20 del
 * mes anterior al 4; el del 28, del 5 al 19. Los dias de corte pueden variar
 * un poco (17-19 / 4-6): por eso es editable y cada corte se ajusta a mano.
 */
export const REGLA_CORTES_WALMART: ReglaCorte = {
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
