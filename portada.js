// Portada de esta versión de la web: inicio() la pinta y alPintarPortada() arranca lo que se mueve.
// --- Inicio: el informe del club ---------------------------------------
function inicio() {
  const { esta, pasada } = semanas();
  const pendientes = esta.filter((p) => !p.resultado);
  const principal = equipo(PRINCIPAL);
  const h = HISTORIA;

  return `
    <section class="portada" aria-labelledby="portada-titulo">
      <div class="mosaico" aria-hidden="true">
        <figure>${foto(FOTO.partido, "", false)}</figure>
        <div class="mosaico-color mosaico-color--verde"><b>${CLUB.fundado}</b><span>Año de fundación</span></div>
        <figure>${foto(FOTO.galerias, "", false)}</figure>
        <div class="mosaico-color mosaico-color--marino"><b>${EQUIPOS.length}</b><span>Equipos federados</span></div>
      </div>
      <div class="eje portada-texto">
        <p class="nota">Club de fútbol base de Santa Lucía, A Coruña.${pendientes.length ? ` Este fin de semana disputa ${plural(pendientes.length, "partido")}.` : ""}</p>
        <div>
          <h1 class="portada-titulo" id="portada-titulo"><span class="linea"><span>Ural Español</span></span><span class="linea"><span>Club de Fútbol</span></span></h1>
          <p class="portada-lema">Formamos futbolistas desde ${CLUB.fundado}: ${EQUIPOS.length} equipos, de biberón a juvenil, y un Juvenil A en División de Honor.</p>
          <p class="acciones"><a class="boton" href="#agenda">Partidos de esta semana</a><a class="enlace" href="#/socios">Hazte socio ${icono("i-flecha")}</a></p>
        </div>
      </div>
    </section>

    <section class="eje bloque" id="agenda" aria-labelledby="agenda-titulo">
      <p class="nota">Calendario oficial de la Real Federación Galega de Fútbol, actualizado cada hora.</p>
      <div>
        <h2 class="titulo" id="agenda-titulo">Partidos de esta semana</h2>
        ${esta.length ? agenda(esta) : vacio("La federación aún no ha publicado partidos para esta semana.")}
      </div>
    </section>

    ${donde()}

    ${pasada.length ? cifrasSemana(pasada, principal) : ""}

    ${principal ? juvenil(principal) : ""}

    <section class="eje bloque" id="equipos" aria-labelledby="equipos-titulo">
      <p class="nota">Todos los equipos compiten en la Real Federación Galega de Fútbol, salvo el Juvenil A, en División de Honor de la RFEF.</p>
      <div>
        <h2 class="titulo" id="equipos-titulo">Nuestros equipos</h2>
        ${muro()}
      </div>
    </section>

    <section class="club bloque" id="historia" aria-labelledby="club-titulo">
      <dl class="club-datos">
        <div><dt>Fundado</dt><dd>${CLUB.fundado}</dd></div>
        <div><dt>Sede</dt><dd>Santa Lucía, A Coruña</dd></div>
        <div><dt>Equipos</dt><dd>${EQUIPOS.length}</dd></div>
        <div><dt>Edades</dt><dd>De 4 a 18 años</dd></div>
      </dl>
      <div class="club-texto">
        <h2 class="titulo" id="club-titulo">El club</h2>
        <p class="lead">Nacido en 1929 como Deportivo Alameda, el club fue Derby y Español S.D. antes de adoptar en 2020 el nombre y el escudo del Ural C.F., fundado en 1962 por estudiantes que veían los Urales en el monte de Santa Margarita. Hoy se dedica por completo al fútbol base.</p>
        <div class="club-listas">
          <div><h3>Palmarés</h3><ul>${h.palmares.map((p) => `<li><span>${esc(p.titulo)}${p.veces > 1 ? ` (${p.veces})` : ""}</span><span>${esc(p.anios)}</span></li>`).join("")}</ul></div>
          <div><h3>Nombres del club</h3><ul>${h.nombres.map((n) => `<li><span>${esc(n.nombre)}</span><span>${n.desde}–${n.hasta ?? "hoy"}</span></li>`).join("")}</ul></div>
        </div>
        <a class="enlace" href="#/historia">Historia completa ${icono("i-flecha")}</a>
      </div>
    </section>

    <section class="socios-banda" aria-labelledby="socios-titulo">
      <div class="tira-fotos" aria-hidden="true">${foto(FOTO.torre)}${foto(FOTO.lluvia)}${foto(FOTO.orzan)}</div>
      <div class="socios-campo">
        <h2 id="socios-titulo">Socios</h2>
        <p class="socios-frase">Cada carné sostiene a ${EQUIPOS.length} equipos de fútbol base: material, árbitros, desplazamientos y entrenadores. <a href="#/socios">Hazte socio del Ural</a>.</p>
        <img class="socios-escudo" src="img/escudo.png" alt="" width="120" height="114">
      </div>
    </section>`;
}

