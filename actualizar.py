"""Descarga de futgal.es los equipos, plantillas, partidos y clasificaciones del club
y los guarda en federacion.js. Uso: python actualizar.py

ponytail: lee el HTML de la federación con expresiones regulares; si futgal cambia
el diseño de sus páginas habrá que ajustar los patrones de este archivo.
"""
import gzip
import io
import html
import http.cookiejar
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
from collections import Counter
from datetime import date, datetime
from itertools import count

BASE = "https://www.futgal.es/pnfg/NPcd/"
CLUB = 1023  # Ural Español C.F. en futgal
TEMPORADA = 22  # 2026-2027 (código interno de futgal)
INICIO_TEMPORADA = "2026-07-01"  # partidos anteriores son de otra temporada (cambiar junto con TEMPORADA)
# Hoja de Google donde el club escribe noticias, vídeos, datos de jugadores y del club (compartida "cualquiera con el enlace: lector")
HOJA_ID = "1Kz8ZsDzWaAo07bvQDYqTv7tF-NlbZm8ZotTOIIvxOQc"
# Hoja de respuestas del formulario «Publicar en la web del Ural» (vacío: aún no está vinculada)
FORMULARIO_ID = ""
MAX_ACTAS = int(os.environ.get("MAX_ACTAS", 5))  # actas nuevas por equipo y ejecución

jar = http.cookiejar.CookieJar()
web = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
web.addheaders = [("User-Agent", "Mozilla/5.0 (web Ural Espanol CF)")]


def get(url, intentos=2):
    """futgal devuelve una página vacía si no hay sesión: la (re)abre y reintenta."""
    for i in range(intentos):
        time.sleep(3 + 10 * i)  # futgal bloquea la IP si se le piden páginas demasiado rápido
        with web.open(url, timeout=30) as r:
            s = r.read().decode("cp1252", errors="replace")
        if len(s) > 2000:
            return s
        jar.clear()
        web.open("https://www.futgal.es/pnfg/", timeout=30).read()
    raise RuntimeError(f"futgal no responde (¿IP bloqueada? reintenta más tarde): {url}")


def texto(s):
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s).replace("\xa0", " ")).strip()


def filas(s):
    return re.findall(r"<tr.*?</tr>", s, flags=re.S)


def celdas(fila):
    return [texto(c) for c in re.findall(r"<td.*?>(.*?)</td>", fila, flags=re.S)]


# La federación escribe muchos nombres sin tilde. Solo palabras sin duda; las dudosas se dejan como vienen.
ACENTOS = {w.translate(str.maketrans("áéíóúÁÓ", "aeiouAO")): w for w in """
    Aarón Adrián Alegría Álvarez Álvaro Andrés Ángel Antón Añón Arévalo Bermúdez Bernárdez Cibrán
    Cortés Darío Díaz Domínguez Durán Eirín Enríquez Fernández Galán García Gómez González Gundín
    Gutiérrez Hernández Ibáñez Iván Jesús Jiménez Joaquín José Lobón López Mantiñán María Martín
    Martínez Méndez Nicolás Óscar Pérez Piñón Ramírez Ramón Rifón Río Ríos Rodríguez Román Rubén
    Sánchez Santamaría Saúl Sebastián Simeón Solís Suárez Tomás Tomé Uría Uzcátegui Valentín
    Vázquez Yáñez""".split()}


def acentos(s):
    return re.sub(r"[^\W\d_]+", lambda m: ACENTOS.get(m.group(), m.group()), s)


def nombre_persona(s):
    apellidos, _, nombre = s.partition(",")
    return acentos(f"{nombre.strip()} {apellidos.strip()}".strip().title())


def es_club(nombre):
    return "URAL ESPA" in nombre.upper()


def categoria(cat):
    c = cat.upper()
    for clave, cid in [("VETERANO", "veteranos"), ("BIBER", "biberon"), ("PREBENJAMIN", "prebenjamin"), ("BENJAMIN", "benjamin"), ("ALEVIN", "alevin"),
                       ("INFANTIL", "infantil"), ("CADETE", "cadete"), ("XUVENIL", "juvenil"), ("JUVENIL", "juvenil")]:
        if clave in c:
            return cid
    return "senior"


def equipos_del_club():
    s = get(f"{BASE}NFG_VerClub?cod_primaria=1000118&codigo_club={CLUB}")
    out = []
    for f in filas(s):
        m = re.search(r"Codigo_Equipo=(\d+)", f)
        if m:
            c = celdas(f)
            out.append((m.group(1), c[0], c[-1]))
    return out


def lista_personas(s, titulo):
    m = re.search(titulo + r".*?</thead>(.*?)</table>", s, flags=re.S)
    return [nombre_persona(texto(td)) for td in re.findall(r"<td>(.*?)</t[dr]>", m.group(1), flags=re.S)] if m else []


def competicion_actual(cod):
    s = get(f"{BASE}NFG_VisCompeticiones_Equipo?cod_primaria=1000123&codequipo={cod}&codtemporada={TEMPORADA}")
    temporada = s[s.find("</thead>"):].split("</table>")[0]
    for f in filas(temporada):
        m = re.search(r"codcompeticion=(\d+)'>(.*?)</a>.*?codgrupo=(\d+)'>(.*?)</a>", f, flags=re.S)
        # La liga, no copas ni torneos amistosos
        if m and not re.search(r"COPA|TORNEO|NO OFICIAL|ELIMINATORIA", texto(m.group(2)).upper()):
            return m.group(1), texto(m.group(2)), m.group(3), texto(m.group(4))
    return None


