// Protección de menores: solo estas categorías muestran foto, diga lo que diga data.js.
const CATEGORIAS_CON_FOTO = new Set(["juvenil"]);

const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const icono = (id, cls = "icono") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const plural = (n, s, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;

// Fotos de A Coruña y del fútbol gallego (Wikimedia Commons, créditos en el pie). Ninguna es del club.
const FOTO = {
  red: { src: "assets/red-porteria.jpg", alt: "Red de una portería sobre el césped", w: 1600, h: 1200 },
  niebla: { src: "assets/porteria-niebla.jpg", alt: "Portería de un campo de fútbol en la niebla", w: 1600, h: 1063 },
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
const letraEquipo = (e) => e.letra + modalidad(e).replace(" F-", "").replace(" sala", "S");
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
    <p class="cartel-cruce">${esc(cruce(p))}</p>
    <p class="cartel-cuando">${esc(mayus(fmt(p.fecha, { weekday: "long", day: "numeric", month: "long" })))}${p.hora ? ` · ${esc(p.hora)}` : " · hora por confirmar"}</p>
    <p class="cartel-donde">${p.campo ? esc(p.campo) : "Campo por confirmar"} · ${esc(nombreEquipo(e))}, jornada ${p.jornada}</p>
    <p class="cartel-acciones">
      <a class="boton" href="${calendarioIcs(p, e)}" download="ural-${e.id}-j${p.jornada}.ics">Añadir al calendario</a>
      ${mapa ? `<a class="boton boton--claro" href="${mapa}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
      <a class="boton boton--claro" href="${enlaceWhatsapp({ ...p, e })}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
    </p>
    <p class="cartel-mas"><a class="enlace" href="${rutaEquipo(e)}">Ver su página ${icono("i-flecha")}</a>
      <a class="enlace" href="${calendarioTemporada(e)}" download="ural-${e.id}.ics">Toda la temporada al calendario</a></p>`;
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

// --- Lo propio de la web del Ural -----------------------------------------
const urlPublica = () => location.href.split("#")[0];
const textoPartido = (p) => `${nombreEquipo(p.e)}: ${cruce(p)}, ${mayus(fechaCorta(p.fecha))}${p.hora ? ` a las ${p.hora}` : ""}${p.campo ? `, ${p.campo}` : ""}.`;
const enlaceWhatsapp = (p) => `https://wa.me/?text=${encodeURIComponent(`${textoPartido(p)} ${urlPublica()}${rutaEquipo(p.e)}`)}`;
const enlaceMapa = (campo) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${campo}, A Coruña`)}`;
const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));

// Toda la temporada en un archivo .ics
function calendarioTemporada(e) {
  const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;
  const eventos = e.partidos.filter((p) => p.fecha && !p.resultado).map((p) => {
    const f = p.fecha.replaceAll("-", ""), [h, m] = (p.hora || "0:0").split(":").map(Number), ini = h * 60 + m;
    return ["BEGIN:VEVENT", `UID:${e.id}-${p.jornada}@ural-web`, ...(p.hora ? [`DTSTART;TZID=Europe/Madrid:${f}T${hhmm(ini)}`, `DTEND;TZID=Europe/Madrid:${f}T${hhmm(ini + 90)}`] : [`DTSTART;VALUE=DATE:${f}`]),
      `SUMMARY:${nombreEquipo(e)}: ${cruce(p)}`.replace(/([,;])/g, "\\$1"), `LOCATION:${p.campo || "Campo por confirmar"}`.replace(/([,;])/g, "\\$1"), "END:VEVENT"].join("\r\n");
  });
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ural Español CF//Web//ES", ...eventos, "END:VCALENDAR"].join("\r\n"))}`;
}

// Goleadores: de las actas; el Juvenil A, de los totales de lapreferente
function goleadoresEquipo(e) {
  const t = {};
  if (Object.keys(e.actas || {}).length) {
    for (const a of Object.values(e.actas)) for (const [n, g] of Object.entries(a.g || {})) t[n] = (t[n] || 0) + g;
  } else for (const [n, d] of Object.entries(e.perfiles?.jugadores || {})) if (d.goles) t[n] = d.goles;
  return Object.entries(t).map(([n, g]) => ({ n, g, e })).sort((x, y) => y.g - x.g);
}
const goleadoresClub = (n = 5) => EQUIPOS.flatMap(goleadoresEquipo).sort((x, y) => y.g - x.g).slice(0, n);
const listaGoleadores = (lista) => lista.length ? `<ol class="goleadores">${lista.map((x, i) =>
  `<li><span>${i + 1}</span><a href="${rutaFicha(x.e, x.n)}"><b>${esc(x.n)}</b><small>${esc(nombreEquipo(x.e))}</small></a><strong data-cuenta="${x.g}">${x.g}</strong></li>`).join("")}</ol>` : vacio("Aún no hay goles en las actas publicadas.");

// La previa: cómo llegan los dos equipos, con los datos de la clasificación
function caraACara(e, p) {
  const yo = e.clasificacion.find((f) => f.propio), el = e.clasificacion.find((f) => normal(f.equipo) === normal(p.rival));
  if (!yo || !el) return "";
  const pos = (f) => e.clasificacion.indexOf(f) + 1;
  const fila = (t, a, b, invertido = false) => {
    const total = Math.abs(a) + Math.abs(b) || 1, mejor = invertido ? a < b : a > b;
    return `<li><b${mejor ? ' class="gana"' : ""}>${a}</b><div><span>${t}</span><i><u style="--p:${(Math.abs(invertido ? b : a) / total) * 100}%"></u></i></div><b${!mejor && a !== b ? ' class="gana"' : ""}>${b}</b></li>`;
  };
  const ida = e.partidos.find((x) => x.resultado && normal(x.rival) === normal(p.rival));
  return `<section class="seccion" aria-labelledby="previa-t"><h2 class="titulo" id="previa-t">La previa</h2>
    <div class="previa">
      <div class="previa-cab"><div>${nuestro}<strong>${esc(CLUB.corto)}</strong></div><span>VS</span><div>${escudoDe(e, p.rival)}<strong>${esc(p.rival)}</strong></div></div>
      <ul>${fila("Posición", pos(yo), pos(el), true)}${fila("Puntos", yo.pts, el.pts)}${fila("Goles a favor", yo.gf, el.gf)}${fila("Goles en contra", yo.gc, el.gc, true)}${fila("Victorias", yo.g, el.g)}</ul>
      ${ida ? `<p class="previa-ida">En la ida: ${esc(cruce(ida))}, ${esc(ida.resultado)}.</p>` : ""}
    </div></section>`;
}

// Centro de partidos: todo el club, por semanas, por categoría y por campo
let vistaCentro = "dia";
function filaCentro(p) {
  const m = p.resultado && marcador(p), [casa, fuera] = lados(p);
  return `<li class="centro-fila${m ? ` centro-fila--${m.res}` : ""}">
    <span class="centro-hora">${m ? `<b class="res-txt-${m.res}">${m.l}-${m.v}</b>` : `<b>${esc(p.hora || "--:--")}</b>`}<small>${esc(mayus(fmt(p.fecha, { weekday: "short" })))}</small></span>
    <a class="centro-equipo" href="${rutaEquipo(p.e)}"><b>${esc(nombreEquipo(p.e))}</b><small>${esc(p.e.liga)}</small></a>
    <span class="centro-cruce">${casa.img}<span>${esc(casa.n)}</span><i>–</i><span>${esc(fuera.n)}</span>${fuera.img}</span>
    <span class="centro-campo">${p.campo ? `<a href="${enlaceMapa(p.campo)}" target="_blank" rel="noopener">${esc(p.campo)}</a>` : "Campo por confirmar"}</span>
    <span class="centro-acciones">${m ? "" : `<a href="${calendarioIcs(p, p.e)}" download="ural-${p.e.id}-j${p.jornada}.ics" aria-label="Añadir al calendario: ${esc(cruce(p))}" title="Añadir al calendario">${icono("i-cal")}</a>
      <a href="${enlaceWhatsapp(p)}" target="_blank" rel="noopener" aria-label="Enviar por WhatsApp: ${esc(cruce(p))}" title="Enviar por WhatsApp">${icono("i-enviar")}</a>`}</span>
  </li>`;
}
function centroPartidos(lun = "", cat = "") {
  const base = lun ? dia(lun) : lunesDe(hoy()), fin = sumarDias(base, 6);
  const semana = todosLosPartidos().filter((p) => p.fecha && dia(p.fecha) >= base && dia(p.fecha) <= fin)
    .sort((x, y) => (x.fecha + (x.hora || "99")).localeCompare(y.fecha + (y.hora || "99")));
  const lista = cat ? semana.filter((p) => p.e.categoria === cat) : semana;
  const cats = CATEGORIAS.filter((c) => semana.some((p) => p.e.categoria === c.id));
  const url = (d, c = cat) => `#/partidos/${iso(d)}${c ? `/${c}` : ""}`;
  const grupos = vistaCentro === "campo"
    ? [...new Set(lista.map((p) => p.campo || "Campo por confirmar"))].sort().map((c) => [c, lista.filter((p) => (p.campo || "Campo por confirmar") === c)])
    : [...new Set(lista.map((p) => p.fecha))].map((f) => [mayus(fmt(f, { weekday: "long", day: "numeric", month: "long" })), lista.filter((p) => p.fecha === f)]);
  return `${cabeceraSimple("Centro de partidos", `${plural(semana.length, "partido")} del ${esc(fmt(iso(base), { day: "numeric", month: "long" }))} al ${esc(fmt(iso(fin), { day: "numeric", month: "long" }))}`)}
    <section class="seccion centro" aria-label="Partidos de la semana">
      <div class="centro-barra">
        <nav class="semanas" aria-label="Cambiar de semana"><a class="redondo" href="${url(sumarDias(base, -7))}" aria-label="Semana anterior">${icono("i-izq")}</a><a class="pastilla" href="#/partidos">Esta semana</a><a class="redondo" href="${url(sumarDias(base, 7))}" aria-label="Semana siguiente">${icono("i-der")}</a></nav>
        <div class="vistas" role="group" aria-label="Ordenar"><button type="button" data-vista="dia" aria-pressed="${vistaCentro === "dia"}">Por día</button><button type="button" data-vista="campo" aria-pressed="${vistaCentro === "campo"}">Por campo</button></div>
        ${lista.some((p) => !p.resultado) ? `<button type="button" class="boton" data-cartel="${iso(base)}|${cat}">Descargar el cartel</button>` : ""}
      </div>
      <nav class="fichas" aria-label="Categoría"><a href="${url(base, "")}"${cat ? "" : ' aria-current="true"'}>Todas</a>${cats.map((c) => `<a href="${url(base, c.id)}"${cat === c.id ? ' aria-current="true"' : ""}>${esc(c.nombre)}</a>`).join("")}</nav>
      ${grupos.map(([t, ps]) => `<h2 class="centro-grupo">${esc(t)}<small>${plural(ps.length, "partido")}</small></h2><ul>${ps.map(filaCentro).join("")}</ul>`).join("") || vacio("No hay partidos publicados esta semana.")}
    </section>`;
}

// Cartel del fin de semana: una imagen lista para Instagram o WhatsApp, hecha con los datos reales
async function generarCartel(partidos, titulo) {
  await document.fonts.ready;
  const css = getComputedStyle(document.documentElement), v = (n, d) => css.getPropertyValue(n).trim() || d;
  const fondo = v("--cartel-fondo", "#0d8a3e"), oscuro = v("--cartel-oscuro", "#0a4a24"), acento = v("--cartel-acento", "#ffffff"), letraT = v("--titulo", "sans-serif"), letraB = v("--letra", "sans-serif");
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const x = c.getContext("2d");
  const cargar = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  x.fillStyle = fondo; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = oscuro; x.beginPath(); x.moveTo(0, 0); x.lineTo(1080, 0); x.lineTo(1080, 150); x.lineTo(0, 300); x.closePath(); x.fill();
  const escudo = await cargar("img/escudo.png");
  if (escudo) x.drawImage(escudo, 64, 56, 150, 142);
  x.fillStyle = "#fff"; x.font = `800 86px ${letraT}`; x.fillText(titulo.toUpperCase(), 244, 130);
  x.font = `600 34px ${letraB}`; x.fillStyle = acento; x.fillText("Ural Español C.F.", 248, 180);
  const lista = partidos.slice(0, 15), alto = Math.min(68, 945 / Math.max(1, lista.length)), y0 = 330;
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i], y = y0 + i * alto;
    x.fillStyle = i % 2 ? "#ffffff12" : "#00000022"; x.fillRect(48, y, 984, alto - 6);
    x.textBaseline = "middle"; const my = y + (alto - 6) / 2;
    x.fillStyle = acento; x.font = `700 28px ${letraB}`; x.fillText(`${mayus(fmt(p.fecha, { weekday: "short" }))} ${p.hora || ""}`, 68, my);
    x.fillStyle = "#fff"; x.font = `700 28px ${letraB}`; x.fillText(nombreEquipo(p.e), 268, my, 300);
    x.font = `400 26px ${letraB}`; x.fillText(`${p.local ? "vs" : "en"} ${p.rival}`, 580, my, 440);
  }
  x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; x.font = `600 28px ${letraB}`;
  x.fillText(partidos.length > 15 ? `y ${partidos.length - 15} partidos más en la web del club` : "Toda la información en la web del club", 64, 1326);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}
