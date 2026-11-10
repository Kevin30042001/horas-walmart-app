import { useState, type ComponentType } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarRange,
  ChevronRight,
  Clock4,
  Database,
  Flag,
  Lock,
  Palette,
  Receipt,
  UserRound,
} from 'lucide-react';
import SeccionReportes from './SeccionReportes';
import SeccionPerfil from '../config/SeccionPerfil';
import SeccionTurnos from '../config/SeccionTurnos';
import SeccionReglasPago from '../config/SeccionReglasPago';
import SeccionDeducciones from '../config/SeccionDeducciones';
import SeccionAsuetos from '../config/SeccionAsuetos';
import SeccionCortes from '../config/SeccionCortes';
import SeccionSeguridad from '../config/SeccionSeguridad';
import SeccionRespaldo from '../config/SeccionRespaldo';
import SeccionRetencion from '../config/SeccionRetencion';
import SeccionApariencia from '../config/SeccionApariencia';
import SeccionNotificaciones from '../config/SeccionNotificaciones';

type Id = 'perfil' | 'turnos' | 'pago' | 'cortes' | 'asuetos' | 'datos' | 'seguridad' | 'notificaciones' | 'apariencia';

const SECCIONES: { id: Id; titulo: string; detalle: string; Icono: ComponentType<{ className?: string }>; Contenido: ComponentType }[] = [
  { id: 'perfil', titulo: 'Perfil', detalle: 'Nombre, gafete, salario y FO-3106', Icono: UserRound, Contenido: SeccionPerfil },
  { id: 'turnos', titulo: 'Turnos y horario', detalle: 'Horario semanal, recesos y rotaciones', Icono: Clock4, Contenido: SeccionTurnos },
  {
    id: 'pago',
    titulo: 'Pago',
    detalle: 'Reglas de la boleta y deducciones',
    Icono: Receipt,
    Contenido: () => (
      <div className="space-y-6">
        <SeccionReglasPago />
        <div>
          <p className="etiqueta mb-2">Deducciones estimadas</p>
          <SeccionDeducciones />
        </div>
      </div>
    ),
  },
  { id: 'cortes', titulo: 'Cortes de pago', detalle: 'Calendario de cortes de Walmart', Icono: CalendarRange, Contenido: SeccionCortes },
  { id: 'asuetos', titulo: 'Asuetos', detalle: 'Feriados nacionales y locales', Icono: Flag, Contenido: SeccionAsuetos },
  {
    id: 'datos',
    titulo: 'Datos y respaldo',
    detalle: 'Respaldo, limpieza y almacenamiento',
    Icono: Database,
    Contenido: () => (
      <div className="space-y-6">
        <SeccionRespaldo />
        <div>
          <p className="etiqueta mb-2">Limpieza automatica</p>
          <SeccionRetencion />
        </div>
      </div>
    ),
  },
  { id: 'notificaciones', titulo: 'Recordatorios', detalle: 'Avisos de entrada, salida y jornada abierta', Icono: Bell, Contenido: SeccionNotificaciones },
  { id: 'seguridad', titulo: 'Seguridad', detalle: 'Bloqueo con PIN', Icono: Lock, Contenido: SeccionSeguridad },
  { id: 'apariencia', titulo: 'Apariencia', detalle: 'Tema y formato de hora', Icono: Palette, Contenido: SeccionApariencia },
];

export default function MasScreen() {
  const [abierta, setAbierta] = useState<Id | null>(null);
  const seccion = SECCIONES.find((s) => s.id === abierta);

  if (seccion) {
    return (
      <div className="pt-segura mx-auto max-w-md px-4 pb-8">
        <header className="flex items-center gap-2 py-2">
          <button onClick={() => setAbierta(null)} aria-label="Volver" className="pulsable rounded-full p-2 hover:bg-elevada">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{seccion.titulo}</h1>
        </header>
        <seccion.Contenido />
      </div>
    );
  }

  return (
    <div className="pt-segura mx-auto max-w-md space-y-4 px-4 pb-8">
      <header className="py-2">
        <p className="etiqueta">Mis Horas</p>
        <h1 className="font-display text-xl font-semibold">Mas</h1>
      </header>
      <SeccionReportes />
      <section className="overflow-hidden rounded-3xl border border-borde/70 bg-superficie">
        <p className="etiqueta px-4 pt-4">Configuracion</p>
        <ul className="divide-y divide-borde/60">
          {SECCIONES.map(({ id, titulo, detalle, Icono }) => (
            <li key={id}>
              <button onClick={() => setAbierta(id)} className="pulsable flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="rounded-xl bg-acento/12 p-2 text-acentotx">
                  <Icono className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="block text-xs text-tenue">{detalle}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-tenue" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="px-2 text-center text-[11px] text-tenue">
        Control personal: no reemplaza el reloj marcador oficial. Tus datos viven solo en este dispositivo.
      </p>
    </div>
  );
}
