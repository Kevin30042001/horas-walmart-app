function clonarFecha(f: Date): Date {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

function sumarDias(f: Date, dias: number): Date {
  const d = clonarFecha(f);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatoFechaLocal(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Si el dia deseado no existe en el mes (ej. 30 de febrero), usa el ultimo dia disponible. */
function diaValidoDelMes(anio: number, mesIndiceCero: number, diaDeseado: number): Date {
  const ultimoDiaDelMes = new Date(anio, mesIndiceCero + 1, 0).getDate();
  return new Date(anio, mesIndiceCero, Math.min(diaDeseado, ultimoDiaDelMes));
}

export interface ReglaCorte {
  /** Dias del mes en que normalmente cae el corte, ej. [14, 28]. */
  diasDeCorte: number[];
  /** Dias habiles/calendario entre el corte y el pago. */
  diasHastaPago: number;
}

export interface PeriodoCorteGenerado {
  fechaInicio: string;
  fechaCorte: string;
  fechaPago: string;
}

/**
 * Genera periodos de corte consecutivos entre `desde` y `hasta` siguiendo una
 * REGLA BASE repetitiva (p.ej. corte los dias 14 y 28). Walmart no siempre
 * corta exacto esos dias (fines de semana, feriados, cierres contables), asi
 * que esto es solo el punto de partida: cada fila generada queda como un
 * registro normal en la tabla `cortes` que el usuario puede mover a mano sin
 * romper el resto del calendario.
 */
export function generarCortes(desde: Date, hasta: Date, regla: ReglaCorte): PeriodoCorteGenerado[] {
  const diasOrdenados = [...regla.diasDeCorte].sort((a, b) => a - b);
  const periodos: PeriodoCorteGenerado[] = [];

  let cursor = clonarFecha(desde);
  let inicioPeriodo = sumarDias(cursor, 1);

  // Tope de seguridad (24 "saltos de mes" buscando el siguiente corte) para
  // nunca quedar en un bucle infinito si la regla viene mal configurada.
  for (let guardia = 0; guardia < 10_000; guardia++) {
    let siguienteCorte: Date | null = null;
    let mesCandidato = clonarFecha(cursor);

    for (let intentosDeMes = 0; intentosDeMes < 24 && !siguienteCorte; intentosDeMes++) {
      for (const dia of diasOrdenados) {
        const candidato = diaValidoDelMes(mesCandidato.getFullYear(), mesCandidato.getMonth(), dia);
        if (candidato.getTime() > cursor.getTime()) {
          siguienteCorte = candidato;
          break;
        }
      }
      if (!siguienteCorte) {
        mesCandidato = new Date(mesCandidato.getFullYear(), mesCandidato.getMonth() + 1, 1);
      }
    }

    if (!siguienteCorte || siguienteCorte.getTime() > hasta.getTime()) break;

    periodos.push({
      fechaInicio: formatoFechaLocal(inicioPeriodo),
      fechaCorte: formatoFechaLocal(siguienteCorte),
      fechaPago: formatoFechaLocal(sumarDias(siguienteCorte, regla.diasHastaPago)),
    });

    cursor = siguienteCorte;
    inicioPeriodo = sumarDias(siguienteCorte, 1);
  }

  return periodos;
}
