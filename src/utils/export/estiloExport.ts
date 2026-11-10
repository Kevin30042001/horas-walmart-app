import type { JornadaRow } from '../../data/db';
import type { TipoHora } from '../../domain/tipos';
import { CODIGO_WALMART } from '../../domain/calculo/codigos';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { horasDeJornada } from '../../aplicacion/resumenCorte';

/** Paleta de los reportes (la misma de la app). */
export const COLOR = {
  azul: '0071DC',
  azulOscuro: '004C91',
  marino: '041E42',
  amarillo: 'FFC220',
  amarilloSuave: 'FFF4D1',
  azulSuave: 'E8F1FC',
  gris: 'F3F6FA',
  grisBorde: 'D3DEEC',
  tenue: '4A5A75',
  blanco: 'FFFFFF',
  naranja: 'C2410C',
} as const;

export const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(0, 2), 16),
  parseInt(hex.slice(2, 4), 16),
  parseInt(hex.slice(4, 6), 16),
];

/** "TE2.5 Extras 250 % Nocturnas" -> ["TE2.5", "Extras 250 % Nocturnas"]. */
export function separarCodigo(nombreLinea: string): [string, string] {
  const [primero, ...resto] = nombreLinea.split(' ');
  if (primero && /^[A-Z][A-Z0-9._]*$/.test(primero) && resto.length) return [primero, resto.join(' ')];
  return ['', nombreLinea];
}

/** Resumen por codigo de una jornada: "TE2.5 1.18 · TE2.5_H 3.00" (sin las ordinarias). */
export function codigosDeJornada(j: JornadaRow): string {
  const h = horasDeJornada(j);
  return (Object.entries(h) as [TipoHora, number][])
    .filter(([tipo, horas]) => horas > 0 && tipo !== 'ordinariaDiurna' && tipo !== 'ordinariaNocturna')
    .map(([tipo, horas]) => `${CODIGO_WALMART[tipo]} ${horas.toFixed(2)}`)
    .join(' · ');
}

export function totalesJornada(j: JornadaRow) {
  const h = horasDeJornada(j);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    total: r(Object.values(h).reduce((a, b) => a + b, 0)),
    ordinarias: r(h.ordinariaDiurna + h.ordinariaNocturna),
    extras: r(h.extraDiurna + h.extraNocturna),
    asueto: r(h.asuetoDiurna + h.asuetoNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna),
    libre: r(h.descansoLaboradoDiurna + h.descansoLaboradoNocturna),
  };
}

export const horasDeTramo = (minutos: number) => minutosADecimal(minutos);

const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
export function fechaCortaIso(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(a!, m! - 1, d!);
  return `${DIAS[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
}

export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
