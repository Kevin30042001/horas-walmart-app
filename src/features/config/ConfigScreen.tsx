import { useState } from 'react';
import SeccionPerfil from './SeccionPerfil';
import SeccionTurnos from './SeccionTurnos';
import SeccionReglasPago from './SeccionReglasPago';
import SeccionAsuetos from './SeccionAsuetos';
import SeccionCortes from './SeccionCortes';
import SeccionDeducciones from './SeccionDeducciones';
import SeccionSeguridad from './SeccionSeguridad';
import SeccionRespaldo from './SeccionRespaldo';
import SeccionRetencion from './SeccionRetencion';

type Seccion = 'perfil' | 'turnos' | 'reglas' | 'asuetos' | 'cortes' | 'deducciones' | 'seguridad' | 'respaldo' | 'retencion';

const TABS: { id: Seccion; etiqueta: string }[] = [
  { id: 'perfil', etiqueta: 'Perfil' },
  { id: 'turnos', etiqueta: 'Turnos' },
  { id: 'reglas', etiqueta: 'Reglas de pago' },
  { id: 'asuetos', etiqueta: 'Asuetos' },
  { id: 'cortes', etiqueta: 'Cortes' },
  { id: 'deducciones', etiqueta: 'Deducciones' },
  { id: 'seguridad', etiqueta: 'Seguridad' },
  { id: 'respaldo', etiqueta: 'Respaldo' },
  { id: 'retencion', etiqueta: 'Retencion' },
];

/**
 * Shell de Configuracion: solo maneja la pestana activa. Cada seccion vive en
 * su propio archivo (SRP) para no terminar con un componente gigante.
 */
export default function ConfigScreen() {
  const [seccion, setSeccion] = useState<Seccion>('perfil');

  return (
    <div className="p-4 pb-10">
      <h1 className="mb-3 text-lg font-bold">Configuracion</h1>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSeccion(t.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              seccion === t.id ? 'bg-marca text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {seccion === 'perfil' && <SeccionPerfil />}
      {seccion === 'turnos' && <SeccionTurnos />}
      {seccion === 'reglas' && <SeccionReglasPago />}
      {seccion === 'asuetos' && <SeccionAsuetos />}
      {seccion === 'cortes' && <SeccionCortes />}
      {seccion === 'deducciones' && <SeccionDeducciones />}
      {seccion === 'seguridad' && <SeccionSeguridad />}
      {seccion === 'respaldo' && <SeccionRespaldo />}
      {seccion === 'retencion' && <SeccionRetencion />}
    </div>
  );
}
