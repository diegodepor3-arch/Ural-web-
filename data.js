// Datos que mantiene el club a mano. Equipos, plantillas, partidos y clasificaciones
// vienen de la federación en federacion.js (lo genera actualizar.py).

const CLUB = {
  nombre: "Ural Español C.F.",
  corto: "Ural",
  fundado: 1929,
  barrio: "Santa Lucía · A Coruña",
  email: "", // pendiente: correo del club
  direccion: "", // pendiente: dirección de la sede
  x: "https://x.com/uralespanol",
  federacion: "https://www.futgal.es/pnfg/NPcd/NFG_VerClub?cod_primaria=1000118&codigo_club=1023",
};

// Equipo que manda en la portada: el Juvenil A de División de Honor (el club no tiene equipo sénior desde 2026)
const PRINCIPAL = "juvenil-a";

// De mayor a menor: es el orden de las tarjetas de categorías.
const CATEGORIAS = [
  { id: "juvenil", nombre: "Juveniles", singular: "Juvenil", edad: "16-18 años" },
  { id: "cadete", nombre: "Cadetes", singular: "Cadete", edad: "14-15 años" },
  { id: "infantil", nombre: "Infantiles", singular: "Infantil", edad: "12-13 años" },
  { id: "alevin", nombre: "Alevines", singular: "Alevín", edad: "10-11 años" },
  { id: "benjamin", nombre: "Benjamines", singular: "Benjamín", edad: "8-9 años" },
  { id: "prebenjamin", nombre: "Prebenjamines", singular: "Prebenjamín", edad: "6-7 años" },
  { id: "biberon", nombre: "Biberón", singular: "Biberón", edad: "4-5 años" },
  { id: "veteranos", nombre: "Veteranos", singular: "Veteranos", edad: "Vuelta Xentes" },
];

// Por equipo (id de federacion.js): vídeos y fotos.
// Fotos: solo se muestran en juveniles; app.js lo fuerza aunque aquí haya otras.
// fotos: { "Nombre Como Sale En La Plantilla": "img/jugadores/archivo.jpg" }
// videos: tipo "highlight" | "entrevista", youtube = id del vídeo
// jugadores: lo que la federación no publica:
//   { "Nombre Como Sale En La Plantilla": { posicion: "Delantero", nacimiento: "2008-05-14", mvp: 2 } }
// Partidos, titularidades, goles, tarjetas y dorsal salen solos de las actas de la federación.
const EXTRA = {
  "juvenil-a": {
    fotos: {},
    videos: [],
    jugadores: {},
  },
};

// Historia (fuente: Galipedia, "Ural Español Club de Fútbol" y "Ural Club de Fútbol")
const HISTORIA = {
  nombres: [
    { desde: 1929, hasta: 1935, nombre: "Deportivo Alameda" },
    { desde: 1935, hasta: 1941, nombre: "Derby Sociedad Deportiva" },
    { desde: 1941, hasta: 2020, nombre: "Español Sociedad Deportiva" },
    { desde: 2020, hasta: null, nombre: "Ural Español Club de Fútbol" },
  ],
  hitos: [
    { anio: 1929, texto: "Nace en Santa Lucía como Deportivo Alameda." },
    { anio: 1962, texto: "Un grupo de jóvenes que jugaba en Santa Margarita funda el Ural C.F. Los estudiantes vieron en el monte de Santa Margarita los montes Urales, y de ahí el nombre. Entre ellos estaba Augusto César Lendoiro, que acabaría dirigiendo el club." },
    { anio: 1996, texto: "El Español S.D. gana la Primera Autonómica y sube a Preferente, donde juega nueve temporadas." },
    { anio: 2018, texto: "Campeón de Tercera Galicia." },
    { anio: 2020, texto: "El Ural C.F., dedicado al fútbol base y filial del Español, cesa su actividad. Sus equipos pasan al Español, que adopta su escudo, su equipación y su nombre: Ural Español C.F." },
    { anio: 2026, texto: "El club compite solo en fútbol base, con el Juvenil A en División de Honor." },
  ],
  palmares: [
    { titulo: "Copa da Coruña", veces: 5, anios: "1942, 1949, 1971, 2001, 2004" },
    { titulo: "Primera Autonómica", veces: 1, anios: "1995-96" },
    { titulo: "Segunda Autonómica", veces: 1, anios: "1993-94" },
    { titulo: "Tercera Autonómica / Galicia", veces: 2, anios: "1992-93, 2017-18" },
  ],
  // Categoría del primer equipo por temporada: nivel 4 = Preferente … 1 = 3ª Galicia/Autonómica
  niveles: ["", "3ª Autonómica", "2ª Autonómica", "1ª Autonómica", "Preferente"],
  temporadas: [
    ["1991-92", 1, 4], ["1992-93", 1, 1], ["1993-94", 2, 1], ["1994-95", 3, 3], ["1995-96", 3, 1],
    ["1996-97", 4, 8], ["1997-98", 4, 9], ["1998-99", 4, 15], ["1999-00", 4, 15], ["2000-01", 4, 4],
    ["2001-02", 4, 16], ["2002-03", 4, 13], ["2003-04", 4, 16], ["2004-05", 4, 20], ["2005-06", 3, 10],
    ["2006-07", 3, 18], ["2007-08", 2, 18], ["2008-09", 1, 13], ["2009-10", 1, 3], ["2010-11", 1, 5],
    ["2011-12", 2, 9], ["2012-13", 2, 8], ["2013-14", 2, 4], ["2014-15", 2, 3], ["2015-16", 2, 7],
    ["2016-17", 1, 2], ["2017-18", 1, 1], ["2018-19", 2, 10], ["2019-20", 2, 2], ["2021-22", 3, 3],
  ],
};

const NOTICIAS = [
  {
    id: "nueva-web",
    fecha: "2026-10-27",
    titulo: "Estrenamos web",
    resumen: "Todos los equipos del Ural, de biberón a juvenil, con sus partidos, resultados y clasificaciones al día en un solo sitio.",
    cuerpo: "Texto de ejemplo: sustituir por la noticia real.\n\nCada línea en blanco separa párrafos.",
  },
];
