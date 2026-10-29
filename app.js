// Protección de menores: solo estas categorías muestran foto, diga lo que diga data.js.
const CATEGORIAS_CON_FOTO = new Set(["juvenil"]);

const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const icono = (id, cls = "icono") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const plural = (n, s, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;

// Fotos de A Coruña y del fútbol gallego (Wikimedia Commons, créditos en el pie). Ninguna es del club.
const FOTO = {
  galerias: { src: "assets/a-coruna-galerias-07.jpg", alt: "Galerías de la Marina, A Coruña", w: 1600, h: 1200 },
  galeriasDetalle: { src: "assets/galerias-glazed-window-balconies-a-coruna-galicia.jpg", alt: "Detalle de las galerías acristaladas de A Coruña", w: 1009, h: 1600 },
  partido: { src: "assets/ud-ourense-villalonga-cf-lance-do-xogo.jpg", alt: "Partido de fútbol gallego: UD Ourense contra Villalonga", w: 1600, h: 958 },
  torre: { src: "assets/torre-de-hercules-divesgallaecia2012-62.jpg", alt: "La Torre de Hércules, A Coruña", w: 1600, h: 1067 },
  lluvia: { src: "assets/rua-real-dia-de-lluvia-panoramio.jpg", alt: "La Rúa Real de A Coruña en un día de lluvia", w: 1200, h: 1600 },
  orzan: { src: "assets/playa-de-el-orzan-panoramio.jpg", alt: "Temporal en la playa del Orzán, A Coruña", w: 1600, h: 1200 },
};
const foto = (f, cls = "", lazy = true) =>
  `<img class="${cls}" src="${f.src}" alt="${esc(f.alt)}" width="${f.w}" height="${f.h}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}>`;

// --- Fechas -------------------------------------------------------------
const dia = (f) => new Date(`${f}T12:00`); // mediodía: sin líos de zona horaria
const fmt = (f, op) => dia(f).toLocaleDateString("es-ES", op).replace(".", "");
const fechaCorta = (f) => `${fmt(f, { weekday: "short" })} ${fmt(f, { day: "numeric", month: "short" })}`;
const hoy = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
const sumarDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// --- Equipos ------------------------------------------------------------
const categoria = (id) => CATEGORIAS.find((c) => c.id === id) || { id, nombre: mayus(id), singular: mayus(id) };
const equipo = (id) => EQUIPOS.find((e) => e.id === id);
const modalidad = (e) => e.liga.includes("F-11") ? " F-11" : e.liga.includes("F-7") ? " F-7" : e.liga.includes("F.S") ? " sala" : "";
const nombreEquipo = (e) => e.categoria === "veteranos" ? "Veteranos"
  : `${categoria(e.categoria).singular} ${e.letra}${modalidad(e)}`;
const rutaEquipo = (e) => `#/equipo/${e.id}`;
const filaPropia = (e) => e.clasificacion.findIndex((f) => f.propio);
const proximo = (e) => e.partidos.find((p) => !p.resultado);
const todosLosPartidos = () => EQUIPOS.flatMap((e) => e.partidos.map((p) => ({ ...p, e })));
const ordenCat = (e) => CATEGORIAS.findIndex((c) => c.id === e.categoria);
// Dorsales sacados de las actas; se comparan sin tildes por si las dos fuentes escriben distinto
const dorsal = (e, nombre) => Object.entries(e.dorsales || {}).find(([k]) => normal(k) === normal(nombre))?.[1];

function marcador(p) {
  const [l, v] = p.resultado.split("-").map(Number);
  const nos = p.local ? l : v, ellos = p.local ? v : l;
  return { l, v, nos, ellos, res: nos > ellos ? "G" : nos < ellos ? "P" : "E" };
}
const RESULTADO = { G: "Victoria", E: "Empate", P: "Derrota" };

const iniciales = (n) => n.replace(/[^A-ZÁÉÍÓÚÑ ]/gi, "").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
// Escudo sin fondo (escudos.py lo recorta y lo guarda en img/escudos); si aún no está, el de la federación
const sinFondo = (url) => (typeof ESCUDOS === "object" && ESCUDOS[url]) || url;
const escudoDe = (e, nombre) => e.escudos?.[nombre]
  ? `<img class="escudo" src="${esc(sinFondo(e.escudos[nombre]))}" alt="" width="40" height="40" loading="lazy">`
  : `<span class="escudo escudo--vacio" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
const nuestro = `<img class="escudo" src="img/escudo.png" alt="" width="40" height="38">`;
const vacio = (txt) => `<p class="vacio">${txt}</p>`;
const actualizado = (f) => new Date(f).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// Local primero, como en el cartel
const cruce = (p) => p.local ? `${CLUB.corto} – ${p.rival}` : `${p.rival} – ${CLUB.corto}`;

// La semana en curso (lunes a domingo) y la anterior
function semanas() {
  const lunes = sumarDias(hoy(), -((hoy().getDay() + 6) % 7)), domingo = sumarDias(lunes, 6);
  const en = (p, a, b) => p.fecha && dia(p.fecha) >= a && dia(p.fecha) <= b;
  const todos = todosLosPartidos();
  const orden = (a, b) => (a.fecha + (a.hora || "99")).localeCompare(b.fecha + (b.hora || "99")) || ordenCat(a.e) - ordenCat(b.e);
  return {
    lunes, domingo,
    esta: todos.filter((p) => en(p, lunes, domingo)).sort(orden),
    pasada: todos.filter((p) => p.resultado && en(p, sumarDias(lunes, -7), sumarDias(lunes, -1)))
      .sort((a, b) => ordenCat(a.e) - ordenCat(b.e) || a.e.letra.localeCompare(b.e.letra)),
  };
}

// --- Inicio: el álbum ----------------------------------------------------
function inicio() {
  const { esta, pasada } = semanas();
  const pendientes = esta.filter((p) => !p.resultado);
  const principal = equipo(PRINCIPAL);

  return `
    <section class="tapa" aria-labelledby="tapa-titulo">
      <div class="tapa-carton">
        <img class="tapa-escudo" src="img/escudo.png" alt="" width="120" height="114">
        <h1 class="tapa-titulo" id="tapa-titulo"><span class="linea"><span>Ural</span></span><span class="linea linea--2"><span>Español</span></span></h1>
        <p class="tapa-que">El álbum del fútbol base de Santa Lucía, A Coruña</p>
        <p class="tapa-datos"><span>Temporada 2026-27</span><i aria-hidden="true"></i><span>${EQUIPOS.length} equipos</span><i aria-hidden="true"></i><span>Desde ${CLUB.fundado}</span></p>
        ${pendientes.length ? `<p class="tapa-finde">Este fin de semana juegan <b>${plural(pendientes.length, "partido")}</b>.</p>` : ""}
      </div>
    </section>

    ${donde()}

    <section class="agenda" id="agenda" aria-labelledby="agenda-titulo">
      <div class="agenda-columna">
        <h2 class="palabra" id="agenda-titulo">Partidos</h2>
        <p class="agenda-sub">De esta semana, por categorías. Pulsa una para ver sus horarios.</p>
        ${esta.length ? agenda(esta) : vacio("La federación aún no ha publicado partidos para esta semana.")}
      </div>
      <figure class="agenda-foto">${foto(FOTO.lluvia)}<figcaption>Sábado de lluvia en la Rúa Real, A Coruña</figcaption></figure>
    </section>

    ${pasada.length ? cifrasSemana(pasada, principal) : ""}

    ${principal ? juvenil(principal) : ""}

    <section class="cromos-seccion" id="equipos" aria-labelledby="cromos-titulo">
      <h2 class="titulo" id="cromos-titulo">La colección: ${EQUIPOS.length} equipos</h2>
      ${muro()}
    </section>

    <section class="carta-seccion" id="historia" aria-labelledby="carta-titulo">
      <article class="carta">
        <img class="carta-escudo" src="img/escudo.png" alt="" width="44" height="42">
        <h2 class="carta-titulo" id="carta-titulo">Una carta del club</h2>
        <p>Somos el Ural Español, y llevamos jugando en Santa Lucía desde ${CLUB.fundado}. Empezamos como Deportivo Alameda, fuimos Derby y Español S.D., y en 2020 recogimos el nombre y el escudo del Ural C.F.</p>
        <p>El nombre lo pusieron unos estudiantes que jugaban en Santa Margarita: miraban el monte y veían los <mark>montes Urales</mark>. Por eso hay montañas en el escudo.</p>
        <p>Hoy somos ${EQUIPOS.length} equipos, de los 4 a los 18 años, y unos veteranos que no lo dejan. Cada fin de semana llenamos los campos de Grela, Torre y Elviña.</p>
        <p class="carta-firma"><span>Ural Español C.F.</span><small>Santa Lucía, A Coruña</small></p>
        <a class="carta-tira" href="#/historia">Lee la historia completa del club</a>
      </article>
    </section>

    <section class="respuesta" aria-labelledby="respuesta-titulo">
      <p class="respuesta-texto">Cada carné sostiene a ${EQUIPOS.length} equipos: material, árbitros, desplazamientos y entrenadores.</p>
      <div class="respuesta-tarjeta">
        <h2 id="respuesta-titulo">Hazte socio</h2>
        <p>Temporada 2026-27. Tu nombre en el álbum del Ural.</p>
        <a class="barra" href="#/socios">Quiero hacerme socio</a>
      </div>
    </section>`;
}

// El Juvenil A: foto con muesca de entrada a un lado; sus datos y dos accesos al otro
function juvenil(e) {
  const pos = filaPropia(e), fila = e.clasificacion[pos], p = proximo(e);
  return `
    <section class="juvenil" id="juvenil" aria-labelledby="juvenil-titulo">
      <figure class="juvenil-foto">${foto(FOTO.partido)}</figure>
      <div class="juvenil-texto">
        <div>
          <h2 class="titulo" id="juvenil-titulo">Juvenil A</h2>
          <p class="lead">${fila ? `${pos + 1}º de ${e.clasificacion.length} con ${fila.pts} puntos en División de Honor, la liga nacional más alta de su edad.` : "En División de Honor, la liga nacional más alta de su edad."}${p ? ` Próximo partido: ${esc(mayus(fechaCorta(p.fecha)))}${p.hora ? ` a las ${esc(p.hora)}` : ""}, ${p.local ? "contra" : "en casa de"} ${esc(p.rival)}.` : ""}</p>
        </div>
        <p class="juvenil-acciones">
          <a class="celda celda--tinta" href="${rutaEquipo(e)}/plantilla">Ver sus cromos</a>
          <a class="celda" href="${rutaEquipo(e)}/clasificacion">Clasificación</a>
        </p>
      </div>
    </section>`;
}

// ¿Dónde juega tu hijo?: eliges el equipo y sale su próximo partido como un cartel
const CLAVE_EQUIPO = "ural-equipo";
const recordado = () => { try { return localStorage.getItem(CLAVE_EQUIPO); } catch { return null; } };
function donde() {
  const elegido = equipo(recordado()) || equipo(PRINCIPAL) || EQUIPOS[0];
  if (!elegido) return "";
  const grupos = CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id));
  return `
    <section class="donde" id="donde" aria-labelledby="donde-titulo">
      <div class="donde-elige">
        <h2 class="titulo" id="donde-titulo">¿Dónde juega tu hijo?</h2>
        <label class="donde-etiqueta" for="donde-equipo">Elige su equipo</label>
        <select id="donde-equipo" class="donde-select">
          ${grupos.map((c) => `<optgroup label="${esc(c.nombre)}">${EQUIPOS.filter((e) => e.categoria === c.id).map((e) =>
            `<option value="${e.id}"${e === elegido ? " selected" : ""}>${esc(nombreEquipo(e))}</option>`).join("")}</optgroup>`).join("")}
        </select>
      </div>
      <div class="donde-cartel" aria-live="polite">${cartel(elegido)}</div>
    </section>`;
}

function cartel(e) {
  const p = proximo(e);
  if (!p) return `<p class="cartel-vacio">${esc(nombreEquipo(e))} no tiene partidos pendientes.</p>
    <a class="enlace" href="${rutaEquipo(e)}">Ver su temporada ${icono("i-flecha")}</a>`;
  const mapa = p.campo && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.campo}, A Coruña`)}`;
  return `
    <p class="cartel-cuando">${esc(mayus(fmt(p.fecha, { weekday: "long", day: "numeric", month: "long" })))}${p.hora ? ` · ${esc(p.hora)}` : " · hora por confirmar"}</p>
    <p class="cartel-cruce">${esc(cruce(p))}</p>
    <p class="cartel-donde">${p.campo ? esc(p.campo) : "Campo por confirmar"} · ${esc(nombreEquipo(e))}, jornada ${p.jornada}</p>
    <p class="cartel-acciones">
      <a class="boton" href="${calendarioIcs(p, e)}" download="ural-${e.id}-j${p.jornada}.ics">Añadir al calendario</a>
      ${mapa ? `<a class="boton boton--claro" href="${mapa}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
      <a class="enlace" href="${rutaEquipo(e)}">Todo su calendario ${icono("i-flecha")}</a>
    </p>`;
}

