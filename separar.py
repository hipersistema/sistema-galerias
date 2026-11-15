#!/usr/bin/env python3
"""
separar.py - Parte un modulo HTML en .html + css/ + js/ sin cambiar su comportamiento.

Uso:  python separar.py recepcionyfechas.html recepcion
      -> css/recepcion.css  y  js/recepcion.js   (junto al HTML)

- Mueve el <style> principal y el <script> inline mas grande.
- Deja intactos los scripts pequenos (p. ej. el del tema) y los que ya tienen src.
- Mantiene el orden de carga: el <script src> queda exactamente donde estaba el inline.
- Respeta CRLF/LF. Crea .bak. No sobreescribe css/js existentes.
"""
import re
import shutil
import sys
from pathlib import Path

if len(sys.argv) < 3:
    sys.exit("Uso: python separar.py <archivo.html> <nombre>   (ej. recepcion)")

RUTA = Path(sys.argv[1])
NOMBRE = sys.argv[2]
VER = "1"

if not RUTA.exists():
    sys.exit(f"No existe: {RUTA}")

with open(RUTA, "r", encoding="utf-8", newline="") as f:
    html = f.read()

if f"css/{NOMBRE}.css" in html or f"js/{NOMBRE}.js" in html:
    sys.exit("Ya estaba separado. No se hizo nada.")

scripts = [m for m in re.finditer(r"<script>(.*?)</script>", html, re.S)]
if not scripts:
    sys.exit("No encontre <script> inline. No se modifico nada.")
sc = max(scripts, key=lambda m: len(m.group(1)))

# Ignora <style> que viven DENTRO del script (plantillas JS como el Kardex)
estilos = [m for m in re.finditer(r"<style>(.*?)</style>", html, re.S)
           if m.end() <= sc.start() or m.start() >= sc.end()]
if len(estilos) != 1:
    sys.exit(f"Esperaba 1 <style> fuera del script y encontre {len(estilos)}. No se modifico nada.")
st = estilos[0]
sc = max(scripts, key=lambda m: len(m.group(1)))

carpeta = RUTA.parent
css_path = carpeta / "css" / f"{NOMBRE}.css"
js_path = carpeta / "js" / f"{NOMBRE}.js"
for p in (css_path, js_path):
    if p.exists():
        sys.exit(f"Ya existe {p}. No se modifico nada.")

nl = "\r\n" if "\r\n" in html else "\n"
tag_css = f'<link rel="stylesheet" href="css/{NOMBRE}.css?v={VER}">'
tag_js = f'<script src="js/{NOMBRE}.js?v={VER}"></script>'

# Reemplaza de atras hacia adelante para no mover los indices
reemplazos = sorted([(st.start(), st.end(), tag_css), (sc.start(), sc.end(), tag_js)], reverse=True)
nuevo = html
for a, b, t in reemplazos:
    nuevo = nuevo[:a] + t + nuevo[b:]

shutil.copy2(RUTA, str(RUTA) + ".bak")
css_path.parent.mkdir(exist_ok=True)
js_path.parent.mkdir(exist_ok=True)
with open(css_path, "w", encoding="utf-8", newline="") as f:
    f.write(st.group(1).strip("\r\n") + nl)
with open(js_path, "w", encoding="utf-8", newline="") as f:
    f.write(sc.group(1).strip("\r\n") + nl)
with open(RUTA, "w", encoding="utf-8", newline="") as f:
    f.write(nuevo)

print(f"OK\n  {RUTA}  ({len(html):,} -> {len(nuevo):,} bytes)\n  {css_path}\n  {js_path}\n  copia: {RUTA}.bak")
