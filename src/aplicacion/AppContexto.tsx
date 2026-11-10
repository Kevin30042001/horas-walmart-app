import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PerfilRow, TurnoRow } from '../data/db';
import { obtenerPerfil, obtenerTurnoActivo } from '../data/repos/perfilRepo';
import { formatoHora } from '../utils/fecha';

interface ValorContexto {
  perfil: PerfilRow | null;
  turnoActivo: TurnoRow | null;
  /** Cambia cada vez que algo se guarda: las pantallas lo usan para recargar. */
  version: number;
  refrescar: () => void;
  hora: (d: Date) => string;
}

const Contexto = createContext<ValorContexto | null>(null);

/** Aplica tema (claro/oscuro/auto) y el color del turno activo a toda la app. */
function aplicarTema(perfil: PerfilRow | null, turno: TurnoRow | null): void {
  const raiz = document.documentElement;
  const prefiereOscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const tema = perfil?.tema ?? 'oscuro';
  const oscuro = tema === 'oscuro' || (tema === 'auto' && prefiereOscuro);
  raiz.classList.toggle('dark', oscuro);
  raiz.dataset.turno = turno?.tipoBase === 'DIURNO' ? 'diurno' : 'nocturno';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0a0b12' : '#f6f5f2');
}

export function AppProveedor({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [turnoActivo, setTurnoActivo] = useState<TurnoRow | null>(null);
  const [version, setVersion] = useState(0);

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    void (async () => {
      const [p, t] = await Promise.all([obtenerPerfil(), obtenerTurnoActivo()]);
      setPerfil(p);
      setTurnoActivo(t ?? null);
      aplicarTema(p, t ?? null);
    })();
  }, [version]);

  const hora = useCallback((d: Date) => formatoHora(d, perfil?.formato24h ?? true), [perfil?.formato24h]);

  return <Contexto.Provider value={{ perfil, turnoActivo, version, refrescar, hora }}>{children}</Contexto.Provider>;
}

export function useApp(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp debe usarse dentro de <AppProveedor>');
  return valor;
}
