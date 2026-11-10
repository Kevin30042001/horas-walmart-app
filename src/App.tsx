import { useEffect, useState } from 'react';
import { sembrarDatosPorDefecto } from './data/semilla';
import { obtenerPerfil } from './data/repos/perfilRepo';
import BottomNav, { type Pestana } from './components/BottomNav';
import PantallaBloqueo from './components/PantallaBloqueo';
import DashboardScreen from './features/dashboard/DashboardScreen';
import MarcarScreen from './features/marcar/MarcarScreen';
import RegistrosScreen from './features/registros/RegistrosScreen';
import ReportesScreen from './features/reportes/ReportesScreen';
import ConfigScreen from './features/config/ConfigScreen';

export default function App() {
  const [listo, setListo] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('inicio');

  useEffect(() => {
    void sembrarDatosPorDefecto()
      .then(() => obtenerPerfil())
      .then((perfil) => setPinHash(perfil.pinHash))
      .finally(() => setListo(true));
  }, []);

  if (!listo) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (pinHash && !desbloqueado) {
    return <PantallaBloqueo pinHashEsperado={pinHash} onDesbloquear={() => setDesbloqueado(true)} />;
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        {pestana === 'inicio' && <DashboardScreen />}
        {pestana === 'marcar' && <MarcarScreen />}
        {pestana === 'registros' && <RegistrosScreen />}
        {pestana === 'reportes' && <ReportesScreen />}
        {pestana === 'config' && <ConfigScreen />}
      </main>
      <BottomNav pestanaActiva={pestana} onCambiar={setPestana} />
    </div>
  );
}
