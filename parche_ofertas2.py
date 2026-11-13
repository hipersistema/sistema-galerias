#!/usr/bin/env python3
# Uso: python parche_ofertas2.py [ruta/descuentos.html]
# Requiere haber aplicado parche_ofertas.py. Al asignar deuda de un producto que está en Ofertas, resta su stock.
import shutil, sys

ruta = sys.argv[1] if len(sys.argv) > 1 else 'descuentos.html'
with open(ruta, 'r', encoding='utf-8', newline='') as f:
    src = f.read()

if 'descontarStockOfertas' in src:
    sys.exit('Ya aplicado. Nada que hacer.')
if 'tab-ofertas' not in src:
    sys.exit('Falta aplicar parche_ofertas.py primero.')

NL = '\r\n' if '\r\n' in src else '\n'
fix = lambda s: s.replace('\r\n', '\n').replace('\n', NL)


def reemplazar(src, ancla, nuevo, nombre):
    n = src.count(ancla)
    if n != 1:
        sys.exit('ERROR en "%s": se esperaba 1 coincidencia y hay %d. No se modificó nada.' % (nombre, n))
    return src.replace(ancla, nuevo, 1)


# 1) Función de descuento de stock, dentro del IIFE de Ofertas (acceso a "ofertas")
FN = r'''// Resta stock a las ofertas que coincidan (por nombre) con los ítems recién asignados
            window.descontarStockOfertas = async function (items) {
                if (!hayDB() || !ofertas.length) return;
                const grupos = new Map();
                items.forEach(it => {
                    const d = String(it.descripcionArticulo || '').toLowerCase().trim();
                    const o = ofertas.find(x => String(x.descripcion || '').toLowerCase().trim() === d);
                    if (!o) return;
                    const g = grupos.get(o.id) || { o, quitar: 0 };
                    g.quitar += parseInt(it.cantidad) || 1;
                    grupos.set(o.id, g);
                });
                for (const { o, quitar } of grupos.values()) {
                    const antes = num(o.stock);
                    const { data, error } = await supabaseClient.rpc('descontar_stock_oferta', { p_id: o.id, p_cant: quitar });
                    if (error) { console.error(error); toast('No se pudo restar el stock de "' + o.descripcion + '": ' + error.message, true); continue; }
                    o.stock = data;
                    if (num(data) <= 0) toast('⚠️ Oferta agotada: "' + o.descripcion + '" (stock en 0)', true);
                    else if (quitar > antes) toast('⚠️ "' + o.descripcion + '": se asignaron más unidades que el stock registrado', true);
                }
                renderOfertas();
            };

            '''
a = "$('tablaOfertas').addEventListener('click', async e => {"
src = reemplazar(src, a, fix(FN) + a, 'función descontarStockOfertas')

# 2) Envoltorio de registrarDescuento (después de los parches anteriores)
WRAP = r'''<script>
        /* PARCHE-OFERTAS-STOCK: al asignar deuda, resta el stock de las ofertas */
        (function () {
            const original = window.registrarDescuento;
            window.registrarDescuento = async function () {
                const n0 = window.descuentos.length;
                const r = await original.apply(this, arguments);
                const n = window.descuentos.length - n0;
                if (n > 0 && window.descontarStockOfertas) {
                    try { await descontarStockOfertas(window.descuentos.slice(0, n)); } catch (e) { console.error(e); }
                }
                return r;
            };
        })();
    </script>
    '''
a = '<script src="editar-productos-cuenta.js"></script>'
src = reemplazar(src, a, fix(WRAP) + a, 'envoltorio registrarDescuento')

shutil.copyfile(ruta, ruta + '.bak3')
with open(ruta, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('OK. Backup: ' + ruta + '.bak3')