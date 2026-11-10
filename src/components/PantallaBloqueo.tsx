import { Lock } from 'lucide-react';
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
      <Lock className="h-10 w-10 text-acento" aria-hidden />
      <h1 className="font-display text-lg font-semibold">Mis Horas esta bloqueado</h1>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && void intentar()}
        className="campo num !w-40 text-center !text-2xl tracking-[0.4em]"
        aria-label="PIN"
        maxLength={8}
        autoFocus
      />
      {error && <p className="text-sm text-peligro">PIN incorrecto</p>}
      <button onClick={() => void intentar()} className="pulsable rounded-2xl bg-acento px-8 py-3 font-semibold text-sobre-acento">
        Desbloquear
      </button>
    </div>
  );
}