async function descargarCartel(lun, cat) {
  const base = dia(lun), fin = sumarDias(base, 6);
  const ps = todosLosPartidos().filter((p) => p.fecha && !p.resultado && dia(p.fecha) >= base && dia(p.fecha) <= fin && (!cat || p.e.categoria === cat))
    .sort((x, y) => (x.fecha + (x.hora || "99")).localeCompare(y.fecha + (y.hora || "99")));
  const blob = await generarCartel(ps, lun === iso(lunesDe(hoy())) ? "Este finde" : `Semana del ${fmt(lun, { day: "numeric", month: "short" })}`);
  const archivo = new File([blob], "ural-este-finde.png", { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [archivo] })) { try { await navigator.share({ files: [archivo], title: "Ural Español: este finde" }); return; } catch { /* cancelado: se descarga */ } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = archivo.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Mi equipo: la web recuerda tu equipo en este dispositivo
function miEquipo() {
  const e = equipo(recordado());
  if (e) return vistaEquipo(e.id);
  return `${cabeceraSimple("Mi equipo", "Elige el equipo que sigues y lo tendrás siempre a mano en este móvil.")}<section class="seccion" aria-label="Elegir equipo">${muro()}</section>`;
}
const seguir = (id) => { try { id ? localStorage.setItem(CLAVE_EQUIPO, id) : localStorage.removeItem(CLAVE_EQUIPO); } catch { /* sin almacenamiento: solo no se recuerda */ } };

// --- Piezas de club ------------------------------------------------------
const lados = (p) => p.local
  ? [{ n: CLUB.corto, img: nuestro }, { n: p.rival, img: escudoDe(p.e, p.rival) }]
  : [{ n: p.rival, img: escudoDe(p.e, p.rival) }, { n: CLUB.corto, img: nuestro }];

function cuentaAtras(p) {
  if (!p.hora) return "";
  return `<div class="cuenta" data-objetivo="${p.fecha}T${p.hora}" role="timer" aria-label="Cuenta atrás">
    ${["días", "horas", "min"].map((u) => `<span><b>--</b><small>${u}</small></span>`).join("")}</div>`;
}

// El enfrentamiento: escudo y nombre de cada lado, VS o resultado en medio
function versus(p, conHora = true) {
  const [casa, fuera] = lados(p), m = p.resultado && marcador(p);
  return `<div class="versus">
    <div class="versus-equipo">${casa.img}<strong>${esc(casa.n)}</strong></div>
    <div class="versus-centro">
      ${m ? `<span class="versus-marcador versus-marcador--${m.res}">${m.l} – ${m.v}</span>` : `<span class="versus-vs">VS</span>`}
      ${conHora ? `<small>${esc(fechaCorta(p.fecha))}${p.hora ? ` · ${esc(p.hora)}` : ""}</small>` : ""}
    </div>
    <div class="versus-equipo">${fuera.img}<strong>${esc(fuera.n)}</strong></div>
  </div>`;
}

const tarjetaProximo = (p) => `
  <div class="tarjeta-proximo">
    <p class="tarjeta-cab"><span>Próximo partido · ${esc(nombreEquipo(p.e))}</span><span>Jornada ${p.jornada}</span></p>
    <div class="tarjeta-cuerpo">${versus(p)}${cuentaAtras(p)}</div>
    <p class="tarjeta-pie">${p.campo ? esc(p.campo) : "Campo por confirmar"} · ${p.local ? "en casa" : "fuera"}</p>
  </div>`;

// conEquipo: en la portada la tarjeta dice qué equipo juega y lleva a su página
function tarjetaPartido(p, destacado = false, conEquipo = false) {
  const t = conEquipo ? "a" : "article";
  return `<${t} class="partido${destacado ? " partido--proximo" : ""}"${conEquipo ? ` href="${rutaEquipo(p.e)}"` : ""}>
    <p class="partido-cab"><span>${conEquipo ? esc(nombreEquipo(p.e)) : `Jornada ${p.jornada}`}</span>${destacado ? "<span>Próximo</span>" : ""}</p>
    ${versus(p)}
    ${!p.resultado && p.campo ? `<p class="partido-campo">${esc(p.campo)}</p>` : ""}
  </${t}>`;
}

// Cinta de resultados y partidos: se desplaza sola, la segunda copia es solo visual
function cinta(partidos) {
  if (!partidos.length) return "";
  let lista = partidos;
  while (lista.length < 8) lista = [...lista, ...partidos];
  const item = (p, copia) => {
    const m = p.resultado && marcador(p);
    return `<a class="cinta-item" href="${rutaEquipo(p.e)}"${copia ? ' tabindex="-1"' : ""}>${escudoDe(p.e, p.rival)}
      <span><small>${esc(nombreEquipo(p.e))}</small>${p.local ? "vs" : "en"} ${esc(p.rival)} ${m ? `<b class="res-txt-${m.res}">${m.nos}-${m.ellos}</b>` : `<i>${esc(fechaCorta(p.fecha))}${p.hora ? ` ${esc(p.hora)}` : ""}</i>`}</span></a>`;
  };
  return `<section class="cinta" aria-label="Partidos y resultados"><div class="cinta-pista" style="--dur:${lista.length * 4}s">
    <div>${lista.map((p) => item(p, false)).join("")}</div><div aria-hidden="true">${lista.map((p) => item(p, true)).join("")}</div></div></section>`;
}

// Partidos de la semana por categoría: tarjeta con las letras de sus equipos; al pulsarla se despliega
function semanaCategorias(partidos) {
  const cats = CATEGORIAS.filter((c) => partidos.some((p) => p.e.categoria === c.id));
  if (!cats.length) return vacio("La federación aún no ha publicado partidos para esta semana.");
  return `<div class="semana-cats">${cats.map((c) => {
    const suyos = partidos.filter((p) => p.e.categoria === c.id), equipos = [...new Set(suyos.map((p) => p.e))].sort((x, y) => x.letra.localeCompare(y.letra));
    return `<button type="button" class="semana-cat" data-semana="${c.id}" aria-expanded="false" aria-controls="semana-${c.id}">
        <strong>${esc(c.nombre)}</strong>
        <span class="letras">${equipos.map((e) => `<span title="${esc(nombreEquipo(e))}">${esc(letraEquipo(e))}</span>`).join("")}</span>
        <small>${plural(suyos.length, "partido")}</small>
      </button>
      <div class="semana-panel" id="semana-${c.id}" hidden><div class="partidos">${suyos.map((p) => tarjetaPartido(p, false, true)).join("")}</div></div>`;
  }).join("")}</div>`;
}

// Calendario del mes con el escudo del rival en cada día de partido
const mesVisto = {};
function calendarioMes(e) {
  const hoyIso = iso(hoy());
  const con = e.partidos.filter((p) => p.fecha);
  if (!con.length) return vacio("La federación todavía no ha publicado el calendario.");
  const inicial = (con.find((p) => !p.resultado) || con.at(-1)).fecha.slice(0, 7);
  const ym = mesVisto[e.id] ||= inicial;
  const [y, m] = ym.split("-").map(Number), primero = new Date(y, m - 1, 1), dias = new Date(y, m, 0).getDate();
  const huecos = (primero.getDay() + 6) % 7;
  const celdas = [...Array(huecos).fill(`<div class="dia dia--vacio"></div>`)];
  for (let d = 1; d <= dias; d++) {
    const f = `${ym}-${String(d).padStart(2, "0")}`, p = con.find((x) => x.fecha === f);
    const r = p?.resultado && marcador({ ...p });
    celdas.push(`<div class="dia${f === hoyIso ? " dia--hoy" : ""}${p ? " dia--partido" : ""}"><small>${d}</small>${p ? `${escudoDe(e, p.rival)}<b class="${r ? `res-txt-${r.res}` : ""}">${r ? `${r.nos}-${r.ellos}` : esc(p.hora || "")}</b><span class="sr">${p.local ? "contra" : "en casa de"} ${esc(p.rival)}</span>` : ""}</div>`);
  }
  return `<div class="mes" data-mes-equipo="${e.id}">
    <div class="mes-cab">
      <button type="button" data-mes="-1" aria-label="Mes anterior">${icono("i-izq")}</button>
      <h3>${esc(mayus(primero.toLocaleDateString("es-ES", { month: "long", year: "numeric" })))}</h3>
      <button type="button" data-mes="1" aria-label="Mes siguiente">${icono("i-der")}</button>
    </div>
    <div class="mes-sem" aria-hidden="true">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="mes-dias">${celdas.join("")}</div>
  </div>`;
}

// Clasificación corta para la portada
const tablaMini = (e, n = 6) => {
  const pos = filaPropia(e), desde = Math.max(0, Math.min(pos - Math.floor(n / 2), e.clasificacion.length - n));
  return `<ol class="tabla-mini" start="${desde + 1}">${e.clasificacion.slice(desde, desde + n).map((f, i) =>
    `<li${f.propio ? ' class="propio"' : ""}><span>${desde + i + 1}</span>${f.propio ? nuestro : escudoDe(e, f.equipo)}<span>${esc(f.equipo)}</span><small>${f.pj} PJ</small><b>${f.pts}</b></li>`).join("")}</ol>`;
};

// Categorías con las letras de sus equipos
function muro() {
  const cats = CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id));
  return `<div class="categorias">${cats.map((c) => {
    const eqs = EQUIPOS.filter((e) => e.categoria === c.id);
    return `<a class="categoria" href="#/cantera/${c.id}"><strong>${esc(c.nombre)}</strong><small>${esc(c.edad || "")}</small>
      <span class="letras">${eqs.map((e) => `<span title="${esc(nombreEquipo(e))}">${esc(e.categoria === "veteranos" ? "V" : letraEquipo(e))}</span>`).join("")}</span></a>`;
  }).join("")}</div>`;
}

