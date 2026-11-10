/**
 * Calcula el Domingo de Pascua (algoritmo Meeus/Jones/Butcher, calendario gregoriano).
 * A partir de ahi se derivan los asuetos moviles de Semana Santa en El Salvador.
 */
export function calcularDomingoPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

export interface SemanaSanta {
  juevesSanto: Date;
  viernesSanto: Date;
  sabadoSanto: Date;
}

function restarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() - dias);
  return d;
}

/** Jueves, Viernes y Sabado Santo -- los 3 dias de asueto nacional previos al Domingo de Pascua. */
export function calcularSemanaSanta(anio: number): SemanaSanta {
  const domingoPascua = calcularDomingoPascua(anio);
  return {
    juevesSanto: restarDias(domingoPascua, 3),
    viernesSanto: restarDias(domingoPascua, 2),
    sabadoSanto: restarDias(domingoPascua, 1),
  };
}