def clasificacion(comp, grupo):
    s = get(f"{BASE}NFG_VisClasificacion?cod_primaria=1000120&codgrupo={grupo}&codcompeticion={comp}")
    tabla, vistos = [], set()
    for f in filas(s):
        c = celdas(f)
        # Tabla detallada: pos, equipo, [pts/pj], pts, J G E P casa, J G E P fuera, GF, GC
        n = [int(x) for x in c[3:] if x.isdigit()]
        if "codequipo=" not in f or len(n) < 11 or c[2] in vistos:
            continue
        vistos.add(c[2])
        tabla.append({"equipo": c[2], "pts": n[0], "pj": n[1] + n[5], "g": n[2] + n[6], "e": n[3] + n[7],
                      "p": n[4] + n[8], "gf": n[9], "gc": n[10], "propio": es_club(c[2])})
    return tabla


def partidos(cod, grupo):
    s = get(f"{BASE}NFG_VisCompeticiones_Grupo?cod_primaria=1000123&codequipo={cod}&codgrupo={grupo}")
    out = []
    for f in filas(s):
        h5 = [texto(x) for x in re.findall(r"<h5.*?>(.*?)</h5>", f, flags=re.S)]
        if len(h5) < 4 or not h5[0].isdigit():
            continue
        local, visitante = h5[1], h5[2]
        if re.match(r"\d\d-\d\d-\d{4}", visitante):  # jornada de descanso: solo sale un equipo y la fecha
            continue
        m = re.match(r"(\d\d)-(\d\d)-(\d{4})\s*(\d\d:\d\d)?", h5[3])
        res = re.findall(r"\d+", h5[4]) if len(h5) > 4 else []
        out.append({
            "jornada": int(h5[0]),
            "fecha": f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else "",
            "hora": (m.group(4) or "") if m else "",
            "local": es_club(local),
            "rival": visitante if es_club(local) else local,
            "resultado": f"{res[0]}-{res[1]}" if len(res) >= 2 else "",
            "campo": "",
        })
    return out


def jornada(comp, grupo, num):
    return get(f"{BASE}NFG_CmpJornada?cod_primaria=1000120&CodCompeticion={comp}&CodGrupo={grupo}"
               f"&CodTemporada={TEMPORADA}&CodJornada={num}")


def escudos(s):
    """Empareja cada nombre de equipo de la jornada con el escudo más cercano en el HTML."""
    imgs = [(m.start(), m.group(1)) for m in re.finditer(r'<img src="(https?://[^"]+/pimg/Clubes/[^"]+)"', s)]
    out = {}
    for m in re.finditer(r'Codigo_Equipo=\d+">(.*?)</a>', s, flags=re.S):
        if imgs:
            out[texto(m.group(1))] = min(imgs, key=lambda x: abs(x[0] - m.start()))[1]
    return out


def leer_acta(s):
    """Lo que hizo cada jugador del club en un partido: t=titular, s=suplente, e=entró,
    g=goles, a=amarillas, r=rojas, d=dorsal, c=cambios [entra, sale, minuto], rm=minuto de cada roja.
    Infantil y categorías menores no publican cambios (se puede volver a entrar): ahí c queda vacío."""
    acta = {"t": [], "s": [], "e": [], "g": {}, "a": [], "r": [], "d": {}, "c": [], "rm": {}}
    for bloque in re.split(r"class=number[^>]*>", s)[1:]:
        if not es_club(texto(bloque.split("</div>")[0])):
            continue
        cuerpo = bloque.split("Cuerpo T")[0]
        corte = cuerpo.find("Suplentes") if "Suplentes" in cuerpo else len(cuerpo)
        for parte, clave in ((cuerpo[:corte], "t"), (cuerpo[corte:], "s")):
            for f in filas(parte):
                c = [x for x in celdas(f) if x]
                if len(c) >= 2 and c[0].isdigit():
                    n = nombre_persona(c[1])
                    acta[clave].append(n)
                    acta["d"][n] = int(c[0])
        break
    nuestros = set(acta["t"]) | set(acta["s"])
    nombre_fila = lambda html_: nombre_persona(re.sub(r"\([^)]*\)", "", texto(html_)).strip())  # quita el minuto: (85') o (90'+1)
    for m in re.finditer(r'title="?(Gol[^">]*)"?.*?</strong></td>\s*<td[^>]*>(.*?)</td>', s, flags=re.S):
        n = nombre_fila(m.group(2))
        if "ropia" not in m.group(1) and n in nuestros:  # los goles en propia puerta no cuentan para el jugador
            acta["g"][n] = acta["g"].get(n, 0) + 1
    for m in re.finditer(r"tarj_(\w+)\.gif.*?</td>\s*<td[^>]*>(.*?)</td>", s, flags=re.S):
        n = nombre_fila(m.group(2))
        if n in nuestros:
            roja = "roj" in m.group(1) or "2" in m.group(1)
            acta["r" if roja else "a"].append(n)
            if roja and (mi := minuto(m.group(2))) is not None:
                acta["rm"][n] = mi
    entra = None
    for f in filas(s[s.find("Sustituciones"):]):
        n = next((nombre_fila(x) for x in celdas(f) if "," in x), None)
        if "arrow-up" in f or "font-green" in f:  # entra: flecha hacia arriba (RFEF) o flecha verde (futgal)
            entra = n
            if n in acta["s"]:
                acta["e"].append(n)
        elif entra in nuestros and (mi := minuto(f)) is not None:  # la fila siguiente es la de quien sale, con el minuto
            acta["c"].append([entra, n, mi])
            entra = None
    return acta