// La camiseta del club, verde de arriba abajo; el portero la lleva de otro color
const SILUETA = {
  corta: "M62 8 30 20 4 52l22 30 18-12v130h112V70l18 12 22-30-26-32-32-12c-4 14-20 24-38 24S66 22 62 8z",
  larga: "M62 8 30 20C18 40 10 90 8 150l22 4c4-42 10-68 14-82v128h112V72c4 14 10 40 14 82l22-4c-2-60-10-110-22-130L138 8c-4 14-20 24-38 24S66 22 62 8z",
};
function camiseta(num, portero = false, espalda = "") {
  const forma = SILUETA[portero ? "larga" : "corta"], tela = portero ? "tela-portero" : "tela-jugador";
  const base = `<path d="${forma}" fill="url(#${tela})"/><path d="${forma}" fill="url(#pliegues)"/>`;
  if (espalda) return `<svg class="camiseta" viewBox="0 0 200 210" aria-hidden="true">${base}
    <path d="M62 8c6 7 20 10 38 10s32-3 38-10" fill="none" class="cam-cuello" stroke-width="6"/>
    <text x="100" y="66" class="cam-dorso">${esc(espalda.toUpperCase())}</text><text x="100" y="168" class="cam-num cam-num--dorso">${num ?? ""}</text></svg>`;
  return `<svg class="camiseta" viewBox="0 0 200 210" aria-hidden="true">${base}
    <path d="M62 8c4 14 20 24 38 24s34-10 38-24" fill="none" class="cam-cuello" stroke-width="6"/>
    <image href="img/escudo.png" x="118" y="42" width="24" height="23"/>
    ${num != null && num !== "" ? `<text x="100" y="146" class="cam-num">${num}</text>` : ""}</svg>`;
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
  const pendientes = e.partidos.filter((x) => !x.resultado).map((x) => ({ ...x, e }));
  const jugados = e.partidos.filter((x) => x.resultado).map((x) => ({ ...x, e }));
  const extra = EXTRA[e.id] || {};
  const videos = (tipo) => (extra.videos || []).filter((v) => v.tipo === tipo && v.youtube);
  const pos = filaPropia(e), fila = e.clasificacion[pos];
  const SECCION = { calendario: "Calendario", plantilla: "Plantilla", clasificacion: "Clasificación" };
  const num = e.plantilla.map((n) => dorsal(e, n)).filter((d) => d != null).sort((x, y) => x - y)[0] ?? "";

  const cabecera = `
    <section class="cab cab--equipo">
      <div>
        <p class="migas"><a href="#/cantera">Equipos</a> / <a href="#/cantera/${e.categoria}">${esc(categoria(e.categoria).nombre)}</a>${sub ? ` / <a href="${rutaEquipo(e)}">${esc(nombreEquipo(e))}</a>` : ""}</p>
        <h1 class="cab-titulo">${esc(SECCION[sub] || nombreEquipo(e))}</h1>
        <p class="cab-sub">${sub ? `${esc(nombreEquipo(e))} · ` : ""}${esc(e.competicion || e.liga)}</p>
        <p class="fuente"><span class="punto"></span>Datos de ${esc(e.fuente || "futgal.es")}${e.descargado ? ` · actualizado ${esc(actualizado(e.descargado))}` : ""}</p>
        <p class="cab-acciones"><button type="button" class="pastilla" data-seguir="${e.id}" aria-pressed="${recordado() === e.id}">${recordado() === e.id ? "Es mi equipo" : "Seguir este equipo"}</button>
          ${e.partidos.some((x) => !x.resultado) ? `<a class="pastilla" href="${calendarioTemporada(e)}" download="ural-${e.id}.ics">Temporada al calendario</a>` : ""}</p>
      </div>
      ${p ? tarjetaProximo(p) : ""}
    </section>`;

  if (sub === "calendario") return `${cabecera}
    <section class="seccion" aria-labelledby="mes-t"><h2 class="titulo" id="mes-t">Calendario</h2>${calendarioMes(e)}</section>
    <section class="seccion" aria-labelledby="prox-t"><h2 class="titulo" id="prox-t">Próximos partidos</h2>
      ${pendientes.length ? tresYResto(pendientes, (x, i) => tarjetaPartido(x, i === 0), "Ver todo el calendario") : vacio("No hay partidos pendientes.")}</section>
    <section class="seccion" aria-labelledby="jug-t"><h2 class="titulo" id="jug-t">Resultados</h2>
      ${jugados.length ? tresYResto([...jugados].reverse(), (x) => tarjetaPartido(x), "Ver todos los resultados") : vacio("Aún no se ha jugado ningún partido.")}</section>`;
  if (sub === "clasificacion") return `${cabecera}
    <section class="seccion" aria-labelledby="cla-t"><h2 class="titulo" id="cla-t">Clasificación</h2>${tablaClasificacion(e)}
      ${e.urlClasificacion ? `<a class="enlace" href="${esc(e.urlClasificacion)}" target="_blank" rel="noopener">Ver en ${esc(e.fuente || "futgal.es")} ${icono("i-diagonal")}</a>` : ""}</section>`;
  if (sub === "plantilla") return `${cabecera}${plantilla(e)}`;
  if (sub) return `${cabecera}<section class="seccion">${vacio("Esta sección no existe.")}</section>`;

  return `${cabecera}
    <nav class="hub" aria-label="Secciones del equipo">
      <a class="hub-tarjeta" href="${rutaEquipo(e)}/calendario"><span class="hub-dato">${p ? `<b>${esc(fmt(p.fecha, { day: "numeric" }))}</b><small>${esc(fmt(p.fecha, { month: "short" }))}</small>` : `<b>${e.partidos.length || "–"}</b><small>partidos</small>`}</span>
        <span class="hub-texto"><strong>Calendario</strong><small>${p ? `Próximo: ${p.local ? "contra" : "en casa de"} ${esc(p.rival)}` : "Partidos de la temporada"}</small></span></a>
      <a class="hub-tarjeta" href="${rutaEquipo(e)}/plantilla"><span class="hub-camiseta">${camiseta(num)}</span>
        <span class="hub-texto"><strong>Plantilla</strong><small>${e.plantilla.length ? `${plural(e.plantilla.length, "jugador", "jugadores")} y cuerpo técnico` : "Pendiente de la federación"}</small></span></a>
      <a class="hub-tarjeta" href="${rutaEquipo(e)}/clasificacion"><span class="hub-dato">${fila ? `<b>${pos + 1}º</b><small>${fila.pts} pts</small>` : "<b>–</b>"}</span>
        <span class="hub-texto"><strong>Clasificación</strong><small>${fila ? `De ${e.clasificacion.length} equipos` : "Pendiente de la federación"}</small></span></a>
    </nav>
    ${p ? caraACara(e, p) : ""}
    <section class="seccion dos" aria-label="La temporada">
      <div><h2 class="titulo">Así va la temporada</h2>${perfilTemporada(jugados)}</div>
      <div><h2 class="titulo">Goleadores</h2>${listaGoleadores(goleadoresEquipo(e).slice(0, 6))}</div>
    </section>
    ${videos("highlight").length ? `<section class="seccion"><h2 class="titulo">Resúmenes</h2>${listaVideos(videos("highlight"))}</section>` : ""}
    ${videos("entrevista").length ? `<section class="seccion"><h2 class="titulo">Entrevistas</h2>${listaVideos(videos("entrevista"))}</section>` : ""}`;
}

