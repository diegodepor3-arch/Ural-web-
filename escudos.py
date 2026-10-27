"""Quita el fondo (casi siempre blanco) a los escudos de los rivales que usa federacion.js
y los guarda en img/escudos/ como WebP transparente. Escribe escudos.js con la lista
{url de la federación: archivo local}, que app.js usa en lugar de la imagen original.
Uso: python escudos.py   (necesita Pillow: pip install pillow)

Solo se borra el fondo que toca los bordes de la imagen: el blanco de dentro del escudo se queda.
Los que ya están descargados no se vuelven a pedir.
"""
import json
import os
import re
import urllib.request
from collections import deque
from io import BytesIO

from PIL import Image

CARPETA = "img/escudos"
LADO = 160  # se muestran como mucho a 64 px: con 160 sobra para pantallas de alta densidad
TOLERANCIA = 60  # cuánto puede alejarse un píxel del color del fondo y seguir siendo fondo
BORDE_SUAVE = 140  # hasta aquí, los píxeles pegados al fondo quedan medio transparentes


def nombre_local(url):
    base = os.path.splitext(url.rsplit("/", 1)[-1])[0]
    return f"{CARPETA}/{re.sub(r'[^A-Za-z0-9_-]+', '_', base)}.webp"


def distancia(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def sin_fondo(img):
    img = img.convert("RGBA")
    img.thumbnail((LADO, LADO), Image.LANCZOS)
    w, h = img.size
    px = img.load()
    borde = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    if sum(px[p][3] < 128 for p in borde) > len(borde) / 2:  # ya viene transparente
        return img.crop(img.getbbox())
    # color del fondo: el más repetido en el borde (redondeado para que el ruido del JPG no lo reparta)
    cuenta = {}
    for p in borde:
        k = tuple(c // 16 for c in px[p][:3])
        cuenta[k] = cuenta.get(k, 0) + 1
    clave = max(cuenta, key=cuenta.get)
    muestras = [px[p][:3] for p in borde if tuple(c // 16 for c in px[p][:3]) == clave]
    fondo = tuple(sum(c[i] for c in muestras) // len(muestras) for i in range(3))
    # relleno desde los bordes por los píxeles parecidos al fondo
    es_fondo = [[False] * h for _ in range(w)]
    cola = deque(p for p in borde if distancia(px[p], fondo) <= TOLERANCIA)
    for x, y in cola:
        es_fondo[x][y] = True
    while cola:
        x, y = cola.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not es_fondo[nx][ny] and distancia(px[nx, ny], fondo) <= TOLERANCIA:
                es_fondo[nx][ny] = True
                cola.append((nx, ny))
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            if es_fondo[x][y]:
                px[x, y] = (r, g, b, 0)
            elif any(es_fondo[nx][ny] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                     if 0 <= nx < w and 0 <= ny < h):
                # orilla: más transparente cuanto más se parece al fondo, para que no quede un halo blanco
                d = distancia((r, g, b), fondo)
                px[x, y] = (r, g, b, min(a, round(255 * min(1, max(0, d - TOLERANCIA) / (BORDE_SUAVE - TOLERANCIA)))))
    caja = img.getbbox()
    return img.crop(caja) if caja else img


def main():
    with open("federacion.js", encoding="utf-8") as f:
        urls = sorted(set(re.findall(r'"(https?://[^"]+/(?:pimg/Clubes|static/img/club)/[^"]+)"', f.read())))
    os.makedirs(CARPETA, exist_ok=True)
    hechos = {}
    for url in urls:
        destino = nombre_local(url)
        if not os.path.exists(destino):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (web Ural Espanol CF)"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    sin_fondo(Image.open(BytesIO(r.read()))).save(destino, "WEBP", quality=90, method=6)
                print("·", destino)
            except (OSError, ValueError) as err:  # si falla, la web sigue usando el de la federación
                print("No se pudo:", url, err)
                continue
        hechos[url] = destino
    with open("escudos.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por escudos.py: escudos de la federación sin fondo. No editar a mano.\n")
        f.write(f"const ESCUDOS = {json.dumps(hechos, ensure_ascii=False, indent=1)};\n")
    print(f"{len(hechos)} de {len(urls)} escudos sin fondo")


if __name__ == "__main__":
    main()
