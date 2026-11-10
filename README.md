# Mis Horas - Control Personal

App **personal** para llevar el control de horas laboradas, horas extras y una
proyeccion de pago por corte, pensada para colaboradores de Walmart El Salvador
que rotan entre turno **Despacho** (nocturno) y **Recibo** (diurno).

**IMPORTANTE:** esta app NO reemplaza el reloj marcador oficial de la empresa.
Es un control y respaldo de evidencias personal. Los calculos de pago,
deducciones (ISSS/AFP/ISR) y neto son **proyecciones estimadas**, no la boleta
oficial.

## Por que este stack

- **React + Vite + TypeScript + Tailwind, como PWA**: funciona offline, se
  instala en Android/iPhone/PC sin pasar por una tienda de aplicaciones, y es
  100% gratis de alojar (GitHub Pages).
- **Capacitor** envuelve la misma PWA para generar un APK nativo via GitHub
  Actions -- no hace falta Android Studio ni una PC con recursos, todo se
  compila en la nube.
- **Dexie (IndexedDB)**: toda la informacion (registros, fotos, configuracion)
  vive en el dispositivo. Sin backend, sin login, sin servicios que se
  "duerman" por inactividad.
- **Tesseract.js**: OCR 100% en el dispositivo, sin APIs de pago ni enviar
  fotos a ningun servidor.
- **ExcelJS + jsPDF**: exportes a Excel (con diseño: colores, bordes, formatos de moneda y horas) y PDF, sin dependencias de pago.

## Arquitectura

```
src/
  domain/        Logica pura (horario, motor de calculo, proyeccion de pago,
                  FO-3106, retencion, OCR parsing). Sin React ni Dexie --
                  100% testeable con Vitest.
  data/          Esquema Dexie + repositorios (unico lugar que toca IndexedDB).
  aplicacion/    Pega el dominio con los datos (procesar jornada, resumen de
                  corte, estado del dia de marcado).
  features/      Pantallas: marcar, dashboard (Pago), registros, mas
                  (reportes + config).
  components/    UI compartida (nav, tarjetas).
  ocr/           Envoltorio de Tesseract.js.
  utils/         Fechas, imagenes (compresion WebP, hash SHA-256), exportes.
android/         Proyecto nativo generado por Capacitor (no editar a mano
                  salvo build.gradle para la config de firma).
.github/workflows/  CI: pruebas + deploy web + build de APK firmado.
```

## Como funciona (v2)

> Detalle de cada cambio, bugs corregidos y supuestos para RRHH:
> [`docs/MEJORAS-V2.md`](docs/MEJORAS-V2.md). Plan de trabajo: [`docs/PLAN.md`](docs/PLAN.md).

### Horario real (fuente de verdad)

| Despacho (nocturno, 39 h) | Entrada | Receso | Salida | Horas |
|---|---|---|---|---|
| Domingo | 20:00 | 00:00-01:00 | 03:00 | 6 |
| Lunes | 21:00 | 00:00-01:00 | 03:00 | 5 |
| Martes | 21:00 | 00:00-01:00 | 04:00 | 6 |
| Miercoles / Jueves | 21:00 | 00:00-01:00 | 05:00 | 7 |
| Viernes | 21:00 | 00:00-01:00 | 06:00 | 8 |
| Sabado | libre | | | |

| Recibo (diurno, 44 h) | Entrada | Salida | Horas |
|---|---|---|---|
| Sabado | 14:00 | 18:00 | 4 |
| Lunes | 12:00 | 19:00 | 7 |
| Martes / Miercoles / Viernes | 11:00 | 19:00 | 8 |
| Jueves | 10:00 | 19:00 | 9 |
| Domingo | libre | | |

Todo es editable en **Mas > Turnos y horario** (editor visual semanal; el
receso es una ventana con hora de inicio y fin).

### Regla de extras (la del formato FO-3106)

- **Extra** = minutos trabajados FUERA de la ventana programada del dia (antes
  de la entrada programada o despues de la salida programada).
