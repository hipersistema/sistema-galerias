import sys, shutil

F = sys.argv[1] if len(sys.argv) > 1 else 'descuentos.html'
MARK = 'PARCHE-PRODUCTOS-DESCUENTO'
OCULTAR_ARTICULOS = True   # False = dejar visible la pestaña Artículos

s = open(F, encoding='utf-8', newline='').read()
if MARK in s:
    sys.exit('Ya estaba aplicado.')
nl = '\r\n' if '\r\n' in s else '\n'
fx = lambda t: t.strip('\n').replace('\r\n', '\n').replace('\n', nl) + nl

def ins(s, anchor, new, after=False):
    if s.count(anchor) != 1:
        sys.exit('ANCLA no encontrada o repetida (no se modificó nada): ' + anchor[:70])
    return s.replace(anchor, anchor + nl + new if after else new + anchor)

BOTON = '<button class="tab" data-tab="descuento">🏷️ En descuento (<span id="countPD">0</span>)</button>'

PANEL = r'''
<!-- PARCHE-PRODUCTOS-DESCUENTO -->
<div id="tab-descuento" class="panel">
    <div class="card">
        <div class="shead"><h3>🏷️ Productos en descuento</h3></div>
        <div class="add">
            <h4>➕ Agregar / actualizar producto</h4>
            <form id="formPD" onsubmit="agregarProdDesc(event)" class="grid">
                <div class="f"><label for="pdCodigo">Código</label><input id="pdCodigo"></div>
                <div class="f wide"><label for="pdDesc">Descripción</label>
                    <input id="pdDesc" required autocomplete="off" placeholder="Busca en artículos o escribe...">
                    <div id="pdAc" class="ac" hidden></div></div>
                <div class="f"><label for="pdPrecio">Precio a cobrar ($)</label><input type="number" id="pdPrecio" step="0.01" min="0" required></div>
                <div class="f"><label for="pdStock">Stock</label><input type="number" id="pdStock" step="1" min="0" value="0" required></div>
                <div class="f wide"><label for="pdNota">Nota (dañado, por vencer...)</label><input id="pdNota"></div>
                <div><button type="submit" class="btn btn-dark">Guardar</button></div>
            </form>
        </div>
        <input type="text" id="filtroPD" placeholder="🔍 Buscar..." oninput="renderProdDesc()" style="margin-bottom:14px">
        <div class="tw"><table>
            <thead><tr><th>Código</th><th>Descripción</th><th>Precio</th><th>Stock</th><th>Nota</th><th>Acción</th></tr></thead>
            <tbody id="tablaPD"></tbody>
        </table></div>
    </div>
</div>
'''