// Los 3 primeros a la vista; el resto, plegado tras un botón (details nativo)
const tresYResto = (lista, tarjeta, texto) => `
  <div class="partidos">${lista.slice(0, 3).map(tarjeta).join("")}</div>
  ${lista.length > 3 ? `<details class="resto"><summary>${texto} (${lista.length})</summary>
    <div class="partidos">${lista.slice(3).map((x, i) => tarjeta(x, i + 3)).join("")}</div></details>` : ""}`;

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
  const conFoto = CATEGORIAS_CON_FOTO.has(e.categoria), fotos = (EXTRA[e.id] || {}).fotos || {};
  const jugadores = ordenJugadores(e), inicial = Math.max(0, jugadores.findIndex((n) => slug(n) === ultimaFicha[e.id]));
  return `
    <section class="seccion" id="plantilla" aria-labelledby="plantilla-titulo">
      <h2 class="titulo" id="plantilla-titulo">Temporada 2026-27</h2>
      ${actasSinGoleadores(e) ? `<p class="aviso">${actasSinGoleadores(e)}</p>` : ""}
      ${jugadores.length ? `
      <div class="carrusel" data-activo="${inicial}">
        <button type="button" class="redondo" data-paso="-1" aria-label="Jugador anterior">${icono("i-izq")}</button>
        <div class="carrusel-pista">${jugadores.map((n, i) => {
          const num = dorsal(e, n), f = conFoto && fotos[n];
          return `<button type="button" class="carta" data-carta="${i}" data-ficha="${rutaFicha(e, n)}" data-nombre="${esc(n)}" data-num="${num ?? ""}" aria-label="${esc(n)}${num != null ? `, dorsal ${num}` : ""}">
            ${f ? `<img src="${esc(f)}" alt="" loading="lazy">` : camiseta(num ?? iniciales(n), esPortero(e, n))}</button>`;
        }).join("")}</div>
        <button type="button" class="redondo" data-paso="1" aria-label="Jugador siguiente">${icono("i-der")}</button>
      </div>
      <p class="carrusel-nombre" aria-live="polite"></p>
      <ul class="lista-jugadores">${jugadores.map((n) => `<li><a href="${rutaFicha(e, n)}"><b>${dorsal(e, n) ?? ""}</b>${esc(n)}</a></li>`).join("")}</ul>` : ""}
      ${e.entrenadores.length || e.delegados.length ? `
        <h3 class="subtitulo">Cuerpo técnico</h3>
        <ul class="tecnicos">
          ${e.entrenadores.map((n) => `<li><b>${esc(n)}</b> Entrenador</li>`).join("")}
          ${e.delegados.map((n) => `<li><b>${esc(n)}</b> Delegado</li>`).join("")}
        </ul>` : ""}
      <a class="enlace" href="${esc(e.urlFederacion)}" target="_blank" rel="noopener">Ficha del equipo en la RFGF ${icono("i-diagonal")}</a>
    </section>`;
}

