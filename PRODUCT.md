# Product

## Platform

web

## Stack

HTML, CSS y JavaScript estáticos, sin frameworks. Código en GitHub, publicado en Vercel. `actualizar.py` genera `federacion.js` cada hora (GitHub Actions) y Vercel redespliega.

## Users

- Familias de la cantera: cuándo y dónde juega su hijo el fin de semana, desde el móvil.
- Aficionados del Juvenil A (División de Honor): resultados, clasificación, rivales.
- Jugadores y entrenadores: plantilla, calendario, estadísticas.
- Patrocinadores y prensa: imagen del club, historia, noticias.

## Product Purpose

Web oficial del Ural Español C.F. (Santa Lucía, A Coruña, desde 1929). Desde 2026 el club solo tiene fútbol base: 23 equipos de biberón a juvenil, más veteranos. El equipo principal es el Juvenil A en División de Honor.

## Data

- futgal.es (club 1023): todos los equipos excepto el calendario del Juvenil A.
- División de Honor Juvenil la organiza la RFEF y no está en futgal: el calendario sale de futbolme.com y la clasificación se calcula con los resultados de cada jornada (no recoge sanciones de puntos).
- futgal bloquea la IP si se le piden muchas páginas seguidas: cada ejecución sigue donde lo dejó la anterior.

## Brand

- Colores del escudo: marino, oro, cielo y verde monte. Fondo papel.
- El nombre viene de los estudiantes que veían los montes Urales en el monte de Santa Margarita: montañas y curvas de nivel como motivo gráfico.
- Tipografías: Fraunces (títulos), Geist (texto), Geist Mono (cifras y etiquetas).
- Diseño deliberadamente distinto de las webs del Montañeros y del Rayo Vilaboa (oscuras y redondeadas): esta es clara, editorial y de esquinas rectas.

## Pending from the club

- Email, dirección de la sede, campo habitual, Instagram.
- Precios de socio, fotos (solo juveniles), noticias reales, vídeos.
- Posición y fecha de nacimiento de los jugadores del Juvenil A (`data.js` → EXTRA).

## Product Principles

1. Lo primero es cuándo y dónde se juega.
2. Todas las categorías tienen el mismo peso.
3. Datos automáticos; lo manual se limita a noticias, vídeos y fotos.
4. La seguridad de los menores no es negociable: fotos solo en juveniles, forzado en `app.js`.
