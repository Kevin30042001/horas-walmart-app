import { useEffect, useState } from 'react';
import { sembrarDatosPorDefecto } from './data/semilla';
import { guardarPerfil, obtenerPerfil } from './data/repos/perfilRepo';
import Guia from './features/guia/Guia';
import { GuiaContexto } from './features/guia/GuiaContexto';
import { pasoDePestana } from './features/guia/pasos';
import { recalcularSiCambioElMotor } from './aplicacion/recalcular';
import { evaluarLimpiezaAutomatica } from './aplicacion/limpieza';
import { AppProveedor } from './aplicacion/AppContexto';
import BottomNav, { type Pestana } from './components/BottomNav';
import BarraSuperior from './components/BarraSuperior';
import Chispa from './components/Chispa';
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
  /** Paso abierto de la guia (null = cerrada). */
  const [guiaPaso, setGuiaPaso] = useState<number | null>(null);

  useEffect(() => {
    void sembrarDatosPorDefecto()
      .then(() => recalcularSiCambioElMotor())
      .then(() => evaluarLimpiezaAutomatica())
      .catch((e) => console.warn('Mantenimiento al abrir la app:', e))
      .then(() => obtenerPerfil())
      .then((perfil) => {
        setPinHash(perfil.pinHash);
        // la primera vez (o si nunca se vio) se muestra la guia de bienvenida
        if (!perfil.guiaVista) setGuiaPaso(0);
      })
      .finally(() => setListo(true));
  }, []);

  if (!listo) {
    return (
      <div className="flex h-full items-center justify-center text-acentotx">
        <Chispa className="h-14 w-14 animate-pulso" />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  if (pinHash && !desbloqueado) {
    return <PantallaBloqueo pinHashEsperado={pinHash} onDesbloquear={() => setDesbloqueado(true)} />;
  }

  return (
    <AppProveedor>
      <GuiaContexto.Provider value={{ abrirGuia: (paso) => setGuiaPaso(paso ?? 0) }}>
      <div className="flex h-full flex-col">
        <main className="flex-1 overflow-y-auto pb-24">
          <BarraSuperior onAyuda={() => setGuiaPaso(pasoDePestana(pestana))} />
          {pestana === 'marcar' && <MarcarScreen />}
          {pestana === 'pago' && <DashboardScreen onIr={setPestana} />}
          {pestana === 'registros' && <RegistrosScreen />}
          {pestana === 'mas' && <MasScreen />}
        </main>
        <BottomNav pestanaActiva={pestana} onCambiar={setPestana} />
      </div>
      {guiaPaso !== null && (
        <Guia
          pasoInicial={guiaPaso}
          onCerrar={() => {
            setGuiaPaso(null);
            void guardarPerfil({ guiaVista: true });
          }}
        />
      )}
      </GuiaContexto.Provider>
    </AppProveedor>
  );
}