def minuto(html_):
    """(46') → 46; (90'+2) → 90."""
    m = re.search(r"\((\d+)'", texto(html_))
    return int(m.group(1)) if m else None


def dorsales(actas_):
    """El dorsal más habitual de cada jugador en las actas (si empata, el más reciente).
    Si dos jugadores coinciden (equipos sin dorsal fijo), el número es para quien más veces lo ha llevado
    y el otro se queda con el siguiente que más haya usado; quien se queda sin ninguno recibe el
    primer número libre del 12 en adelante."""
    usos, ultima = Counter(), {}
    for j in sorted(actas_, key=int):
        for n, d in actas_[j]["d"].items():
            usos[n, d] += 1
            ultima[n, d] = int(j)
    out = {}
    for (n, d) in sorted(usos, key=lambda x: (-usos[x], -ultima[x], x[1], x[0])):
        if n not in out and d not in out.values():
            out[n] = d
    jugados = Counter(n for (n, _), k in usos.items() for _ in range(k))
    for n in sorted(jugados.keys() - out.keys(), key=lambda n: (-jugados[n], n)):
        out[n] = next(d for d in count(12) if d not in out.values())
    return out


def dorsales_del_club(equipos):
    """Jugadores de la plantilla que aún no han jugado con su equipo (o no tienen acta): se les pone
    el número que más han llevado jugando con otro equipo del club, si en el suyo está libre."""
    usos = Counter()
    for e in equipos:
        for a in (e.get("actas") or {}).values():
            for n, d in a["d"].items():
                usos[normal(n), d] += 1
    for e in equipos:
        if not e.get("actas") or "dorsales" not in e:
            continue
        propios = {normal(n) for n in e.get("dorsales", {})}
        for n in e["plantilla"]:
            if normal(n) in propios:
                continue
            libres = [(k, d) for (m, d), k in usos.items() if m == normal(n) and d not in e["dorsales"].values()]
            if libres:
                e["dorsales"][n] = max(libres, key=lambda x: (x[0], -x[1]))[1]


def normal(n):
    """Igual que normal() de app.js: sin mayúsculas ni tildes."""
    return "".join(c for c in unicodedata.normalize("NFD", n.lower()) if not unicodedata.combining(c)).strip()


def copia_acta(cod_acta):
    """Ruta de la copia de un acta, comprimida (las antiguas sin comprimir también valen); None si no hay."""
    for ruta in (os.path.join(".cache", f"acta-{cod_acta}.html.gz"), os.path.join(".cache", f"acta-{cod_acta}.html")):
        if os.path.exists(ruta):
            return ruta
    return None


def acta_html(cod_acta):
    """Copia de cada acta en .cache/ (se sube a GitHub): si cambia la forma de leerla no hay que volver a pedirla a futgal."""
    ruta = copia_acta(cod_acta)
    if ruta:
        with (gzip.open(ruta, "rt", encoding="utf-8") if ruta.endswith(".gz") else open(ruta, encoding="utf-8")) as f:
            return f.read()
    s = get(f"{BASE}NFG_CmpPartido?cod_primaria=1000120&CodActa={cod_acta}")
    os.makedirs(".cache", exist_ok=True)
    with gzip.open(os.path.join(".cache", f"acta-{cod_acta}.html.gz"), "wt", encoding="utf-8") as f:
        f.write(s)
    return s


def actas(cod, comp, grupo, jugados, previas):
    """Actas de los partidos jugados. Las ya leídas se guardan y solo se piden las nuevas."""
    out = dict(previas or {})
    for j, a in out.items():  # las que tienen copia se vuelven a leer gratis (por si mejora la lectura)
        if a.get("id") and copia_acta(a["id"]):
            out[j] = dict(leer_acta(acta_html(a["id"])), id=a["id"])
    # ponytail: pocas actas por ejecución para no provocar el bloqueo de futgal
    # leídas antes de guardar copias: se vuelven a pedir por su código, para poder releerlas cuando mejore la lectura
    sin_copia = [j for j, a in out.items() if a.get("id") and not copia_acta(a["id"])][:MAX_ACTAS]
    for j in sin_copia:
        out[j] = dict(leer_acta(acta_html(out[j]["id"])), id=out[j]["id"])
    # sin "c": leída antes de guardar los cambios (minutos jugados); se vuelve a pedir
    nuevas = [p for p in jugados if not out.get(str(p["jornada"]), {}).get("id") or "c" not in out[str(p["jornada"])]]
    resto = MAX_ACTAS - len(sin_copia)
    for p in nuevas[-resto:] if resto > 0 else []:
        s = jornada(comp, grupo, p["jornada"])
        i = s.find(f"Codigo_Equipo={cod}\"")
        cerca = [(abs(m.start() - i), m.group(1)) for m in re.finditer(r"CodActa=(\d+)", s)]
        if i >= 0 and cerca:
            cod_acta = min(cerca)[1]
            out[str(p["jornada"])] = dict(leer_acta(acta_html(cod_acta)), id=cod_acta)
    return out


