/**
 * Retencion de datos: decide que jornadas son candidatas a purgarse segun los
 * dias de retencion configurados. Logica pura y testeable -- la ejecucion
 * real (borrar de Dexie, archivar resumenes) vive en la capa de aplicacion.
 */
export interface JornadaParaRetencion {
  id: number;
  fecha: string; // yyyy-MM-dd
  protegida: boolean;
  corteId?: number | null;
}

function restarDiasIso(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(anio!, mes! - 1, dia!);
  fecha.setDate(fecha.getDate() - dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/**
 * Una jornada es candidata a purgarse si NO esta protegida y su fecha es
 * anterior al limite (hoy - diasRetencion).
 */
export function filtrarCandidatosAPurgar(
  jornadas: JornadaParaRetencion[],
  diasRetencion: number,
  hoyIso: string,
  cortesProtegidos: number[] = []
): JornadaParaRetencion[] {
  const limite = restarDiasIso(hoyIso, diasRetencion);
  const protegidos = new Set(cortesProtegidos);
  return jornadas.filter(
    (j) => !j.protegida && !(j.corteId != null && protegidos.has(j.corteId)) && j.fecha < limite
  );
}

export const DIAS_AVISO_LIMPIEZA = 7;

export interface DecisionLimpieza {
  /** 'avisar' = mostrar aviso (y ofrecer respaldo ZIP); 'limpiar' = ya se aviso hace 7+ dias. */
  accion: 'nada' | 'avisar' | 'limpiar';
  /** Jornadas que ya pasaron la retencion. */
  candidatos: JornadaParaRetencion[];
  /** Jornadas que se limpiaran en los proximos 7 dias (incluye los candidatos). */
  proximos: JornadaParaRetencion[];
}

function diasEntre(desdeIso: string, hastaIso: string): number {
  const a = new Date(desdeIso + 'T00:00:00').getTime();
  const b = new Date(hastaIso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Limpieza automatica con aviso previo:
 *  - 7 dias antes de que una jornada pase la retencion, se avisa (y se
 *    ofrece exportar el respaldo ZIP).
 *  - Solo se limpia sola si el aviso se mostro hace 7 dias o mas; si la app
 *    no se abrio durante ese tiempo, primero se avisa (nunca se borra sin aviso).
 *  - Los dias y cortes protegidos nunca se borran.
 */
export function decidirLimpieza(params: {
  jornadas: JornadaParaRetencion[];
  diasRetencion: number;
  hoyIso: string;
  cortesProtegidos?: number[];
  /** Fecha (yyyy-MM-dd) en que se mostro el aviso por primera vez, o null. */
  avisoDesde: string | null;
}): DecisionLimpieza {
  const { jornadas, diasRetencion, hoyIso, cortesProtegidos = [], avisoDesde } = params;
  const candidatos = filtrarCandidatosAPurgar(jornadas, diasRetencion, hoyIso, cortesProtegidos);
  const proximos = filtrarCandidatosAPurgar(jornadas, Math.max(0, diasRetencion - DIAS_AVISO_LIMPIEZA), hoyIso, cortesProtegidos);
  if (proximos.length === 0) return { accion: 'nada', candidatos, proximos };
  if (candidatos.length > 0 && avisoDesde && diasEntre(avisoDesde, hoyIso) >= DIAS_AVISO_LIMPIEZA) {
    return { accion: 'limpiar', candidatos, proximos };
  }
  return { accion: 'avisar', candidatos, proximos };
}
