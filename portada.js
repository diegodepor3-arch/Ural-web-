// Lo que usan todas las portadas
function datosPortada() {
  const { esta, pasada } = semanas();
  const principal = equipo(PRINCIPAL), pp = principal && proximo(principal);
  return { esta, pasada, principal, pp: pp && { ...pp, e: principal }, pendientes: esta.filter((p) => !p.resultado),
    pos: principal ? filaPropia(principal) : -1, ganados: pasada.filter((p) => marcador(p).res === "G").length,
    goles: pasada.reduce((s, p) => s + marcador(p).nos, 0) };
}
const seccionNoticias = () => `<section class="bloque" aria-labelledby="not-t"><div class="bloque-cab"><h2 class="titulo" id="not-t">Noticias</h2><a href="#/noticias">Ver todas</a></div>${listaNoticias(NOTICIAS.slice(0, 3))}</section>`;
const miFranja = () => {
  const e = equipo(recordado());
  if (!e) return "";
  const p = proximo(e);
  return `<a class="mi-franja" href="${rutaEquipo(e)}"><span>Tu equipo</span><b>${esc(nombreEquipo(e))}</b><span>${p ? `${esc(mayus(fechaCorta(p.fecha)))}${p.hora ? ` · ${esc(p.hora)}` : ""} · ${esc(cruce(p))}` : "Sin partidos pendientes"}</span></a>`;
};
function alPintarPortada() {}
// Cabecera: la franja anuncia el próximo partido y Equipos despliega los 23 equipos
function cabeceraComun() {
  const j = equipo(PRINCIPAL), p = j && proximo(j);
  if (p) document.querySelector(".franja span").innerHTML = `<a href="${rutaEquipo(j)}">Próximo · ${esc(nombreEquipo(j))}: ${esc(cruce(p))} · ${esc(mayus(fechaCorta(p.fecha)))}${p.hora ? `, ${esc(p.hora)}` : ""}</a>`;
  const menu = document.querySelector(".menu"), equipos = menu.querySelector('[data-seccion="cantera"]');
  menu.insertAdjacentHTML("beforeend", `<div class="mega" hidden>${CATEGORIAS.filter((c) => EQUIPOS.some((e) => e.categoria === c.id)).map((c) => `<div><h3><a href="#/cantera/${c.id}">${esc(c.nombre)}</a></h3><ul>${EQUIPOS.filter((e) => e.categoria === c.id).map((e) => `<li><a href="${rutaEquipo(e)}">${esc(nombreEquipo(e))}</a></li>`).join("")}</ul></div>`).join("")}</div>`);
  const mega = menu.querySelector(".mega"), ver = (si) => { mega.hidden = !si; };
  menu.querySelectorAll(".menu-enlaces a").forEach((l) => ["mouseenter", "focus"].forEach((t) => l.addEventListener(t, () => ver(l === equipos))));
  menu.addEventListener("mouseleave", () => ver(false));
  addEventListener("hashchange", () => ver(false));
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") ver(false); });
}
// Centenario: el club y su historia por delante. Escudo, 97 años, podio de goleadores y la escalera de la cantera.
function alArrancar() {
  const nav = document.querySelector(".menu-enlaces"), l = [...nav.children], noticias = document.createElement("a");
  noticias.href = "#/noticias"; noticias.dataset.seccion = "noticias"; noticias.textContent = "Noticias";
  l.splice(4, 0, noticias);
  const lado = (hijos) => { const d = document.createElement("div"); d.className = "menu-lado"; d.append(...hijos); return d; };
  nav.replaceChildren(lado(l.slice(0, 3)), lado(l.slice(3)));
  cabeceraComun();
}
function inicio() {
  const d = datosPortada(), j = d.principal, top = goleadoresClub(3);
  const anios = hoy().getFullYear() - CLUB.fundado;
  const cats = CATEGORIAS.filter((c) => c.id !== "veteranos" && EQUIPOS.some((e) => e.categoria === c.id)).reverse();
  const podio = [top[1], top[0], top[2]];
  return `
    <section class="cent" aria-labelledby="h">
      ${foto(FOTO.niebla, "cent-foto", false)}
      <div class="cent-dentro">
        <img class="cent-escudo" src="img/escudo.png" alt="Escudo del Ural Español" width="397" height="376">
        <h1 id="h">Ural Español</h1>
        <p class="cent-lema"><b data-cuenta="${anios}">${anios}</b> años de fútbol en Santa Lucía</p>
        <p class="cent-acc"><a class="boton" href="#/partidos">Partidos de esta semana</a><a class="boton boton--claro" href="#/mi-equipo">Mi equipo</a></p>
      </div>
    </section>
    ${d.pp ? bandaPartido(d.pp) : ""}
    ${cinta(d.pasada.concat(d.pendientes))}
    ${miFranja()}
    <section class="bloque" data-pestanas aria-labelledby="pes-t">
      <h2 class="titulo" id="pes-t">Esta semana</h2>
      <div class="pestanas" role="tablist">
        <button type="button" role="tab" data-pestana="prox" aria-selected="true">Próximos</button>
        <button type="button" role="tab" data-pestana="res" aria-selected="false">Resultados</button>
        ${j ? `<button type="button" role="tab" data-pestana="tabla" aria-selected="false">División de Honor</button>` : ""}
      </div>
      <div data-panel="prox"><ul>${d.pendientes.slice(0, 7).map(filaCentro).join("") || `<li>${vacio("Sin partidos publicados.")}</li>`}</ul><a class="enlace" href="#/partidos">Centro de partidos ${icono("i-flecha")}</a></div>
      <div data-panel="res" hidden><div class="partidos">${d.pasada.slice(0, 9).map((p) => tarjetaPartido(p, false, true)).join("") || vacio("Sin resultados esta semana.")}</div></div>
      ${j ? `<div data-panel="tabla" hidden>${tablaClasificacion(j)}</div>` : ""}
    </section>
    ${top.length === 3 ? `<section class="bloque" aria-labelledby="pod-t"><h2 class="titulo" id="pod-t">El podio del gol</h2>
      <ol class="podio">${podio.map((x) => `<li><a href="${rutaFicha(x.e, x.n)}"><span class="podio-cam">${camiseta(x.g)}</span><b>${esc(x.n.split(" ").slice(0, 2).join(" "))}</b><small>${esc(nombreEquipo(x.e))} · ${plural(x.g, "gol", "goles")}</small></a><i></i></li>`).join("")}</ol></section>` : ""}
    <section class="bloque" aria-labelledby="esc-t"><div class="bloque-cab"><h2 class="titulo" id="esc-t">Del biberón a División de Honor</h2><a href="#/cantera">Los ${EQUIPOS.length} equipos</a></div>
      <ol class="escalera" style="--n:${cats.length}">${cats.map((c, i) => {
        const eqs = EQUIPOS.filter((e) => e.categoria === c.id);
        return `<li style="--i:${i}"><a href="#/cantera/${c.id}"><strong>${esc(c.nombre)}</strong><small>${esc(c.edad || "")}</small><small class="escalera-n">${plural(eqs.length, "equipo")}</small></a></li>`;
      }).join("")}</ol></section>
    <section class="cent-historia" aria-labelledby="his-t">
      <div><h2 class="titulo" id="his-t">Cuatro nombres, un club</h2>
        <ol>${HISTORIA.nombres.map((n) => `<li><b>${n.desde}</b>${esc(n.nombre)}</li>`).join("")}</ol>
        <a class="enlace" href="#/historia">Historia completa ${icono("i-flecha")}</a></div>
      <ul class="palmares">${HISTORIA.palmares.map((p) => `<li><b data-cuenta="${p.veces}">${p.veces}</b><span>${esc(p.titulo)}</span><small>${esc(p.anios)}</small></li>`).join("")}</ul>
    </section>
    ${donde()}
    ${seccionNoticias()}`;
}