def completar_proximo(p, cod, comp, grupo, e):
    """El calendario no trae el campo: lo saca de la página de la jornada (y de paso los escudos)."""
    s = jornada(comp, grupo, p["jornada"])
    e["escudos"] = escudos(s)
    i = s.find(f"Codigo_Equipo={cod}\"")
    if i < 0:
        return
    bloque = s[i:i + 6000]
    campo = re.search(r"Codigo_Campo=\d+\">(.*?)</a>", bloque, flags=re.S)
    hora = re.search(r"class=horario[^>]*>(.*?)</span>", bloque, flags=re.S)
    if campo:
        p["campo"] = texto(campo.group(1))
    if hora and (h := re.search(r"\d\d:\d\d", hora.group(1))):
        p["hora"] = h.group(0)


FUTBOLME = "https://futbolme.com/resultados-directo/"
# División de Honor Juvenil la organiza la RFEF: futgal no tiene su calendario. Sale de futbolme.com.
FUTBOLME_EQUIPO = "equipo/ural-espanol-cf/3021"
FUTBOLME_GRUPO = "torneo/division-de-honor-juvenil-grupo-1/31"
# La web de la RFEF no deja descargar datos (403): solo se enlaza su calendario oficial en PDF
RFEF_CALENDARIO = "https://rfef.es/sites/default/files/2026-07/DHJ_Calendario_Grupo_1.pdf"