JS = r'''
<script>
/* PARCHE-PRODUCTOS-DESCUENTO */
(function () {
    const KEY = 'hipergalerias_prod_desc';
    const usd = n => '$' + Number(n).toFixed(2);
    const norm = s => String(s || '').toLowerCase().trim();
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(KEY)) || []; } catch { }
    const guardarLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch { } };

    const st = document.createElement('style');
    st.textContent = /*OCULTAR*/'';
    document.head.appendChild(st);

    window.renderProdDesc = function () {
        $('countPD').textContent = lista.length;
        const v = norm($('filtroPD').value);
        const f = lista.filter(p => norm(p.codigo + ' ' + p.descripcion + ' ' + p.nota).includes(v))
            .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'));
        $('tablaPD').innerHTML = f.length ? f.map(p =>
            '<tr><td><code>' + esc(p.codigo || 'S/C') + '</code></td><td><strong>' + esc(p.descripcion) + '</strong></td><td><span class="saldo">' + usd(p.precio) +
            '</span></td><td><span class="count">' + esc(p.stock ?? 0) + '</span></td><td>' + esc(p.nota || '') +
            '</td><td><button class="btn btn-gray btn-sm" data-pd-edit="' + esc(p.id) + '">✏️</button> <button class="btn btn-out btn-sm" data-pd-del="' + esc(p.id) + '">🗑️</button></td></tr>').join('')
            : '<tr><td colspan="6" class="empty">No hay productos en descuento.</td></tr>';
    };

    window.cargarProdDesc = async function () {
        if (hayDB()) {
            const d = await fetchAllSupabase('productos_descuento', 'id,codigo,descripcion,precio,stock,nota');
            if (d) { lista = d.map(x => ({ ...x, precio: num(x.precio), stock: num(x.stock) })); guardarLocal(); }
        }
        renderProdDesc();
    };

    window.agregarProdDesc = async function (e) {
        e.preventDefault();
        const f = { codigo: $('pdCodigo').value.trim(), descripcion: $('pdDesc').value.trim(), precio: num($('pdPrecio').value), stock: num($('pdStock').value), nota: $('pdNota').value.trim() };
        if (!f.descripcion || f.precio <= 0) return toast('Pon descripción y precio mayor a 0', true);
        const ex = lista.find(p => (f.codigo && p.codigo === f.codigo) || norm(p.descripcion) === norm(f.descripcion));
        if (hayDB()) {
            const { data: ya } = await supabaseClient.from('articulos').select('id').eq('descripcion', f.descripcion).limit(1);
            if (!ya || !ya.length) {
                await supabaseClient.from('articulos').insert([{ codigoBarras: f.codigo || 'S/C', codigoInterno: 'S/C', descripcion: f.descripcion, departamento: 'General' }]);
                cacheCodigos.set(norm(f.descripcion), f.codigo || 'S/C');
                cargarArticulosPagina();
            }
            const t = supabaseClient.from('productos_descuento');
            const { error } = ex ? await t.update(f).eq('id', ex.id) : await t.insert([f]);
            if (error) { console.error(error); return toast('No se pudo guardar: ' + error.message, true); }
        } else if (ex) Object.assign(ex, f); else lista.push({ id: Date.now(), ...f });
        $('formPD').reset(); $('pdStock').value = 0;
        await cargarProdDesc();
        toast(ex ? 'Producto actualizado' : 'Producto agregado');
    };

    $('tablaPD').addEventListener('click', async e => {
        const d = e.target.closest('[data-pd-del]'), u = e.target.closest('[data-pd-edit]');
        if (!d && !u) return;
        const p = lista.find(x => String(x.id) === String(d ? d.dataset.pdDel : u.dataset.pdEdit)); if (!p) return;
        if (d) {
            if (!confirm('¿Quitar "' + p.descripcion + '" de la lista?')) return;
            if (hayDB()) { const { error } = await supabaseClient.from('productos_descuento').delete().eq('id', p.id); if (error) return toast(error.message, true); }
            else lista = lista.filter(x => x !== p);
        } else {
            const n = prompt('Nuevo precio para ' + p.descripcion, Number(p.precio).toFixed(2)); if (n === null) return;
            const pr = num(String(n).replace(',', '.')); if (pr <= 0) return toast('Precio inválido', true);
            const s = prompt('Stock de ' + p.descripcion, p.stock ?? 0); if (s === null) return;
            const sk = Math.max(num(s), 0);
            if (hayDB()) { const { error } = await supabaseClient.from('productos_descuento').update({ precio: pr, stock: sk }).eq('id', p.id); if (error) return toast(error.message, true); }
            else Object.assign(p, { precio: pr, stock: sk });
        }
        cargarProdDesc();
    });

    let t;
    $('pdDesc').addEventListener('input', () => {
        clearTimeout(t);
        const v = $('pdDesc').value.trim();
        if (v.length < 2) { $('pdAc').hidden = true; return; }
        t = setTimeout(async () => {
            sugerir('pdAc', await buscarArticulosDB(v),
                a => '<strong>' + esc(a.descripcion) + '</strong> <small style="color:var(--muted)">(Cód: ' + esc(codigoDe(a)) + ')</small>',
                a => { $('pdDesc').value = a.descripcion; $('pdCodigo').value = codigoDe(a) === 'S/C' ? '' : codigoDe(a); $('pdPrecio').focus(); });
        }, 250);
    });

    const origCarga = window.cargarTodoDesdeSupabase;
    window.cargarTodoDesdeSupabase = async function () {
        const r = await origCarga.apply(this, arguments);
        cargarProdDesc();
        return r;
    };

    // Asignación: stock visual + precio autorrellenado
    const origSel = window.seleccionarEnLinea;
    window.seleccionarEnLinea = function (row, a, enfocar) {
        origSel.apply(this, arguments);
        const c = norm(codigoDe(a)), d = norm(a.descripcion);
        const p = lista.find(x => (x.codigo && norm(x.codigo) === c) || norm(x.descripcion) === d);
        let s = row.querySelector('.l-stock');
        if (!p) { if (s) s.remove(); return; }
        if (!s) { s = document.createElement('small'); s.className = 'l-stock'; row.querySelector('.cw').appendChild(s); }
        s.textContent = '📦 Stock disponible: ' + (p.stock ?? 0) + (p.nota ? ' · ' + p.nota : '');
        s.style.cssText = 'font-weight:700;color:' + ((p.stock ?? 0) > 0 ? 'var(--g)' : 'var(--red)');
        const pr = row.querySelector('.l-precio');
        pr.value = Number(p.precio).toFixed(2);
        calcLinea(row);
        if (enfocar !== false) pr.select();
    };
    $('lineas').addEventListener('input', e => {
        if (e.target.classList.contains('l-buscar')) { const s = e.target.closest('.lin').querySelector('.l-stock'); if (s) s.remove(); }
    });

    renderProdDesc();
})();
</script>
'''
JS = JS.replace("/*OCULTAR*/''", "'.tab[data-tab=\"articulos\"]{display:none}'" if OCULTAR_ARTICULOS else "''")

ART_BTN = '<button class="tab" data-tab="articulos">🛒 Artículos (<span id="countArticulos">0</span>)</button>'
s = ins(s, ART_BTN, nl + '            ' + BOTON, after=True)
s = ins(s, '<!-- RRHH DESC -->', fx(PANEL))
s = ins(s, '<script src="sesion-usuario.js"></script>', fx(JS))

shutil.copyfile(F, F + '.bak')
open(F, 'w', encoding='utf-8', newline='').write(s)
print('OK. Respaldo en ' + F + '.bak')