const ultimaFicha = {}; // al volver, el carrusel queda en el último jugador visto
function colocarCarrusel(c) {
  const activo = Number(c.dataset.activo), cartas = [...c.querySelectorAll(".carta")];
  cartas.forEach((carta, i) => {
    const d = i - activo, a = Math.abs(d);
    carta.style.transform = `translateX(calc(-50% + ${d * 74}%)) scale(${a === 0 ? 1 : a === 1 ? 0.78 : 0.62})`;
    carta.style.zIndex = 10 - a;
    carta.style.opacity = a > 2 ? 0 : a === 0 ? 1 : 0.7;
    carta.tabIndex = a === 0 ? 0 : -1;
    carta.classList.toggle("carta--activa", a === 0);
  });
  const c0 = cartas[activo], nombre = c.parentElement.querySelector(".carrusel-nombre");
  if (c0) nombre.innerHTML = `${c0.dataset.num ? `<small>Dorsal ${esc(c0.dataset.num)}</small>` : ""}<strong>${esc(c0.dataset.nombre)}</strong><a class="boton" href="${c0.dataset.ficha}">Ver ficha</a>`;
}
function moverCarrusel(c, paso) {
  c.dataset.activo = Math.min(c.querySelectorAll(".carta").length - 1, Math.max(0, Number(c.dataset.activo) + paso));
  colocarCarrusel(c);
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

const anillo = (valor, maximo, texto, etiqueta) => `<div class="anillo">
  <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" class="anillo-valor" style="--pct:${maximo ? Math.min(1, valor / maximo) : 0}"/></svg>
  <b>${texto}</b><small>${etiqueta}</small></div>`;

function vistaFicha(e, id) {
  const jugadores = ordenJugadores(e), i = jugadores.findIndex((n) => slug(n) === id);
  if (i < 0) return noEncontrado();
  const n = jugadores[i], num = dorsal(e, n), portero = esPortero(e, n), datos = perfil(e, n);
  ultimaFicha[e.id] = id;
  const est = estadisticas(e, n), volver = `${rutaEquipo(e)}/plantilla`;
  const ant = jugadores[(i - 1 + jugadores.length) % jugadores.length], sig = jugadores[(i + 1) % jugadores.length];
  const cifra = (v, t) => `<div><dt>${t}</dt><dd>${v}</dd></div>`;
  const prox = e.partidos.filter((x) => !x.resultado).slice(0, 3).map((x) => ({ ...x, e }));
  return `
    <section class="ficha" data-anterior="${rutaFicha(e, ant)}" data-siguiente="${rutaFicha(e, sig)}" data-volver="${volver}" aria-labelledby="ficha-nombre">
      <div class="ficha-info">
        <a class="pastilla" href="${volver}">${icono("i-izq")} Volver a la plantilla</a>
        <p class="ficha-etiqueta">${esc(datos.posicion || (portero ? "Portero" : "Jugador"))} · ${esc(nombreEquipo(e))}</p>
        <h1 class="ficha-nombre" id="ficha-nombre">${esc(n)}</h1>
        <div class="panel">
          <dl class="ficha-cifras">
            ${cifra(est.jugados, "Partidos")}${cifra(est.goles, "Goles")}${cifra(est.titular, "Titular")}
            ${est.minutos != null ? cifra(est.minutos, "Minutos") : cifra(est.convocado, "Convocado")}
            ${est.encajados != null ? cifra(est.encajados, "Encajados") : ""}${cifra(est.amarillas, "Amarillas")}${cifra(est.rojas, "Rojas")}
            ${datos.edad != null ? cifra(datos.edad, "Edad") : ""}${datos.mvp ? cifra(datos.mvp, "MVP") : ""}
          </dl>
          <h2 class="subtitulo">Jornada a jornada</h2>
          ${est.totales ? vacio("La RFEF no publica en abierto las actas de División de Honor: hay totales de la temporada, pero no el detalle de cada jornada.") : tiraJornadas(est.jornadas)}
          <p class="fuente">${est.totales
            ? `Totales de la temporada: <a href="${esc(e.perfiles.url)}" target="_blank" rel="noopener">lapreferente.com</a> (web no oficial).`
            : `Actas de la RFGF (futgal.es)${est.actas ? `, ${plural(est.actas, "acta")}` : ", pendientes de descargar"}.${actasSinGoleadores(e) ? ` ${actasSinGoleadores(e)}` : ""}`}</p>
        </div>
        ${prox.length ? `<h2 class="subtitulo">Próximos partidos</h2><div class="partidos">${prox.map((x) => tarjetaPartido(x)).join("")}</div>` : ""}
      </div>
      <div class="ficha-visual">
        <div class="ficha-flechas">
          <a class="redondo" href="${rutaFicha(e, ant)}" aria-label="Jugador anterior: ${esc(ant)}">${icono("i-izq")}</a>
          <a class="redondo" href="${rutaFicha(e, sig)}" aria-label="Jugador siguiente: ${esc(sig)}">${icono("i-der")}</a>
        </div>
        <div class="ficha-camiseta">${camiseta(num, portero, n.split(" ").at(-2) || n.split(" ")[0])}</div>
        <div class="ficha-anillos">
          ${anillo(est.jugados, est.actas || est.convocado, `${(est.actas || est.convocado) ? Math.round((est.jugados / (est.actas || est.convocado)) * 100) : 0}%`, "Participación")}
          ${anillo(est.goles, est.jugados || 1, (est.jugados ? est.goles / est.jugados : 0).toFixed(2).replace(".", ","), "Goles por partido")}
        </div>
      </div>
    </section>`;
}

// --- Equipos (cantera) --------------------------------------------------
function cantera(catId) {
  if (!catId) return `${cabeceraSimple("Equipos", `${plural(EQUIPOS.length, "equipo")} esta temporada, de biberón a juvenil.`)}
    <section class="seccion" aria-label="Categorías">${muro()}</section>`;
  const c = categoria(catId), eqs = EQUIPOS.filter((e) => e.categoria === catId);
  if (!eqs.length) return noEncontrado();
  return `${cabeceraSimple(c.nombre, `${esc(c.edad || "")} · ${plural(eqs.length, "equipo")} esta temporada`, `<p class="migas"><a href="#/cantera">Equipos</a></p>`)}
    <section class="seccion" aria-label="${esc(c.nombre)}"><div class="equipos">${eqs.map((e) => {
      const p = proximo(e), pos = filaPropia(e);
      return `<a class="tarjeta-equipo" href="${rutaEquipo(e)}">
        <span class="tarjeta-letra" aria-hidden="true">${esc(e.letra)}</span>
        <strong>${esc(nombreEquipo(e))}</strong><small>${esc(e.liga)}</small>
        ${pos >= 0 ? `<span class="tarjeta-pos"><b>${pos + 1}º</b> · ${e.clasificacion[pos].pts} pts</span>` : ""}
        <span class="tarjeta-prox">${p ? `${esc(mayus(fechaCorta(p.fecha)))}${p.hora ? ` · ${esc(p.hora)}` : ""} · ${p.local ? "vs" : "en"} ${esc(p.rival)}` : "Sin partidos pendientes"}</span>
      </a>`;
    }).join("")}</div></section>`;
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
    ruta === "partidos" ? centroPartidos(a, sub) :
    ruta === "mi-equipo" ? miEquipo() :
    ruta === "historia" ? historia() :
    ruta === "noticias" ? `${cabeceraSimple("Noticias", "La actualidad del club.")}<section class="seccion" aria-label="Noticias">${listaNoticias(NOTICIAS)}</section>` :
    ruta === "noticia" ? noticia(a) :
    ruta === "socios" ? socios() :
    ruta === "buscar" ? buscar(a) :
    noEncontrado();
  document.body.classList.toggle("es-portada", !ruta);
  app.querySelectorAll(".carrusel").forEach(colocarCarrusel);
  tic();
  contadores();
  if (!ruta && typeof alPintarPortada === "function") alPintarPortada();
  document.title = `${ruta ? app.querySelector("h1")?.textContent.trim() + " · " : ""}${CLUB.nombre}`;
  document.querySelectorAll("[data-seccion]").forEach((l) => {
    const s = l.dataset.seccion;
    l.toggleAttribute("aria-current", s ? `${ruta}/${a}`.startsWith(s) || ruta === s : !ruta);
  });
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

// Buscador rápido: botón de la cabecera o Ctrl+K
function resultadosPaleta(q) {
  const t = normal(q.trim());
  const items = [
    ...CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id)).map((c) => ({ t: c.nombre, s: "Categoría", h: `#/cantera/${c.id}` })),
    ...EQUIPOS.map((e) => ({ t: nombreEquipo(e), s: e.liga, h: rutaEquipo(e) })),
    ...EQUIPOS.flatMap((e) => e.plantilla.map((n) => ({ t: n, s: nombreEquipo(e), h: rutaFicha(e, n) }))),
  ];
  return (t ? items.filter((i) => normal(`${i.t} ${i.s}`).includes(t)) : items).slice(0, 8);
}
const paleta = document.getElementById("paleta");
const pintarPaleta = (q) => { paleta.querySelector("ul").innerHTML = resultadosPaleta(q).map((i, n) => `<li><a href="${i.h}"${n === 0 ? ' class="activo"' : ""}><b>${esc(i.t)}</b><span>${esc(i.s)}</span></a></li>`).join("") || `<li class="paleta-nada">Sin resultados</li>`; };
function abrirPaleta() { if (!paleta.open) paleta.showModal(); paleta.querySelector("input").value = ""; pintarPaleta(""); paleta.querySelector("input").focus(); }
document.querySelectorAll("[data-paleta]").forEach((b) => b.addEventListener("click", abrirPaleta));
paleta.querySelector("input").addEventListener("input", (ev) => pintarPaleta(ev.target.value));
paleta.addEventListener("click", (ev) => { if (ev.target === paleta || ev.target.closest("a")) paleta.close(); });
paleta.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") { const l = paleta.querySelector("a.activo"); if (l) { location.hash = l.getAttribute("href"); paleta.close(); } }
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    ev.preventDefault();
    const l = [...paleta.querySelectorAll("a")], i = l.findIndex((x) => x.classList.contains("activo")), n = (i + (ev.key === "ArrowDown" ? 1 : -1) + l.length) % l.length;
    l.forEach((x, k) => x.classList.toggle("activo", k === n));
  }
});
addEventListener("keydown", (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); abrirPaleta(); } });

