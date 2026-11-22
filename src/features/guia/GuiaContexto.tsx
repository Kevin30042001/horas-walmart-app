import { createContext, useContext } from 'react';

export interface ValorGuia {
  /** Abre la guia (en un paso concreto, o desde el inicio). */
  abrirGuia: (paso?: number) => void;
}

export const GuiaContexto = createContext<ValorGuia>({ abrirGuia: () => {} });

export function useGuia(): ValorGuia {
  return useContext(GuiaContexto);
}