- **Ordinario** = minutos DENTRO de la ventana, menos el receso.
- **Dia libre** o dia sin horario: todo cuenta como dia libre laborado.
- **Asueto por dia calendario** (igual que el sistema de Walmart): solo los
  minutos entre las 00:00 y 24:00 de la fecha del asueto son asueto. En un
  turno nocturno, la parte antes o despues de medianoche puede ser normal.
  Dentro del horario es TE2_H / TE2.5_H; fuera, TE4.0 / TE5.0. Opcion (activa
  por defecto): la hora de comida que cae en el asueto se paga, como hace Walmart.
- Cada tramo se divide en **diurno/nocturno en las 06:00 y 19:00**.
- **Tolerancia** de 6 min por defecto: como en Walmart, llegar o salir hasta
  6 min antes o despues (LLEG-ANT / SALIR_TARDE) no se paga como extra.
- Llegar tarde o salir temprano se informa como **faltante**; no se resta.
- El tope legal (8 h diurna / 7 h nocturna, 44 h / 39 h por semana) es solo
  una **alerta**: el jueves de Recibo (9 h) es jornada programada, no extra.
- Turno nocturno: una entrada sin salida de las ultimas 16 h es la **jornada
  abierta**; todas las marcas (receso de las 00:00, salida de las 03:00) le
  pertenecen, y su fecha es la de la ENTRADA.
- El receso es opcional: si no lo marcas y el horario lo tiene, se descuenta
  la ventana programada ("receso asumido", editable).

### Formula de pago (estructura de la boleta)

```
hora base = salario mensual / 30 / 8          (642 -> 2.675, editable)

Bruto = Salario del corte  (mensual / 2, o proporcional a los dias del corte)
      + P0.25 Nocturnidad       = h ordinarias nocturnas x base x 0.25
      + TE2 Horas Extras 200 %  = h x base x 2.00
      + TE2.5 Extras 250 % Noct.= h x base x 2.50
      + TE2_H / TE2.5_H asueto  = h x base x 1.00 / 1.50  (total 200 % / 250 %)
      + TE4.0 / TE5.0 extras en asueto = h x base x 4.00 / 5.00
      + Dia libre laborado      = configurable (recargo + dia compensatorio)
Neto  = Bruto - ISSS - AFP - ISR   (estimados, editables)
```

- **Redondeo como nomina**: cada tramo de cada dia se pasa a decimal con la
  tabla oficial (minutos/60 a 2 decimales) y luego se suman los decimales.
- Cada linea de **Mas > Pago** es un *recargo* (se suma sobre el salario) o un
  *pago completo*, con su factor y el mismo nombre que en la boleta.
- Verificado contra una boleta real: extras 200 % de 1.45 h = $7.76; extras
  250 % de 0.85 h = $5.68; nocturnidad de 13.98 h = $9.35.

Validado contra una quincena real del sistema de Walmart (20/10 al 04/11):
TE2 0:03, TE2.5 10:00, TE2.5_H 5:00, TE4.0 0:17 y TE5.0 coinciden
(`src/domain/calculo/quincenaWalmart.test.ts`).

### Cortes de pago

Cada corte dura **15 dias seguidos** y el siguiente empieza al dia siguiente:
5 al 19, 20 al 3 (si el mes tiene 31 dias), 4 al 18... Se paga el siguiente
**14 o 28** que quede al menos 7 dias despues del corte. En **Mas > Cortes de
pago** pones la fecha en que empezo un corte real y generas el calendario.
Como 15 dias exactos se corren unos 5 dias por anio, si Walmart ajusta un
corte (por ejemplo uno de 16 dias) lo editas a mano y vuelves a generar desde
el siguiente. Tambien existe el modo "por dia del mes" (ej. corta el 4 y el 19).

### Como cambiar de turno