// Las cifras suben al aparecer
const contador = "IntersectionObserver" in window && new IntersectionObserver((vistas) => {
  for (const v of vistas) {
    if (!v.isIntersecting) continue;
    contador.unobserve(v.target);
    const fin = Number(v.target.dataset.cuenta), t0 = performance.now();
    const paso = (t) => { const k = Math.min(1, (t - t0) / 700); v.target.textContent = Math.round(fin * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
});
function contadores() { if (contador && !matchMedia("(prefers-reduced-motion: reduce)").matches) app.querySelectorAll("[data-cuenta]").forEach((n) => contador.observe(n)); }

function tic() {
  for (const c of document.querySelectorAll("[data-objetivo]")) {
    const s = Math.max(0, new Date(c.dataset.objetivo) - Date.now()) / 1000;
    [s / 86400, (s % 86400) / 3600, (s % 3600) / 60].forEach((v, i) => { c.children[i].firstChild.textContent = String(Math.floor(v)); });
  }
}
setInterval(tic, 15000);

app.addEventListener("click", (ev) => {
  const t = ev.target;
  const vis = t.closest("[data-vista]");
  if (vis) { vistaCentro = vis.dataset.vista; render(); return; }
  const car = t.closest("[data-cartel]");
  if (car) {
    const [l, c] = car.dataset.cartel.split("|"), txt = car.textContent;
    car.disabled = true; car.textContent = "Preparando…";
    descargarCartel(l, c).finally(() => { car.disabled = false; car.textContent = txt; });
    return;
  }
  const seg = t.closest("[data-seguir]");
  if (seg) {
    const ya = recordado() === seg.dataset.seguir;
    seguir(ya ? "" : seg.dataset.seguir);
    seg.setAttribute("aria-pressed", !ya); seg.textContent = ya ? "Seguir este equipo" : "Es mi equipo";
    return;
  }
  const sem = t.closest("[data-semana]");
  if (sem) {
    const abrir = sem.getAttribute("aria-expanded") !== "true", caja = sem.closest(".semana-cats");
    caja.querySelectorAll("[data-semana]").forEach((b) => b.setAttribute("aria-expanded", b === sem && abrir));
    caja.querySelectorAll(".semana-panel").forEach((p) => { p.hidden = !(abrir && p.id === `semana-${sem.dataset.semana}`); });
    return;
  }
  const mes = t.closest("[data-mes]");
  if (mes) {
    const caja = mes.closest("[data-mes-equipo]"), e = equipo(caja.dataset.mesEquipo);
    const [y, m] = mesVisto[e.id].split("-").map(Number), d = new Date(y, m - 1 + Number(mes.dataset.mes), 1);
    mesVisto[e.id] = iso(d).slice(0, 7);
    caja.outerHTML = calendarioMes(e);
    return;
  }
  const paso = t.closest("[data-paso]");
  if (paso) return moverCarrusel(paso.closest(".carrusel"), Number(paso.dataset.paso));
  const carta = t.closest("[data-carta]");
  if (carta) {
    if (carta.classList.contains("carta--activa")) { location.hash = carta.dataset.ficha; return; }
    const c = carta.closest(".carrusel"); c.dataset.activo = carta.dataset.carta; return colocarCarrusel(c);
  }
  const pes = t.closest("[data-pestana]");
  if (pes) {
    const caja = pes.closest("[data-pestanas]");
    caja.querySelectorAll("[data-pestana]").forEach((b) => b.setAttribute("aria-selected", b === pes));
    caja.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== pes.dataset.pestana; });
  }
});

// Deslizar el dedo pasa las camisetas
let inicioDedo = null;
app.addEventListener("pointerdown", (ev) => { if (ev.target.closest(".carrusel")) inicioDedo = ev.clientX; });
app.addEventListener("pointerup", (ev) => {
  const c = ev.target.closest(".carrusel");
  if (c && inicioDedo != null && Math.abs(ev.clientX - inicioDedo) > 40) moverCarrusel(c, ev.clientX < inicioDedo ? 1 : -1);
  inicioDedo = null;
});

app.addEventListener("keydown", (ev) => {
  const c = ev.target.closest?.(".carrusel");
  if (c && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) { moverCarrusel(c, ev.key === "ArrowLeft" ? -1 : 1); c.querySelector(".carta--activa")?.focus(); }
});

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

document.getElementById("pie-contacto").innerHTML = [CLUB.direccion && ` ${esc(CLUB.direccion)}.`,
  CLUB.email && ` <a href="mailto:${esc(CLUB.email)}">${esc(CLUB.email)}</a>`].filter(Boolean).join("");
document.getElementById("pie-x").href = CLUB.x;
document.getElementById("pie-fed").href = CLUB.federacion;
document.getElementById("franja-fed").href = CLUB.federacion;
document.getElementById("pie-fuente").textContent =
  `Partidos, plantillas y clasificaciones: Real Federación Galega de Fútbol (futgal.es)${typeof ACTUALIZADO === "string" && ACTUALIZADO ? `, actualizado ${new Date(ACTUALIZADO).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`;

addEventListener("hashchange", navegar);
render();
