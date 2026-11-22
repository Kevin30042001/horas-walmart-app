import type { ComponentType, ReactNode } from 'react';
import {
  CalendarDays,
  Camera,
  Clock3,
  Coffee,
  Database,
  FileSpreadsheet,
  Flag,
  LogIn,
  LogOut,
  Moon,
  PartyPopper,
  Plus,
  Settings2,
  Share2,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import ChipCodigo from '../../components/ChipCodigo';
import type { Pestana } from '../../components/BottomNav';

export interface PasoGuia {
  id: string;
  Icono: ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
  puntos: string[];
  /** Ejemplo visual de como se ve en la app. */
  ejemplo?: ReactNode;
  /** Color del icono: 'asueto' = amarillo (como en la app). */
  tono?: 'asueto';
  /** Pestana a la que pertenece (el boton "?" abre la guia en su primer paso). */
  pestana?: Pestana;
}

const Fila = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
);

const Pildora = ({ children, clase = 'bg-elevada' }: { children: ReactNode; clase?: string }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${clase}`}>{children}</span>
);

export const PASOS_GUIA: PasoGuia[] = [
  {
    id: 'bienvenida',
    Icono: Sparkles,
    titulo: 'Bienvenido a Mis Horas',
    texto:
      'Tu control personal de horas, horas extras y lo que te van a pagar en cada corte. Es una herramienta tuya: no reemplaza el reloj marcador oficial ni la boleta.',
    puntos: [
      'Todo se guarda solo en tu celular: sin cuentas ni contraseñas.',
      'Funciona sin internet, incluso de madrugada en el turno.',
      'Puedes ver esta guía cuando quieras con el botón ? de arriba.',
    ],
  },
  {
    id: 'primeros-pasos',
    Icono: Settings2,
    titulo: 'Primero, configura 3 cosas',
    texto: 'Con esto la app calcula bien tus horas y tu pago. Lo haces una sola vez en Más > Configuración.',
    puntos: [
      'Perfil: tu nombre, gafete y salario mensual (sin salario no hay proyección de pago).',
      'Turnos y horario: revisa que tu horario de Despacho y Recibo sea el correcto.',
      'Cortes de pago: elige "15 días seguidos", pon la fecha en que empezó un corte y toca Generar cortes.',
    ],
    ejemplo: (
      <Fila>
        <Pildora>1 · Perfil</Pildora>
        <Pildora>2 · Turnos</Pildora>
        <Pildora>3 · Cortes</Pildora>
      </Fila>
    ),
    pestana: 'mas',
  },
  {
    id: 'marcar',
    Icono: Clock3,
    titulo: 'Marcar: entrada, receso y salida',
    texto:
      'En la pestaña Marcar tienes un botón grande que siempre muestra lo siguiente que toca: Marcar entrada, Iniciar receso o Marcar salida.',
    puntos: [
      'El anillo muestra cuánto llevas de tu jornada programada, en vivo.',
      'Si te pasas de tu salida, verás "Llevas 0:25 de extra".',
      'El receso es opcional: si no lo marcas, se descuenta el de tu horario.',
      'Si olvidaste marcar, la app te sugiere la hora programada para confirmarla con un toque.',
    ],
    ejemplo: (
      <div className="space-y-2">
        <div className="mx-auto flex h-12 max-w-[15rem] items-center justify-center gap-2 rounded-2xl bg-acento font-display font-semibold text-sobre-acento">
          <LogOut className="h-5 w-5" aria-hidden /> Marcar salida
        </div>
        <Fila>
          <Pildora>
            <Coffee className="h-3.5 w-3.5" aria-hidden /> Receso
          </Pildora>
          <Pildora>
            <Camera className="h-3.5 w-3.5" aria-hidden /> Con foto
          </Pildora>
        </Fila>
      </div>
    ),
    pestana: 'marcar',
  },
  {
    id: 'nocturno',
    Icono: Moon,
    titulo: 'Turno de noche y cambio de turno',
    texto:
      'Si entras a las 21:00 del lunes y sales a las 03:00 del martes, todo cuenta como la jornada del lunes. Después de medianoche la app no te pide entrar de nuevo.',
    puntos: [
      'El chip de arriba (DESPACHO / RECIBO) cambia tu turno con un toque.',
      'Despacho se ve en azul y Recibo en amarillo.',
      'Si marcas a una hora que coincide con el otro turno, la app te pregunta si cambiaste.',
    ],
    ejemplo: (
      <Fila>
        <Pildora clase="bg-azul/15 text-acentotx">
          <Moon className="h-3.5 w-3.5" aria-hidden /> DESPACHO
        </Pildora>
        <Pildora clase="bg-amarillo/25 text-asuetotx">
          <Clock3 className="h-3.5 w-3.5" aria-hidden /> RECIBO
        </Pildora>
      </Fila>
    ),
    pestana: 'marcar',
  },
  {
    id: 'extras',
    Icono: Zap,
    titulo: 'Cómo se calculan las extras',
    texto:
      'Igual que el sistema de Walmart: es extra todo lo que trabajas FUERA de tu horario programado de ese día (llegar antes o salir después).',
    puntos: [
      'Se divide en diurna (06:00 a 19:00) y nocturna (19:00 a 06:00).',
      'Llegar o salir hasta 6 minutos antes o después no cuenta (tolerancia).',
      'Cada tramo lleva su código y porcentaje, como en el sistema de la empresa.',
    ],
    ejemplo: (
      <Fila>
        <ChipCodigo tipoHora="ordinariaNocturna" porcentaje={125} />
        <ChipCodigo tipoHora="extraDiurna" porcentaje={200} />
        <ChipCodigo tipoHora="extraNocturna" porcentaje={250} />
      </Fila>
    ),
  },
  {
    id: 'asuetos',
    Icono: Flag,
    tono: 'asueto',
    titulo: 'Asuetos (en amarillo)',
    texto:
      'El asueto cuenta por día calendario, de 00:00 a 24:00. Si tu turno empieza el día anterior, solo las horas después de medianoche son asueto.',
    puntos: [
      'Dentro de tu horario: TE2_H (200 %) de día o TE2.5_H (250 %) de noche.',
      'Fuera de tu horario: TE4.0 (400 %) de día o TE5.0 (500 %) de noche.',
      'La hora de comida que cae en el asueto se paga (puedes apagarlo en Perfil).',
      'Los asuetos nacionales vienen cargados; agrega otros en Más > Asuetos.',
    ],
    ejemplo: (
      <Fila>
        <ChipCodigo tipoHora="asuetoNocturna" porcentaje={250} />
        <ChipCodigo tipoHora="asuetoExtraNocturna" porcentaje={500} />
      </Fila>
    ),
  },
  {
    id: 'pago',
    Icono: Wallet,
    titulo: 'Pago: cuánto te van a pagar',
    texto:
      'La pestaña Pago muestra tu próximo pago (el 14 o el 28) con el neto estimado, igual que una boleta: salario + nocturnidad + extras + asueto, menos ISSS, AFP y renta.',
    puntos: [
      'Arriba puedes elegir otro corte ("Paga 14/11", "Paga 28/11"...).',
      'Toca cada línea de la boleta para ver su cálculo.',
      'La tarjeta de asueto se despliega con lo trabajado en horario normal y lo extra.',
      'Es una proyección: tu boleta real puede variar unos centavos o por otros descuentos.',
    ],
    ejemplo: (
      <div className="mx-auto max-w-[15rem] rounded-2xl bg-acento p-3 text-sobre-acento">
        <p className="text-[11px] font-semibold opacity-80">Neto estimado</p>
        <p className="num text-2xl font-semibold">$442.64</p>
        <p className="text-[11px] opacity-80">Paga el sábado, 14 de noviembre</p>
      </div>
    ),
    pestana: 'pago',
  },
  {
    id: 'registros',
    Icono: CalendarDays,
    titulo: 'Registros: tu historial',
    texto: 'Todos tus días por corte y por semana, con los códigos de cada uno. Toca un día para ver el detalle.',
    puntos: [
      'Con el botón + agregas un día pasado que no marcaste.',
      'Desliza un día a la izquierda para editarlo o eliminarlo.',
      'En el detalle puedes cambiar la hora de una marca, agregar la que falta o adjuntar una foto.',
      'Protege un día para que la limpieza automática nunca lo borre.',
    ],
    ejemplo: (
      <Fila>
        <Pildora clase="bg-acento text-sobre-acento">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Día pasado
        </Pildora>
        <Pildora clase="bg-asueto text-sobre-asueto">
          <Flag className="h-3.5 w-3.5" aria-hidden /> ASUETO
        </Pildora>
      </Fila>
    ),
    pestana: 'registros',
  },
  {
    id: 'fotos',
    Icono: Camera,
    titulo: 'Fotos de evidencia',
    texto:
      'Puedes marcar con una foto del reloj o del comprobante. La app lee la fecha y hora de la foto y te pide confirmarla antes de guardarla.',
    puntos: [
      'Úsala sobre todo en días con extras, asuetos o días libres trabajados.',
      'La app te avisa cuando un día con extras no tiene foto.',
      'Las fotos salen en el PDF como respaldo.',
    ],
    pestana: 'marcar',
  },
  {
    id: 'reportes',
    Icono: FileSpreadsheet,
    titulo: 'Reportes: FO-3106, Excel y PDF',
    texto: 'En Más > Reportes eliges el corte y generas el archivo.',
    puntos: [
      'FO-3106: el formato de preautorización de horas extras, listo para tu jefe.',
      'Excel completo: resumen, jornadas, el porqué de cada pago y el FO-3106.',
      'PDF: resumen de pago y jornadas para enviar o imprimir.',
      'Si no ves el archivo en Descargas, usa el botón Compartir / guardar.',
    ],
    ejemplo: (
      <Fila>
        <Pildora clase="bg-exito/15 text-exito">
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> Listo
        </Pildora>
        <Pildora clase="bg-acento text-sobre-acento">
          <Share2 className="h-3.5 w-3.5" aria-hidden /> Compartir / guardar
        </Pildora>
      </Fila>
    ),
    pestana: 'mas',
  },
  {
    id: 'datos',
    Icono: Database,
    titulo: 'Recordatorios y respaldo',
    texto: 'Unas opciones más en Más > Configuración para que no pierdas nada.',
    puntos: [
      'Recordatorios: un aviso antes de entrar y si olvidaste marcar la salida.',
      'Respaldo: descarga un archivo con todos tus datos; guárdalo si cambias de celular.',
      'Limpieza: cada 60 días se borran fotos viejas (te avisa 7 días antes y guarda los totales).',
      'Seguridad: puedes poner un PIN para abrir la app.',
    ],
    pestana: 'mas',
  },
  {
    id: 'listo',
    Icono: PartyPopper,
    titulo: '¡Listo!',
    texto: 'Ya sabes lo principal. Empieza marcando tu próxima entrada o agregando tus días pasados.',
    puntos: ['Toca ? arriba cuando tengas una duda: abre la guía en la pantalla donde estás.'],
    ejemplo: (
      <div className="mx-auto flex h-12 max-w-[15rem] items-center justify-center gap-2 rounded-2xl bg-acento font-display font-semibold text-sobre-acento">
        <LogIn className="h-5 w-5" aria-hidden /> Marcar entrada
      </div>
    ),
  },
];

/** Primer paso de la guia que explica una pestana (para el boton "?"). */
export function pasoDePestana(pestana: Pestana): number {
  const i = PASOS_GUIA.findIndex((p) => p.pestana === pestana);
  return i >= 0 ? i : 0;
}
