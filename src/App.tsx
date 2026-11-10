import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { sembrarDatosPorDefecto } from './data/semilla';
import { obtenerPerfil } from './data/repos/perfilRepo';
import { recalcularSiCambioElMotor } from './aplicacion/recalcular';
import { AppProveedor } from './aplicacion/AppContexto';
import BottomNav, { type Pestana } from './components/BottomNav';
import PantallaBloqueo from './components/PantallaBloqueo';
import DashboardScreen from './features/dashboard/DashboardScreen';
import MarcarScreen from './features/marcar/MarcarScreen';
import RegistrosScreen from './features/registros/RegistrosScreen';
import MasScreen from './features/mas/MasScreen';

export default function App() {
  const [listo, setListo] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('marcar');

  useEffect(() => {
    void sembrarDatosPorDefecto()
      .then(() => recalcularSiCambioElMotor())
      .then(() => obtenerPerfil())
      .then((perfil) => setPinHash(perfil.pinHash))
      .finally(() => setListo(true));
  }, []);

  if (!listo) {
    return (
      <div className="flex h-full items-center justify-center text-acento">
        <Clock3 className="h-10 w-10 animate-pulso" aria-label="Cargando" />
      </div>
    );
  }

  if (pinHash && !desbloqueado) {
    return <PantallaBloqueo pinHashEsperado={pinHash} onDesbloquear={() => setDesbloqueado(true)} />;
  }

  return (
    <AppProveedor>
      <div className="flex h-full flex-col">
        <main className="flex-1 overflow-y-auto pb-24">
          {pestana === 'marcar' && <MarcarScreen />}
          {pestana === 'pago' && <DashboardScreen onIr={setPestana} />}
          {pestana === 'registros' && <RegistrosScreen />}
          {pestana === 'mas' && <MasScreen />}
        </main>
        <BottomNav pestanaActiva={pestana} onCambiar={setPestana} />
      </div>
    </AppProveedor>
  );
}
