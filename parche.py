#!/usr/bin/env python3
"""
parche.py - Arregla el módulo de Recepción (sistema-galerias)

Corrige:
  1) Botón "Editar": faltaba la función editarItem() -> no cargaba el formulario.
  2) Eliminar con clave: faltaba cerrarModalClave() -> tras validar la clave
     no se ejecutaba la eliminación.
  3) Sube la versión (?v=N) de recepcion.js y recepcion.css en el HTML para que
     el navegador no use la copia vieja en caché.

Uso (desde la carpeta raíz del proyecto, donde está recepcionyfechas.html):
    python parche.py

Es seguro correrlo varias veces: si algo ya está aplicado, lo omite.
Antes de modificar cada archivo crea una copia .bak.
"""
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
JS = RAIZ / "js" / "recepcion.js"
CSS = RAIZ / "css" / "recepcion.css"
HTML = RAIZ / "recepcionyfechas.html"

FUNC_EDITAR = r'''/* ============ EDITAR REGISTRO (carga el formulario) ============ */
function editarItem(id) {
    const item = registros.find(r => String(r.id) === String(id));
    if (!item) {
        toast('No se encontró el registro para editar.', { type: 'error' });
        return;
    }

    // Los valores por defecto ("S/C", "S/P", etc.) se muestran vacíos en el formulario
    const limpio = v => (v == null || ['S/C', 'S/P', 'S/F', 'S/N', 'S/L'].includes(v)) ? '' : v;

    $('editId').value = item.id;
    $('codBarra').value = limpio(item.codBarra);
    $('codInterno').value = limpio(item.codInterno);
    $('producto').value = item.producto || '';
    $('departamento').value = item.departamento || '';
    $('proveedor').value = limpio(item.proveedor);
    $('numFactura').value = limpio(item.numFactura);
    $('personaRecibe').value = limpio(item.personaRecibe);
    $('lote').value = limpio(item.lote);
    $('cantidad').value = item.cantidad || 1;
    $('costoUnitario').value = item.costoUnitario || '';
    $('costoTotal').value = item.costoTotal || '';
    $('fechaRecepcion').value = formatearFechaInput(item.fechaRecepcion) || hoyISO();
    $('fechaCaducidad').value = formatearFechaInput(item.fechaVencimiento);
    $('observaciones').value = item.observaciones || '';

    // Modo edición: banner, botones y texto del guardar
    $('bannerEdicion').textContent = '✏️ Editando: ' + item.producto + ' (lote ' + (item.lote || 'S/L') + ')';
    $('bannerEdicion').classList.add('show');
    $('btnGuardarTxt').textContent = 'Guardar cambios';
    $('btnCancelarEdicion').style.display = '';
    $('btnEliminarForm').style.display = '';

    validarFechas();
    $('formRecepcion').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('producto').focus(), 300);
}
'''

FUNC_CLAVE = r'''function cerrarModalClave(exito) {
    cerrarOverlay('modalClaveSeguridad');
    if (!exito) callbackClaveExito = null;
}
'''


def leer(ruta):
    # newline='' conserva los saltos de línea originales (CRLF en Windows)
    with open(ruta, "r", encoding="utf-8", newline="") as f:
        return f.read()


def escribir(ruta, texto):
    with open(ruta, "w", encoding="utf-8", newline="") as f:
        f.write(texto)


def respaldar(ruta):
    bak = ruta.with_suffix(ruta.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(ruta, bak)


def eol_de(texto):
    return "\r\n" if "\r\n" in texto else "\n"


def insertar_antes(texto, ancla, bloque):
    eol = eol_de(texto)
    bloque = bloque.replace("\r\n", "\n").replace("\n", eol)
    return texto.replace(ancla, bloque + eol + ancla, 1)


def parchear_js():
    if not JS.exists():
        print(f"[JS]   ERROR: no encuentro {JS}")
        return False

    texto = leer(JS)
    original = texto
    cambios = []

    # 1) editarItem
    if re.search(r"function\s+editarItem\s*\(", texto):
        print("[JS]   editarItem ya existe -> omitido")
    else:
        ancla = "function cancelarEdicionForm() {"
        if ancla not in texto:
            print("[JS]   ERROR: no encontré 'function cancelarEdicionForm()' para anclar editarItem")
            return False
        texto = insertar_antes(texto, ancla, FUNC_EDITAR)
        cambios.append("editarItem")

    # 2) cerrarModalClave
    if re.search(r"function\s+cerrarModalClave\s*\(", texto):
        print("[JS]   cerrarModalClave ya existe -> omitido")
    else:
        ancla = "function cerrarModal() {"
        if ancla not in texto:
            print("[JS]   ERROR: no encontré 'function cerrarModal()' para anclar cerrarModalClave")
            return False
        texto = insertar_antes(texto, ancla, FUNC_CLAVE)
        cambios.append("cerrarModalClave")

    if texto != original:
        respaldar(JS)
        escribir(JS, texto)
        print(f"[JS]   OK: agregado {', '.join(cambios)} (copia en {JS.name}.bak)")
    return True


def subir_version(texto, patron):
    """Incrementa ?v=N del recurso que coincida con el patrón. Devuelve (texto, cambió)."""
    rx = re.compile(patron + r"(\d+)")
    m = rx.search(texto)
    if not m:
        return texto, None
    nueva = int(m.group(2)) + 1
    return rx.sub(lambda mm: mm.group(1) + str(nueva), texto, count=1), nueva


def parchear_html():
    if not HTML.exists():
        print(f"[HTML] ERROR: no encuentro {HTML}")
        return False

    texto = leer(HTML)
    original = texto

    texto, v_js = subir_version(texto, r"(js/recepcion\.js\?v=)")
    texto, v_css = subir_version(texto, r"(css/recepcion\.css\?v=)")

    if v_js is None:
        print("[HTML] aviso: no encontré 'js/recepcion.js?v=N' en el HTML")
    if v_css is None:
        print("[HTML] aviso: no encontré 'css/recepcion.css?v=N' en el HTML")

    if texto != original:
        respaldar(HTML)
        escribir(HTML, texto)
        print(f"[HTML] OK: versión js -> v={v_js}, css -> v={v_css} (copia en {HTML.name}.bak)")
    return True


def revisar_css():
    if not CSS.exists():
        print(f"[CSS]  aviso: no encuentro {CSS}")
        return
    print("[CSS]  sin cambios necesarios (solo se refresca su versión desde el HTML)")


def main():
    print(f"Carpeta del proyecto: {RAIZ}\n")
    ok = parchear_js()
    ok = parchear_html() and ok
    revisar_css()

    print()
    if ok:
        print("Listo. Abre el módulo y pulsa Ctrl+F5 para recargar sin caché.")
    else:
        print("El parche terminó con errores. Revisa los mensajes de arriba.")
        sys.exit(1)


if __name__ == "__main__":
    main()
