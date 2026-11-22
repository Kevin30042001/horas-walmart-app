import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { PASOS_GUIA } from './pasos';
import Chispa from '../../components/Chispa';

interface Props {
  pasoInicial?: number;
  onCerrar: () => void;
}

/**
 * Guia interactiva dentro de la app: un paso por modulo, con ejemplo visual.
 * Se navega con los botones, deslizando o con las flechas del teclado.
 */
export default function Guia({ pasoInicial = 0, onCerrar }: Props) {
  const [paso, setPaso] = useState(Math.min(Math.max(pasoInicial, 0), PASOS_GUIA.length - 1));
  const inicioX = useRef<number | null>(null);
  const total = PASOS_GUIA.length;
  const actual = PASOS_GUIA[paso]!;
  const ultimo = paso === total - 1;

  const ir = (n: number) => setPaso(Math.min(Math.max(n, 0), total - 1));

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowRight') setPaso((p) => Math.min(p + 1, total - 1));
      if (e.key === 'ArrowLeft') setPaso((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [onCerrar, total]);

  function soltar(e: EventoPuntero) {
    if (inicioX.current === null) return;
    const dx = e.clientX - inicioX.current;
    inicioX.current = null;
    if (Math.abs(dx) > 50) ir(paso + (dx < 0 ? 1 : -1));
  }

  const { Icono } = actual;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fondo" role="dialog" aria-modal="true" aria-label="Guia de Mis Horas">
      <header className="pt-segura flex items-center gap-2 border-b border-borde/60 px-4 pb-2">
        <Chispa className="h-6 w-6" />
        <p className="flex-1 font-display text-sm font-bold">
          Guía de Mis Horas <span className="num font-normal text-tenue">· {paso + 1} de {total}</span>
        </p>
        <button onClick={onCerrar} className="pulsable flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-tenue hover:bg-elevada">
          Saltar <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto"
        onPointerDown={(e) => (inicioX.current = e.clientX)}
        onPointerUp={soltar}
        style={{ touchAction: 'pan-y' }}
      >
        <div key={actual.id} className="mx-auto flex max-w-md animate-aparecer flex-col px-5 pb-6 pt-6">
          <div
            className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] shadow-xl ${
              actual.tono === 'asueto' ? 'bg-asueto text-sobre-asueto shadow-asueto/25' : 'bg-acento text-sobre-acento shadow-acento/25'
            }`}
          >
            <Icono className="h-10 w-10" aria-hidden />
          </div>
          <h2 className="text-center font-display text-2xl font-bold tracking-tight">{actual.titulo}</h2>
          <p className="mt-2 text-center text-sm text-tenue">{actual.texto}</p>

          {actual.ejemplo && (
            <div className="mt-5 rounded-3xl border border-dashed border-borde bg-superficie p-4">
              <p className="etiqueta mb-3 text-center">Así se ve</p>
              {actual.ejemplo}
            </div>
          )}

          <ul className="mt-5 space-y-2.5">
            {actual.puntos.map((p) => (
              <li key={p} className="flex gap-3 rounded-2xl bg-superficie p-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acento/15 text-acentotx">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="pb-segura border-t border-borde/60 bg-superficie px-4 pt-3">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex justify-center gap-1.5" role="tablist" aria-label="Pasos de la guia">
            {PASOS_GUIA.map((p, i) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={i === paso}
                aria-label={`Paso ${i + 1}: ${p.titulo}`}
                onClick={() => ir(i)}
                className={`h-2 rounded-full transition-all ${i === paso ? 'w-6 bg-acento' : 'w-2 bg-borde'}`}
              />
            ))}
          </div>
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => ir(paso - 1)}
              disabled={paso === 0}
              className="pulsable flex h-12 w-14 items-center justify-center rounded-2xl border border-borde disabled:opacity-30"
              aria-label="Paso anterior"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => (ultimo ? onCerrar() : ir(paso + 1))}
              className="pulsable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-acento font-semibold text-sobre-acento"
            >
              {ultimo ? 'Empezar a usar la app' : 'Siguiente'}
              {ultimo ? <Check className="h-5 w-5" aria-hidden /> : <ArrowRight className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