def futbolme(ruta):
    time.sleep(1)
    with web.open(FUTBOLME + ruta, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def partidos_futbolme(ruta, s=None):
    """Partidos de una página de futbolme (calendario del equipo o jornada del grupo): (jornada, fecha, hora, local, visitante, resultado)."""
    out = []
    for b in (s or futbolme(ruta)).split('class="cajaPartido"')[1:]:
        nombres = re.findall(r'd-none d-sm-block[^>]*>(.*?)</span>', b, flags=re.S)
        f = re.search(r'horaPrevistaPartido">\s*(\d\d)/(\d\d)/(\d\d)', b)
        j = re.search(r">Jornada (\d+)<", b)
        res = re.search(r'resultadoPartido">\s*<span>\s*(\d+)\s*</span>\s*-\s*<span>\s*(\d+)', b)
        hora = re.search(r'horaPartido">\s*(\d\d:\d\d)', b)
        if len(nombres) >= 2:
            out.append({"jornada": int(j.group(1)) if j else 0, "fecha": f"20{f.group(3)}-{f.group(2)}-{f.group(1)}" if f else "",
                        "hora": hora.group(1) if hora else "", "localN": texto(nombres[0]), "visitanteN": texto(nombres[1]),
                        "resultado": f"{res.group(1)}-{res.group(2)}" if res else ""})
    return out


# La RFEF no publica las actas de División de Honor: los números de cada jugador salen de lapreferente.com
LAPREFERENTE_JUVENIL = "https://www.lapreferente.com/E58614T20262027/ural-espa%C3%B1ol-cf"


def jugadores_lapreferente(url):
    """Totales de la temporada por jugador (web pública, no oficial): posición, edad, convocatorias,
    partidos, titularidades, minutos, goles y tarjetas. En porteros, el número entre paréntesis son goles encajados."""
    with web.open(url, timeout=30) as r:
        s = r.read().decode("latin-1")
    out = {}
    for f in re.findall(r"<tr[^>]*>(.*?)</tr>", s, flags=re.S):
        if "plantillaDorsal" not in f:
            continue
        nombre = re.search(r'<a [^>]*>\s*<span[^>]*>.*?</span>.*?<span>(.*?)</span>', f, flags=re.S)
        posicion = re.search(r'min-width:152px"><span>(.*?)</span>', f)
        cifras = [texto(x) for x in re.findall(r"<td[^>]*><span>(.*?)</span></td>", f[f.find("min-width:152px"):], flags=re.S)]
        if not nombre or len(cifras) < 8:
            continue
        n = lambda x: int(re.sub(r"\D", "", x) or 0)
        out[texto(nombre.group(1))] = {
            "posicion": texto(posicion.group(1)) if posicion else "", "edad": n(cifras[0]) or None,
            "pc": n(cifras[1]), "pj": n(cifras[2]), "pt": n(cifras[3]), "min": n(cifras[4]),
            "goles": 0 if "(" in cifras[5] else n(cifras[5]), "encajados": n(cifras[5]) if "(" in cifras[5] else None,
            "ta": n(cifras[6]), "tr": n(cifras[7])}
    return out


def juvenil_division_honor(e):
    nuestro = lambda n: "URAL ESPA" in n.upper()
    pagina = futbolme(f"{FUTBOLME_EQUIPO}/calendario")
    cal = partidos_futbolme("", pagina)
    # Escudos de los rivales: uno por equipo, de su página en futbolme (los ya conocidos no se vuelven a pedir)
    escudos_ = dict(e.get("escudos") or {})
    for ruta in sorted(set(re.findall(r'href="(?:https://futbolme.com)?/resultados-directo/(equipo/[^/"]+/\d+)/calendario"', pagina))):
        if ruta in escudos_.get("_rutas", []):
            continue
        t = futbolme(ruta)
        nombre, img = re.search(r"<h1[^>]*>(.*?)</h1>", t, flags=re.S), re.search(r'src="(/static/img/club/[^"]+)" class="escudo_ind"', t)
        if nombre and img:
            escudos_[texto(nombre.group(1))] = "https://futbolme.com" + img.group(1)
        escudos_.setdefault("_rutas", []).append(ruta)
    e["escudos"] = escudos_
    e["competicion"] = "División de Honor Juvenil · Grupo 1"
    e["fuente"] = "futbolme.com"
    e["urlOficial"] = RFEF_CALENDARIO
    try:
        e["perfiles"] = {"fecha": datetime.now().isoformat(timespec="minutes"), "url": LAPREFERENTE_JUVENIL,
                         "jugadores": jugadores_lapreferente(LAPREFERENTE_JUVENIL)}
    except (OSError, ValueError) as err:  # si falla, se quedan los de la ejecución anterior
        print("lapreferente no disponible:", err)
    e["urlClasificacion"] = f"{FUTBOLME}{FUTBOLME_GRUPO}/clasificacion"
    e["partidos"] = [{"jornada": p["jornada"], "fecha": p["fecha"], "hora": p["hora"], "local": nuestro(p["localN"]),
                      "rival": p["visitanteN"] if nuestro(p["localN"]) else p["localN"], "resultado": p["resultado"], "campo": ""}
                     for p in cal]
    # ponytail: clasificación calculada con los resultados de cada jornada; no recoge sanciones de puntos
    tabla = {}
    for j in sorted({p["jornada"] for p in cal if p["resultado"]}):
        for p in partidos_futbolme(f"{FUTBOLME_GRUPO}/jornada/{j}"):
            for n in (p["localN"], p["visitanteN"]):
                tabla.setdefault(n, {"equipo": n, "pts": 0, "pj": 0, "g": 0, "e": 0, "p": 0, "gf": 0, "gc": 0, "propio": nuestro(n)})
            if not p["resultado"]:
                continue
            gl, gv = map(int, p["resultado"].split("-"))
            for n, a, b in ((p["localN"], gl, gv), (p["visitanteN"], gv, gl)):
                t = tabla[n]
                t["pj"] += 1; t["gf"] += a; t["gc"] += b
                t["g" if a > b else "e" if a == b else "p"] += 1
                t["pts"] += 3 if a > b else 1 if a == b else 0
    e["clasificacion"] = sorted(tabla.values(), key=lambda t: (-t["pts"], -(t["gf"] - t["gc"]), -t["gf"], t["equipo"]))


def equipo_basico(cod, nombre, cat):
    """Lo que se sabe de un equipo con solo la lista del club: la web ya le hace página aunque falten sus datos."""
    letra = re.search(r'"([A-Z])"', nombre)
    cid = categoria(cat)
    return {
        "id": f"{cid}-{(letra.group(1) if letra else 'a').lower()}{'-f11' if 'F-11' in cat else ''}{'-fs' if 'F.S' in cat else ''}",
        "codigo": cod,
        "categoria": cid,
        "letra": letra.group(1) if letra else "A",
        "liga": cat.title(),
        "urlFederacion": f"https://www.futgal.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo={cod}",
        "plantilla": [], "entrenadores": [], "delegados": [], "clasificacion": [], "partidos": [],
    }


def descargar_equipo(cod, nombre, cat, anterior=None):
    ficha = get(f"{BASE}NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo={cod}")
    e = equipo_basico(cod, nombre, cat)
    e.update(plantilla=lista_personas(ficha, "Jugadores"), entrenadores=lista_personas(ficha, "cnicos"),
             delegados=lista_personas(ficha, "Delegados"))
    comp = competicion_actual(cod)
    if not comp and "DIVISION DE HONOR JUVENIL" in cat.upper():
        try:
            juvenil_division_honor(e)
            if "perfiles" not in e and (anterior or {}).get("perfiles"):  # si lapreferente falla, se quedan los de antes
                e["perfiles"] = anterior["perfiles"]
        except (OSError, ValueError) as err:  # si falla, se queda lo de la ejecución anterior
            print("futbolme no disponible:", err)
            for k in ("competicion", "fuente", "urlOficial", "perfiles", "urlClasificacion", "partidos", "clasificacion"):
                if k in (anterior or {}):
                    e[k] = anterior[k]
    if comp:
        cc, cnombre, grupo, gnombre = comp
        e["partidos"] = partidos(cod, grupo)
        # futgal a veces devuelve una competición de otra temporada (p. ej. la de 2021 de un equipo que este año
        # no está inscrito, o un torneo de Navidad del año pasado): si ningún partido es de esta temporada, no vale
        if not any(p["fecha"] >= INICIO_TEMPORADA for p in e["partidos"]):
            print("  competición de otra temporada, se descarta:", cnombre)
            e["partidos"] = []
            comp = None
    if comp:
        e["competicion"] = f"{cnombre.title()} · {gnombre.title()}"
        e["urlClasificacion"] = f"https://www.futgal.es/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codgrupo={grupo}&codcompeticion={cc}"
        e["clasificacion"] = clasificacion(cc, grupo)
        proximo = next((p for p in e["partidos"] if not p["resultado"]), None)
        if proximo:
            completar_proximo(proximo, cod, cc, grupo, e)
        # actas de todas las categorías: estadísticas y dorsal de cada jugador
        e["actas"] = actas(cod, cc, grupo, [p for p in e["partidos"] if p["resultado"]], (anterior or {}).get("actas"))
        e["dorsales"] = dorsales(e["actas"])
    e["descargado"] = datetime.now().isoformat(timespec="minutes")
    return e


def leer_previo():
    try:
        with open("federacion.js", encoding="utf-8") as f:
            datos = re.search(r"const EQUIPOS = (.*);\s*$", f.read(), flags=re.S).group(1)
        return {e["codigo"]: e for e in json.loads(datos)}
    except (OSError, AttributeError, ValueError):
        return {}


def guardar(equipos):
    dorsales_del_club(equipos)
    with open("federacion.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por actualizar.py desde futgal.es. No editar a mano.\n")
        f.write(f"const ACTUALIZADO = {json.dumps(max(e.get('descargado', '') for e in equipos))};\n")
        f.write(f"const EQUIPOS = {json.dumps(equipos, ensure_ascii=False, indent=1)};\n")


def plantillas(club, previo):
    """Pasada rápida: solo la ficha de los equipos sin plantilla (una página por equipo)."""
    for cod, nombre, cat in club:
        if previo[cod]["plantilla"]:
            continue
        try:
            ficha = get(f"{BASE}NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo={cod}")
        except (RuntimeError, OSError) as err:
            print("Parado, se sigue en la próxima ejecución:", err)
            break
        previo[cod].update(plantilla=lista_personas(ficha, "Jugadores"), entrenadores=lista_personas(ficha, "cnicos"),
                           delegados=lista_personas(ficha, "Delegados"))
        print("·", previo[cod]["id"], len(previo[cod]["plantilla"]), "jugadores", flush=True)
        guardar([previo[c] for c, _, _ in club])


# --- Hoja de Google del club ------------------------------------------------------------------------
# El club escribe en una hoja de Google; aquí se descarga entera (como Excel) y se convierte en hoja.js,
# que app.js aplica encima de data.js. Una fila mal escrita se salta; si la hoja no se puede descargar,
# hoja.js se queda como estaba.
SINGULAR = {"juvenil": "Juvenil", "cadete": "Cadete", "infantil": "Infantil", "alevin": "Alevín", "benjamin": "Benjamín",
            "prebenjamin": "Prebenjamín", "biberon": "Biberón", "veteranos": "Veteranos"}
TIPOS_VIDEO = {"resumen": "highlight", "entrevista": "entrevista"}
DATOS_CLUB = {"email": "email", "direccion de la sede": "direccion", "campo habitual": "campo", "instagram": "instagram",
              "x (twitter)": "x", "telefono": "telefono"}


def nombre_hoja(e):
    """Como sale el equipo en la lista desplegable de la hoja: «Alevín A F-11», «Biberón A sala»."""
    mod = " F-11" if "F-11" in e["liga"] else " sala" if "F.S" in e["liga"] else ""
    return f'{SINGULAR.get(e["categoria"], e["categoria"].title())} {e["letra"]}{mod}'


def fecha_hoja(v):
    """Fecha de una casilla: fecha de verdad o texto 08/11/2026 (también 8-11-26 o 2026-11-08). None si no lo es."""
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    t = str(v or "").strip().split(" ")[0]  # «06/11/2026 10:09:13» (marca temporal del formulario) -> la fecha
    if m := re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", t):
        a, me, d = map(int, m.groups())
    elif m := re.fullmatch(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})", t):
        d, me, a = map(int, m.groups())
        a += 2000 if a < 100 else 0
    else:
        return None
    try:
        return date(a, me, d).isoformat()
    except ValueError:
        return None


