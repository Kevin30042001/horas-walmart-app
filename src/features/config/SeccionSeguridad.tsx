import { useEffect, useState } from 'react';
import { obtenerPerfil, guardarPerfil } from '../../data/repos/perfilRepo';
import { hashPin } from '../../utils/pin';

export default function SeccionSeguridad() {
  const [pinActivo, setPinActivo] = useState(false);
  const [nuevoPin, setNuevoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    void obtenerPerfil().then((p) => setPinActivo(p.pinHash !== null));
  }, []);

  async function activarPin(): Promise<void> {
    setError(null);
    setMensaje(null);
    if (nuevoPin.length < 4) {
      setError('El PIN debe tener al menos 4 digitos.');
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setError('Los PIN no coinciden.');
      return;
    }
    await guardarPerfil({ pinHash: await hashPin(nuevoPin) });
    setPinActivo(true);
    setNuevoPin('');
    setConfirmarPin('');
    setMensaje('PIN activado.');
  }

  async function quitarPin(): Promise<void> {
    await guardarPerfil({ pinHash: null });
    setPinActivo(false);
    setMensaje('PIN desactivado.');
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Bloqueo opcional con PIN al abrir la app. (Biometria no esta disponible todavia -- queda pendiente para una
        version futura).
      </p>

      {pinActivo ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-600">PIN activo.</p>
          <button onClick={() => void quitarPin()} className="w-full rounded-lg bg-red-600 py-2 font-semibold text-white">
            Quitar PIN
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Nuevo PIN (min. 4 digitos)"
            value={nuevoPin}
            onChange={(e) => setNuevoPin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirmar PIN"
            value={confirmarPin}
            onChange={(e) => setConfirmarPin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={() => void activarPin()} className="w-full rounded-lg bg-marca py-2 font-semibold text-white">
            Activar PIN
          </button>
        </div>
      )}
      {mensaje && <p className="text-xs text-emerald-600">{mensaje}</p>}
    </div>
  );
}
