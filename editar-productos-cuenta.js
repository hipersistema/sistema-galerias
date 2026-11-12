/* editar-productos-cuenta.js: editar / devolver productos desde "N prod." */
(function () {
    const usd = n => '$' + Number(n).toFixed(2);
    let cedP = null, itEdit = null, busy = false;

    // Capas: clave (320) por encima del modal de edición (250) y de productos (200)
    const st = document.createElement('style');
    st.textContent = '#modalClave{z-index:320}#modalEditItem{z-index:250}';
    document.head.appendChild(st);

    document.body.insertAdjacentHTML('beforeend',
        '<div id="modalEditItem" class="modal"><div class="mcard" style="width:440px">' +
        '<h3>✏️ Editar producto</h3><div class="sub" id="eiInfo"></div>' +
        '<div class="grid"><div class="f"><label for="eiCant">Cantidad</label><input type="number" id="eiCant" min="1"></div>' +
        '<div class="f"><label for="eiTotal">Total a deber ($)</label><input type="number" id="eiTotal" step="0.01" min="0.01"></div></div>' +
        '<div class="sub" id="eiAbon" style="margin:12px 0 0"></div>' +
        '<div class="acts"><button class="btn btn-gray" onclick="closeM(\'modalEditItem\')">Cancelar</button>' +
        '<button class="btn btn-dark" id="btnGuardarIt">💾 Guardar</button></div></div></div>');

    const buscar = id => window.descuentos.find(d => String(d.id) === String(id));
    const ordenados = ced => window.descuentos
        .filter(d => String(d.cedula || '').trim() === String(ced).trim())
        .sort((a, b) => String(fechaISO(b.fecha)).localeCompare(String(fechaISO(a.fecha))) || (num(b.id) - num(a.id)));

    function decorar(ced) {
        cedP = ced;
        const items = ordenados(ced);
        document.querySelectorAll('#prodLista .pit').forEach((row, i) => {
            const it = items[i];
            if (!it || row.querySelector('[data-it-edit]')) return;
            row.querySelector('.pd2').insertAdjacentHTML('beforeend',
                '<span style="display:flex;gap:6px;margin-top:4px">' +
                '<button class="btn btn-gray btn-sm" data-it-edit="' + esc(it.id) + '" title="Corregir cantidad o monto">✏️ Editar</button>' +
                '<button class="btn btn-out btn-sm" data-it-del="' + esc(it.id) + '" title="El trabajador devolvió el producto">↩️ Devolver</button></span>');
        });
    }
    $('tablaDescuentos').addEventListener('click', e => {
        const b = e.target.closest('button[data-prods]');
        if (b) decorar(b.dataset.prods);
    });

    // Reabre la lista de productos ya actualizada (modalProductos nunca se cierra)
    function refrescar() {
        const b = document.querySelector('#tablaDescuentos button[data-prods="' + cedP + '"]');
        if (b) b.click(); else closeM('modalProductos');
    }

    function abrirEdit(id) {
        const it = buscar(id); if (!it) return;
        itEdit = it;
        const c = parseInt(it.cantidad) || 1;
        $('eiInfo').innerHTML = '<strong>' + esc(it.descripcionArticulo || parseProducto(it.producto).desc) + '</strong> · ' + esc(it.nombreEmpleado);
        $('eiCant').value = c;
        $('eiCant').dataset.unit = num(it.totalADeber) / c;
        $('eiTotal').value = num(it.totalADeber).toFixed(2);
        $('eiAbon').textContent = 'Ya abonado: ' + usd(num(it.abonado));
        openM('modalEditItem');
        setTimeout(() => { $('eiTotal').focus(); $('eiTotal').select(); }, 80);
    }
    $('eiCant').addEventListener('input', () => {
        $('eiTotal').value = (num($('eiCant').dataset.unit) * (parseInt($('eiCant').value) || 0)).toFixed(2);
    });

    async function guardar() {
        if (!itEdit || busy) return;
        const it = itEdit, cant = parseInt($('eiCant').value) || 0, total = num($('eiTotal').value), ab = num(it.abonado);
        if (cant < 1 || total <= 0) return toast('Cantidad y total deben ser mayores a 0', true);
        if (total < ab - .001) return toast('El total no puede ser menor a lo ya abonado (' + usd(ab) + '). Anula antes el descuento en RRHH DESC.', true);
        const desc = it.descripcionArticulo || parseProducto(it.producto).desc;
        const producto = desc + ' (x' + cant + ')', saldo = Math.max(total - ab, 0);
        busy = true; $('btnGuardarIt').disabled = true;
        try {
            if (hayDB() && it.id) {
                const { error } = await supabaseClient.from('descuento_empleados')
                    .update({ producto, total_deuda: total, saldo_pendiente: saldo }).eq('id', it.id);
                if (error) { console.error(error); toast('No se pudo guardar: ' + error.message, true); return; }
            }
            Object.assign(it, { cantidad: cant, producto, totalADeber: total.toFixed(2), saldoPendiente: saldo.toFixed(2) });
            closeM('modalEditItem');
            actualizarContadoresYTablas();
            refrescar();
            toast('Producto actualizado');
        } finally { busy = false; $('btnGuardarIt').disabled = false; }
    }
    $('btnGuardarIt').addEventListener('click', guardar);
    $('eiTotal').addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });

    async function devolver(id) {
        const it = buscar(id); if (!it) return;
        if (num(it.abonado) > .01) return toast('Ya tiene abonos (' + usd(num(it.abonado)) + '). Anula antes el descuento en RRHH DESC.', true);
        if (!confirm('¿Quitar "' + (it.descripcionArticulo || parseProducto(it.producto).desc) + '" de la cuenta? (producto devuelto)')) return;
        if (hayDB() && it.id) {
            const { error } = await supabaseClient.from('descuento_empleados').delete().eq('id', it.id);
            if (error) { console.error(error); toast('No se pudo quitar: ' + error.message, true); return; }
        }
        window.descuentos = window.descuentos.filter(d => String(d.id) !== String(id));
        actualizarContadoresYTablas();
        refrescar();
        toast('Producto quitado de la cuenta');
    }

    $('prodLista').addEventListener('click', e => {
        const ed = e.target.closest('button[data-it-edit]'), dl = e.target.closest('button[data-it-del]');
        if (ed) pedirClaveGerencial(() => abrirEdit(ed.dataset.itEdit));
        else if (dl) pedirClaveGerencial(() => devolver(dl.dataset.itDel));
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeM('modalEditItem'); });
})();