def id_youtube(v):
    t = str(v or "").strip()
    m = re.search(r"(?:youtu\.be/|v=|/shorts/|/embed/|/live/)([\w-]{11})", t) or re.fullmatch(r"([\w-]{11})", t)
    return m.group(1) if m else None


def foto_drive(v, carpeta="img/hoja"):
    """Enlace de una foto de Google Drive (compartida con cualquiera que tenga el enlace) -> copia en la web."""
    t = str(v or "").strip()
    m = re.search(r"/d/([\w-]{20,})", t) or re.search(r"[?&]id=([\w-]{20,})", t)
    if not m:
        if t:
            print("  foto sin enlace de Drive, se ignora:", t)
        return None
    ruta = f"{carpeta}/{m.group(1)}.jpg"
    if os.path.exists(ruta):
        return ruta
    try:
        with web.open(f"https://drive.google.com/uc?export=download&id={m.group(1)}", timeout=60) as r:
            datos, tipo = r.read(), r.headers.get("Content-Type", "")
        if not tipo.startswith("image/"):
            print("  la foto no es una imagen o no está compartida:", t)
            return None
        try:  # más pequeña para que la web cargue rápido (si no hay Pillow, se guarda tal cual)
            from PIL import Image, ImageOps
            im = ImageOps.exif_transpose(Image.open(io.BytesIO(datos))).convert("RGB")
            im.thumbnail((1600, 1600))
            salida = io.BytesIO()
            im.save(salida, "JPEG", quality=82)
            datos = salida.getvalue()
        except ImportError:
            pass
        os.makedirs(carpeta, exist_ok=True)
        with open(ruta, "wb") as f:
            f.write(datos)
        return ruta
    except OSError as err:
        print("  no se pudo descargar la foto:", t, err)
        return None


