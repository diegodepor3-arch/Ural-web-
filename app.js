// Protección de menores: solo estas categorías muestran foto, diga lo que diga data.js.
const CATEGORIAS_CON_FOTO = new Set(["juvenil"]);

const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const icono = (id, cls = "icono") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const plural = (n, s, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;

// --- Fechas -------------------------------------------------------------
const dia = (f) => new Date(`${f}T12:00`); // mediodía: sin líos de zona horaria
const fmt = (f, op) => dia(f).toLocaleDateString("es-ES", op).replace(".", "");
const fechaCorta = (f) => `${fmt(f, { weekday: "short" })} ${fmt(f, { day: "numeric", month: "short" })}`;
const hoy = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
const sumarDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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

const iniciales = (n) => n.replace(/[^A-ZÁÉÍÓÚÑ ]/gi, "").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
// Escudo sin fondo (escudos.py lo recorta y lo guarda en img/escudos); si aún no está, el de la federación
const sinFondo = (url) => (typeof ESCUDOS === "object" && ESCUDOS[url]) || url;
const escudoDe = (e, nombre) => e.escudos?.[nombre]
  ? `<img class="escudo" src="${esc(sinFondo(e.escudos[nombre]))}" alt="" loading="lazy">`
  : `<span class="escudo escudo--vacio" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
const nuestro = `<img class="escudo" src="img/escudo.png" alt="">`;
const vacio = (txt) => `<p class="vacio">${txt}</p>`;
const actualizado = (f) => new Date(f).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// --- Dibujos ------------------------------------------------------------
// Cresta de montaña determinista (mismo dibujo en cada visita): picos alternos como los del escudo
function cresta(W, H, picos, semilla = 7) {
  let s = semilla;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = [[0, H * 0.75]];
  for (let i = 0; i < picos; i++) {
    const x = ((i + 0.5) / picos) * W;
    pts.push([x - W / picos / 2 + azar() * 10, H * (0.55 + azar() * 0.2)]);
    pts.push([x + (azar() - 0.5) * 20, H * (0.12 + azar() * 0.35)]);
  }
  pts.push([W, H * 0.6]);
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

// Curvas de nivel: la misma cresta repetida hacia abajo, cada vez más tenue
const curvas = (d, n = 7, paso = 14) => Array.from({ length: n }, (_, i) =>
  `<path d="${d}" transform="translate(0 ${i * paso})" style="opacity:${(1 - i / n).toFixed(2)}"/>`).join("");

const fondoMontes = () => {
  const d = cresta(1200, 300, 9, 11);
  return `<svg class="montes" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g class="montes-curvas">${curvas(d, 9, 16)}</g>
    <path class="montes-cresta" d="${d}"/>
  </svg>`;
};

// --- Piezas comunes -----------------------------------------------------
function cuentaAtras(p) {
  if (!p.hora) return `<p class="billete-sin-hora">Hora por confirmar</p>`;
  return `<div class="cuenta" data-objetivo="${p.fecha}T${p.hora}" role="timer" aria-label="Cuenta atrás">
    ${["d", "h", "min"].map((u) => `<span><b>--</b><small>${u}</small></span>`).join("")}</div>`;
}

const lados = (p) => p.local
  ? [{ n: CLUB.corto, img: nuestro, propio: true }, { n: p.rival, img: escudoDe(p.e, p.rival) }]
  : [{ n: p.rival, img: escudoDe(p.e, p.rival) }, { n: CLUB.corto, img: nuestro, propio: true }];

// Billete del próximo partido: matriz con el cruce y talón con la cuenta atrás
function billete(p) {
  const [casa, fuera] = lados(p);
  return `
    <article class="billete">
      <div class="billete-matriz">
        <p class="billete-cab"><span>${esc(nombreEquipo(p.e))}</span><span>Jornada ${p.jornada}</span></p>
        <div class="billete-cruce">
          <div class="billete-equipo${casa.propio ? " es-propio" : ""}">${casa.img}<strong>${esc(casa.n)}</strong><small>Local</small></div>
          <span class="billete-vs">vs</span>
          <div class="billete-equipo${fuera.propio ? " es-propio" : ""}">${fuera.img}<strong>${esc(fuera.n)}</strong><small>Visitante</small></div>
        </div>
        <p class="billete-campo">${icono("i-pin")}${p.campo ? esc(p.campo) : "Campo por confirmar"}</p>
      </div>
      <div class="billete-talon">
        <p class="billete-fecha"><small>${esc(fmt(p.fecha, { weekday: "long" }))}</small><b>${esc(fmt(p.fecha, { day: "numeric" }))}</b><small>${esc(fmt(p.fecha, { month: "long" }))}</small></p>
        <p class="billete-hora">${p.hora ? esc(p.hora) : "--:--"}</p>
        ${cuentaAtras(p)}
      </div>
    </article>`;
}

// Fila de partido: sirve para la agenda de la portada y para el calendario de cada equipo
function filaPartido(p, conEquipo = false) {
  const m = p.resultado && marcador(p);
  const [casa, fuera] = lados(p);
  const etiqueta = conEquipo ? "a" : "div";
  return `
    <${etiqueta} class="fila${m ? ` fila--${m.res}` : ""}${p.esHoy ? " fila--hoy" : ""}"${conEquipo ? ` href="${rutaEquipo(p.e)}"` : ""} role="listitem">
      <span class="fila-hora">${conEquipo ? (p.hora || "--:--") : `<small>J${p.jornada}</small>${esc(p.fecha ? fmt(p.fecha, { day: "numeric", month: "short" }) : "")}`}</span>
      ${conEquipo ? `<span class="fila-equipo"><b>${esc(nombreEquipo(p.e))}</b><small>${esc(p.e.liga)}</small></span>` : ""}
      <span class="fila-cruce">
        <span class="fila-lado${casa.propio ? " es-propio" : ""}">${esc(casa.n)}${casa.img}</span>
        ${m ? `<b class="fila-res">${m.l}<i>-</i>${m.v}</b>` : `<b class="fila-res fila-res--vacio">${!conEquipo && p.hora ? esc(p.hora) : "vs"}</b>`}
        <span class="fila-lado${fuera.propio ? " es-propio" : ""}">${fuera.img}${esc(fuera.n)}</span>
      </span>
      <span class="fila-campo">${m ? `<span class="marca marca--${m.res}">${{ G: "Victoria", E: "Empate", P: "Derrota" }[m.res]}</span>` : p.campo ? `${icono("i-pin")}${esc(p.campo)}` : ""}</span>
    </${etiqueta}>`;
}

const titulo = (num, texto, extra = "") => `
  <div class="titulo"><span class="titulo-num">${num}</span><h2>${texto}</h2>${extra ? `<span class="titulo-extra">${extra}</span>` : ""}</div>`;

// --- Inicio -------------------------------------------------------------
function inicio() {
  const lunes = sumarDias(hoy(), -((hoy().getDay() + 6) % 7)), domingo = sumarDias(lunes, 6);
  const enRango = (p, a, b) => p.fecha && dia(p.fecha) >= a && dia(p.fecha) <= b;
  const orden = (a, b) => (a.fecha + (a.hora || "99")).localeCompare(b.fecha + (b.hora || "99")) || ordenCat(a.e) - ordenCat(b.e);
  const todos = todosLosPartidos();
  const semana = todos.filter((p) => enRango(p, lunes, domingo)).sort(orden);
  const pasada = todos.filter((p) => p.resultado && enRango(p, sumarDias(lunes, -7), sumarDias(lunes, -1)))
    .sort((a, b) => ordenCat(a.e) - ordenCat(b.e) || a.e.letra.localeCompare(b.e.letra));
  const principal = equipo(PRINCIPAL), pp = principal && proximo(principal), pos = principal ? filaPropia(principal) : -1;
  const ganados = pasada.filter((p) => marcador(p).res === "G").length;

  return `
    <section class="portada">
      ${fondoMontes()}
      <div class="contenedor portada-dentro">
        <div class="portada-texto">
          <p class="antetitulo">Fútbol base · ${EQUIPOS.length} equipos · Temporada 2026-27</p>
          <h1 class="portada-titulo">Ural<span>Español</span></h1>
          <p class="portada-lema">De biberón a División de Honor. Una cantera que sube desde Santa Lucía desde ${CLUB.fundado}.</p>
          ${principal ? `
            <dl class="datos-rapidos">
              <div><dt>Juvenil A</dt><dd>${esc(principal.competicion?.split("·")[0].trim() || principal.liga)}</dd></div>
              ${pos >= 0 ? `<div><dt>Posición</dt><dd>${pos + 1}º<small> / ${principal.clasificacion.length}</small></dd></div>
              <div><dt>Puntos</dt><dd>${principal.clasificacion[pos].pts}</dd></div>` : ""}
            </dl>` : ""}
        </div>
        ${pp ? `<div class="portada-billete"><p class="rotulo">Próximo partido</p>${billete({ ...pp, e: principal })}</div>` : ""}
      </div>
    </section>

    <div class="contenedor">
      <section class="bloque">
        ${titulo("01", "Agenda de la semana", `${esc(fmt(iso(lunes), { day: "numeric", month: "short" }))} – ${esc(fmt(iso(domingo), { day: "numeric", month: "short" }))}`)}
        ${semana.length ? agenda(semana) : vacio("La federación aún no ha publicado partidos para esta semana.")}
      </section>

      ${pasada.length ? `
      <section class="bloque">
        ${titulo("02", "Resultados de la semana pasada", `${ganados} de ${pasada.length} ganados`)}
        <div class="resultados">${pasada.map((p) => {
          const m = marcador(p);
          return `<a class="resultado resultado--${m.res}" href="${rutaEquipo(p.e)}">
            <span>${esc(nombreEquipo(p.e))}</span>
            <b>${m.nos}<i>-</i>${m.ellos}</b>
            <small>${p.local ? "vs" : "en"} ${esc(p.rival)}</small>
          </a>`;
        }).join("")}</div>
      </section>` : ""}

      <section class="bloque">
        ${titulo(pasada.length ? "03" : "02", "Nuestros equipos", `<a href="#/cantera">Ver todos ${icono("i-flecha")}</a>`)}
        <p class="entradilla">De los 4 a los 18 años. Pulsa un equipo para ver su calendario, su plantilla y su clasificación.</p>
        ${categorias()}
      </section>

      <section class="bloque">
        ${titulo(pasada.length ? "04" : "03", "Noticias", `<a href="#/noticias">Ver todas ${icono("i-flecha")}</a>`)}
        ${listaNoticias(NOTICIAS.slice(0, 3))}
      </section>
    </div>`;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Agenda: un panel de salidas por día, con filtro por categoría
let filtroAgenda = "";
function agenda(partidos) {
  const cats = CATEGORIAS.filter((c) => partidos.some((p) => p.e.categoria === c.id));
  if (!cats.some((c) => c.id === filtroAgenda)) filtroAgenda = "";
  const hoyIso = iso(hoy());
  const dias = [...new Set(partidos.map((p) => p.fecha))];
  return `
    <div class="filtros" role="group" aria-label="Filtrar por categoría">
      <button type="button" data-filtro="" aria-pressed="${!filtroAgenda}">Todos <small>${partidos.length}</small></button>
      ${cats.map((c) => `<button type="button" data-filtro="${c.id}" aria-pressed="${filtroAgenda === c.id}">${esc(c.nombre)} <small>${partidos.filter((p) => p.e.categoria === c.id).length}</small></button>`).join("")}
    </div>
    <div class="agenda">${dias.map((f) => `
      <div class="agenda-dia${f === hoyIso ? " agenda-dia--hoy" : ""}" data-dia>
        <h3><span>${esc(mayus(fmt(f, { weekday: "long" })))}</span> ${esc(fmt(f, { day: "numeric", month: "long" }))}${f === hoyIso ? " <em>Hoy</em>" : ""}</h3>
        <div role="list">${partidos.filter((p) => p.fecha === f).map((p) =>
          filaPartido(p, true).replace('role="listitem"', `role="listitem" data-cat="${p.e.categoria}"${filtroAgenda && filtroAgenda !== p.e.categoria ? " hidden" : ""}`)).join("")}</div>
      </div>`).join("")}
    </div>`;
}

// Categorías: una tarjeta por categoría con sus equipos; el verde se aclara de juvenil a biberón
function categorias() {
  const cats = CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id));
  if (!cats.length) return vacio("Equipos pendientes de la federación.");
  return `
    <div class="categorias">${cats.map((c, i) => {
      const eqs = EQUIPOS.filter((e) => e.categoria === c.id);
      return `
      <section class="categoria" style="--tono:${Math.max(0, 1 - i / (cats.length - 1 || 1))}">
        <a class="categoria-cab" href="#/cantera/${c.id}">
          <span class="categoria-edad">${esc(c.edad || "")}</span>
          <h3>${esc(c.nombre)}</h3>
          <span class="categoria-num">${eqs.length}<small>${eqs.length === 1 ? "equipo" : "equipos"}</small></span>
        </a>
        <ul class="categoria-equipos">${eqs.map((e) => {
          const pos = filaPropia(e);
          return `<li><a href="${rutaEquipo(e)}">
            <b>${esc(e.categoria === "veteranos" ? "V" : e.letra)}</b>
            <span>${esc(nombreEquipo(e))}<small>${esc(e.liga)}</small></span>
            ${pos >= 0 ? `<i>${pos + 1}º</i>` : ""}
          </a></li>`;
        }).join("")}</ul>
      </section>`;
    }).join("")}</div>`;
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

  return `
    <section class="cab-equipo">
      ${fondoMontes()}
      <div class="contenedor cab-equipo-dentro">
        <div>
          <p class="migas"><a href="#/cantera">Equipos</a> / <a href="#/cantera/${e.categoria}">${esc(categoria(e.categoria).nombre)}</a>${sub ? ` / <a href="${rutaEquipo(e)}">${esc(nombreEquipo(e))}</a>` : ""}</p>
          <h1 class="titular">${esc(nombreEquipo(e))}</h1>
          <p class="cab-liga">${esc(e.competicion || e.liga)}</p>
          ${fila ? `
          <dl class="datos-rapidos">
            <div><dt>Posición</dt><dd>${pos + 1}º<small> / ${e.clasificacion.length}</small></dd></div>
            <div><dt>Puntos</dt><dd>${fila.pts}</dd></div>
            <div><dt>Goles</dt><dd>${fila.gf}<small>:${fila.gc}</small></dd></div>
            ${racha.length ? `<div><dt>Racha</dt><dd class="racha">${racha.map((r) => `<i class="marca marca--${r}" title="${{ G: "Victoria", E: "Empate", P: "Derrota" }[r]}">${r === "P" ? "D" : r === "G" ? "V" : "E"}</i>`).join("")}</dd></div>` : ""}
          </dl>` : ""}
          <p class="fuente"><span class="punto"></span>Partidos de ${esc(e.fuente || "futgal.es (RFGF)")}${e.descargado ? ` · actualizado ${esc(actualizado(e.descargado))}` : ""}
            · <a href="${esc(e.urlOficial || e.urlFederacion)}" target="_blank" rel="noopener">${e.urlOficial ? "Calendario oficial RFEF" : "Ficha en la RFGF"} ${icono("i-externo")}</a></p>
        </div>
        ${p ? `<div><p class="rotulo">Próximo partido</p>${billete(p)}</div>` : ""}
      </div>
    </section>
    <div class="contenedor">${
      sub === "calendario" ? `
      <section class="bloque">
        ${titulo("02", "Calendario", `${plural(partidos.length - jugados.length, "partido")} por jugar`)}
        ${partidos.length ? calendario(partidos, jugados.length) : vacio("La federación todavía no ha publicado el calendario.")}
      </section>` :
      sub === "clasificacion" ? `
      <section class="bloque">
        ${titulo("04", "Clasificación", e.urlClasificacion ? `<a href="${esc(e.urlClasificacion)}" target="_blank" rel="noopener">${esc(e.fuente || "futgal.es")} ${icono("i-externo")}</a>` : "")}
        ${tablaClasificacion(e)}
      </section>` :
      sub === "plantilla" ? plantilla(e) :
      sub ? vacio("Esta sección no existe.") : `
      <section class="bloque">
        <div class="hub">
          ${tarjetaHub(e, "calendario", "01", "Calendario",
            p ? `${fmt(p.fecha, { day: "numeric" })}<small>${fmt(p.fecha, { month: "short" })}</small>` : partidos.length,
            p ? `Próximo: ${p.local ? "vs" : "en"} ${p.rival}` : `${plural(partidos.length, "partido")}`)}
          ${tarjetaHub(e, "plantilla", "02", "Plantilla", e.plantilla.length,
            `jugadores${e.entrenadores.length ? " · cuerpo técnico" : ""}`)}
          ${tarjetaHub(e, "clasificacion", "03", "Clasificación",
            fila ? `${pos + 1}º` : "–", fila ? `${fila.pts} puntos · ${e.clasificacion.length} equipos` : "Pendiente de la federación")}
        </div>
      </section>

      <section class="bloque">
        ${titulo("04", "Perfil de la temporada", jugados.length ? `${plural(jugados.length, "jornada")} jugada${jugados.length === 1 ? "" : "s"}` : "")}
        ${perfilTemporada(jugados)}
      </section>

      ${videos("highlight").length ? `<section class="bloque">${titulo("05", "Resúmenes")}${listaVideos(videos("highlight"))}</section>` : ""}
      ${videos("entrevista").length ? `<section class="bloque">${titulo("06", "Entrevistas")}${listaVideos(videos("entrevista"))}</section>` : ""}`}
    </div>`;
}

const tarjetaHub = (e, sub, num, tit, cifra, texto) => `
  <a class="hub-tarjeta" href="${rutaEquipo(e)}/${sub}">
    <span class="hub-num">${num}</span>
    <b class="hub-cifra">${cifra}</b>
    <strong>${tit}</strong>
    <small>${esc(texto)}</small>
    ${icono("i-flecha", "icono hub-flecha")}
  </a>`;

// Jugados y los 4 siguientes a la vista; el resto de la temporada, plegado (details nativo)
const calendario = (partidos, jugados) => {
  const corte = jugados + 4, fila = (x) => filaPartido(x);
  return `<div class="calendario" role="list">${partidos.slice(0, corte).map(fila).join("")}</div>
    ${partidos.length > corte ? `<details class="resto"><summary>Resto de la temporada (${partidos.length - corte})</summary>
      <div class="calendario" role="list">${partidos.slice(corte).map(fila).join("")}</div></details>` : ""}`;
};

function tablaClasificacion(e) {
  if (!e.clasificacion.length) return vacio("La federación todavía no ha publicado la clasificación.");
  const n = e.clasificacion.length;
  return `
    <div class="tabla-marco"><table class="tabla">
      <thead><tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col"><abbr title="Puntos">Pts</abbr></th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th><th scope="col" class="opc-movil"><abbr title="Ganados">G</abbr></th><th scope="col" class="opc-movil"><abbr title="Empatados">E</abbr></th><th scope="col" class="opc-movil"><abbr title="Perdidos">P</abbr></th><th scope="col" class="opc"><abbr title="Goles a favor">GF</abbr></th><th scope="col" class="opc"><abbr title="Goles en contra">GC</abbr></th><th scope="col"><abbr title="Diferencia de goles">DG</abbr></th></tr></thead>
      <tbody>${e.clasificacion.map((f, i) => `
        <tr class="${f.propio ? "propio" : ""}${i === 0 ? " lider" : ""}${i >= n - 3 && n > 8 ? " zona-baja" : ""}">
          <td class="tabla-pos">${i + 1}</td>
          <th scope="row"><span class="tabla-equipo">${f.propio ? nuestro : escudoDe(e, f.equipo)}<span>${esc(f.equipo)}</span></span></th>
          <td class="tabla-pts">${f.pts}</td>
          <td>${f.pj}</td><td class="opc-movil">${f.g}</td><td class="opc-movil">${f.e}</td><td class="opc-movil">${f.p}</td><td class="opc">${f.gf}</td><td class="opc">${f.gc}</td>
          <td>${f.gf - f.gc > 0 ? "+" : ""}${f.gf - f.gc}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

// Perfil de etapa: puntos acumulados jornada a jornada frente al ritmo perfecto (ganarlo todo)
function perfilTemporada(jugados) {
  if (!jugados.length) return vacio("El perfil aparece en cuanto se juegue la primera jornada.");
  const W = 900, H = 260, iz = 36, de = 16, ar = 20, ab = 34;
  const acum = [];
  jugados.forEach((p) => acum.push((acum.at(-1) || 0) + { G: 3, E: 1, P: 0 }[marcador(p).res]));
  const max = Math.max(3, 3 * jugados.length);
  const x = (i) => iz + ((i + 1) / jugados.length) * (W - iz - de);
  const y = (v) => ar + (1 - v / max) * (H - ar - ab);
  const linea = `M${iz} ${y(0)}` + acum.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const pct = Math.round((acum.at(-1) / max) * 100);
  const paso = jugados.length > 14 ? 2 : 1;
  return `
    <div class="perfil">
      <div class="perfil-cifras">
        <p><b>${acum.at(-1)}</b><small>puntos de ${max} posibles</small></p>
        <p><b>${pct}%</b><small>de rendimiento</small></p>
      </div>
      <svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntos acumulados: ${acum.map((v, i) => `J${jugados[i].jornada} ${v}`).join(", ")}">
        <defs><pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" class="rayado"/></pattern></defs>
        ${[0, 0.5, 1].map((k) => `<line x1="${iz}" x2="${W - de}" y1="${y(max * k)}" y2="${y(max * k)}" class="grafica-rejilla"/><text x="${iz - 8}" y="${y(max * k) + 4}" text-anchor="end" class="grafica-eje">${Math.round(max * k)}</text>`).join("")}
        <path d="M${iz} ${y(0)}L${x(jugados.length - 1)} ${y(max)}" class="grafica-ideal"/>
        <text x="${x(jugados.length - 1) - 6}" y="${y(max) + 16}" text-anchor="end" class="grafica-eje">ritmo perfecto</text>
        <path d="${linea}L${x(jugados.length - 1)} ${y(0)}Z" fill="url(#rayado)"/>
        <path d="${linea}" class="grafica-linea"/>
        ${jugados.map((p, i) => {
          const m = marcador(p);
          return `<g class="grafica-punto grafica-punto--${m.res}"><title>J${p.jornada} · ${p.local ? "vs" : "en"} ${p.rival}: ${m.nos}-${m.ellos}</title>
            <circle cx="${x(i)}" cy="${y(acum[i])}" r="5"/>
            ${i % paso === 0 || i === jugados.length - 1 ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="grafica-eje">J${p.jornada}</text>` : ""}</g>`;
        }).join("")}
      </svg>
      <p class="leyenda"><i class="marca marca--G">V</i>Victoria <i class="marca marca--E">E</i>Empate <i class="marca marca--P">D</i>Derrota <span class="leyenda-ideal"></span>Ritmo perfecto</p>
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

function plantilla(e) {
  const cab = titulo("03", "Plantilla", `${plural(e.plantilla.length, "jugador", "jugadores")}`);
  if (!e.plantilla.length && !e.entrenadores.length) {
    return `<section class="bloque" id="plantilla">${cab}${vacio("Plantilla pendiente de la federación.")}</section>`;
  }
  const conFoto = CATEGORIAS_CON_FOTO.has(e.categoria);
  const fotos = (EXTRA[e.id] || {}).fotos || {};
  const conActas = Object.keys(e.actas || {}).length > 0 || !!e.perfiles;
  return `
    <section class="bloque" id="plantilla">
      ${cab}
      <ul class="plantilla">${ordenJugadores(e).map((n) => {
        const num = dorsal(e, n), est = conActas ? estadisticas(e, n) : null, foto = conFoto && fotos[n];
        const [nombre, ...apellidos] = n.split(" ");
        return `<li><a class="jugador${esPortero(e, n) ? " jugador--portero" : ""}" href="${rutaFicha(e, n)}">
          ${foto ? `<img class="jugador-foto" src="${esc(foto)}" alt="" loading="lazy">` : ""}
          <span class="jugador-num${num == null ? " jugador-num--iniciales" : ""}">${num ?? iniciales(n)}</span>
          <span class="jugador-nombre">${esc(nombre)} <b>${esc(apellidos.join(" "))}</b></span>
          ${est ? `<span class="jugador-datos"><span>${est.jugados} PJ</span><span>${est.goles} G</span>${est.amarillas ? `<span class="tarjeta-a">${est.amarillas}</span>` : ""}${est.rojas ? `<span class="tarjeta-r">${est.rojas}</span>` : ""}</span>` : ""}
        </a></li>`;
      }).join("")}</ul>
      ${e.entrenadores.length || e.delegados.length ? `
        <h3 class="subtitulo">Cuerpo técnico</h3>
        <ul class="tecnicos">
          ${e.entrenadores.map((n) => `<li><small>Entrenador</small>${esc(n)}</li>`).join("")}
          ${e.delegados.map((n) => `<li><small>Delegado</small>${esc(n)}</li>`).join("")}
        </ul>` : ""}
      <a class="enlace" href="${esc(e.urlFederacion)}" target="_blank" rel="noopener">Ficha del equipo en la RFGF ${icono("i-externo")}</a>
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

// Tira de jornadas: una columna por acta; la altura es lo que jugó, las bolitas los goles
function tiraJornadas(jornadas) {
  if (!jornadas.length) return vacio("Sin actas todavía.");
  const ALTO = { titular: 100, entra: 55, banquillo: 12, no: 4 };
  const NOMBRE = { titular: "titular", entra: "entró desde el banquillo", banquillo: "en el banquillo, no jugó", no: "no convocado" };
  return `
    <div class="tira" role="list">${jornadas.map((p) => `
      <div class="tira-col tira-col--${p.estado}" role="listitem" aria-label="Jornada ${p.j}: ${NOMBRE[p.estado]}${p.g ? `, ${plural(p.g, "gol", "goles")}` : ""}">
        <span class="tira-goles">${"●".repeat(Math.min(p.g, 4))}</span>
        <span class="tira-barra" style="--alto:${ALTO[p.estado]}%"></span>
        <small>${p.j}</small>
      </div>`).join("")}
    </div>
    <p class="leyenda"><i class="ley ley--titular"></i>Titular <i class="ley ley--entra"></i>Entró <i class="ley ley--banquillo"></i>Banquillo <i class="ley ley--no"></i>No convocado <span class="ley-gol">●</span> Gol</p>`;
}

function vistaFicha(e, id) {
  const jugadores = ordenJugadores(e), i = jugadores.findIndex((n) => slug(n) === id);
  if (i < 0) return noEncontrado();
  const n = jugadores[i], num = dorsal(e, n), portero = esPortero(e, n), datos = perfil(e, n);
  const est = estadisticas(e, n);
  const volver = `${rutaEquipo(e)}/plantilla`;
  const ant = jugadores[(i - 1 + jugadores.length) % jugadores.length], sig = jugadores[(i + 1) % jugadores.length];
  const foto = CATEGORIAS_CON_FOTO.has(e.categoria) && ((EXTRA[e.id] || {}).fotos || {})[n];
  const [nombre, ...apellidos] = n.split(" ");
  const cifra = (v, t) => `<div><dt>${t}</dt><dd>${v}</dd></div>`;

  return `
    <section class="ficha" data-anterior="${rutaFicha(e, ant)}" data-siguiente="${rutaFicha(e, sig)}" data-volver="${volver}">
      ${fondoMontes()}
      <div class="contenedor">
        <nav class="ficha-nav" aria-label="Jugadores">
          <a href="${volver}">${icono("i-izq")} ${esc(nombreEquipo(e))}</a>
          <span>
            <a href="${rutaFicha(e, ant)}" aria-label="Jugador anterior: ${esc(ant)}">${icono("i-izq")}</a>
            <span class="ficha-cuenta">${i + 1} / ${jugadores.length}</span>
            <a href="${rutaFicha(e, sig)}" aria-label="Jugador siguiente: ${esc(sig)}">${icono("i-der")}</a>
          </span>
        </nav>
        <div class="ficha-rejilla">
          <div class="ficha-dorsal${portero ? " ficha-dorsal--portero" : ""}" aria-hidden="true">
            ${foto ? `<img src="${esc(foto)}" alt="">` : ""}<span>${num ?? iniciales(n)}</span>
          </div>
          <div class="ficha-info">
            <p class="antetitulo">${esc(datos.posicion || (portero ? "Portero" : "Jugador"))} · ${esc(nombreEquipo(e))}</p>
            <h1 class="ficha-nombre">${esc(nombre)}<span>${esc(apellidos.join(" "))}</span></h1>
            <dl class="ficha-cifras">
              ${cifra(est.jugados, "Partidos")}${cifra(est.goles, "Goles")}${cifra(est.titular, "Titular")}
              ${est.minutos != null ? cifra(est.minutos, "Minutos") : cifra(est.convocado, "Convocado")}
              ${est.encajados != null ? cifra(est.encajados, "Encajados") : ""}${cifra(est.amarillas, "Amarillas")}${cifra(est.rojas, "Rojas")}
              ${datos.edad != null ? cifra(datos.edad, "Edad") : ""}${datos.mvp ? cifra(datos.mvp, "MVP") : ""}
            </dl>
          </div>
        </div>
        <section class="bloque">
          ${titulo("—", "Jornada a jornada", est.actas ? `${plural(est.actas, "acta")}` : "")}
          ${est.totales ? vacio("La RFEF no publica en abierto las actas de División de Honor: hay totales de la temporada, pero no el detalle de cada jornada.") : tiraJornadas(est.jornadas)}
          <p class="fuente">${est.totales
            ? `Totales de la temporada: <a href="${esc(e.perfiles.url)}" target="_blank" rel="noopener">lapreferente.com</a> (web no oficial)`
            : `Partidos, goles y tarjetas: actas de la RFGF (futgal.es)${est.actas ? "" : " · actas pendientes de descargar"}`}. Pulsa ← → para cambiar de jugador.</p>
        </section>
      </div>
    </section>`;
}

// --- Equipos (cantera) --------------------------------------------------
function cantera(catId) {
  if (!catId) {
    return `${cabeceraSimple("Equipos", `${plural(EQUIPOS.length, "equipo")} esta temporada, de biberón a juvenil`)}
      <div class="contenedor bloque">
        ${categorias()}
      </div>`;
  }
  const c = categoria(catId);
  const eqs = EQUIPOS.filter((e) => e.categoria === catId);
  if (!eqs.length) return noEncontrado();
  return `${cabeceraSimple(c.nombre, `${esc(c.edad || "")} · ${plural(eqs.length, "equipo")} esta temporada`, `<p class="migas"><a href="#/cantera">Equipos</a></p>`)}
    <div class="contenedor bloque"><div class="tarjetas">${eqs.map((e) => {
      const p = proximo(e), pos = filaPropia(e);
      return `<a class="tarjeta-equipo" href="${rutaEquipo(e)}">
        <span class="tarjeta-letra" aria-hidden="true">${esc(e.letra)}</span>
        <strong>${esc(nombreEquipo(e))}</strong>
        <small>${esc(e.liga)}</small>
        <span class="tarjeta-pie">
          ${pos >= 0 ? `<span><b>${pos + 1}º</b> ${e.clasificacion[pos].pts} pts</span>` : ""}
          <span>${p ? `${esc(fechaCorta(p.fecha))}${p.hora ? ` · ${esc(p.hora)}` : ""} · ${p.local ? "vs" : "en"} ${esc(p.rival)}` : "Sin partidos pendientes"}</span>
        </span>
      </a>`;
    }).join("")}</div></div>`;
}

// --- Historia -----------------------------------------------------------
function historia() {
  const h = HISTORIA, t = h.temporadas;
  const W = 960, H = 280, iz = 110, de = 10, ar = 20, ab = 40;
  const x = (i) => iz + (i / (t.length - 1)) * (W - iz - de);
  const y = (nivel) => ar + (1 - (nivel - 1) / 3) * (H - ar - ab);
  const escalon = t.map(([, nv], i) => `${i ? `L${x(i - 0.5).toFixed(1)} ${y(t[i - 1][1]).toFixed(1)}L${x(i - 0.5).toFixed(1)} ${y(nv).toFixed(1)}` : `M${x(0)} ${y(nv)}`}`).join("") + `L${x(t.length - 1)} ${y(t.at(-1)[1])}`;
  return `
    ${cabeceraSimple("Historia", `Desde ${CLUB.fundado} en Santa Lucía, A Coruña`)}
    <div class="contenedor">
      <section class="bloque historia-intro">
        <p class="destacado">Los estudiantes que jugaban en Santa Margarita miraban el monte y veían los Urales. De ahí sale el nombre, y de ahí las montañas del escudo.</p>
      </section>

      <section class="bloque">
        ${titulo("01", "Cuatro nombres, un club")}
        <ol class="nombres">${h.nombres.map((x) => `<li><span>${x.desde}–${x.hasta ?? "hoy"}</span><b>${esc(x.nombre)}</b></li>`).join("")}</ol>
      </section>

      <section class="bloque">
        ${titulo("02", "Momentos")}
        <ol class="hitos">${h.hitos.map((x) => `<li><span class="hitos-anio">${x.anio}</span><p>${esc(x.texto)}</p></li>`).join("")}</ol>
      </section>

      <section class="bloque">
        ${titulo("03", "Palmarés")}
        <ul class="palmares">${h.palmares.map((x) => `<li><b>${x.veces}</b><span>${esc(x.titulo)}</span><small>${esc(x.anios)}</small></li>`).join("")}</ul>
      </section>

      <section class="bloque">
        ${titulo("04", "Subidas y bajadas", `${t[0][0]} – ${t.at(-1)[0]}`)}
        <p class="entradilla">Categoría del primer equipo temporada a temporada. Las banderas marcan los títulos de liga.</p>
        <div class="tabla-marco"><svg class="grafica grafica--historia" viewBox="0 0 ${W} ${H}" role="img" aria-label="Categoría por temporada: ${t.map(([s, nv, p]) => `${s} ${h.niveles[nv]} ${p}º`).join(", ")}">
          ${[1, 2, 3, 4].map((nv) => `<line x1="${iz}" x2="${W - de}" y1="${y(nv)}" y2="${y(nv)}" class="grafica-rejilla"/><text x="${iz - 10}" y="${y(nv) + 4}" text-anchor="end" class="grafica-eje">${h.niveles[nv]}</text>`).join("")}
          <path d="${escalon}L${x(t.length - 1)} ${H - ab}L${x(0)} ${H - ab}Z" class="grafica-area"/>
          <path d="${escalon}" class="grafica-linea"/>
          ${t.map(([s, nv, p], i) => `${p === 1 ? `<g class="campeon"><title>${s}: campeón de ${h.niveles[nv]}</title><line x1="${x(i)}" x2="${x(i)}" y1="${y(nv)}" y2="${y(nv) - 26}"/><path d="M${x(i)} ${y(nv) - 26}h12l-3 4 3 4h-12z"/></g>` : ""}
            ${i % 3 === 0 ? `<text x="${x(i)}" y="${H - 14}" text-anchor="middle" class="grafica-eje">${s.slice(0, 4)}</text>` : ""}`).join("")}
        </svg></div>
      </section>
    </div>`;
}

// --- Noticias y búsqueda ------------------------------------------------
const listaNoticias = (ns) => ns.length ? `<div class="noticias">${ns.map((n, i) => `
  <a class="noticia${i === 0 ? " noticia--grande" : ""}" href="#/noticia/${esc(n.id)}">
    <time datetime="${esc(n.fecha)}">${esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" }))}</time>
    <strong>${esc(n.titulo)}</strong>
    <p>${esc(n.resumen)}</p>
    <span class="noticia-leer">Leer ${icono("i-flecha")}</span>
  </a>`).join("")}</div>` : vacio("Todavía no hay noticias.");

const listaVideos = (vs) => `<div class="videos">${vs.map((v) => `
  <figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${esc(v.titulo)}" loading="lazy" allowfullscreen></iframe>
  <figcaption>${esc(v.titulo)}</figcaption></figure>`).join("")}</div>`;

const cabeceraSimple = (tit, sub = "", migas = "") => `
  <section class="cab-simple">
    ${fondoMontes()}
    <div class="contenedor">${migas}<h1 class="titular">${esc(tit)}</h1>${sub ? `<p class="cab-liga">${sub}</p>` : ""}</div>
  </section>`;

function noticia(id) {
  const n = NOTICIAS.find((x) => x.id === id);
  if (!n) return noEncontrado();
  return `${cabeceraSimple(n.titulo, esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" })), `<p class="migas"><a href="#/noticias">Noticias</a></p>`)}
    <article class="contenedor articulo">${n.cuerpo.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("")}</article>`;
}

function buscar(q) {
  const t = normal(q.trim());
  if (!t) return cabeceraSimple("Buscar", "Escribe un nombre en el buscador.");
  const coincide = (...s) => normal(s.join(" ")).includes(t);
  const personas = EQUIPOS.flatMap((e) => [...e.plantilla, ...e.entrenadores].filter((n) => coincide(n)).map((n) => ({ n, e })));
  const equipos = EQUIPOS.filter((e) => coincide(nombreEquipo(e), e.liga, categoria(e.categoria).nombre));
  const noticias = NOTICIAS.filter((n) => coincide(n.titulo, n.resumen, n.cuerpo));
  const total = personas.length + equipos.length + noticias.length;
  const lista = (items) => `<ul class="lista-busqueda">${items}</ul>`;
  return `${cabeceraSimple(`“${q.trim()}”`, total ? plural(total, "resultado") : "Sin resultados. Prueba con otro nombre o apellido.")}
    <div class="contenedor">
      ${personas.length ? `<section class="bloque">${titulo("—", "Personas")}${lista(personas.map(({ n, e }) =>
        `<li><a href="${e.plantilla.includes(n) ? rutaFicha(e, n) : `${rutaEquipo(e)}/plantilla`}"><strong>${esc(n)}</strong><span>${esc(nombreEquipo(e))}</span></a></li>`).join(""))}</section>` : ""}
      ${equipos.length ? `<section class="bloque">${titulo("—", "Equipos")}${lista(equipos.map((e) =>
        `<li><a href="${rutaEquipo(e)}"><strong>${esc(nombreEquipo(e))}</strong><span>${esc(e.liga)}</span></a></li>`).join(""))}</section>` : ""}
      ${noticias.length ? `<section class="bloque">${titulo("—", "Noticias")}${listaNoticias(noticias)}</section>` : ""}
    </div>`;
}

// --- Socios -------------------------------------------------------------
// Pendiente: precios, ventajas y forma de pago los confirma el club.
const contacto = (asunto) => CLUB.email
  ? `<a class="boton" href="mailto:${esc(CLUB.email)}?subject=${encodeURIComponent(asunto)}">Escríbenos ${icono("i-flecha")}</a>`
  : `<p class="vacio">Forma de contacto pendiente de confirmar con el club.</p>`;
const socios = () => `${cabeceraSimple("Hazte socio", "Cada carné sostiene a más de veinte equipos de fútbol base")}
  <div class="contenedor">
    <section class="bloque socio">
      <div class="carne" aria-hidden="true">
        ${fondoMontes()}
        <img src="img/escudo.png" alt="">
        <p class="carne-club">Ural Español C.F.</p>
        <p class="carne-tipo">Socio · Temporada 2026-27</p>
        <p class="carne-num">Nº 0000</p>
      </div>
      <div class="articulo">
        <p>Con el carné del Ural apoyas a todos los equipos del club, de biberón a juvenil: material, desplazamientos, árbitros y entrenadores titulados.</p>
        <p class="vacio">Precios y ventajas: pendiente de confirmar con el club.</p>
        ${contacto("Quiero hacerme socio")}
      </div>
    </section>
  </div>`;

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
    ruta === "noticias" ? `${cabeceraSimple("Noticias", "La actualidad del club")}<div class="contenedor bloque">${listaNoticias(NOTICIAS)}</div>` :
    ruta === "noticia" ? noticia(a) :
    ruta === "socios" ? socios() :
    ruta === "buscar" ? buscar(a) :
    noEncontrado();
  tictac();
  document.title = `${ruta ? app.querySelector("h1")?.textContent.trim() + " · " : ""}${CLUB.nombre}`;
  document.querySelectorAll(".menu-enlaces a").forEach((l) => {
    const s = l.dataset.seccion;
    l.toggleAttribute("aria-current", s ? `${ruta}/${a}`.startsWith(s) || ruta === s : !ruta);
  });
  menu.classList.remove("menu--abierto");
  botonMenu.setAttribute("aria-expanded", "false");
  const destino = ancla && document.getElementById(ancla);
  destino ? destino.scrollIntoView() : scrollTo(0, 0);
}

function navegar() {
  document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches
    ? document.startViewTransition(render) : render();
}

app.addEventListener("click", (ev) => {
  const filtro = ev.target.closest("[data-filtro]");
  if (!filtro) return;
  filtroAgenda = filtro.dataset.filtro;
  const bloque = filtro.closest(".bloque");
  bloque.querySelectorAll("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", b === filtro));
  bloque.querySelectorAll("[data-cat]").forEach((f) => (f.hidden = filtroAgenda && f.dataset.cat !== filtroAgenda));
  bloque.querySelectorAll("[data-dia]").forEach((d) => (d.hidden = !d.querySelector("[data-cat]:not([hidden])")));
});

addEventListener("keydown", (ev) => {
  const f = app.querySelector(".ficha");
  if (!f || ev.target.closest?.("input")) return;
  if (ev.key === "ArrowLeft") location.hash = f.dataset.anterior;
  if (ev.key === "ArrowRight") location.hash = f.dataset.siguiente;
  if (ev.key === "Escape") location.hash = f.dataset.volver;
});

// Menú del móvil y buscador
const menu = document.querySelector(".menu"), botonMenu = document.querySelector(".menu-abrir");
botonMenu.addEventListener("click", () => {
  const abierto = menu.classList.toggle("menu--abierto");
  botonMenu.setAttribute("aria-expanded", abierto);
});
document.querySelector(".buscador").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const q = ev.target.q.value.trim();
  if (q) location.hash = `#/buscar/${encodeURIComponent(q)}`;
  ev.target.q.value = "";
});

function tictac() {
  for (const c of document.querySelectorAll("[data-objetivo]")) {
    const falta = Math.max(0, new Date(c.dataset.objetivo) - Date.now()) / 1000;
    [falta / 86400, (falta % 86400) / 3600, (falta % 3600) / 60].forEach((v, i) =>
      (c.children[i].firstChild.textContent = String(Math.floor(v)).padStart(2, "0")));
  }
}
setInterval(tictac, 15000);

document.getElementById("pie-contacto").innerHTML = [CLUB.direccion && esc(CLUB.direccion),
  CLUB.email && `<a href="mailto:${esc(CLUB.email)}">${esc(CLUB.email)}</a>`].filter(Boolean).join("<br>");
document.getElementById("pie-x").href = CLUB.x;
document.getElementById("pie-fed").href = CLUB.federacion;
document.getElementById("pie-fuente").textContent =
  `Partidos, plantillas y clasificaciones: Real Federación Galega de Fútbol (futgal.es)${typeof ACTUALIZADO === "string" && ACTUALIZADO ? ` · actualizado ${new Date(ACTUALIZADO).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`;

addEventListener("hashchange", navegar);
render();
