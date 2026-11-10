import { useState } from 'react';
import { hashPin } from '../utils/pin';

interface Props {
  pinHashEsperado: string;
  onDesbloquear: () => void;
}

/**
 * Bloqueo opcional con PIN (biometria queda fuera de alcance por ahora --
 * requeriria WebAuthn, que es bastante mas trabajo para un beneficio marginal
 * en una app de un solo usuario por dispositivo). Se re-bloquea al recargar
 * la pagina: suficiente para un uso casual, no es un vault de alta seguridad.
 */
export default function PantallaBloqueo({ pinHashEsperado, onDesbloquear }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function intentar(): Promise<void> {
    const hash = await hashPin(pin);
    if (hash === pinHashEsperado) {
      onDesbloquear();
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-lg font-bold">Mis Horas esta bloqueado</h1>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && void intentar()}
        className="w-32 rounded-lg border border-slate-300 p-3 text-center text-2xl tracking-widest dark:border-slate-700 dark:bg-slate-800"
        maxLength={8}
        autoFocus
      />
      {error && <p className="text-sm text-red-500">PIN incorrecto</p>}
      <button onClick={() => void intentar()} className="rounded-lg bg-marca px-6 py-2 font-semibold text-white">
        Desbloquear
      </button>
    </div>
  );
}
