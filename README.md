# Taylor

Taylor is a safety-first mobility platform: a ride-hailing experience built around identity verification, real-time trip monitoring, and trusted-contact safety features, with dedicated tools for riders, drivers, and institutional partners (schools, businesses, and local organizations).

This repository contains the marketing site — a single-page, bilingual (English/Spanish) site showcasing the product, the ecosystem, the team, and the Android app download.

## Project structure

```
index.html          Markup for all sections
css/style.css        Global styles
js/                   Feature modules (i18n, animations, background/WebGL, charts,
                       cursor, waitlist, download, promo-scroll)
img/                  Team photos and other images
video/                Promo scroll sequence assets
app/                  Downloadable Android APK
range_server.py       Local dev server with HTTP Range support (needed for
                       video scrubbing and APK downloads)
```

## Running locally

The site is static (no build step). To serve it locally with proper support for
range requests (required for video scrubbing and APK downloads):

```
python range_server.py <port> <directory>
```

Then open `http://localhost:<port>` in your browser.

## Tech stack

- Tailwind CSS
- Three.js (WebGL backgrounds)
- GSAP + ScrollTrigger (scroll-driven animation)
- Lenis (smooth scroll)
- Chart.js (data visualizations)

## Deploying

The site is a static bundle and can be deployed to any static host (e.g. Netlify).
A `_headers` file should set the correct `Content-Type` for the `.apk` file under
`/app` if your host doesn't recognize the extension by default.

---

# Taylor (Español)

Taylor es una plataforma de movilidad enfocada en seguridad: una experiencia de
transporte bajo demanda construida sobre verificación de identidad, monitoreo de
viajes en tiempo real y funciones de seguridad con contactos de confianza, con
herramientas dedicadas para pasajeras, conductoras y socios institucionales
(escuelas, empresas y organizaciones locales).

Este repositorio contiene el sitio de marketing — una página única y bilingüe
(inglés/español) que presenta el producto, el ecosistema, el equipo y la descarga
de la app de Android.

## Estructura del proyecto

```
index.html          Marcado de todas las secciones
css/style.css        Estilos globales
js/                   Módulos por funcionalidad (i18n, animaciones, fondo/WebGL,
                       gráficas, cursor, lista de espera, descarga, promo-scroll)
img/                  Fotos del equipo y otras imágenes
video/                Assets de la secuencia del scroll promocional
app/                  APK descargable de Android
range_server.py       Servidor de desarrollo local con soporte de HTTP Range
                       (necesario para el scrubbing de video y la descarga del APK)
```

## Ejecutar localmente

El sitio es estático (sin paso de build). Para servirlo localmente con soporte
correcto de range requests (necesario para el scrubbing de video y la descarga
del APK):

```
python range_server.py <puerto> <directorio>
```

Luego abre `http://localhost:<puerto>` en tu navegador.

## Stack tecnológico

- Tailwind CSS
- Three.js (fondos WebGL)
- GSAP + ScrollTrigger (animación ligada al scroll)
- Lenis (scroll suave)
- Chart.js (visualización de datos)

## Despliegue

El sitio es un paquete estático y puede desplegarse en cualquier hosting estático
(por ejemplo Netlify). Un archivo `_headers` debe definir el `Content-Type`
correcto para el archivo `.apk` dentro de `/app` si tu hosting no reconoce esa
extensión por defecto.
