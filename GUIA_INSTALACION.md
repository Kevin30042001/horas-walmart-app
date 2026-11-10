# Guia de instalacion - Mis Horas

Pensada para instalar la app **sin usar una computadora**, solo con el celular
y el navegador. Dos formas de tenerla: como PWA (recomendada, se actualiza
sola) o como APK instalado (para cuando quieras el icono "nativo").

## 0. Activar GitHub Pages (una sola vez, lo hace quien administra el repo)

1. En GitHub, entra al repo `horas-walmart-app`.
2. **Settings > Pages**.
3. En "Source" elige **GitHub Actions** y guarda.
4. Ve a la pestaña **Actions** y confirma que el workflow **"Deploy web
   (GitHub Pages)"** termino en verde. Al terminar, la URL de la app aparece
   en ese mismo workflow (o en Settings > Pages).

A partir de aqui, cada vez que se suba codigo nuevo a `main`, la web se
actualiza sola.

## 1. Instalar como PWA en Android (recomendado)

1. Abre **Chrome** en tu celular y entra a la URL de la app
   (`https://<tu-usuario>.github.io/horas-walmart-app/`).
2. Toca el menu de tres puntos (arriba a la derecha) y elige **"Instalar
   aplicacion"** o **"Agregar a pantalla de inicio"**.
3. Confirma. Te va a quedar un icono como cualquier app normal.
4. Listo -- funciona sin internet despues de abrirla una vez (los datos viven
   en el celular, no en un servidor).

## 2. Instalar como PWA en iPhone

1. Abre **Safari** (tiene que ser Safari, no Chrome) y entra a la misma URL.
2. Toca el boton de **Compartir** (el cuadrito con la flecha hacia arriba).
3. Elige **"Agregar a inicio"**.
4. Confirma el nombre y toca **Agregar**.

## 3. Instalar el APK (opcional, si preferis un instalador tradicional)

1. En GitHub, ve a la pestaña **Actions > Build APK firmado**.
2. Si no existe todavia ninguna ejecucion, dispara una manual: boton **"Run
   workflow"**.
3. Cuando termine (circulo verde), entra a esa ejecucion y descarga el
   artifact **"mis-horas-apk"** (es un .zip, adentro esta el .apk).
4. En tu Android: abre el .zip descargado (el explorador de archivos del
   celular puede abrirlo), extrae el .apk.
5. Toca el archivo .apk. Si es la primera vez que instalas algo fuera de
   Play Store, Android va a pedir permiso -- acepta **"Permitir de esta
   fuente"** cuando lo pregunte.
6. Toca **Instalar**.

**Para actualizar el APK despues:** repetis los pasos 1-6 con una ejecucion
nueva del workflow. Como el keystore de firma es siempre el mismo (una vez
configurado, ver `README.md`), Android deja instalar la actualizacion
encima de la version anterior sin perder tus datos.

## 4. Primera configuracion dentro de la app

Al abrir la app por primera vez ya viene con turnos Despacho/Recibo, reglas de
pago, asuetos y deducciones de ejemplo precargados. Lo minimo que conviene
ajustar antes de usarla en serio:

1. **Configuracion > Perfil**: tu nombre, gafete y salario mensual.
2. **Configuracion > Cortes**: genera el calendario de cortes (regla base 14 y
   28, editable despues fecha por fecha).
3. **Configuracion > Reglas de pago / Deducciones**: revisa que los factores y
   las tasas de ISSS/AFP/ISR calcen con tu realidad (la tabla de ISR sembrada
   es un EJEMPLO, no la oficial -- ver aviso en la app).
4. **Configuracion > Turnos**: ajusta el horario de cada dia, horas semanales
   y dia libre si tu turno real no calza con los valores de ejemplo (Despacho
   nocturno / Recibo diurno), y registra la rotacion si cambias de turno.

Despues de eso, ya podes usar la pestana **Marcar** para tu entrada/salida del
dia a dia.
