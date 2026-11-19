        let registros = [];
        let filtroEstadoActual = 'todos';
        let itemSeleccionadoActual = null;
        let sortDirections = {};
        let timeoutBusqueda = null;
        let guardando = false;
        let ultimoAutocompletado = '';

        let paginaActual = 1;
        const registrosPorPagina = 100;

        let callbackClaveExito = null;

        const $ = id => document.getElementById(id);
        const hoyISO = () => new Date().toISOString().substring(0, 10);
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        $('fechaRecepcion').value = hoyISO();

        /* ============ STOCK REAL (MySQL -> Supabase) ============
           Un script en la PC del supermercado copia el stock de NewPosline a la
           tabla "stock_real" de Supabase cada pocos minutos. La web solo LEE esa
           tabla con la sesión del usuario. Si falla, solo esa celda muestra "—". */
        const cacheStock = new Map();          // codigo -> { inv: [...] | null, t: timestamp }
        const STOCK_TTL = 5 * 60 * 1000;           // refresca cada 1 min
        const STOCK_REINTENTO = 60 * 1000;     // si falló, reintenta a los 15 s
        let stockSeq = 0;
        let ultimaMuestra = [];
        let syncInfoT = 0;

        const fmtStock = n => {
            const v = Number(n) || 0;
            return Number.isInteger(v) ? String(v) : v.toFixed(2);
        };
        const claseStock = n => n > 0 ? 'pos' : n < 0 ? 'neg' : 'cero';

        // El ID de MySQL (itemID) corresponde al código interno del artículo
        function codigoStock(item) {
            const c = String((item && item.codInterno) || '').trim();
            return (c && c !== 'S/C') ? c : '';
        }

        function htmlStock(cod) {
            if (!cod) return '<span class="stk-na" title="Este producto no tiene código interno">—</span>';
            const c = cacheStock.get(cod);
            if (!c) return '<span class="skel" style="width:46px;margin:0 auto"></span>';
            if (!c.inv) return '<span class="stk-na" title="No se pudo leer el stock. Revisa tu conexión.">—</span>';
            if (!c.inv.length) return '<span class="stk-na" title="Aún no hay datos de stock para este código">—</span><span class="stk-det">Sin datos de stock</span>';

            const total = c.inv.reduce((a, r) => a + (Number(r.cantidad) || 0), 0);
            const det = c.inv.map(r => {
                const q = Number(r.cantidad) || 0;
                const nombre = r.almacen || ('Almacén ' + r.warehouseID);
                return '<span class="stk-det">' + esc(nombre) + ': <b class="' + claseStock(q) + '">' + fmtStock(q) + '</b></span>';
            }).join('');
            return '<span class="stk-total ' + claseStock(total) + '">' + fmtStock(total) + '</span>' + det;
        }

        function pintarStock(cod) {
            const html = htmlStock(cod);
            document.querySelectorAll('td.stk').forEach(td => { if (td.dataset.cod === cod) td.innerHTML = html; });
        }

        let canalStock = null, consultaId = 0, consultaT;
        function canalEnVivo() {
            if (canalStock || typeof supabaseClient === 'undefined' || !supabaseClient) return canalStock;
            canalStock = supabaseClient.channel('stock-consulta', { config: { broadcast: { self: false } } });
            canalStock.on('broadcast', { event: 'respuesta' }, ({ payload }) => {
                if (!payload || !Array.isArray(payload.codigos)) return;
                const porItem = new Map(payload.codigos.map(c => [String(c), []]));
                (payload.filas || []).forEach(r => {
                    const a = porItem.get(String(r.item_id));
                    if (a) a.push({ warehouseID: r.warehouse_id, almacen: r.almacen, cantidad: r.cantidad });
                });
                porItem.forEach((inv, c) => {
                    inv.sort((x, y) => String(x.warehouseID).localeCompare(String(y.warehouseID)));
                    cacheStock.set(c, { inv, t: Date.now() });
                    pintarStock(c);
                });
            }).subscribe();
            return canalStock;
        }
        function consultarEnVivo(lista) {
            clearTimeout(consultaT);
            consultaT = setTimeout(() => {
                const codigos = [...new Set(lista.map(codigoStock).filter(Boolean))].slice(0, 10);
                const ch = canalEnVivo();
                if (!ch || !codigos.length) return;
                ch.send({ type: 'broadcast', event: 'pedir', payload: { id: ++consultaId, codigos } });
            }, 400);
        }
        setTimeout(canalEnVivo, 2000);

        // Indicador "Stock actualizado hace X min" (avisa si la sincronización se detuvo)
        async function actualizarInfoSync() {
            const el = $('stockSyncInfo');
            if (!el || Date.now() - syncInfoT < 30000) return;
            syncInfoT = Date.now();
            try {
                const { data, error } = await supabaseClient.from('stock_sync').select('ultima_sync').eq('id', 1).maybeSingle();
                if (error || !data) { el.textContent = ''; return; }
                const min = Math.max(0, Math.round((Date.now() - new Date(data.ultima_sync).getTime()) / 60000));
                el.textContent = ' · Stock actualizado ' + (min < 1 ? 'hace menos de 1 min' : 'hace ' + min + ' min') +
                    (min > 15 ? ' ⚠️ la sincronización parece detenida' : '');
                el.style.color = min > 15 ? 'var(--red-text)' : '';
                el.style.fontWeight = min > 15 ? '700' : '';
            } catch (e) { /* no es crítico */ }
        }

        async function cargarStocksVisibles(lista) {
            const pendientes = [...new Set(lista.map(codigoStock).filter(Boolean))].filter(c => {
                const x = cacheStock.get(c);
                return !x || Date.now() - x.t > STOCK_TTL;
            });
            if (!pendientes.length) { actualizarInfoSync(); return; }

            const miSeq = ++stockSeq;
            try {
                if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('Sin conexión a Supabase');
                for (let i = 0; i < pendientes.length; i += 100) {
                    const lote = pendientes.slice(i, i + 100);
                    const { data, error } = await supabaseClient.from('stock_real')
                        .select('item_id,warehouse_id,almacen,cantidad')
                        .in('item_id', lote).order('warehouse_id');
                    if (error) throw error;
                    if (miSeq !== stockSeq) return; // cambió la página: esta respuesta ya no sirve
                    const porItem = new Map(lote.map(c => [c, []]));
                    (data || []).forEach(r => {
                        const arr = porItem.get(String(r.item_id));
                        if (arr) arr.push({ warehouseID: r.warehouse_id, almacen: r.almacen, cantidad: r.cantidad });
                    });
                    porItem.forEach((inv, c) => { cacheStock.set(c, { inv, t: Date.now() }); pintarStock(c); });
                }
            } catch (e) {
                console.warn('No se pudo leer el stock:', e);
                pendientes.forEach(c => {
                    cacheStock.set(c, { inv: null, t: Date.now() - STOCK_TTL + STOCK_REINTENTO });
                    pintarStock(c);
                });
            }
            actualizarInfoSync();
        }

        // Refresca solo las celdas de stock de la página visible (sin repintar la tabla)
        setInterval(() => {
            if (document.visibilityState === 'visible' && ultimaMuestra.length) {
                syncInfoT = 0;
                cargarStocksVisibles(ultimaMuestra).catch(e => console.warn('Stock:', e));
            }
        }, 300000);

        /* ============ AVISO DE USO: el script de stock solo corre si el módulo está abierto ============ */
        let ultimoAviso = 0;
        function pedirSync() {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - ultimoAviso < 60000) return;
            if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
            ultimoAviso = Date.now();
            supabaseClient.rpc('pedir_sync').then(({ error }) => { if (error) console.warn('pedir_sync:', error.message); });
        }
        setTimeout(pedirSync, 4000);
        setInterval(pedirSync, 2 * 60 * 1000);
        document.addEventListener('visibilitychange', pedirSync);
        $('inputBuscar').addEventListener('focus', pedirSync);
        $('inputBuscar').addEventListener('input', pedirSync);

        /* ============ UI: ESTADO DEL SISTEMA, NOTIFICACIONES, MODALES ============ */
        let cargasActivas = 0;
        function setCargando(on) {
            cargasActivas = Math.max(0, cargasActivas + (on ? 1 : -1));
            $('progressBar').classList.toggle('on', cargasActivas > 0);
        }

        function toast(msg, { type = 'success', action = null, duration = 4500 } = {}) {
            const iconos = { success: '✅', error: '⛔', info: 'ℹ️', warn: '⚠️' };
            const el = document.createElement('div');
            el.className = `toast ${type}`;
            el.setAttribute('role', type === 'error' ? 'alert' : 'status');
            el.innerHTML = `<span class="toast-ico">${iconos[type] || ''}</span><span class="toast-msg">${esc(msg)}</span>`;

            const cerrar = () => {
                if (el._cerrado) return;
                el._cerrado = true;
                el.classList.add('out');
                setTimeout(() => el.remove(), 230);
            };

            if (action) {
                const b = document.createElement('button');
                b.className = 'toast-action';
                b.textContent = action.label;
                b.onclick = () => { cerrar(); action.fn(); };
                el.appendChild(b);
            }
            const x = document.createElement('button');
            x.className = 'toast-x';
            x.setAttribute('aria-label', 'Cerrar aviso');
            x.textContent = '✕';
            x.onclick = cerrar;
            el.appendChild(x);

            const barra = document.createElement('span');
            barra.className = 'toast-bar';
            barra.style.animationDuration = duration + 'ms';
            el.appendChild(barra);

            let t = setTimeout(cerrar, duration);
            el.addEventListener('mouseenter', () => { clearTimeout(t); barra.style.animationPlayState = 'paused'; });
            el.addEventListener('mouseleave', () => { barra.style.animationPlayState = 'running'; t = setTimeout(cerrar, 1800); });

            const host = $('toastHost');
            while (host.children.length >= 4) host.firstElementChild.remove();
            host.appendChild(el);
        }

        function abrirOverlay(id) {
            const el = $(id);
            clearTimeout(el._t);
            el.classList.remove('closing');
            el.style.display = 'flex';
        }

        function cerrarOverlay(id) {
            const el = $(id);
            if (el.style.display !== 'flex') return;
            el.classList.add('closing');
            clearTimeout(el._t);
            el._t = setTimeout(() => {
                el.style.display = 'none';
                el.classList.remove('closing');
            }, 180);
        }

        function confirmarUI(titulo, mensaje, { textoOk = 'Confirmar', peligro = false } = {}) {
            return new Promise(resolve => {
                const ov = document.createElement('div');
                ov.className = 'modal-overlay';
                ov.style.display = 'flex';
                ov.style.zIndex = 1200;
                ov.setAttribute('role', 'alertdialog');
                ov.setAttribute('aria-modal', 'true');
                ov.innerHTML = `
                    <div class="modal-card" style="max-width:430px">
                        <div class="modal-header ${peligro ? 'danger' : ''}"><h3>${esc(titulo)}</h3></div>
                        <div class="modal-body">
                            <p class="confirm-msg">${esc(mensaje)}</p>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-ghost" data-r="0">Cancelar</button>
                                <button type="button" class="btn ${peligro ? 'btn-delete' : 'btn-save'}" data-r="1">${esc(textoOk)}</button>
                            </div>
                        </div>
                    </div>`;
                document.body.appendChild(ov);

                const fin = ok => {
                    document.removeEventListener('keydown', onKey, true);
                    ov.classList.add('closing');
                    setTimeout(() => ov.remove(), 190);
                    resolve(ok);
                };
                const onKey = e => {
                    if (e.key === 'Escape') { e.stopImmediatePropagation(); fin(false); }
                };
                document.addEventListener('keydown', onKey, true);
                ov.addEventListener('click', e => { if (e.target === ov) fin(false); });
                ov.querySelectorAll('button').forEach(b => b.onclick = () => fin(b.dataset.r === '1'));
                ov.querySelector('[data-r="0"]').focus();
            });
        }

        function navegarSuave(url) {
            document.body.classList.add('leaving');
            setTimeout(() => { window.location.href = url; }, 230);
        }

        /* ============ MENÚ DE USUARIO (avatar + desplegable) ============ */
        function toggleUserMenu() {
            const m = $('userDropdown');
            const abrir = m.hidden;
            m.hidden = !abrir;
            const t = $('userTrigger');
            if (t) { t.classList.toggle('open', abrir); t.setAttribute('aria-expanded', abrir); }
        }

        function cerrarUserMenu() {
            const m = $('userDropdown');
            if (!m || m.hidden) return;
            m.hidden = true;
            const t = $('userTrigger');
            if (t) { t.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); }
        }

        document.addEventListener('click', e => { if (!e.target.closest('#userMenu')) cerrarUserMenu(); });

        /* ============ AUTENTICACIÓN Y SESIÓN COMPARTIDA ============ */
        async function ejecutarLogout() {
            cerrarUserMenu();
            try { localStorage.removeItem('recepcion_cache_v1'); } catch (e) { }
            if (typeof supabaseClient !== 'undefined') {
                await supabaseClient.auth.signOut();
                navegarSuave('index.html');
            }
        }

        function gestionarEstadoSesion(session) {
            const authContainer = $('userAuthContainer');

            if (session && session.user) {
                const metadata = session.user.user_metadata || {};
                const nombre = metadata.display_name || metadata.full_name || session.user.email.split('@')[0];
                const nombreFormateado = nombre.charAt(0).toUpperCase() + nombre.slice(1);
                const inicial = nombreFormateado.charAt(0);
                const abierto = !$('userDropdown').hidden;

                if (authContainer) {
                    authContainer.innerHTML = `
                        <button type="button" class="utrigger${abierto ? ' open' : ''}" id="userTrigger" aria-haspopup="true" aria-expanded="${abierto}" onclick="toggleUserMenu()">
                            <span class="av">${esc(inicial)}<i class="on"></i></span>
                            <span class="uname">${esc(nombreFormateado)}</span>
                            <span class="chev">▾</span>
                        </button>
                    `;
                }
                $('umAvatar').textContent = inicial;
                $('umNombre').textContent = nombreFormateado;
                $('umEmail').textContent = session.user.email || '';
            } else {
                window.location.href = 'index.html';
            }
        }

        /* ============ MANEJO DE FECHAS SEGURO ============ */
        function normalizarFechaGuardada(val) {
            if (!val || val === 'S/F' || val === '-') return '';

            if (val instanceof Date && !isNaN(val.getTime())) {
                const yyyy = val.getFullYear();
                const mm = String(val.getMonth() + 1).padStart(2, '0');
                const dd = String(val.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            let str = String(val).trim();
            if (str === '' || str === 'Invalid Date') return '';

            if (str.includes('GMT') || str.includes('hora de')) {
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) {
                    const yyyy = parsed.getFullYear();
                    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                    const dd = String(parsed.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
            }

            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
                const partes = str.split('/');
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }

            const dGen = new Date(str);
            if (!isNaN(dGen.getTime())) {
                const yyyy = dGen.getFullYear();
                const mm = String(dGen.getMonth() + 1).padStart(2, '0');
                const dd = String(dGen.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            return str;
        }

        function formatearFechaMostrar(val) {
            const norm = normalizarFechaGuardada(val);
            if (!norm) return 'S/F';
            const partes = norm.split('-');
            if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
            return norm;
        }

        function formatearFechaInput(val) {
            return normalizarFechaGuardada(val);
        }

        /* Aviso (no bloqueante) si la caducidad es anterior a la recepción */
        function validarFechas() {
            const r = $('fechaRecepcion').value;
            const c = $('fechaCaducidad').value;
            const hint = $('hintFechas');
            const anterior = r && c && c < r;
            hint.textContent = anterior ? '⚠️ La caducidad es anterior a la recepción: el producto ingresaría ya vencido.' : '';
            hint.classList.toggle('show', !!anterior);
        }

        /* ============ CLAVE DE SEGURIDAD SEGURA (RPC SUPABASE) ============ */
        async function validarPinConSupabase(pinIngresado) {
            if (!pinIngresado) return false;
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                console.warn("Sin conexión activa a Supabase para verificar autorización RPC.");
                return false;
            }

            try {
                const { data: esValido, error } = await supabaseClient.rpc('verificar_pin_autorizacion', {
                    p_pin: pinIngresado.trim()
                });

                if (error) {
                    console.error("Error al verificar PIN en base de datos:", error);
                    return false;
                }

                return Boolean(esValido);
            } catch (err) {
                console.error("Error de red al validar PIN:", err);
                return false;
            }
        }

        function verificarClaveAdmin(callback) {
            callbackClaveExito = callback;
            const inputClave = $('inputClaveAdmin');
            inputClave.value = '';
            abrirOverlay('modalClaveSeguridad');
            setTimeout(() => inputClave.focus(), 100);
        }

        function cerrarModalClave(exito) {
            cerrarOverlay('modalClaveSeguridad');
            if (!exito && callbackClaveExito) callbackClaveExito = null;
        }

        async function confirmarClaveAdmin() {
            const claveIngresada = $('inputClaveAdmin').value.trim();
            if (!claveIngresada) {
                toast('Por favor ingresa la clave de seguridad.', { type: 'warn' });
                return;
            }

            const btnConfirmar = $('btnConfirmarClave');
            if (btnConfirmar) {
                btnConfirmar.disabled = true;
                btnConfirmar.textContent = 'Verificando...';
            }

            const esValido = await validarPinConSupabase(claveIngresada);

            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar';
            }

            if (!esValido) {
                toast('Clave incorrecta o no válida. Revisa e intenta de nuevo.', { type: 'error' });
                const card = $('modalClaveSeguridad').querySelector('.modal-card');
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                $('inputClaveAdmin').value = '';
                $('inputClaveAdmin').focus();
                return;
            }

            cerrarModalClave(true);
            if (callbackClaveExito) {
                const cb = callbackClaveExito;
                callbackClaveExito = null;
                cb();
            }
        }

        function debounceActualizarTabla() {
            paginaActual = 1;
            $('btnLimpiar').classList.toggle('show', !!$('inputBuscar').value);
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => actualizarTabla(), 150);
        }

        function buscarYAutocompletarPorCodigo(valorBuscado, campoOrigen) {
            if ($('editId').value) return;

            const val = valorBuscado.trim();
            if (!val || val.length < 2) return;
            if ($('producto').value.trim()) return;

            const existente = registros.find(r =>
                (r.codBarra && String(r.codBarra).trim() === val && r.codBarra !== 'S/C') ||
                (r.codInterno && String(r.codInterno).trim() === val && r.codInterno !== 'S/C')
            );

            if (existente) {
                if (campoOrigen !== 'codBarra') {
                    $('codBarra').value = (existente.codBarra && existente.codBarra !== 'S/C') ? existente.codBarra : '';
                }
                if (campoOrigen !== 'codInterno') {
                    $('codInterno').value = (existente.codInterno && existente.codInterno !== 'S/C') ? existente.codInterno : '';
                }

                $('producto').value = existente.producto || '';
                $('departamento').value = existente.departamento || '';

                if (existente.proveedor && existente.proveedor !== 'S/P') {
                    $('proveedor').value = existente.proveedor;
                }

                toast(`Producto reconocido: ${existente.producto}. Se completaron sus datos.`, { type: 'info', duration: 3500 });
                setTimeout(() => $('numFactura').focus(), 50);
            }
        }

        function calcularCostoTotalAuto() {
            const cant = parseFloat($('cantidad').value) || 0;
            const unit = parseFloat($('costoUnitario').value) || 0;
            if (cant > 0 && unit >= 0) $('costoTotal').value = (cant * unit).toFixed(2);
        }

        function calcularCostoUnitarioAuto() {
            const cant = parseFloat($('cantidad').value) || 0;
            const total = parseFloat($('costoTotal').value) || 0;
            if (cant > 0 && total >= 0) $('costoUnitario').value = (total / cant).toFixed(2);
        }

        function sincronizarDashboardLocalStorage() {
            let optimos = 0, porVencer = 0, vencidos = 0;
            registros.forEach(item => {
                if (item.inhabilitado) return;
                const st = calcularEstado(item.fechaVencimiento).status;
                if (st === 'optimo') optimos++;
                if (st === 'por_vencer') porVencer++;
                if (st === 'vencido') vencidos++;
            });

            localStorage.setItem('dashboard_mod1_optimos', optimos);
            localStorage.setItem('dashboard_mod1_porvencer', porVencer);
            localStorage.setItem('dashboard_mod1_vencidos', vencidos);
        }

        /* ============ BASE DE DATOS (SUPABASE) ============ */
        function normalizarRegistro(item) {
            item.codBarra = item.codBarra || item.cod_barra || 'S/C';
            item.codInterno = item.codInterno || item.codinterno || item.cod_interno || 'S/C';
            item.fechaRecepcion = normalizarFechaGuardada(item.fechaRecepcion || item.fecha_recepcion);
            item.fechaVencimiento = normalizarFechaGuardada(item.fechaVencimiento || item.fecha_vencimiento);
            if (item.inhabilitado === undefined) item.inhabilitado = false;
            return item;
        }

        function mezclarRegistros(filas) {
            const nuevos = filas.map(normalizarRegistro);
            const idx = new Map(registros.map((r, i) => [String(r.id), i]));
            const inserts = [];
            nuevos.forEach(n => {
                const i = idx.get(String(n.id));
                if (i === undefined) inserts.push(n); else registros[i] = n;
            });
            registros = inserts.concat(registros);
            actualizarTodo();
            sincronizarDashboardLocalStorage();
            guardarCache();
        }

        const CACHE_KEY = 'recepcion_cache_v1';
        const CACHE_COMPLETA_MAX = 6 * 3600 * 1000; // recarga completa cada 6 h
        let cacheFullAt = 0;

        function leerCache() {
            try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
        }
        function guardarCache() {
            try {
                const last = registros.reduce((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), '');
                localStorage.setItem(CACHE_KEY, JSON.stringify({ rows: registros, last, fullAt: cacheFullAt }));
            } catch (e) { try { localStorage.removeItem(CACHE_KEY); } catch (_) { } }
        }

        async function cargarDatosDB(forzarCompleta = false) {
            if (typeof supabaseClient === 'undefined') return;
            setCargando(true);
            try {
                const c = forzarCompleta ? null : leerCache();
                const vigente = c && c.rows && c.last && (Date.now() - c.fullAt) < CACHE_COMPLETA_MAX;

                if (vigente) {
                    // 1) Pinta al instante desde el caché
                    registros = c.rows;
                    cacheFullAt = c.fullAt;
                    actualizarTodo();
                    sincronizarDashboardLocalStorage();
                    // 2) Pide solo lo que cambió desde la última vez
                    const { data, error } = await supabaseClient
                        .from('recepcion_fechas').select('*')
                        .gt('updated_at', c.last).order('updated_at', { ascending: true });
                    if (!error && data && data.length) mezclarRegistros(data);
                    guardarCache();
                    return;
                }

                // Carga completa (primera vez, cada 6 h, o si se fuerza)
                const { data, error } = await supabaseClient
                    .from('recepcion_fechas').select('*').order('id', { ascending: false });

                if (error) {
                    console.error("Error al consultar Supabase:", error);
                    toast("No se pudieron cargar los datos desde la nube: " + error.message, { type: 'error', duration: 7000 });
                    $('tablaRegistros').innerHTML = `<tr><td colspan="9"><div class="empty"><strong>No se pudieron cargar los datos</strong>Revisa tu conexión e intenta de nuevo.<br><button class="btn btn-ghost" onclick="cargarDatosDB()">Reintentar</button></div></td></tr>`;
                    return;
                }
                registros = (data || []).map(normalizarRegistro);
                cacheFullAt = Date.now();
                actualizarTodo();
                sincronizarDashboardLocalStorage();
                guardarCache();
            } finally {
                setCargando(false);
            }
        }

        async function guardarDatosDB(nuevosItems) {
            const itemsFormateados = nuevosItems.map(item => ({
                ...item,
                fechaRecepcion: normalizarFechaGuardada(item.fechaRecepcion) || null,
                fechaVencimiento: normalizarFechaGuardada(item.fechaVencimiento) || null,
                inhabilitado: item.inhabilitado !== undefined ? item.inhabilitado : false
            }));

            setCargando(true);
            try {
                const { data: guardados, error } = await supabaseClient
                    .from('recepcion_fechas')
                    .upsert(itemsFormateados).select();

                if (error) {
                    console.error("Error al guardar en Supabase:", error);
                    toast("No se pudo guardar en la nube: " + error.message, { type: 'error', duration: 7000 });
                    return false;
                }
            if (guardados && guardados.length) mezclarRegistros(guardados); else await cargarDatosDB(true);
            } finally {
                setCargando(false);
            }

            
            return true;
        }

        async function eliminarRegistroDB(idItem) {
            setCargando(true);
            try {
                const { error } = await supabaseClient
                    .from('recepcion_fechas')
                    .delete()
                    .eq('id', idItem);

                if (error) {
                    console.error("Error al eliminar en Supabase:", error);
                    toast("No se pudo eliminar en la nube: " + error.message, { type: 'error', duration: 7000 });
                    return false;
                }
            registros = registros.filter(r => String(r.id) !== String(idItem));
                actualizarTodo();
                sincronizarDashboardLocalStorage();
                guardarCache();
            } finally {
                setCargando(false);
            }

            
            return true;
        }

        /* Elimina y ofrece deshacer */
        async function ejecutarEliminacion(item) {
            const copia = { ...item };
            const ok = await eliminarRegistroDB(item.id);
            if (!ok) return false;
            toast('Registro eliminado.', {
                type: 'success', duration: 7000,
                action: {
                    label: 'Deshacer',
                    fn: async () => { if (await guardarDatosDB([copia])) toast('Registro restaurado.'); }
                }
            });
            return true;
        }

        /* ============ FORMULARIO ============ */
        async function registrarProducto(event) {
            event.preventDefault();
            if (guardando) return;
            guardando = true;

            const btn = $('btnGuardar');
            btn.classList.add('loading');
            btn.disabled = true;

            try {
                const editId = $('editId').value;
                const itemData = {
                    codBarra: $('codBarra').value.trim() || 'S/C',
                    codInterno: $('codInterno').value.trim() || 'S/C',
                    producto: $('producto').value.trim(),
                    departamento: $('departamento').value.trim() || 'GENERAL',
                    proveedor: $('proveedor').value.trim() || 'S/P',
                    numFactura: $('numFactura').value.trim() || 'S/F',
                    personaRecibe: $('personaRecibe').value.trim() || 'S/N',
                    lote: $('lote').value.trim() || 'S/L',
                    cantidad: parseInt($('cantidad').value) || 1,
                    costoUnitario: parseFloat($('costoUnitario').value) || 0,
                    costoTotal: parseFloat($('costoTotal').value) || 0,
                    fechaRecepcion: $('fechaRecepcion').value || hoyISO(),
                    fechaVencimiento: $('fechaCaducidad').value || null,
                    observaciones: $('observaciones').value.trim(),
                    inhabilitado: false
                };

                if (editId) itemData.id = editId;

                const ok = await guardarDatosDB([itemData]);
                if (!ok) return;

                cancelarEdicionForm();
                toast(editId ? 'Registro actualizado.' : `Registro guardado: ${itemData.producto}.`);
                if (!editId) $('codBarra').focus();
            } finally {
                guardando = false;
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }

        function cancelarEdicionForm() {
            $('formRecepcion').reset();
            $('editId').value = '';
            $('fechaRecepcion').value = hoyISO();
            $('btnEliminarForm').style.display = 'none';
            $('btnCancelarEdicion').style.display = 'none';
            $('btnGuardarTxt').textContent = 'Guardar registro';
            $('bannerEdicion').classList.remove('show');
            ultimoAutocompletado = '';
            validarFechas();
        }

        function eliminarItemActualForm() {
            const editId = $('editId').value;
            if (!editId) return;
            const item = registros.find(r => String(r.id) === String(editId));
            if (!item) return;

            verificarClaveAdmin(async () => {
                const ok = await confirmarUI('Eliminar registro', `Se eliminará "${item.producto}" (lote ${item.lote || 'S/L'}). Podrás deshacerlo unos segundos después.`, { textoOk: 'Sí, eliminar', peligro: true });
                if (ok && await ejecutarEliminacion(item)) cancelarEdicionForm();
            });
        }

        /* ============ ESTADO DE VENCIMIENTO ============ */
        function calcularEstado(fechaVencStr) {
            const norm = normalizarFechaGuardada(fechaVencStr);
            if (!norm) return { texto: 'SIN FECHA', clase: 'badge-sin-fecha', status: 'sin_fecha' };

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaVenc = new Date(norm + 'T00:00:00');

            if (isNaN(fechaVenc.getTime())) return { texto: 'SIN FECHA', clase: 'badge-sin-fecha', status: 'sin_fecha' };

            const difDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

            if (isNaN(difDias) || difDias < 0) {
                return { texto: 'VENCIDO', clase: 'badge-danger', status: 'vencido' };
            } else if (difDias <= 5) {
                return { texto: `¡URGENTE (${difDias}d)!`, clase: 'badge-titilar', status: 'por_vencer' };
            } else if (difDias <= 30) {
                return { texto: `POR VENCER (${difDias}d)`, clase: 'badge-warning', status: 'por_vencer' };
            } else {
                return { texto: 'ÓPTIMO', clase: 'badge-optimo', status: 'optimo' };
            }
        }

        function animarNumero(el, destino) {
            const desde = parseInt(el.dataset.v || '0');
            el.dataset.v = destino;
            if (desde === destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                el.textContent = destino.toLocaleString();
                return;
            }
            const t0 = performance.now(), dur = 650;
            const paso = t => {
                const p = Math.min(1, (t - t0) / dur);
                const e = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(desde + (destino - desde) * e).toLocaleString();
                if (p < 1) requestAnimationFrame(paso);
            };
            requestAnimationFrame(paso);
        }

        function actualizarDashboard() {
            let optimos = 0, porVencer = 0, vencidos = 0;

            registros.forEach(item => {
                if (item.inhabilitado) return;
                const st = calcularEstado(item.fechaVencimiento).status;
                if (st === 'optimo') optimos++;
                if (st === 'por_vencer') porVencer++;
                if (st === 'vencido') vencidos++;
            });

            animarNumero($('dashOptimos'), optimos);
            animarNumero($('dashPorVencer'), porVencer);
            animarNumero($('dashVencidos'), vencidos);

            actualizarContadorInhabilitados();
        }

        /* ============ FILTROS Y ORDEN ============ */
        function filtrarEstado(estado, btn) {
            paginaActual = 1;
            filtroEstadoActual = estado;
            document.querySelectorAll('.filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
            const objetivo = btn || document.querySelector(`.filter-pills .pill-btn[data-filter="${estado}"]`);
            if (objetivo) objetivo.classList.add('active');
            document.querySelectorAll('.dash-card').forEach(c => c.classList.toggle('selected', c.dataset.filter === estado));
            actualizarTabla();
        }

        function filtrarDesdeDash(estado) {
            filtrarEstado(filtroEstadoActual === estado ? 'todos' : estado);
        }

        function limpiarFiltros() {
            $('inputBuscar').value = '';
            $('btnLimpiar').classList.remove('show');
            filtrarEstado('todos');
        }

        function obtenerRegistrosFiltrados() {
            const busqueda = $('inputBuscar').value.toLowerCase().trim();

            let existeCoincidenciaCodigoExacto = false;
            if (busqueda) {
                existeCoincidenciaCodigoExacto = registros.some(r =>
                    (r.codBarra && String(r.codBarra).toLowerCase().trim() === busqueda && r.codBarra !== 'S/C') ||
                    (r.codInterno && String(r.codInterno).toLowerCase().trim() === busqueda && r.codInterno !== 'S/C')
                );
            }

            return registros.filter(item => {
                if (filtroEstadoActual === 'inhabilitados') {
                    if (!item.inhabilitado) return false;
                } else {
                    if (item.inhabilitado) return false;
                    const st = calcularEstado(item.fechaVencimiento).status;
                    if (filtroEstadoActual !== 'todos' && st !== filtroEstadoActual) return false;
                }

                if (!busqueda) return true;

                const codBarraStr = String(item.codBarra || '').toLowerCase().trim();
                const codInternoStr = String(item.codInterno || '').toLowerCase().trim();

                if (existeCoincidenciaCodigoExacto) {
                    return (codBarraStr === busqueda && item.codBarra !== 'S/C') ||
                        (codInternoStr === busqueda && item.codInterno !== 'S/C');
                }

                const prod = String(item.producto || '').toLowerCase();
                const dpto = String(item.departamento || '').toLowerCase();
                const prov = String(item.proveedor || '').toLowerCase();
                const fac = String(item.numFactura || '').toLowerCase();
                const lote = String(item.lote || '').toLowerCase();
                const obs = String(item.observaciones || '').toLowerCase();

                return codBarraStr.includes(busqueda) ||
                    codInternoStr.includes(busqueda) ||
                    prod.includes(busqueda) ||
                    dpto.includes(busqueda) ||
                    prov.includes(busqueda) ||
                    fac.includes(busqueda) ||
                    lote.includes(busqueda) ||
                    obs.includes(busqueda);
            });
        }

        function sortTable(column, th) {
            sortDirections[column] = !sortDirections[column];
            const asc = sortDirections[column];

            document.querySelectorAll('th.sortable').forEach(h => { h.removeAttribute('data-dir'); h.removeAttribute('aria-sort'); });
            if (th) {
                th.dataset.dir = asc ? 'asc' : 'desc';
                th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
            }

            registros.sort((rowA, rowB) => {
                let valA, valB;
                if (column === 'recepcion') {
                    valA = parseDate(rowA.fechaRecepcion);
                    valB = parseDate(rowB.fechaRecepcion);
                } else if (column === 'vencimiento') {
                    valA = parseDate(rowA.fechaVencimiento);
                    valB = parseDate(rowB.fechaVencimiento);
                } else {
                    valA = parseDays(rowA.fechaVencimiento);
                    valB = parseDays(rowB.fechaVencimiento);
                }
                return asc ? valA - valB : valB - valA;
            });

            actualizarTabla();
        }

        function parseDate(dateStr) {
            const norm = normalizarFechaGuardada(dateStr);
            if (!norm) return 0;
            return new Date(norm + 'T00:00:00').getTime() || 0;
        }

        function parseDays(fechaVencStr) {
            const norm = normalizarFechaGuardada(fechaVencStr);
            if (!norm) return 999999;
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaVenc = new Date(norm + 'T00:00:00');
            if (isNaN(fechaVenc.getTime())) return 999999;
            return Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
        }

        /* ============ TABLA ============ */
        function actualizarTabla() {
            const tbody = $('tablaRegistros');
            tbody.innerHTML = '';

            const filtrados = obtenerRegistrosFiltrados();
            const totalRegistros = filtrados.length;
            const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;

            if (paginaActual > totalPaginas) paginaActual = totalPaginas;
            if (paginaActual < 1) paginaActual = 1;

            if (totalRegistros === 0) {
                const hayFiltros = $('inputBuscar').value.trim() || filtroEstadoActual !== 'todos';
                tbody.innerHTML = `<tr><td colspan="9"><div class="empty">
                    <strong>${hayFiltros ? 'Sin resultados para este filtro' : 'Aún no hay registros'}</strong>
                    ${hayFiltros ? 'Prueba con otro término o quita los filtros.' : 'Completa el formulario de arriba para registrar la primera recepción.'}
                    ${hayFiltros ? '<br><button class="btn btn-ghost" onclick="limpiarFiltros()">Limpiar filtros</button>' : ''}
                </div></td></tr>`;
                renderizarPaginacion(0, 1, 1);
                return;
            }

            const inicio = (paginaActual - 1) * registrosPorPagina;
            const muestra = filtrados.slice(inicio, inicio + registrosPorPagina);

            muestra.forEach((item, idx) => {
                let badgeHtml = '';
                if (item.inhabilitado) {
                    badgeHtml = `<span class="badge badge-inhabilitado">INHABILITADO</span>`;
                } else {
                    const estado = calcularEstado(item.fechaVencimiento);
                    badgeHtml = `<span class="badge ${estado.clase}">${estado.texto}</span>`;
                }

                const tr = document.createElement('tr');
                tr.className = 'clickable-row';
                tr.style.setProperty('--i', Math.min(idx, 16));
                tr.tabIndex = 0;
                tr.setAttribute('role', 'button');
                tr.setAttribute('aria-label', `Ver acciones de ${item.producto}`);
                tr.onclick = () => abrirModalItem(item);
                tr.onkeydown = e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModalItem(item); }
                };

                const codStock = codigoStock(item);

                tr.innerHTML = `
                    <td><strong>${esc(item.codBarra || 'S/C')}</strong></td>
                    <td><code>${esc(item.codInterno || 'S/C')}</code></td>
                    <td><strong>${esc(item.producto)}</strong></td>
                    <td>${esc((item.departamento || 'GENERAL').toUpperCase())}</td>
                    <td>${esc(item.lote || 'S/L')}</td>
                    <td class="stk" data-cod="${esc(codStock)}">${htmlStock(codStock)}</td>
                    <td>${formatearFechaMostrar(item.fechaRecepcion)}</td>
                    <td>${formatearFechaMostrar(item.fechaVencimiento)}</td>
                    <td>${badgeHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            renderizarPaginacion(totalRegistros, paginaActual, totalPaginas);

            // El stock se consulta DESPUÉS de pintar la tabla y sin esperar el resultado:
            // si la API falla, la pantalla y la sesión no se ven afectadas.
            ultimaMuestra = muestra;
            cargarStocksVisibles(muestra).catch(e => console.warn('Stock:', e));
            const buscando = $('inputBuscar').value.trim().length > 0;
            if (buscando && muestra.length <= 10) consultarEnVivo(muestra);
        }

        function renderizarPaginacion(total, pagina, totalPaginas) {
            let cont = $('contenedorPaginacion');

            if (!cont) {
                cont = document.createElement('div');
                cont.id = 'contenedorPaginacion';
                cont.className = 'paginacion';
                document.querySelector('.table-responsive').after(cont);
            }

            if (total === 0) {
                cont.innerHTML = '';
                return;
            }

            const inicio = ((pagina - 1) * registrosPorPagina) + 1;
            const fin = Math.min(pagina * registrosPorPagina, total);

            cont.innerHTML = `
                <div>Mostrando <strong>${inicio}-${fin}</strong> de <strong>${total.toLocaleString()}</strong> registros</div>
                <div class="paginacion-ctrl">
                    <button class="pill-btn" onclick="cambiarPagina(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>◀ Anterior</button>
                    <span>Página <strong>${pagina}</strong> de <strong>${totalPaginas}</strong></span>
                    <button class="pill-btn" onclick="cambiarPagina(${pagina + 1})" ${pagina === totalPaginas ? 'disabled' : ''}>Siguiente ▶</button>
                </div>
            `;
        }

        function cambiarPagina(nuevaPagina) {
            paginaActual = nuevaPagina;
            actualizarTabla();
            document.querySelector('.table-responsive').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function descargarExcelFiltrado() {
            const datosFiltrados = obtenerRegistrosFiltrados();
            if (datosFiltrados.length === 0) {
                toast('No hay registros con el filtro actual para descargar.', { type: 'warn' });
                return;
            }

            const datosParaExcel = datosFiltrados.map(item => ({
                "Cód. Barra": item.codBarra || 'S/C',
                "Cód. Interno": item.codInterno || 'S/C',
                "Descripción del Producto": item.producto,
                "Departamento": (item.departamento || 'GENERAL').toUpperCase(),
                "Proveedor": (item.proveedor || 'S/P').toUpperCase(),
                "N° Factura": item.numFactura || 'S/F',
                "N° Lote": item.lote || 'S/L',
                "Cantidad": item.cantidad || 0,
                "Costo Unitario ($)": item.costoUnitario || 0,
                "Costo Total ($)": item.costoTotal || 0,
                "Fecha Recepción": formatearFechaMostrar(item.fechaRecepcion),
                "Fecha Vencimiento": formatearFechaMostrar(item.fechaVencimiento),
                "Estatus": item.inhabilitado ? 'INHABILITADO' : calcularEstado(item.fechaVencimiento).texto,
                "Recibe": item.personaRecibe || 'S/N',
                "Observaciones": item.observaciones || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Filtrado");

            XLSX.writeFile(workbook, `reporte_productos_${filtroEstadoActual}_${hoyISO()}.xlsx`);
            toast(`Excel descargado con ${datosFiltrados.length.toLocaleString()} registros.`);
        }

        /* ============ MODAL DE ACCIONES ============ */
        function abrirModalItem(item) {
            itemSeleccionadoActual = item;

            $('modalTituloProducto').innerText = item.producto;
            $('modalCodigos').innerText = `Barra: ${item.codBarra || 'S/C'} | Int: ${item.codInterno || 'S/C'}`;
            $('modalDpto').innerText = (item.departamento || 'GENERAL').toUpperCase();
            $('modalProveedor').innerText = (item.proveedor || 'S/P').toUpperCase();
            $('modalFacturaLote').innerText = `Fac: ${item.numFactura || 'S/F'} | Lote: ${item.lote || 'S/L'}`;
            $('modalCantCostos').innerText = `${item.cantidad || 0} uds. recibidas | Unit: $${(item.costoUnitario || 0).toFixed(2)} | Total: $${(item.costoTotal || 0).toFixed(2)}`;
            $('modalRecibe').innerText = item.personaRecibe || 'S/N';
            $('modalObservaciones').innerText = item.observaciones || '-';

            const btnInhabilitar = $('btnModalInhabilitar');
            if (item.inhabilitado) {
                btnInhabilitar.innerHTML = '✅ Habilitar';
                btnInhabilitar.style.backgroundColor = 'var(--leaf)';
            } else {
                btnInhabilitar.innerHTML = '🚫 Inhabilitar';
                btnInhabilitar.style.backgroundColor = 'var(--dark-inhabilitar)';
            }

            btnInhabilitar.onclick = () => {
                cerrarModal();
                item.inhabilitado = !item.inhabilitado;
                guardarDatosDB([item]).then(ok => {
                    if (!ok) { item.inhabilitado = !item.inhabilitado; return; }
                    toast(item.inhabilitado ? 'Artículo inhabilitado.' : 'Artículo habilitado.', {
                        duration: 6000,
                        action: {
                            label: 'Deshacer',
                            fn: () => { item.inhabilitado = !item.inhabilitado; guardarDatosDB([item]); }
                        }
                    });
                });
            };

            $('btnModalEditar').onclick = () => {
                cerrarModal();
                editarItem(item.id);
            };

            $('btnModalKardex').onclick = () => {
                cerrarModal();
                verKardex(item.codBarra);
            };

            $('btnModalEliminar').onclick = () => {
                cerrarModal();
                verificarClaveAdmin(async () => {
                    const ok = await confirmarUI('Eliminar registro', `Se eliminará "${item.producto}" (lote ${item.lote || 'S/L'}). Podrás deshacerlo unos segundos después.`, { textoOk: 'Sí, eliminar', peligro: true });
                    if (ok) await ejecutarEliminacion(item);
                });
            };

            abrirOverlay('modalAcciones');
            setTimeout(() => $('btnModalEditar').focus(), 60);
        }

        function cerrarModal() {
            cerrarOverlay('modalAcciones');
        }

        function cerrarModalFuera(event) {
            if (event.target === $('modalAcciones')) cerrarModal();
        }

        function editarItem(id) {
            const item = registros.find(r => String(r.id) === String(id));

            if (!item) {
                toast('No se encontró el artículo seleccionado. Actualiza la página e intenta de nuevo.', { type: 'error' });
                return;
            }

            $('editId').value = item.id;
            $('codBarra').value = (item.codBarra && item.codBarra !== 'S/C') ? item.codBarra : '';
            $('codInterno').value = (item.codInterno && item.codInterno !== 'S/C') ? item.codInterno : '';
            $('producto').value = item.producto || '';
            $('departamento').value = item.departamento || '';
            $('proveedor').value = item.proveedor || '';
            $('numFactura').value = (item.numFactura && item.numFactura !== 'S/F') ? item.numFactura : '';
            $('personaRecibe').value = (item.personaRecibe && item.personaRecibe !== 'S/N') ? item.personaRecibe : '';
            $('lote').value = (item.lote && item.lote !== 'S/L') ? item.lote : '';
            $('cantidad').value = item.cantidad || 1;
            $('costoUnitario').value = item.costoUnitario || '';
            $('costoTotal').value = item.costoTotal || '';
            $('fechaRecepcion').value = formatearFechaInput(item.fechaRecepcion) || hoyISO();
            $('fechaCaducidad').value = formatearFechaInput(item.fechaVencimiento);
            $('observaciones').value = item.observaciones || '';

            $('btnEliminarForm').style.display = 'inline-flex';
            $('btnCancelarEdicion').style.display = 'inline-flex';
            $('btnGuardarTxt').textContent = 'Guardar cambios';
            $('bannerEdicion').innerHTML = `✏️ Estás editando <strong>${esc(item.producto)}</strong>. Pulsa <kbd>Esc</kbd> para cancelar sin guardar.`;
            $('bannerEdicion').classList.add('show');
            validarFechas();

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => $('producto').focus(), 300);
        }

        /* ============ KARDEX ============ */
        function verKardex(codBarra) {
            const item = registros.find(r => String(r.codBarra) === String(codBarra) || String(r.id) === String(codBarra));

            if (!item) {
                toast('No se encontró el historial para el código especificado.', { type: 'error' });
                return;
            }

            const estado = item.inhabilitado ? { texto: 'INHABILITADO', clase: 'badge-inhabilitado' } : calcularEstado(item.fechaVencimiento);
            const colores = { 'badge-optimo': '#17703d', 'badge-warning': '#8f5600', 'badge-titilar': '#8f5600', 'badge-danger': '#c62828', 'badge-inhabilitado': '#2c3e50', 'badge-sin-fecha': '#5d6f63' };
            const ventanaKardex = window.open('', '_blank', 'width=1100,height=750');

            if (!ventanaKardex) {
                toast('El navegador bloqueó la ventana del Kardex. Permite las ventanas emergentes para este sitio e intenta de nuevo.', { type: 'error', duration: 7000 });
                return;
            }

            const htmlKardex = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Kardex - ${esc(item.producto)}</title>
    <style>
        @page { size: letter landscape; margin: 8mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px 20px; color: #1e293b; background: #fff; max-width: 1050px; margin: 0 auto; }
        .header-kardex { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f5b000; padding-bottom: 10px; margin-bottom: 12px; }
        .logo-kardex { height: 50px; max-width: 220px; object-fit: contain; }
        .header-title-container { text-align: right; }
        .header-title-container h1 { margin: 0; font-size: 1.5rem; color: #123e1b; font-weight: 800; text-transform: uppercase; }
        .header-title-container p { margin: 2px 0 0 0; font-size: 0.9rem; color: #475569; font-weight: 600; }
        .info-box.full-width { border: 2px solid #a5d6a7; border-radius: 6px; padding: 8px 14px; background-color: #e8f5e9; margin-bottom: 10px; display: flex; flex-direction: column; }
        .info-box.full-width label { font-size: 0.8rem; color: #123e1b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .info-box.full-width span { font-size: 1.4rem; font-weight: 800; color: #123e1b; word-break: break-word; }
        .kardex-horizontal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-box { border: 2px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: center; }
        .info-box label { font-size: 0.78rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .info-box span { font-size: 1.15rem; font-weight: 800; color: #0f172a; word-break: break-word; }
        .print-bar { margin-bottom: 15px; display: flex; justify-content: flex-end; gap: 10px; }
        .btn-print { background-color: #123e1b; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-size: 0.9rem; font-weight: bold; cursor: pointer; }
        .btn-close { background-color: #e2e8f0; color: #334155; border: none; padding: 8px 18px; border-radius: 6px; font-size: 0.9rem; font-weight: bold; cursor: pointer; }
        @media print { .print-bar { display: none; } body { padding: 0; max-width: 100%; } .info-box, .info-box.full-width { border-color: #000; } }
    </style>
</head>
<body>
    <div class="print-bar">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir Kardex</button>
        <button class="btn-close" onclick="window.close()">Cerrar</button>
    </div>
    <div class="header-kardex">
        <div><img src="logo.png" alt="Hipergalerias Logo" class="logo-kardex" onerror="this.onerror=null; this.src='logo.jpeg';"></div>
        <div class="header-title-container">
            <h1>GALERIA HIPERMARKET 1 C.A</h1>
            <p>Ficha Kardex de Producto</p>
            <p style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Emisión: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
    </div>
    <div class="info-box full-width">
        <label>Descripción del Producto</label>
        <span>${esc(item.producto)}</span>
    </div>
    <div class="kardex-horizontal-grid">
        <div class="info-box"><label>Código de Barras</label><span>${esc(item.codBarra || 'S/C')}</span></div>
        <div class="info-box"><label>Código Interno</label><span>${esc(item.codInterno || 'S/C')}</span></div>
        <div class="info-box"><label>Departamento</label><span>${esc((item.departamento || 'GENERAL').toUpperCase())}</span></div>
        <div class="info-box"><label>Proveedor</label><span>${esc((item.proveedor || 'S/P').toUpperCase())}</span></div>
        <div class="info-box"><label>N° de Factura</label><span>${esc(item.numFactura || 'S/F')}</span></div>
        <div class="info-box"><label>N° Lote</label><span>${esc(item.lote || 'S/L')}</span></div>
        <div class="info-box"><label>Cantidad Disponible</label><span>${esc(item.cantidad || 0)} Uds.</span></div>
        <div class="info-box"><label>Fecha de Recepción</label><span>${formatearFechaMostrar(item.fechaRecepcion)}</span></div>
        <div class="info-box"><label>Fecha de Vencimiento</label><span>${formatearFechaMostrar(item.fechaVencimiento)}</span></div>
        <div class="info-box"><label>Estatus del Producto</label><span style="color: ${colores[estado.clase] || '#c62828'};">${estado.texto}</span></div>
    </div>
</body>
</html>`;

            ventanaKardex.document.write(htmlKardex);
            ventanaKardex.document.close();
        }

        function poblarSugerencias() {
            const unicos = k => [...new Set(registros.map(r => r[k]).filter(v => v && !['S/P', 'GENERAL'].includes(v)))].sort();
            $('dlDptos').innerHTML = unicos('departamento').map(v => `<option value="${esc(v)}">`).join('');
            $('dlProveedores').innerHTML = unicos('proveedor').map(v => `<option value="${esc(v)}">`).join('');
        }

        function actualizarTodo() {
            actualizarDashboard();
            actualizarTabla();
            poblarSugerencias();
        }

        /* ============ IMPORTAR / EXPORTAR ============ */
        function cargarExcel(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    if (jsonData.length === 0) {
                        toast('El archivo Excel no contiene datos.', { type: 'warn' });
                        return;
                    }

                    const nuevosRegistros = [];
                    const hoy = hoyISO();
                    let baseId = Date.now();

                    jsonData.forEach((row, index) => {
                        const keys = Object.keys(row);
                        let codBarra = "", codInterno = "", producto = "", departamento = "GENERAL", proveedor = "S/P", numFactura = "S/F", personaRecibe = "S/N", lote = "S/L", cantidad = 1, costoUnitario = 0, costoTotal = 0, fechaRecepcion = hoy, fechaVencimiento = "", observaciones = "";

                        keys.forEach(k => {
                            const kUp = k.trim().toUpperCase();
                            if (kUp.includes("BARRA") || kUp.includes("EAN") || kUp.includes("UPC")) codBarra = row[k];
                            if (kUp.includes("INT") || kUp.includes("CODIGO") || kUp.includes("SKU")) codInterno = row[k];
                            if (kUp.includes("PROD") || kUp.includes("ARTIC") || kUp.includes("DESC") || kUp.includes("NOM")) producto = row[k];
                            if (kUp.includes("DPTO") || kUp.includes("DEP") || kUp.includes("CATEG")) departamento = row[k];
                            if (kUp.includes("PROV") || kUp.includes("ORIG")) proveedor = row[k];
                            if (kUp.includes("FACT") || kUp.includes("FACTURA")) numFactura = row[k];
                            if (kUp.includes("RECIBE") || kUp.includes("RESPONSABLE")) personaRecibe = row[k];
                            if (kUp.includes("LOTE")) lote = row[k];
                            if (kUp.includes("CANT")) cantidad = parseInt(row[k]) || 1;
                            if (kUp.includes("UNIT") || kUp.includes("P.UNIT")) costoUnitario = parseFloat(row[k]) || 0;
                            if (kUp.includes("TOTAL") || kUp.includes("COSTO")) costoTotal = parseFloat(row[k]) || 0;
                            if (kUp.includes("RECEPCION")) fechaRecepcion = row[k];
                            if (kUp.includes("VENC") || kUp.includes("CADUC") || kUp.includes("EXPIR")) fechaVencimiento = row[k];
                            if (kUp.includes("OBS") || kUp.includes("NOTA")) observaciones = row[k];
                        });

                        if (!producto && keys.length > 0) producto = row[keys[0]];
                        if (costoTotal === 0 && costoUnitario > 0 && cantidad > 0) costoTotal = costoUnitario * cantidad;

                        if (producto && String(producto).trim() !== "") {
                            nuevosRegistros.push({
                                id: baseId + index,
                                codBarra: String(codBarra || codInterno || 'S/C'),
                                codInterno: String(codInterno || 'S/C'),
                                producto: String(producto),
                                departamento: String(departamento || 'GENERAL'),
                                proveedor: String(proveedor || 'S/P'),
                                numFactura: String(numFactura || 'S/F'),
                                personaRecibe: String(personaRecibe || 'S/N'),
                                lote: String(lote || 'S/L'),
                                cantidad: cantidad,
                                costoUnitario: costoUnitario,
                                costoTotal: costoTotal,
                                fechaRecepcion: normalizarFechaGuardada(fechaRecepcion || hoy),
                                fechaVencimiento: normalizarFechaGuardada(fechaVencimiento),
                                observaciones: String(observaciones || ''),
                                inhabilitado: false
                            });
                        }
                    });

                    if (nuevosRegistros.length > 0) {
                        toast(`Importando ${nuevosRegistros.length.toLocaleString()} productos…`, { type: 'info', duration: 2500 });
                        guardarDatosDB(nuevosRegistros).then(ok => {
                            if (ok) toast(`Se importaron y guardaron ${nuevosRegistros.length.toLocaleString()} productos.`);
                        });
                    } else {
                        toast('No se encontraron filas válidas en el Excel. Revisa que tenga una columna con el nombre del producto.', { type: 'warn', duration: 6000 });
                    }

                    $('excelFileInput').value = '';
                } catch (err) {
                    console.error(err);
                    toast('No se pudo leer el archivo Excel. Verifica que no esté dañado.', { type: 'error' });
                }
            };
            reader.readAsArrayBuffer(file);
        }

        function exportarRespaldoJSON() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `respaldo_recepcion_hipergalerias_${hoyISO()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            toast('Respaldo descargado.');
        }

        /* ============ TEMA ============ */
        function aplicarTema(oscuro) {
            document.body.classList.toggle('theme-dark', oscuro);
            const toggle = $('themeToggle');
            const icon = $('themeToggleIcon');
            const label = $('themeToggleLabel');
            if (!toggle) return;

            toggle.setAttribute('aria-pressed', oscuro ? 'true' : 'false');
            toggle.setAttribute('aria-label', oscuro ? 'Activar modo claro' : 'Activar modo oscuro');
            toggle.title = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
            if (icon) icon.textContent = oscuro ? '☀' : '☾';
            if (label) label.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
        }

        function inicializarTema() {
            const guardada = localStorage.getItem('hipergalerias_theme');
            const esOscuro = guardada ? guardada === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            aplicarTema(esOscuro);

            const toggle = $('themeToggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    const oscuro = !document.body.classList.contains('theme-dark');
                    aplicarTema(oscuro);
                    localStorage.setItem('hipergalerias_theme', oscuro ? 'dark' : 'light');
                });
            }
        }

        function actualizarContadorInhabilitados() {
            const total = registros.filter(item => item.inhabilitado).length;
            const el = $('contadorInhabilitados');
            if (el) el.innerText = total.toLocaleString();
        }

        /* ============ ATAJOS DE TECLADO ============ */
        document.addEventListener('keydown', e => {
            const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
            const modalAbierto = document.querySelector('.modal-overlay[style*="flex"]');

            if (e.key === 'Escape') {
                if (!$('userDropdown').hidden) cerrarUserMenu();
                else if ($('modalClaveSeguridad').style.display === 'flex') cerrarModalClave(false);
                else if ($('modalAcciones').style.display === 'flex') cerrarModal();
                else if ($('editId').value) cancelarEdicionForm();
            } else if (e.key === '/' && !enCampo && !modalAbierto) {
                e.preventDefault();
                $('inputBuscar').focus();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !modalAbierto) {
                e.preventDefault();
                $('formRecepcion').requestSubmit();
            }
        });

        /* ============ INICIO ============
           Orden a prueba de bucles:
           1) Supabase valida la sesión  -> se quita "Verificando sesión…"
           2) Se cargan los registros (Supabase)
           3) El stock (tabla stock_real de Supabase) se pide aparte, sin bloquear nada
           Cada paso está aislado con try/catch.                          */
        window.addEventListener('DOMContentLoaded', async () => {
            try { inicializarTema(); } catch (e) { console.error(e); }

            $('tablaRegistros').innerHTML = Array.from({ length: 8 }, () =>
                `<tr>${Array.from({ length: 9 }, (_, i) => `<td><span class="skel" style="width:${i === 2 ? 180 : 60}px"></span></td>`).join('')}</tr>`
            ).join('');

            $('fechaRecepcion').addEventListener('change', validarFechas);
            $('fechaCaducidad').addEventListener('change', validarFechas);
            $('btnLimpiar').addEventListener('click', () => { limpiarFiltros(); $('inputBuscar').focus(); });

            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                window.location.href = 'index.html';
                return;
            }

            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                gestionarEstadoSesion(session);

                supabaseClient.auth.onAuthStateChange((_event, s) => {
                    gestionarEstadoSesion(s);
                });
            } catch (e) {
                console.error('Error verificando sesión:', e);
            }

            try {
                await cargarDatosDB();
            } catch (e) {
                console.error('Error cargando datos:', e);
                toast('Error cargando los registros. Reintenta.', { type: 'error' });
            }
        });

        /* ===== COMPUERTA DE SESIÓN ===== */
        (function () {
            const gate = $('authGate');
            const abrir = () => { if (gate) gate.classList.add('done'); };
            const original = gestionarEstadoSesion;

            window.gestionarEstadoSesion = function (session) {
                try { original(session); } finally {
                    if (session && session.user) abrir();
                }
            };

            // Seguro anti-bucle: pase lo que pase, la pantalla de carga se quita a los 6 s
            setTimeout(abrir, 6000);
        })();
    
