import type { TipoHora } from '../domain/tipos';
import { CODIGO_WALMART } from '../domain/calculo/codigos';

/** Chip con el codigo de Walmart (TE2.5, TE2.5_H, TE5.0...) y el % total de la hora. */
export default function ChipCodigo({ tipoHora, porcentaje }: { tipoHora: TipoHora; porcentaje?: number }) {
  const asueto = tipoHora.startsWith('asueto');
  const extra = tipoHora.toLowerCase().includes('extra');
  const estilo = asueto
    ? 'bg-asueto text-sobre-asueto'
    : extra
      ? 'bg-aviso/15 text-aviso'
      : tipoHora.startsWith('descanso')
        ? 'bg-exito/15 text-exito'
        : 'bg-acento/12 text-acentotx';
  return (
    <span className={`num inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${estilo}`}>
      {CODIGO_WALMART[tipoHora]}
      {porcentaje !== undefined && <span className="font-semibold opacity-80">{porcentaje} %</span>}
    </span>
  );
}
