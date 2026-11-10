# Plan: terminar "Mis Horas" (horas-walmart-app)

> Prompt de continuidad usado para la v2. El resultado de cada fase está en
> [`MEJORAS-V2.md`](MEJORAS-V2.md).

## Rol y forma de trabajo

Ingeniero senior full-stack y diseñador de producto. La tarea es **terminar y
rediseñar** la app (React + Vite + TypeScript + Tailwind + Dexie + Capacitor),
que es un control PERSONAL de horas laboradas, horas extras y proyección de
pago en Walmart El Salvador (CD). No reemplaza el reloj marcador oficial.

1. Leer el repo completo antes de tocar código y devolver un plan corto por fase.
2. Un commit por fase, con un mensaje claro en español.
3. **Primero la prueba, luego el arreglo**: cada bug lleva una prueba Vitest que falla antes de corregirlo.
4. Al final de cada fase deben pasar `npm run test`, `npx tsc --noEmit` y `npm run build`.
5. Mantener la arquitectura: `domain/` puro, `data/` es lo único que toca IndexedDB y `aplicacion/` une ambos.
6. Restricciones:
   - Todo gratis, offline-first y sin backend.
   - Todo debe compilar y desplegarse con GitHub Actions.
   - El lockfile solo puede apuntar a `registry.npmjs.org`.
   - Fuentes e íconos empaquetados.
   - Migración de Dexie para no perder datos.

## Fase 0: Horario real (fuente de verdad)

- **Despacho** (nocturno): semana de domingo a viernes, libre el sábado, 39 h, receso 00:00-01:00.
  - Domingo 20:00-03:00 (6 h)
  - Lunes 21:00-03:00 (5 h)
  - Martes 21:00-04:00 (6 h)
  - Miércoles y jueves 21:00-05:00 (7 h)
  - Viernes 21:00-06:00 (8 h)
- **Recibo** (diurno): semana desde el sábado, libre el domingo, 44 h, sin receso.
  - Sábado 14:00-18:00 (4 h)
  - Lunes 12:00-19:00 (7 h)
  - Martes, miércoles y viernes 11:00-19:00 (8 h)
  - Jueves 10:00-19:00 (9 h)
- El receso pasa a ser una ventana con inicio y fin. Una prueba verifica que las sumas den 39 h y 44 h.
- Cambio de turno con un toque desde la pantalla principal.

## Fase 1: Marcado del turno nocturno (crítico)

- Jornada abierta: una entrada sin salida de las últimas 16 h recibe todas las marcas, con la fecha de la ENTRADA.
- El receso es opcional: "Marcar salida" siempre está disponible.
- Si no se marca el receso y el horario lo tiene, se descuenta la ventana programada ("receso asumido").
- Pruebas:
  - Lunes 21:00 → receso 00:00 → salida 03:00 del martes = una jornada del lunes con 5 h.
  - Sábado de Recibo de 14:00 a 18:00 = 4 h.

## Fase 2: Extras según el horario, no según el tope legal

- Extra = minutos fuera de la ventana programada. Ordinario = minutos dentro, menos el receso.
- Día libre: todo es día libre laborado. Asueto: ordinario dentro del horario y extra fuera.
- Tolerancia configurable. El faltante es solo informativo. El tope legal es solo una alerta.
- Casos de prueba del Excel:
  - 04:00 → 05:11 = 1.18 N
  - 06:00 → 08:00 = 2.00 D
  - 05:00 → 08:00 = 1.00 N + 2.00 D
  - Entrar a las 19:00 a un turno de las 20:00 = 1.00 N

## Fase 3: Proyección de pago con la estructura de la boleta

```
Bruto = Salario del corte + Nocturnidad (0.25) + Extras 200 % + Extras 250 %
      + Recargo asueto (1.00, +0.25 si es nocturno) + Extras en asueto (4.00 / 5.00)
      + Día libre laborado (configurable)
Neto  = Bruto - ISSS - AFP - ISR
```

- Cada regla es un recargo o un pago completo, con el mismo nombre de línea que la boleta.
- Redondeo como nómina: por tramo y luego se suma.
- Prueba contra la boleta:
  - 642 → 2.675
  - Nocturnidad 13.98 h
  - Extras al 200 % de 1.45 h = $7.76
  - Extras al 250 % de 0.85 h = $5.68

## Fase 4: Editar y registrar días pasados

- Agregar un día pasado, editar o eliminar marcas, ver la foto en pantalla completa y adjuntar una foto a una jornada existente.
- El OCR usa la fecha leída. EXIF real con `exifr`.
- Cada cambio recalcula la jornada.

## Fase 5: Exportar en formato FO-3106

- Encabezado: FO-3106, título, División, Departamento y Período.
- Columnas: Fecha | Tipo | Gafete | Asociado | Jornada | De | A | Tiempo en nómina | Tarea | Firmas.
- Una fila por tramo extra (dividido en las 06:00 y 19:00), con el tipo automático y una fila TOTAL.

## Fase 6: Rediseño completo

- App de reloj marcador personal, oscura por defecto, con un color por turno (Despacho índigo/violeta, Recibo ámbar).
- Tipografía local con números tabulares, íconos lucide y microanimaciones que respetan `prefers-reduced-motion`.
- Pantallas:
  - Marcar: anillo, contador en vivo, botón grande, línea de tiempo y aviso de extra.
  - Dashboard: próximo pago, horas, desglose tipo boleta, gráfico y heatmap.
  - Registros: por corte y semana, con gestos y botón flotante.
  - Reportes.
  - Configuración por secciones.
- Navegación de 4 pestañas con áreas seguras, estados vacíos con guía, háptica al marcar y formato de 12/24 h.

## Fase 7: Automatización pendiente

- Notificaciones locales: antes de la entrada, si no marcaste la salida y si quedó una jornada abierta.
- Limpieza cada 60 días, con aviso 7 días antes y respaldo ZIP. Respeta lo protegido y conserva el resumen por corte.
- Alertas en el Dashboard: jornada sin salida, extras sin foto, asueto próximo y tope legal.

## Entrega final

1. Tabla de bugs con la prueba que cubre cada uno.
2. Capturas o descripción de cada pantalla.
3. README actualizado.
4. Verificación de los workflows y del lockfile.
5. Supuestos para validar con RRHH.