// Evento .ics para el calendario del móvil: hora local de A Coruña, hora y media de partido
function calendarioIcs(p, e) {
  const f = p.fecha.replaceAll("-", "");
  const cuando = p.hora
    ? (() => {
        const [h, m] = p.hora.split(":").map(Number), fin = h * 60 + m + 90;
        const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;
        return `DTSTART;TZID=Europe/Madrid:${f}T${hhmm(h * 60 + m)}\r\nDTEND;TZID=Europe/Madrid:${f}T${hhmm(fin)}`;
      })()
    : `DTSTART;VALUE=DATE:${f}`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ural Español CF//Web//ES", "BEGIN:VEVENT",
    `UID:${e.id}-${p.jornada}@ural-web`, cuando, `SUMMARY:${nombreEquipo(e)}: ${cruce(p)}`,
    `LOCATION:${p.campo || "Campo por confirmar"}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

// Agenda: una barra por categoría que se despliega con sus partidos de la semana
function agenda(partidos) {
  const cats = CATEGORIAS.filter((c) => partidos.some((p) => p.e.categoria === c.id));
  return `<div class="barras">${cats.map((c, i) => {
    const suyos = partidos.filter((p) => p.e.categoria === c.id);
    return `
    <details class="barra-cat"${i === 0 ? " open" : ""}>
      <summary><span>${esc(c.nombre)}</span><small>${plural(suyos.length, "partido")}</small></summary>
      <ul>${suyos.map((p) => {
        const m = p.resultado && marcador(p);
        return `<li><a href="${rutaEquipo(p.e)}">
          <span><b>${esc(nombreEquipo(p.e))}</b> ${p.local ? "contra" : "en casa de"} ${esc(p.rival)}<small>${esc(mayus(fechaCorta(p.fecha)))}${p.campo ? `, ${esc(p.campo)}` : ""}</small></span>
          <span class="barra-hora${m ? ` barra-hora--${m.res}` : ""}">${m ? `${m.nos}-${m.ellos}` : esc(p.hora || "--:--")}</span>
        </a></li>`;
      }).join("")}</ul>
    </details>`;
  }).join("")}</div>`;
}

// La semana pasada como un libro de cuentas: cifras alineadas en la coma
function cifrasSemana(pasada, principal) {
  const ganados = pasada.filter((p) => marcador(p).res === "G").length;
  const goles = pasada.reduce((s, p) => s + marcador(p).nos, 0);
  const media = (goles / pasada.length).toFixed(1).split(".");
  const pos = principal ? filaPropia(principal) : -1;
  const fila = (entero, dec, texto) => `<div class="cuenta-fila"><b>${entero}</b><b class="cuenta-dec">${dec ? `,${dec}` : ""}</b><span>${texto}</span></div>`;
  return `
    <section class="cuentas" aria-labelledby="cuentas-titulo">
      <h2 class="cuentas-titulo" id="cuentas-titulo"><span>La semana pasada,</span> en números</h2>
      <div class="cuentas-cifras">
        ${fila(pasada.length, "", "partidos jugados")}
        ${fila(ganados, "", "victorias")}
        ${fila(goles, "", "goles del Ural")}
        ${fila(media[0], media[1], "goles por partido")}
        ${pos >= 0 ? fila(`${pos + 1}º`, "", "el Juvenil A en División de Honor") : ""}
      </div>
      <div class="cuentas-todos">
        <h3 class="subtitulo">Todos los resultados</h3>
        <ul class="resultados">${pasada.map((p) => {
          const m = marcador(p);
          return `<li><a href="${rutaEquipo(p.e)}"><span>${esc(nombreEquipo(p.e))}</span><b class="res-${m.res}">${m.nos}-${m.ellos}</b><span>${p.local ? "contra" : "en casa de"} ${esc(p.rival)}</span></a></li>`;
        }).join("")}</ul>
      </div>
    </section>`;
}

// La colección: un cromo por categoría, foto arriba y banda de datos debajo
function muro() {
  const cats = CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id));
  const fotos = [FOTO.partido, FOTO.galeriasDetalle, FOTO.lluvia, FOTO.torre, FOTO.orzan, FOTO.galerias];
  return `<ul class="cromos">${cats.map((c, i) => {
    const eqs = EQUIPOS.filter((e) => e.categoria === c.id);
    return `<li><a class="cromo-cat" href="#/cantera/${c.id}" style="--pos:${(i * 37) % 100}%">
      ${foto(fotos[i % fotos.length])}
      <span class="cromo-banda">
        <b>${esc(c.nombre)}</b>
        <span><span>${plural(eqs.length, "equipo")}</span><span>${esc(c.edad || "")}</span></span>
      </span>
    </a></li>`;
  }).join("")}</ul>`;
}

// Historia con el título fijo a la izquierda mientras pasan los momentos
// En la portada, tres momentos; en la página de historia, todos
function historiaFija(todos = false) {
  const fotos = todos ? [FOTO.torre, FOTO.lluvia, FOTO.galeriasDetalle] : [FOTO.torre];
  const hitos = todos ? HISTORIA.hitos : HISTORIA.hitos.filter((h) => [1929, 1962, 2020].includes(h.anio));
  return `
    <section class="fija" aria-labelledby="fija-titulo">
      <h2 class="fija-titulo" id="fija-titulo">Desde ${CLUB.fundado}</h2>
      <ol class="fija-momentos">${hitos.map((h, i) => `
        <li class="momento">
          ${fotos[i] ? `<figure>${foto(fotos[i])}</figure>` : ""}
          <b>${h.anio}</b>
          <p>${esc(h.texto)}</p>
        </li>`).join("")}
      </ol>
      <a class="enlace fija-mas" href="#/historia">La historia completa ${icono("i-flecha")}</a>
    </section>`;
}

// --- Equipo -------------------------------------------------------------
function vistaEquipo(id, sub = "", jugador = "") {
  const e = equipo(id);
  if (!e) return noEncontrado();
  if (sub === "plantilla" && jugador) return vistaFicha(e, jugador);
  const p = proximo(e) && { ...proximo(e), e };
  const partidos = e.partidos.map((x) => ({ ...x, e, esHoy: x.fecha === iso(hoy()) }));
  const jugados = partidos.filter((x) => x.resultado);
  const extra = EXTRA[e.id] || {};
  const videos = (tipo) => (extra.videos || []).filter((v) => v.tipo === tipo && v.youtube);
  const pos = filaPropia(e), fila = e.clasificacion[pos];
  const racha = jugados.slice(-5).map((x) => marcador(x).res);
  const SECCION = { calendario: "Calendario", plantilla: "Los cromos", clasificacion: "Clasificación" };

  const cabecera = `
    <section class="cab cab--equipo">
      <div class="cab-texto">
        <p class="migas"><a href="#/cantera">Equipos</a> / <a href="#/cantera/${e.categoria}">${esc(categoria(e.categoria).nombre)}</a>${sub ? ` / <a href="${rutaEquipo(e)}">${esc(nombreEquipo(e))}</a>` : ""}</p>
        <h1 class="cab-titulo">${esc(sub && SECCION[sub] ? `${SECCION[sub]}` : nombreEquipo(e))}</h1>
        <p class="cab-sub">${sub ? `${esc(nombreEquipo(e))} · ` : ""}${esc(e.competicion || e.liga)}</p>
        ${fila && !sub ? `
        <dl class="cifras">
          <div><dt>Posición</dt><dd>${pos + 1}º de ${e.clasificacion.length}</dd></div>
          <div><dt>Puntos</dt><dd>${fila.pts}</dd></div>
          <div><dt>Goles</dt><dd>${fila.gf} a ${fila.gc}</dd></div>
          ${racha.length ? `<div><dt>Últimos</dt><dd class="racha">${racha.map((r) => `<i class="marca res-${r}" title="${RESULTADO[r]}">${r === "P" ? "D" : r === "G" ? "V" : "E"}</i>`).join("")}</dd></div>` : ""}
        </dl>` : ""}
        <p class="fuente">Partidos de ${esc(e.fuente || "futgal.es (RFGF)")}${e.descargado ? `, actualizado ${esc(actualizado(e.descargado))}` : ", descarga pendiente: se actualiza sola cada hora"}.
          <a href="${esc(e.urlOficial || e.urlFederacion)}" target="_blank" rel="noopener">${e.urlOficial ? "Calendario oficial RFEF" : "Ficha en la RFGF"}</a></p>
      </div>
      ${p ? `<div class="cab-cartel"><h2 class="cab-cartel-titulo">Próximo partido</h2>${cartel(e)}</div>` : ""}
    </section>`;

  if (sub === "calendario") return `${cabecera}
    <section class="seccion" aria-label="Calendario">${partidos.length ? calendario(partidos, jugados.length) : vacio("La federación todavía no ha publicado el calendario.")}</section>`;
  if (sub === "clasificacion") return `${cabecera}
    <section class="seccion" aria-label="Clasificación">${tablaClasificacion(e)}
      ${e.urlClasificacion ? `<a class="enlace" href="${esc(e.urlClasificacion)}" target="_blank" rel="noopener">Ver en ${esc(e.fuente || "futgal.es")} ${icono("i-diagonal")}</a>` : ""}</section>`;
  if (sub === "plantilla") return `${cabecera}${plantilla(e)}`;
  if (sub) return `${cabecera}<section class="seccion">${vacio("Esta sección no existe.")}</section>`;

  return `${cabecera}
    <nav class="hub" aria-label="Secciones del equipo">
      ${tarjetaHub(e, "calendario", "Calendario",
        p ? `${fmt(p.fecha, { day: "numeric" })} ${fmt(p.fecha, { month: "short" })}` : partidos.length || "–",
        p ? `Próximo: ${p.local ? "contra" : "en casa de"} ${p.rival}` : partidos.length ? plural(partidos.length, "partido") : "Pendiente de la federación")}
      ${tarjetaHub(e, "plantilla", "Plantilla", e.plantilla.length || "–",
        e.plantilla.length ? `jugadores${e.entrenadores.length ? " y cuerpo técnico" : ""}` : "Pendiente de la federación")}
      ${tarjetaHub(e, "clasificacion", "Clasificación", fila ? `${pos + 1}º` : "–",
        fila ? `${fila.pts} puntos, ${plural(e.clasificacion.length, "equipo")}` : "Pendiente de la federación")}
    </nav>
    <section class="seccion" aria-labelledby="perfil-titulo">
      <h2 class="titulo" id="perfil-titulo">Así va la temporada</h2>
      ${perfilTemporada(jugados)}
    </section>
    ${videos("highlight").length ? `<section class="seccion"><h2 class="titulo">Resúmenes</h2>${listaVideos(videos("highlight"))}</section>` : ""}
    ${videos("entrevista").length ? `<section class="seccion"><h2 class="titulo">Entrevistas</h2>${listaVideos(videos("entrevista"))}</section>` : ""}`;
}

const tarjetaHub = (e, sub, tit, cifra, texto) => `
  <a class="hub-panel hub-panel--${sub}" href="${rutaEquipo(e)}/${sub}">
    <b class="hub-cifra">${esc(cifra)}</b>
    <span class="hub-titulo">${tit}</span>
    <span class="hub-texto">${esc(texto)}</span>
    ${icono("i-flecha", "icono hub-flecha")}
  </a>`;

// Calendario: la misma tabla de un solo tamaño que la agenda; lo lejano, plegado
function calendario(partidos, jugados) {
  const corte = jugados + 4;
  const fila = (p) => {
    const m = p.resultado && marcador(p);
    return `<li class="agenda-fila${m ? ` agenda-fila--${m.res}` : ""}${p.esHoy ? " agenda-fila--hoy" : ""}">
      <span class="agenda-equipo">${esc(p.fecha ? fmt(p.fecha, { day: "numeric", month: "short" }) : `Jornada ${p.jornada}`)}</span>
      <span class="agenda-rival">${p.local ? "contra" : "en casa de"} ${esc(p.rival)}</span>
      <span class="agenda-campo">${m ? RESULTADO[m.res] : esc(p.campo || `Jornada ${p.jornada}`)}</span>
      <span class="agenda-hora">${m ? `${m.nos}-${m.ellos}` : esc(p.hora || "--:--")}</span>
    </li>`;
  };
  return `<ul class="calendario-lista">${partidos.slice(0, corte).map(fila).join("")}</ul>
    ${partidos.length > corte ? `<details class="resto"><summary>Resto de la temporada (${partidos.length - corte} partidos)</summary>
      <ul class="calendario-lista">${partidos.slice(corte).map(fila).join("")}</ul></details>` : ""}`;
}

function tablaClasificacion(e) {
  if (!e.clasificacion.length) return vacio("La federación todavía no ha publicado la clasificación.");
  return `
    <div class="tabla-marco"><table class="tabla">
      <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col"><abbr title="Puntos">Pts</abbr></th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th><th scope="col" class="opc-movil"><abbr title="Ganados">G</abbr></th><th scope="col" class="opc-movil"><abbr title="Empatados">E</abbr></th><th scope="col" class="opc-movil"><abbr title="Perdidos">P</abbr></th><th scope="col" class="opc"><abbr title="Goles a favor">GF</abbr></th><th scope="col" class="opc"><abbr title="Goles en contra">GC</abbr></th><th scope="col"><abbr title="Diferencia de goles">DG</abbr></th></tr></thead>
      <tbody>${e.clasificacion.map((f, i) => `
        <tr${f.propio ? ' class="propio"' : ""}>
          <td>${i + 1}</td>
          <th scope="row"><span class="tabla-equipo">${f.propio ? nuestro : escudoDe(e, f.equipo)}<span>${esc(f.equipo)}</span></span></th>
          <td class="tabla-pts">${f.pts}</td>
          <td>${f.pj}</td><td class="opc-movil">${f.g}</td><td class="opc-movil">${f.e}</td><td class="opc-movil">${f.p}</td><td class="opc">${f.gf}</td><td class="opc">${f.gc}</td>
          <td>${f.gf - f.gc > 0 ? "+" : ""}${f.gf - f.gc}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

// Puntos acumulados jornada a jornada frente al ritmo de ganarlo todo
function perfilTemporada(jugados) {
  if (!jugados.length) return vacio("La gráfica aparece en cuanto se juegue la primera jornada.");
  const W = 900, H = 260, iz = 36, de = 16, ar = 20, ab = 34;
  const acum = [];
  jugados.forEach((p) => acum.push((acum.at(-1) || 0) + { G: 3, E: 1, P: 0 }[marcador(p).res]));
  const max = Math.max(3, 3 * jugados.length);
  const x = (i) => iz + ((i + 1) / jugados.length) * (W - iz - de);
  const y = (v) => ar + (1 - v / max) * (H - ar - ab);
  const linea = `M${iz} ${y(0)}` + acum.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const paso = jugados.length > 14 ? 2 : 1;
  return `
    <div class="perfil">
      <p class="perfil-frase"><b>${acum.at(-1)} puntos</b> de ${max} posibles: un ${Math.round((acum.at(-1) / max) * 100)}% de rendimiento.</p>
      <svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntos acumulados: ${acum.map((v, i) => `jornada ${jugados[i].jornada}, ${v}`).join("; ")}">
        <path d="M${iz} ${y(0)}L${x(jugados.length - 1)} ${y(max)}" class="grafica-ideal"/>
        <text x="${x(jugados.length - 1) - 6}" y="${y(max) + 18}" text-anchor="end" class="grafica-eje">ganándolo todo</text>
        <path d="${linea}L${x(jugados.length - 1)} ${y(0)}Z" class="grafica-area"/>
        <path d="${linea}" class="grafica-linea"/>
        ${jugados.map((p, i) => {
          const m = marcador(p);
          return `<g class="grafica-punto res-${m.res}"><title>Jornada ${p.jornada}, ${p.local ? "contra" : "en casa de"} ${p.rival}: ${m.nos}-${m.ellos}</title>
            <circle cx="${x(i)}" cy="${y(acum[i])}" r="6"/>
            ${i % paso === 0 || i === jugados.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="grafica-eje">J${p.jornada}</text>` : ""}</g>`;
        }).join("")}
      </svg>
      <p class="leyenda"><i class="marca res-G">V</i> Victoria <i class="marca res-E">E</i> Empate <i class="marca res-P">D</i> Derrota</p>
    </div>`;
}

// --- Plantilla ----------------------------------------------------------
// ponytail: la federación no dice quién es portero; sin posición conocida se usan los dorsales habituales
const PORTEROS = new Set([1, 13, 25]);
// Totales de lapreferente.com (solo Juvenil A, cuyas actas no publica la RFEF); mismo nombre sin tildes
const delaPreferente = (e, n) => Object.entries(e.perfiles?.jugadores || {}).find(([x]) => normal(x) === normal(n))?.[1];
// Edad y posición: lo que ponga el club en data.js manda; si no, lapreferente.com
const perfil = (e, n) => {
  const manual = ((EXTRA[e.id] || {}).jugadores || {})[n] || {}, lp = delaPreferente(e, n) || {};
  return { ...manual, posicion: manual.posicion || lp.posicion, edad: manual.nacimiento ? edad(manual.nacimiento) : lp.edad ?? null };
};
const esPortero = (e, n) => { const p = perfil(e, n).posicion; return p ? p === "Portero" : PORTEROS.has(dorsal(e, n)); };
const slug = (n) => normal(n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ordenJugadores = (e) => [...e.plantilla].sort((a, b) => (dorsal(e, a) ?? 999) - (dorsal(e, b) ?? 999));
const rutaFicha = (e, n) => `${rutaEquipo(e)}/plantilla/${slug(n)}`;

// Actas en las que el árbitro no apuntó a todos los goleadores del club (pasa mucho en fútbol 7 y 8)
function actasSinGoleadores(e) {
  const jugados = e.partidos.filter((p) => p.resultado && e.actas?.[p.jornada]);
  const faltan = jugados.filter((p) => Object.values(e.actas[p.jornada].g).reduce((s, v) => s + v, 0) < marcador(p).nos);
  return faltan.length ? `En ${faltan.length} de ${plural(jugados.length, "acta")} la federación no recoge a todos los goleadores: los goles de cada jugador pueden ser más.` : "";
}

function plantilla(e) {
  if (!e.plantilla.length && !e.entrenadores.length) return `<section class="seccion">${vacio("Plantilla pendiente de la federación.")}</section>`;
  const conFoto = CATEGORIAS_CON_FOTO.has(e.categoria);
  const fotos = (EXTRA[e.id] || {}).fotos || {};
  const conDatos = Object.keys(e.actas || {}).length > 0 || !!e.perfiles;
  return `
    <section class="seccion" aria-labelledby="plantilla-titulo">
      <h2 class="titulo" id="plantilla-titulo">${plural(e.plantilla.length, "cromo")} en esta página</h2>
      ${actasSinGoleadores(e) ? `<p class="aviso">${actasSinGoleadores(e)}</p>` : ""}
      <ul class="pagina-album">${ordenJugadores(e).map((n) => {
        const num = dorsal(e, n), est = conDatos ? estadisticas(e, n) : null, f = conFoto && fotos[n];
        return `<li><a class="cromo${esPortero(e, n) ? " cromo--portero" : ""}" href="${rutaFicha(e, n)}">
          <span class="cromo-cara">${f ? `<img src="${esc(f)}" alt="" width="300" height="400" loading="lazy">` : ""}<b>${num ?? iniciales(n)}</b></span>
          <span class="cromo-pie"><span class="cromo-nombre">${esc(n)}</span>${est ? `<small>${plural(est.jugados, "partido")}, ${plural(est.goles, "gol", "goles")}</small>` : ""}</span>
        </a></li>`;
      }).join("")}</ul>
      ${e.entrenadores.length || e.delegados.length ? `
        <h3 class="subtitulo">Cuerpo técnico</h3>
        <ul class="tecnicos">
          ${e.entrenadores.map((n) => `<li><b>${esc(n)}</b>, entrenador</li>`).join("")}
          ${e.delegados.map((n) => `<li><b>${esc(n)}</b>, delegado</li>`).join("")}
        </ul>` : ""}
      <a class="enlace" href="${esc(e.urlFederacion)}" target="_blank" rel="noopener">Ficha del equipo en la RFGF ${icono("i-diagonal")}</a>
    </section>`;
}

// Minutos de partido. Infantil y menores quedan fuera: se puede volver a entrar y la federación no publica los cambios
const DURACION = { juvenil: 90, cadete: 80, veteranos: 80 };

// Cuenta lo que hizo el jugador en las actas guardadas (o, sin actas, los totales de lapreferente.com)
function estadisticas(e, n) {
  const lp = !Object.keys(e.actas || {}).length && delaPreferente(e, n);
  if (lp) return { actas: 0, convocado: lp.pc, titular: lp.pt, jugados: lp.pj, goles: lp.goles, amarillas: lp.ta, rojas: lp.tr, minutos: lp.min, encajados: lp.encajados, jornadas: [], totales: true };
  const k = normal(n), es = (x) => normal(x) === k, dura = DURACION[e.categoria];
  const r = { actas: 0, convocado: 0, titular: 0, jugados: 0, goles: 0, amarillas: 0, rojas: 0, minutos: null, jornadas: [] };
  for (const [j, a] of Object.entries(e.actas || {}).sort((x, y) => x[0] - y[0])) {
    const t = a.t.some(es), s = a.s.some(es), en = a.e.some(es);
    const g = Object.entries(a.g).filter(([x]) => es(x)).reduce((suma, [, v]) => suma + v, 0);
    r.actas++; r.convocado += t || s; r.titular += t; r.jugados += t || en; r.goles += g;
    r.amarillas += a.a.filter(es).length; r.rojas += a.r.filter(es).length;
    r.jornadas.push({ j, estado: t ? "titular" : en ? "entra" : s ? "banquillo" : "no", g });
    if (dura && a.c) { // actas leídas antes de guardar los cambios no tienen "c": no cuentan
      const entra = t ? 0 : a.c.find(([x]) => es(x))?.[2];
      const sale = Math.min(dura, a.c.find(([, x]) => es(x))?.[2] ?? dura,
        Object.entries(a.rm || {}).find(([x]) => es(x))?.[1] ?? dura);
      r.minutos = (r.minutos ?? 0) + (entra == null ? 0 : Math.max(0, sale - Math.min(entra, dura)));
    }
  }
  return r;
}

const edad = (nacimiento) => {
  const n = new Date(`${nacimiento}T12:00`), h = new Date();
  return h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0);
};

// Jornada a jornada: una columna por acta; la altura es lo que jugó, los puntos los goles
function tiraJornadas(jornadas) {
  if (!jornadas.length) return vacio("Sin actas todavía.");
  const ALTO = { titular: 100, entra: 55, banquillo: 14, no: 6 };
  const NOMBRE = { titular: "titular", entra: "entró desde el banquillo", banquillo: "en el banquillo, no jugó", no: "no convocado" };
  return `
    <ol class="tira">${jornadas.map((p) => `
      <li class="tira-col tira-col--${p.estado}" aria-label="Jornada ${p.j}: ${NOMBRE[p.estado]}${p.g ? `, ${plural(p.g, "gol", "goles")}` : ""}">
        <span class="tira-goles" aria-hidden="true">${"●".repeat(Math.min(p.g, 4))}</span>
        <span class="tira-barra" style="--alto:${ALTO[p.estado]}%"></span>
        <span class="tira-j" aria-hidden="true">${p.j}</span>
      </li>`).join("")}
    </ol>
    <p class="leyenda"><i class="ley ley--titular"></i> Titular <i class="ley ley--entra"></i> Entró <i class="ley ley--banquillo"></i> Banquillo <i class="ley ley--no"></i> No convocado <span class="ley-gol">●</span> Gol</p>`;
}

function vistaFicha(e, id) {
  const jugadores = ordenJugadores(e), i = jugadores.findIndex((n) => slug(n) === id);
  if (i < 0) return noEncontrado();
  const n = jugadores[i], num = dorsal(e, n), portero = esPortero(e, n), datos = perfil(e, n);
  const est = estadisticas(e, n);
  const volver = `${rutaEquipo(e)}/plantilla`;
  const ant = jugadores[(i - 1 + jugadores.length) % jugadores.length], sig = jugadores[(i + 1) % jugadores.length];
  const f = CATEGORIAS_CON_FOTO.has(e.categoria) && ((EXTRA[e.id] || {}).fotos || {})[n];
  const cifra = (v, t) => `<div><dt>${t}</dt><dd>${v}</dd></div>`;

  return `
    <section class="ficha" data-anterior="${rutaFicha(e, ant)}" data-siguiente="${rutaFicha(e, sig)}" data-volver="${volver}" aria-labelledby="ficha-nombre">
      <nav class="ficha-nav" aria-label="Jugadores">
        <a href="${volver}">${icono("i-izq")} Página del ${esc(nombreEquipo(e))}</a>
        <span>
          <a href="${rutaFicha(e, ant)}" aria-label="Jugador anterior: ${esc(ant)}">${icono("i-izq")}</a>
          <span>Cromo ${i + 1} de ${jugadores.length}</span>
          <a href="${rutaFicha(e, sig)}" aria-label="Jugador siguiente: ${esc(sig)}">${icono("i-der")}</a>
        </span>
      </nav>
      <div class="ficha-cromos">
        <div class="cromo cromo--grande${portero ? " cromo--portero" : ""}" aria-hidden="true">
          <span class="cromo-cara">${f ? `<img src="${esc(f)}" alt="" width="600" height="800">` : ""}<b>${num ?? iniciales(n)}</b></span>
          <span class="cromo-pie"><span class="cromo-nombre">${esc(n)}</span><small>${esc(nombreEquipo(e))}</small></span>
        </div>
        <div class="reverso">
          <h1 class="ficha-nombre" id="ficha-nombre">${esc(n)}</h1>
          <p class="reverso-sub">${esc(datos.posicion || (portero ? "Portero" : "Jugador"))} del ${esc(nombreEquipo(e))}, temporada 2026-27</p>
          <dl class="ficha-cifras">
            ${cifra(est.jugados, "Partidos")}${cifra(est.goles, "Goles")}${cifra(est.titular, "Titular")}
            ${est.minutos != null ? cifra(est.minutos, "Minutos") : cifra(est.convocado, "Convocado")}
            ${est.encajados != null ? cifra(est.encajados, "Encajados") : ""}${cifra(est.amarillas, "Amarillas")}${cifra(est.rojas, "Rojas")}
            ${datos.edad != null ? cifra(datos.edad, "Edad") : ""}${datos.mvp ? cifra(datos.mvp, "MVP") : ""}
          </dl>
        </div>
      </div>
    </section>
    <section class="seccion" aria-labelledby="jornadas-titulo">
      <h2 class="titulo" id="jornadas-titulo">Jornada a jornada</h2>
      ${est.totales ? vacio("La RFEF no publica en abierto las actas de División de Honor: hay totales de la temporada, pero no el detalle de cada jornada.") : tiraJornadas(est.jornadas)}
      <p class="fuente">${est.totales
        ? `Totales de la temporada: <a href="${esc(e.perfiles.url)}" target="_blank" rel="noopener">lapreferente.com</a> (web no oficial)`
        : `Partidos, goles y tarjetas: actas de la RFGF (futgal.es)${est.actas ? `, ${plural(est.actas, "acta")}` : ", actas pendientes de descargar"}${actasSinGoleadores(e) ? `. ${actasSinGoleadores(e)}` : ""}`}. Con las flechas del teclado pasas de un cromo a otro.</p>
    </section>`;
}

// --- Equipos (cantera) --------------------------------------------------
function cantera(catId) {
  if (!catId) return `${cabeceraSimple("Equipos", `${plural(EQUIPOS.length, "equipo")} esta temporada, de biberón a juvenil.`)}
    <section class="cromos-seccion" aria-label="Categorías">${muro()}</section>`;
  const c = categoria(catId);
  const eqs = EQUIPOS.filter((e) => e.categoria === catId);
  if (!eqs.length) return noEncontrado();
  return `${cabeceraSimple(c.nombre, `${esc(c.edad || "")}: ${plural(eqs.length, "equipo")} esta temporada.`, `<p class="migas"><a href="#/cantera">Equipos</a></p>`)}
    <section class="seccion" aria-label="${esc(c.nombre)}">
      <ul class="lista-equipos">${eqs.map((e) => {
        const p = proximo(e), pos = filaPropia(e);
        return `<li><a href="${rutaEquipo(e)}">
          <b>${esc(nombreEquipo(e))}</b>
          <span>${esc(e.liga)}${pos >= 0 ? `, ${pos + 1}º con ${e.clasificacion[pos].pts} puntos` : ""}</span>
          <span>${p ? `${esc(mayus(fechaCorta(p.fecha)))}${p.hora ? ` a las ${esc(p.hora)}` : ""}, ${p.local ? "contra" : "en casa de"} ${esc(p.rival)}` : "Sin partidos pendientes"}</span>
        </a></li>`;
      }).join("")}</ul>
    </section>`;
}

// --- Historia -----------------------------------------------------------
function historia() {
  const h = HISTORIA, t = h.temporadas;
  const W = 960, H = 300, iz = 120, de = 10, ar = 34, ab = 40;
  const x = (i) => iz + (i / (t.length - 1)) * (W - iz - de);
  const y = (nivel) => ar + (1 - (nivel - 1) / 3) * (H - ar - ab);
  const escalon = t.map(([, nv], i) => `${i ? `L${x(i - 0.5).toFixed(1)} ${y(t[i - 1][1]).toFixed(1)}L${x(i - 0.5).toFixed(1)} ${y(nv).toFixed(1)}` : `M${x(0)} ${y(nv)}`}`).join("") + `L${x(t.length - 1)} ${y(t.at(-1)[1])}`;
  return `
    ${cabeceraSimple("Historia", `Desde ${CLUB.fundado} en Santa Lucía, A Coruña.`)}
    <section class="seccion seccion--frase" aria-label="El nombre">
      <p class="destacado">Los estudiantes que jugaban en Santa Margarita miraban el monte y veían los Urales. De ahí sale el nombre.</p>
    </section>
    <section class="nombres-seccion" aria-labelledby="nombres-titulo">
      <h2 class="titulo" id="nombres-titulo">Cuatro nombres, un club</h2>
      <ol class="nombres">${h.nombres.map((n) => `<li><span>${n.desde}–${n.hasta ?? "hoy"}</span><b>${esc(n.nombre)}</b></li>`).join("")}</ol>
    </section>
    ${historiaFija(true).replace('<a class="enlace fija-mas" href="#/historia">La historia completa ' + icono("i-flecha") + "</a>", "")}
    <section class="seccion" aria-labelledby="palmares-titulo">
      <h2 class="titulo" id="palmares-titulo">Palmarés</h2>
      <ul class="palmares">${h.palmares.map((p) => `<li><b>${p.veces}</b><span>${esc(p.titulo)}</span><small>${esc(p.anios)}</small></li>`).join("")}</ul>
    </section>
    <section class="seccion" aria-labelledby="subidas-titulo">
      <h2 class="titulo" id="subidas-titulo">Subidas y bajadas</h2>
      <p class="lead">Categoría del primer equipo de ${t[0][0]} a ${t.at(-1)[0]}. Las banderas marcan los títulos de liga.</p>
      <div class="tabla-marco"><svg class="grafica grafica--historia" viewBox="0 0 ${W} ${H}" role="img" aria-label="Categoría por temporada: ${t.map(([s, nv, p]) => `${s} ${h.niveles[nv]} ${p}º`).join(", ")}">
        ${[1, 2, 3, 4].map((nv) => `<text x="${iz - 12}" y="${y(nv) + 5}" text-anchor="end" class="grafica-eje">${h.niveles[nv]}</text>`).join("")}
        <path d="${escalon}L${x(t.length - 1)} ${H - ab}L${x(0)} ${H - ab}Z" class="grafica-area"/>
        <path d="${escalon}" class="grafica-linea"/>
        ${t.map(([s, nv, p], i) => `${p === 1 ? `<g class="campeon"><title>${s}: campeón de ${h.niveles[nv]}</title><path d="M${x(i)} ${y(nv)}V${y(nv) - 28}h14l-4 5 4 5h-14"/></g>` : ""}
          ${i % 3 === 0 ? `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" class="grafica-eje">${s.slice(0, 4)}</text>` : ""}`).join("")}
      </svg></div>
    </section>`;
}

// --- Noticias y búsqueda ------------------------------------------------
const listaNoticias = (ns) => ns.length ? `<ul class="noticias">${ns.map((n) => `
  <li><a class="noticia" href="#/noticia/${esc(n.id)}">
    <time datetime="${esc(n.fecha)}">${esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" }))}</time>
    <strong>${esc(n.titulo)}</strong>
    <p>${esc(n.resumen)}</p>
  </a></li>`).join("")}</ul>` : vacio("Todavía no hay noticias.");

const listaVideos = (vs) => `<div class="videos">${vs.map((v) => `
  <figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${esc(v.titulo)}" loading="lazy" allowfullscreen></iframe>
  <figcaption>${esc(v.titulo)}</figcaption></figure>`).join("")}</div>`;

const cabeceraSimple = (tit, sub = "", migas = "") => `
  <section class="cab">
    <div class="cab-texto">${migas}<h1 class="cab-titulo">${esc(tit)}</h1>${sub ? `<p class="cab-sub">${sub}</p>` : ""}</div>
  </section>`;

function noticia(id) {
  const n = NOTICIAS.find((x) => x.id === id);
  if (!n) return noEncontrado();
  return `${cabeceraSimple(n.titulo, esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" })), `<p class="migas"><a href="#/noticias">Noticias</a></p>`)}
    <article class="seccion articulo">${n.cuerpo.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("")}</article>`;
}

function buscar(q) {
  const t = normal(q.trim());
  const form = `<form class="buscador" role="search" data-buscar>
      <label for="buscar-q">Nombre de un jugador, un equipo o una noticia</label>
      <span><input id="buscar-q" type="search" name="q" value="${esc(q)}" placeholder="Por ejemplo, Cotelo…" autocomplete="off" spellcheck="false">
      <button class="boton" type="submit">Buscar</button></span>
    </form>`;
  if (!t) return `${cabeceraSimple("Buscar")}<section class="seccion">${form}</section>`;
  const coincide = (...s) => normal(s.join(" ")).includes(t);
  const personas = EQUIPOS.flatMap((e) => [...e.plantilla, ...e.entrenadores].filter((n) => coincide(n)).map((n) => ({ n, e })));
  const equipos = EQUIPOS.filter((e) => coincide(nombreEquipo(e), e.liga, categoria(e.categoria).nombre));
  const noticias = NOTICIAS.filter((n) => coincide(n.titulo, n.resumen, n.cuerpo));
  const total = personas.length + equipos.length + noticias.length;
  const lista = (items) => `<ul class="lista-equipos">${items}</ul>`;
  return `${cabeceraSimple(`“${q.trim()}”`, total ? plural(total, "resultado") : "Sin resultados. Prueba con otro nombre o apellido.")}
    <section class="seccion">${form}</section>
    ${personas.length ? `<section class="seccion"><h2 class="titulo">Personas</h2>${lista(personas.map(({ n, e }) =>
      `<li><a href="${e.plantilla.includes(n) ? rutaFicha(e, n) : `${rutaEquipo(e)}/plantilla`}"><b>${esc(n)}</b><span>${esc(nombreEquipo(e))}</span></a></li>`).join(""))}</section>` : ""}
    ${equipos.length ? `<section class="seccion"><h2 class="titulo">Equipos</h2>${lista(equipos.map((e) =>
      `<li><a href="${rutaEquipo(e)}"><b>${esc(nombreEquipo(e))}</b><span>${esc(e.liga)}</span></a></li>`).join(""))}</section>` : ""}
    ${noticias.length ? `<section class="seccion"><h2 class="titulo">Noticias</h2>${listaNoticias(noticias)}</section>` : ""}`;
}

// --- Socios -------------------------------------------------------------
// Pendiente: precios, ventajas y forma de pago los confirma el club.
const contacto = (asunto) => CLUB.email
  ? `<a class="boton boton--oro" href="mailto:${esc(CLUB.email)}?subject=${encodeURIComponent(asunto)}">Escríbenos para hacerte socio</a>`
  : `<p class="vacio">Forma de contacto pendiente de confirmar con el club.</p>`;
const socios = () => `${cabeceraSimple("Hazte socio", `Cada carné sostiene a ${EQUIPOS.length} equipos de fútbol base.`)}
  <section class="seccion socio" aria-label="El carné">
    <div class="carne" aria-hidden="true">
      <img src="img/escudo.png" alt="" width="72" height="68">
      <p class="carne-club">Ural Español C.F.</p>
      <p class="carne-tipo">Socio, temporada 2026-27</p>
    </div>
    <div class="articulo">
      <p>Con el carné del Ural apoyas a todos los equipos del club, de biberón a juvenil: material, desplazamientos, árbitros y entrenadores titulados.</p>
      <p class="vacio">Precios y ventajas: pendiente de confirmar con el club.</p>
      ${contacto("Quiero hacerme socio")}
    </div>
  </section>`;

const noEncontrado = () => cabeceraSimple("Fuera de juego", `Esta página no existe. <a href="#/">Volver al inicio</a>`);

// --- Navegación ---------------------------------------------------------
function render() {
  const [camino, ancla] = location.hash.replace(/^#\/?/, "").split("#");
  const [ruta = "", a = "", sub = "", extra = ""] = camino.split("/").map(decodeURIComponent);
  app.innerHTML =
    !ruta ? inicio() :
    ruta === "equipo" ? vistaEquipo(a, sub, extra) :
    ruta === "cantera" ? cantera(a) :
    ruta === "historia" ? historia() :
    ruta === "noticias" ? `${cabeceraSimple("Noticias", "La actualidad del club.")}<section class="seccion" aria-label="Noticias">${listaNoticias(NOTICIAS)}</section>` :
    ruta === "noticia" ? noticia(a) :
    ruta === "socios" ? socios() :
    ruta === "buscar" ? buscar(a) :
    noEncontrado();
  document.body.classList.toggle("es-portada", !ruta);
  document.title = `${ruta ? app.querySelector("h1")?.textContent.trim() + " · " : ""}${CLUB.nombre}`;
  document.querySelectorAll(".menu-enlaces a").forEach((l) => {
    const s = l.dataset.seccion;
    l.toggleAttribute("aria-current", s ? `${ruta}/${a}`.startsWith(s) || ruta === s : !ruta);
  });
  menu.classList.remove("menu--abierto");
  botonMenu.setAttribute("aria-expanded", "false");
  const destino = ancla && document.getElementById(ancla);
  destino ? destino.scrollIntoView() : scrollTo(0, 0);
  entradas();
}

function navegar() {
  document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches
    ? document.startViewTransition(render) : render();
}

// Entrada de cada sección al aparecer: título, texto e imagen escalonados. Sin script, todo se ve igual.
const observador = "IntersectionObserver" in window && new IntersectionObserver((vistas) => {
  for (const v of vistas) if (v.isIntersecting) { v.target.classList.add("visto"); observador.unobserve(v.target); }
}, { rootMargin: "0px 0px -10% 0px" });
function entradas() {
  if (!observador) return;
  app.querySelectorAll("section, .unete, .hub").forEach((s) => { s.classList.add("entra"); observador.observe(s); });
}

app.addEventListener("change", (ev) => {
  if (ev.target.id !== "donde-equipo") return;
  const e = equipo(ev.target.value);
  try { localStorage.setItem(CLAVE_EQUIPO, e.id); } catch { /* sin almacenamiento: solo no se recuerda */ }
  app.querySelector(".donde-cartel").innerHTML = cartel(e);
});

app.addEventListener("submit", (ev) => {
  if (!ev.target.matches("[data-buscar]")) return;
  ev.preventDefault();
  location.hash = `#/buscar/${encodeURIComponent(ev.target.q.value.trim())}`;
});

addEventListener("keydown", (ev) => {
  const f = app.querySelector(".ficha");
  if (!f || ev.target.closest?.("input, select")) return;
  if (ev.key === "ArrowLeft") location.hash = f.dataset.anterior;
  if (ev.key === "ArrowRight") location.hash = f.dataset.siguiente;
  if (ev.key === "Escape") location.hash = f.dataset.volver;
});

// Menú del móvil
const menu = document.querySelector(".menu"), botonMenu = document.querySelector(".menu-abrir");
botonMenu.addEventListener("click", () => {
  const abierto = menu.classList.toggle("menu--abierto");
  botonMenu.setAttribute("aria-expanded", abierto);
});

document.getElementById("pie-contacto").innerHTML = [CLUB.direccion && ` ${esc(CLUB.direccion)}.`,
  CLUB.email && ` <a href="mailto:${esc(CLUB.email)}">${esc(CLUB.email)}</a>`].filter(Boolean).join("");
document.getElementById("pie-x").href = CLUB.x;
document.getElementById("pie-fed").href = CLUB.federacion;
document.getElementById("pie-fuente").textContent =
  `Partidos, plantillas y clasificaciones: Real Federación Galega de Fútbol (futgal.es)${typeof ACTUALIZADO === "string" && ACTUALIZADO ? `, actualizado ${new Date(ACTUALIZADO).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`;

addEventListener("hashchange", navegar);
render();
