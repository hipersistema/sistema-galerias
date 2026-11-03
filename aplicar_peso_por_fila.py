#!/usr/bin/env python3
"""Aplica la columna "Peso (kg)" por fila al HTML del módulo de recetas.
Uso:  python aplicar_peso_por_fila.py  nombre_del_archivo.html
Crea una copia de seguridad (.bak) y modifica el archivo. Si algún punto no se
encuentra, no escribe nada y te dice cuál falló."""
import re, sys, shutil

if len(sys.argv) != 2:
    sys.exit("Uso: python aplicar_peso_por_fila.py index.html")
ruta = sys.argv[1]
raw = open(ruta, 'rb').read().decode('utf-8')
crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')
if 'pesoFilaKg' in src:
    sys.exit("Este archivo ya tiene el cambio aplicado.")

def sub1(patron, repl, texto, nombre, flags=0):
    nuevo, n = re.subn(patron, repl, texto, count=1, flags=flags)
    if n != 1:
        sys.exit(f"❌ No se encontró el punto: {nombre}. No se modificó nada.")
    return nuevo

# 1) Encabezado
src = sub1(r'(<th class="p-3 w-24 text-center">Cant\. Bruta</th>)',
           r'\1\n                  <th class="p-3 w-24 text-center">Peso (kg)</th>',
           src, '1 encabezado')

# 2) Celda de peso en cada fila
celda = '''<td class="p-2 align-top">
            <input type="number" step="any" min="0" value="${fila.peso ?? ''}" placeholder="auto"
                   oninput="actualizarPesoFila(${idx}, this.value)"
                   class="w-full p-2 border border-gray-300 rounded text-xs text-center font-bold outline-none">
          </td>
          '''
src = sub1(r'(<td class="p-2 pt-\[18px\] align-top text-right font-bold text-gray-700 font-mono text-xs" id="costoVentaUsadoRow-\$\{idx\}">)',
           lambda m: celda + m.group(1), src, '2 celda de peso')

# 3) Funciones nuevas + reemplazo de calcularPesoBrutoKg
nuevas = '''function actualizarPesoFila(index, val) {
      recetaActual.filas[index].peso = (val === '') ? null : (parseFloat(val) || 0);
      recalcularEscandallo();
    }

    function pesoFilaKg(f, ins) {
      if (f.peso !== null && f.peso !== undefined && f.peso !== '') return parseFloat(f.peso) || 0;
      const cant = parseFloat(f.cantidad) || 0;
      if (esHuevo(ins)) return cant / 1000;
      const u = ins ? String(ins.unidad || '').toUpperCase() : '';
      if (u === 'UND' || u === 'PAQ' || u === 'UNID' || u === 'PQ') return 0;
      return cant;
    }

    function calcularPesoBrutoKg() {
      return recetaActual.filas.reduce((s, f) => {
        const ins = insumosBase.find(i => String(i.id) === String(f.insumoId));
        return s + pesoFilaKg(f, ins);
      }, 0);
    }
'''
src = sub1(r'function calcularPesoBrutoKg\(\) \{.*?\n    \}\n', lambda m: nuevas, src, '3 calcularPesoBrutoKg', re.S)

# 4) Reiniciar peso al cambiar de insumo (seleccionar y vaciar)
src = sub1(r"(recetaActual\.filas\[idx\]\.insumoId = insumoObj\.id;\s*recetaActual\.filas\[idx\]\.modo = 'und';)",
           r"\1\n      recetaActual.filas[idx].peso = null;", src, '4a seleccionarInsumoFila')
src = sub1(r"(recetaActual\.filas\[idx\]\.insumoId = '';\s*recetaActual\.filas\[idx\]\.modo = 'und';)",
           r"\1\n        recetaActual.filas[idx].peso = null;", src, '4b filtrarDropdownInsumo')

# 5) Guardar el peso dentro del JSON de ingredientes
src = sub1(r"(costoUnit: costoVentaUsado,\s*costoTotal: total)",
           r"\1,\n            peso: (f.peso ?? null)", src, '5 guardarRecetaCatalogo')

# 6) Recuperar el peso al editar
src = sub1(r"(cantidad: parseFloat\(Number\(cant\)\.toFixed\(4\)\),\s*modo: 'und')",
           r"\1,\n          peso: (i.peso ?? null)", src, '6 cargarRecetaParaEditar')

shutil.copyfile(ruta, ruta + '.bak')
out = src.replace('\n', '\r\n') if crlf else src
open(ruta, 'wb').write(out.encode('utf-8'))
print("✅ Cambios aplicados. Copia de seguridad:", ruta + '.bak')