def filas_hoja(wb, pestaña):
    """Filas de una pestaña como diccionarios {columna sin tildes ni mayúsculas: valor}."""
    hoja_ = next((w for w in wb.worksheets if normal(w.title) == normal(pestaña)), None)
    if hoja_ is None:
        print("  falta la pestaña", pestaña)
        return []
    filas_ = list(hoja_.iter_rows(values_only=True))
    if not filas_:
        return []
    cab = [normal(str(c or "")) for c in filas_[0]]
    out = []
    for n, f in enumerate(filas_[1:], 2):
        d = {c: (v.strip() if isinstance(v, str) else v) for c, v in zip(cab, f) if c}
        if any(v not in (None, "") for v in d.values()):
            d["_fila"] = n
            out.append(d)
    return out


def leer_hoja(wb, equipos):
    """Convierte la hoja del club en lo que usa la web. equipos: los de federacion.js."""
    por_nombre = {normal(nombre_hoja(e)): e["id"] for e in equipos}
    out = {"noticias": [], "club": {}, "extra": {}}
    aviso = lambda pestaña, f, txt: print(f"  {pestaña}, fila {f['_fila']}: {txt}; no se publica")

    for f in filas_hoja(wb, "Noticias"):
        if normal(str(f.get("publicar") or "")) not in ("si", "s", "x", "yes"):
            continue
        fecha, titulo = fecha_hoja(f.get("fecha")), str(f.get("titulo") or "").strip()
        texto_ = str(f.get("texto completo") or "").strip()
        if not fecha or not titulo:
            aviso("Noticias", f, "falta la fecha o el título")
            continue
        resumen = str(f.get("resumen") or "").strip() or (texto_[:157] + "…" if len(texto_) > 160 else texto_)
        n = {"id": f"{fecha}-{re.sub(r'[^a-z0-9]+', '-', normal(titulo)).strip('-')}", "fecha": fecha, "titulo": titulo,
             "resumen": resumen, "cuerpo": texto_ or resumen}
        if foto := foto_drive(f.get("foto")):
            n["foto"] = foto
        out["noticias"].append(n)
    out["noticias"].sort(key=lambda n: n["fecha"], reverse=True)

    for f in filas_hoja(wb, "Vídeos"):
        eid = por_nombre.get(normal(str(f.get("equipo") or "")))
        tipo = TIPOS_VIDEO.get(normal(str(f.get("tipo") or "resumen")))
        yt = id_youtube(f.get("enlace de youtube"))
        if not eid or not tipo or not yt:
            aviso("Vídeos", f, "falta el equipo, el tipo o un enlace de YouTube válido")
            continue
        out["extra"].setdefault(eid, {}).setdefault("videos", []).append(
            {"tipo": tipo, "youtube": yt, "titulo": str(f.get("titulo") or "").strip() or "Vídeo"})

    for f in filas_hoja(wb, "Jugadores"):
        buscado = normal(str(f.get("jugador") or ""))
        sitios = [(e, n) for e in equipos for n in e["plantilla"] if normal(n) == buscado]
        if not sitios:
            aviso("Jugadores", f, "ese nombre no está en ninguna plantilla de la federación")
            continue
        datos = {}
        if f.get("posicion"):
            datos["posicion"] = str(f["posicion"]).strip()
        if f.get("fecha de nacimiento"):
            if nac := fecha_hoja(f["fecha de nacimiento"]):
                datos["nacimiento"] = nac
            else:
                print(f"  Jugadores, fila {f['_fila']}: la fecha de nacimiento no es una fecha; se ignora")
        try:
            if f.get("mvp") not in (None, ""):
                datos["mvp"] = int(float(f["mvp"]))
        except (TypeError, ValueError):
            print(f"  Jugadores, fila {f['_fila']}: MVP no es un número; se ignora")
        foto = foto_drive(f.get("foto (solo juveniles)")) if any(e["categoria"] == "juvenil" for e, _ in sitios) else None
        for e, n in sitios:
            x = out["extra"].setdefault(e["id"], {})
            if datos:
                x.setdefault("jugadores", {})[n] = datos
            if foto and e["categoria"] == "juvenil":  # fotos solo de juveniles (app.js también lo fuerza)
                x.setdefault("fotos", {})[n] = foto

    for f in filas_hoja(wb, "Club"):
        clave = DATOS_CLUB.get(normal(str(f.get("dato") or "")))
        valor = str(f.get("valor") or "").strip()
        if clave and valor:
            out["club"][clave] = valor
    return out


