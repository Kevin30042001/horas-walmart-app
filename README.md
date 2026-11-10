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
- **SheetJS + jsPDF**: exportes a Excel/PDF sin dependencias de pago.

## Arquitectura

```
src/
  domain/        Logica pura (motor de calculo, clasificacion de horas,
                  conversion minutos->decimal, OCR parsing). Sin React ni
                  Dexie -- 100% testeable con Vitest.
  data/          Esquema Dexie + repositorios (unico lugar que toca IndexedDB).
  aplicacion/    Pega el dominio con los datos (procesar jornada, resumen de
                  corte, estado del dia de marcado).
  features/      Pantallas: dashboard, marcar, registros, reportes, config.
  components/    UI compartida (nav, tarjetas).
  ocr/           Envoltorio de Tesseract.js.
  utils/         Fechas, imagenes (compresion WebP, hash SHA-256), exportes.
android/         Proyecto nativo generado por Capacitor (no editar a mano
                  salvo build.gradle para la config de firma).
.github/workflows/  CI: pruebas + deploy web + build de APK firmado.
```

## Motor de calculo

Implementa el Codigo de Trabajo de El Salvador de forma **parametrizable**
(nada quemado en el codigo):

- Horario diurno 06:00-19:00 / nocturno 19:00-06:00 (Art. 161), con jornada
  mixta (>3.5h nocturnas = jornada nocturna, tope 7h en vez de 8h).
- Turnos que cruzan la medianoche (la jornada pertenece al dia de ENTRADA).
- Matriz de factores editable en Configuracion > Reglas de pago (valores por
  defecto verificados contra una boleta real: extra diurna 200%, extra
  nocturna 250%).
- Tope semanal (44h Recibo / 39h Despacho) calculado por turno, soportando
  rotacion de turno a mitad de corte.
- Deducciones ISSS/AFP/ISR **estimadas** (la tabla de ISR sembrada es un
  EJEMPLO de estructura -- verifica la vigente antes de confiar en el neto).

Cobertura de pruebas (Vitest, dominio 100% puro): cruce de medianoche, jornada
mixta, asueto nocturno con extras, dia de descanso laborado, cambio de turno a
mitad de corte, y un "golden test" contra los numeros reales de una boleta de
pago.

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

Todo vive en el dispositivo (IndexedDB). No hay login ni backend por defecto.
El respaldo/restauracion en JSON y el bloqueo con PIN/biometria estan
modelados en el esquema de datos pero su UI todavia esta pendiente (ver
seccion de limitaciones conocidas en el historial de commits).

## Licencia / alcance

Proyecto personal, pensado para que cualquier colaborador de Walmart El
Salvador lo adapte a su propio turno y salario desde Configuracion.