En la pantalla **Marcar**, toca el chip del turno (arriba a la derecha:
DESPACHO / RECIBO) y elige el otro. Queda registrada la rotacion desde hoy y
el color de toda la app cambia (azul = Despacho nocturno, amarillo = Recibo
diurno, paleta inspirada en Walmart). El asueto siempre se resalta en amarillo. Si
marcas una entrada que calza con el horario del otro turno, la app te
pregunta si cambiaste. Las rotaciones con fecha pasada se registran en
**Mas > Turnos y horario**.

### Pantallas

- **Marcar**: anillo con el tiempo trabajado vs programado, contador en vivo,
  boton grande con la siguiente accion, receso/foto/nota, linea de tiempo
  programada vs real y aviso "llevas 0:25 de extra".
- **Pago**: neto estimado, fecha de pago, progreso del corte y proyeccion al
  cierre, alertas, desglose tipo boleta, barras por dia y calendario heatmap.
- **Registros**: por corte y semana; desliza para editar/eliminar; boton +
  para agregar un dia pasado; detalle con marcas, fotos y "por que se pago asi".
- **Mas**: reportes (FO-3106, Excel, PDF) y configuracion por secciones.

### Pruebas

`npm run test` corre ~145 pruebas (Vitest) del dominio y la capa de
aplicacion: horario real (39 h / 44 h), jornada abierta nocturna, regla de
extras con casos reales del Excel, golden test de la boleta, redondeo de
nomina, FO-3106, edicion de dias pasados, alertas, recordatorios y limpieza.

## Desarrollo (sin PC, desde GitHub Codespaces)

```bash
npm ci
npm run test     # pruebas del motor de calculo
npm run dev      # servidor local
npm run build    # build de produccion (PWA)
```

**Nota si desarrollas detras del proxy/Artifactory de Walmart:** el
`package-lock.json` de este repo apunta a `registry.npmjs.org` (publico) a
proposito, para que GitHub Actions y Vercel puedan instalar dependencias sin
problemas. Si corres `npm install` (no `npm ci`) en una red que solo permite
el registry interno de Walmart, npm va a re-resolver el lockfile usando ESE
registry en tu copia local -- NO commitees ese cambio de vuelta (volveria a
romper el deploy). Si necesitas instalar algo nuevo, usa
`npm install --registry=https://registry.npmjs.org/ <paquete>` o pide que se
haga desde un entorno con salida a internet publica.

## Despliegue

### Web (PWA) -- automatico

Cada push a `main` dispara `.github/workflows/deploy-web.yml`, que corre las
pruebas, construye la PWA y la publica en GitHub Pages
(`https://<usuario>.github.io/horas-walmart-app/`). Actívalo una vez en
**Settings > Pages > Source: GitHub Actions**.

### Android (APK firmado) -- primera vez

1. Corre el workflow **"Generar keystore de firma"** (pestaña Actions, manual,
   una sola vez). Descarga el artifact y sigue las instrucciones de `info.txt`
   para crear los 4 secrets del repo.
2. Crea un tag (`git tag v1.0.0 && git push --tags`) o dispara manualmente
   **"Build APK firmado"**. El APK queda como artifact descargable y, si fue
   por tag, tambien se adjunta a una Release de GitHub.

Sin keystore configurado, el workflow genera un APK **debug** (instalable,
pero sin firma de release) para que puedas probar igual.

## Datos y privacidad

Todo vive en el dispositivo (IndexedDB). No hay login ni backend. Respaldo
JSON y ZIP (JSON + Excel + PDF + fotos) en **Mas > Datos y respaldo**; bloqueo
con PIN en **Mas > Seguridad**. La limpieza automatica (60 dias por defecto)
avisa 7 dias antes, nunca borra sin avisar, respeta dias/cortes protegidos y
conserva el resumen de cada corte.

Las fuentes (Space Grotesk, Manrope) y los iconos van empaquetados: la app
funciona sin internet. Los recordatorios con la app cerrada solo funcionan en
el APK (el navegador no permite programarlos sin un servidor push).

## Licencia / alcance

Proyecto personal, pensado para que cualquier colaborador de Walmart El
Salvador lo adapte a su propio turno y salario desde Configuracion.