def leer_formulario(wb, equipos):
    """Respuestas del formulario: cada fila es una noticia (título, texto, foto, vídeo y equipo opcionales).
    Las columnas se reconocen por su nombre, así que da igual el orden o que se añadan otras."""
    hoja_ = wb.worksheets[0]
    filas_ = list(hoja_.iter_rows(values_only=True))
    if not filas_:
        return [], {}
    cab = [normal(str(c or "")) for c in filas_[0]]
    col = lambda *claves: next((i for i, c in enumerate(cab) if any(k in c for k in claves)), None)
    i_fecha, i_tit, i_txt = col("marca temporal", "timestamp"), col("titulo"), col("texto")
    i_foto, i_video, i_equipo = col("foto"), col("video", "youtube"), col("equipo")
    por_nombre = {normal(nombre_hoja(e)): e["id"] for e in equipos}
    dato = lambda f, i: (f[i] if i is not None and i < len(f) else None)
    noticias, extra = [], {}
    for n_fila, f in enumerate(filas_[1:], 2):
        fecha, titulo = fecha_hoja(dato(f, i_fecha)), str(dato(f, i_tit) or "").strip()
        texto_ = str(dato(f, i_txt) or "").strip()
        if not fecha or not titulo:
            if any(v not in (None, "") for v in f):
                print(f"  Formulario, fila {n_fila}: falta la fecha o el título; no se publica")
            continue
        n = {"id": f"{fecha}-{re.sub(r'[^a-z0-9]+', '-', normal(titulo)).strip('-')}", "fecha": fecha, "titulo": titulo,
             "resumen": texto_[:157] + "…" if len(texto_) > 160 else texto_, "cuerpo": texto_ or titulo}
        if foto := foto_drive(str(dato(f, i_foto) or "").split(",")[0]):
            n["foto"] = foto
        if yt := id_youtube(dato(f, i_video)):
            n["video"] = yt
            if eid := por_nombre.get(normal(str(dato(f, i_equipo) or ""))):  # el vídeo sale también en la página del equipo
                extra.setdefault(eid, {}).setdefault("videos", []).append({"tipo": "highlight", "youtube": yt, "titulo": titulo})
        noticias.append(n)
    return noticias, extra


def descargar_hoja(id_):
    import openpyxl
    with web.open(f"https://docs.google.com/spreadsheets/d/{id_}/export?format=xlsx", timeout=60) as r:
        return openpyxl.load_workbook(io.BytesIO(r.read()), data_only=True)


def hoja(previo):
    equipos = list(previo.values())
    try:
        h = leer_hoja(descargar_hoja(HOJA_ID), equipos)
        if FORMULARIO_ID:
            noticias, extra = leer_formulario(descargar_hoja(FORMULARIO_ID), equipos)
            h["noticias"] = sorted(h["noticias"] + noticias, key=lambda n: n["fecha"], reverse=True)
            for eid, x in extra.items():
                h["extra"].setdefault(eid, {}).setdefault("videos", []).extend(x["videos"])
    except Exception as err:  # sin acceso o no es un Excel: se queda la versión anterior de hoja.js
        print("Hoja del club o formulario no disponible (¿compartidos con «cualquier persona con el enlace»?):", err)
        return
    with open("hoja.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por actualizar.py desde la hoja de Google del club. No editar a mano: se cambia en la hoja.\n")
        f.write(f"const HOJA = {json.dumps(h, ensure_ascii=False, indent=1)};\n")
    print(f"Hoja del club: {len(h['noticias'])} noticias, {sum(len(x.get('videos', [])) for x in h['extra'].values())} vídeos,",
          f"{sum(len(x.get('jugadores', {})) for x in h['extra'].values())} jugadores, {len(h['club'])} datos del club")


def main():
    """futgal bloquea la IP tras unas decenas de páginas seguidas. Por eso cada equipo
    se guarda al momento y cada ejecución empieza por los equipos con datos más viejos:
    programado cada hora, todos se mantienen al día aunque futgal corte a mitad."""
    previo = leer_previo()
    if "hoja" in sys.argv[1:]:  # python actualizar.py hoja -> solo la hoja de Google (no pide nada a futgal)
        return hoja(previo)
    try:
        club = equipos_del_club()
    except (RuntimeError, OSError) as err:  # futgal bloquea a veces: se sigue en la próxima ejecución
        print("Parado, se sigue en la próxima ejecución:", err)
        return
    for cod, nombre, cat in club:  # los aún no descargados salen ya en la web, sin datos
        previo.setdefault(cod, equipo_basico(cod, nombre, cat))
    guardar([previo[c] for c, _, _ in club])
    if "plantillas" in sys.argv[1:]:
        return plantillas(club, previo)
    pendientes = sorted(club, key=lambda t: previo.get(t[0], {}).get("descargado", ""))
    # python actualizar.py juvenil cadete -> esas categorías primero
    pendientes.sort(key=lambda t: categoria(t[2]) not in sys.argv[1:])
    try:
        for cod, nombre, cat in pendientes:
            print("·", nombre, "|", cat, flush=True)
            previo[cod] = descargar_equipo(cod, nombre, cat, previo.get(cod))
            guardar([previo[c] for c, _, _ in club if c in previo])
    except (RuntimeError, OSError) as err:
        print("Parado, se sigue en la próxima ejecución:", err)
    listos = sum(1 for c, _, _ in club if previo.get(c, {}).get("descargado"))
    print(f"{listos} de {len(club)} equipos al día en federacion.js")
    pendientes_actas = sum(1 for e in previo.values() for p in e.get("partidos", [])
                           if p["resultado"] and not e.get("actas", {}).get(str(p["jornada"]), {}).get("id"))
    print(f"Actas pendientes: {pendientes_actas}")


if __name__ == "__main__":
    main()
