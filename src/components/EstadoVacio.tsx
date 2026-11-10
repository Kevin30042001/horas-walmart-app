import type { ReactNode } from 'react';

interface Props {
  icono: ReactNode;
  titulo: string;
  texto: string;
  accion?: ReactNode;
}

/** Estado vacio con guia: dice que falta y como resolverlo. */
export default function EstadoVacio({ icono, titulo, texto, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="rounded-3xl bg-acento/12 p-4 text-acentotx">{icono}</div>
      <h2 className="font-display text-lg font-semibold">{titulo}</h2>
      <p className="max-w-xs text-sm text-tenue">{texto}</p>
      {accion}
    </div>
  );
}
