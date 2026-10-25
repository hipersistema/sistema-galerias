/* analisis.js — Pestaña "Análisis" para descuentos.html
   Uso: <script src="analisis.js"></script> justo ANTES de <script src="i18n.js"></script>
   No toca tu código: se engancha a window.descuentos / window.empleados. */
(function () {
  const g = id => document.getElementById(id);
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const money = n => '$' + n.toFixed(2);
  const dmy = f => f ? f.split('-').reverse().join('/') : '';

  /* ---------- estilos ---------- */
  const st = document.createElement('style');
  st.textContent = `
  .an-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
  .an-chip{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:99px;padding:7px 14px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:inherit;transition:all .2s var(--ease)}
  .an-chip:hover{border-color:var(--g);background:var(--gbg)}
  .an-chip.on{background:var(--gd);color:#fff;border-color:var(--gd)}
  [data-theme=dark] .an-chip.on{background:var(--g)}
  .an-2{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:20px;align-items:start}
  #tab-analisis,#tab-analisis .card{min-width:0;max-width:100%}
  @media(max-width:1100px){.an-2{grid-template-columns:minmax(0,1fr)}}
  .an-2 .tw table{font-size:.8rem}
  .an-2 .tw th,.an-2 .tw td{white-space:normal;padding:8px 9px}
  .an-2 .tw th:nth-child(n+3),.an-2 .tw td:nth-child(n+3){white-space:nowrap}
  .an-bw{flex:1;width:100%;display:flex;align-items:flex-end;min-height:0}
  @media(max-width:600px){.an-chart{height:190px!important}.an-chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}.an-chip{flex:none}.an-2 .tw th,.an-2 .tw td{padding:8px}}
  .an-chart{display:flex;align-items:flex-end;gap:6px;height:230px;overflow-x:auto;padding:10px 4px 0;border-bottom:1px solid var(--line)}
  .an-col{flex:1 0 38px;max-width:90px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}
  .an-bar{width:100%;background:linear-gradient(180deg,var(--g),var(--gd));border-radius:6px 6px 0 0;min-height:2px;transition:height .5s var(--ease)}
  .an-col small{font-size:.66rem;color:var(--muted);white-space:nowrap}
  .an-col b{font-size:.68rem;color:var(--title)}
  .an-lbls{display:flex;gap:6px;overflow-x:auto;padding:6px 4px 0}
  .an-lbls span{flex:0 0 auto;min-width:34px;text-align:center;font-size:.66rem;color:var(--muted);white-space:nowrap}
  tr.an-click{cursor:pointer}
  tr.an-click.an-fijo{cursor:text}
  #anTblEmp td,#anTblProd td{user-select:text}
  .an-bar.top{background:linear-gradient(180deg,var(--y),#c98a00)}
  .an-d{display:block;font-style:normal;font-size:.7rem;font-weight:700;margin-top:2px}
  .an-d.up{color:#16a34a}.an-d.dn{color:#e53935}
  .an-wd{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:14px}
  .an-w{border-radius:10px;padding:8px 2px;text-align:center;border:1px solid var(--line);background:rgba(46,125,50,calc(.06 + var(--a) * .55))}
  .an-w small{display:block;color:var(--muted);font-size:.68rem;font-weight:700}
  .an-w b{color:var(--title);font-size:.85rem}
  .an-rk{font-size:1.15rem;text-align:center;width:40px}
  .an-who{display:flex;align-items:center;gap:10px}
  .an-av{flex:none;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--g),var(--gd));color:#fff;display:grid;place-items:center;font-weight:800}
  .an-2 .tw td.an-prods{white-space:normal;min-width:180px;font-size:.78rem;line-height:1.4}
  #anTblEmp td:first-child{min-width:150px}
  .an-inline{display:inline-block;height:8px;border-radius:4px;background:var(--g);vertical-align:middle;margin-left:8px}
  `;
  document.head.appendChild(st);

  /* ---------- pestaña + panel ---------- */
  const nav = document.querySelector('nav.tabs');
  const btn = document.createElement('button');
  btn.className = 'tab'; btn.dataset.tab = 'analisis'; btn.textContent = '📊 Análisis';
  nav.appendChild(btn);
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === btn));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-analisis'));
    render();
  };

  const panel = document.createElement('div');
  panel.id = 'tab-analisis'; panel.className = 'panel';
  panel.innerHTML = `
  <div class="card">
    <div class="shead"><h3>📊 Análisis de consumo</h3>
      <div class="row"><button class="btn btn-gray btn-sm" id="anLimpiar">🧹 Limpiar filtros</button>
      <button class="btn btn-dark btn-sm" id="anExcel">📥 Exportar Excel</button></div></div>
    <div class="an-chips" id="anChips">
      <button class="an-chip" data-p="hoy">Hoy</button><button class="an-chip" data-p="ayer">Ayer</button>
      <button class="an-chip" data-p="semana">Esta semana</button><button class="an-chip" data-p="7d">Últimos 7 días</button>
      <button class="an-chip" data-p="mes">Este mes</button><button class="an-chip" data-p="30d">Últimos 30 días</button>
      <button class="an-chip" data-p="anio">Este año</button><button class="an-chip" data-p="todo">Todo</button>
    </div>
    <div class="grid">
      <div class="f"><label for="anDesde">Desde</label><input type="date" id="anDesde"></div>
      <div class="f"><label for="anHasta">Hasta</label><input type="date" id="anHasta"></div>
      <div class="f wide"><label for="anProd">Producto (nombre o código)</label><input id="anProd" list="anProdList" placeholder="Ej: pan, 759..." autocomplete="off"><datalist id="anProdList"></datalist></div>
      <div class="f wide"><label for="anEmp">Empleado (nombre o cédula)</label><input id="anEmp" placeholder="Buscar empleado..." autocomplete="off"></div>
      <div class="f"><label for="anCargo">Cargo</label><select id="anCargo"><option value="">Todos</option></select></div>
      <div class="f"><label for="anEstatus">Estatus</label><select id="anEstatus"><option value="">Todos</option><option value="pend">Pendiente</option><option value="par">Parcial</option><option value="liq">Liquidado</option></select></div>
    </div>
  </div>
  <section class="stats" id="anKpis"></section>
  <div class="card">
    <div class="shead"><h3 id="anSerieTit">📈 Evolución</h3>
      <div class="row"><label for="anGran">Agrupar por</label>
        <select id="anGran" style="width:auto"><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option><option value="anio">Año</option></select>
        <select id="anMetrica" style="width:auto"><option value="uni">Unidades</option><option value="monto">Monto ($)</option></select></div></div>
    <div class="an-chart" id="anChart"></div>
    <div class="an-wd" id="anWd"></div>
  </div>
  <div class="an-2">
    <div class="card"><div class="shead"><h3>👥 Quién se lo llevó</h3><span class="count" id="anCntEmp">0</span></div>
      <div class="tw"><table><thead><tr><th>Empleado</th><th>Producto(s)</th><th>Unid.</th><th>Monto</th><th>Última vez</th></tr></thead><tbody id="anTblEmp"></tbody></table></div>
      <p style="color:var(--muted);font-size:.78rem;margin:10px 0 0">Haz clic en una fila para filtrar por ese empleado.</p></div>
    <div class="card"><div class="shead"><h3>🛒 Productos más movidos</h3><span class="count" id="anCntProd">0</span></div>
      <div class="tw"><table><thead><tr><th>Producto</th><th>Código</th><th>Unid.</th><th>Monto</th><th>Empleados</th></tr></thead><tbody id="anTblProd"></tbody></table></div>
      <p style="color:var(--muted);font-size:.78rem;margin:10px 0 0">Haz clic en una fila para filtrar por ese producto.</p></div>
  </div>`;
  document.querySelector('main').appendChild(panel);

  /* ---------- rangos rápidos ---------- */
  function preset(p) {
    const t = new Date(), h = iso(t); let d = h, gr = 'dia';
    const back = n => { const x = new Date(t); x.setDate(x.getDate() - n); return iso(x); };
    if (p === 'ayer') d = back(1);
    else if (p === 'semana') { const x = new Date(t); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); d = iso(x); }
    else if (p === '7d') d = back(6);
    else if (p === 'mes') d = h.slice(0, 8) + '01';
    else if (p === '30d') d = back(29);
    else if (p === 'anio') { d = h.slice(0, 4) + '-01-01'; gr = 'mes'; }
    else if (p === 'todo') { g('anDesde').value = ''; g('anHasta').value = ''; g('anGran').value = 'mes'; return marcar(p); }
    g('anDesde').value = d; g('anHasta').value = p === 'ayer' ? d : h; g('anGran').value = gr; marcar(p);
  }
  function marcar(p) { document.querySelectorAll('.an-chip').forEach(c => c.classList.toggle('on', c.dataset.p === p)); }

  /* ---------- datos ---------- */
  function filtrar(ov) {
    const d = ov ? ov.d : g('anDesde').value, h = ov ? ov.h : g('anHasta').value, p = norm(g('anProd').value), e = norm(g('anEmp').value),
      c = g('anCargo').value, s = g('anEstatus').value;
    const cargo = new Map(window.empleados.map(x => [String(x.cedula), x.cargo]));
    const out = [];
    window.descuentos.forEach(it => {
      const f = fechaISO(it.fecha); if (!f) return;
      if ((d && f < d) || (h && f > h)) return;
      const desc = it.descripcionArticulo || parseProducto(it.producto).desc;
      let cod = it.codigoArticulo; if (!cod || cod === 'S/C') cod = buscarCodigo(desc);
      if (p && !norm(desc + ' ' + cod).includes(p)) return;
      if (e && !norm(it.nombreEmpleado + ' ' + it.cedula).includes(e)) return;
      const cg = cargo.get(String(it.cedula)) || 'N/D';
      if (c && cg !== c) return;
      const est = num(it.saldoPendiente) <= .01 ? 'liq' : num(it.abonado) > .01 ? 'par' : 'pend';
      if (s && est !== s) return;
      out.push({ f, est, abon: num(it.abonado), desc, cod, cant: parseInt(it.cantidad) || 1, monto: num(it.totalADeber), saldo: num(it.saldoPendiente), ced: String(it.cedula || '').trim(), nom: it.nombreEmpleado, cargo: cg });
    });
    return out;
  }
  function agrupar(rows, keyFn) {
    const m = new Map();
    rows.forEach(r => {
      const k = keyFn(r); let o = m.get(k);
      if (!o) { o = { k, uni: 0, monto: 0, emps: new Set(), ult: '', r }; m.set(k, o); }
      o.uni += r.cant; o.monto += r.monto; o.emps.add(r.ced); if (r.f > o.ult) o.ult = r.f;
    });
    return [...m.values()];
  }
  function bucket(f, gr) {
    if (gr === 'dia') return f; if (gr === 'mes') return f.slice(0, 7); if (gr === 'anio') return f.slice(0, 4);
    const [y, m, d] = f.split('-').map(Number), dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); return iso(dt);
  }
  function etiqueta(k, gr) {
    if (gr === 'dia') return k.slice(8) + '/' + k.slice(5, 7);
    if (gr === 'semana') return 'S ' + k.slice(8) + '/' + k.slice(5, 7);
    if (gr === 'mes') return k.slice(5) + '/' + k.slice(2, 4);
    return k;
  }

  /* ---------- render ---------- */
  let cache = { emp: [], prod: [], serie: [] };
  function render() {
    if (!g('tab-analisis').classList.contains('active')) return;
    // listas dinámicas
    const cargos = [...new Set(window.empleados.map(e => e.cargo))].sort(), cs = g('anCargo'), cv = cs.value;
    if (cs.options.length !== cargos.length + 1) { cs.innerHTML = '<option value="">Todos</option>' + cargos.map(c => '<option>' + esc(c) + '</option>').join(''); cs.value = cv; }
    const dl = g('anProdList'), nombres = [...new Set(window.descuentos.map(d => d.descripcionArticulo || parseProducto(d.producto).desc))].sort();
    if (dl.options.length !== nombres.length) dl.innerHTML = nombres.map(n => '<option value="' + esc(n) + '">').join('');

    const rows = filtrar(), gr = g('anGran').value, met = g('anMetrica').value;
    const uni = rows.reduce((a, r) => a + r.cant, 0), monto = rows.reduce((a, r) => a + r.monto, 0), saldo = rows.reduce((a, r) => a + r.saldo, 0);
    const nEmp = new Set(rows.map(r => r.ced)).size, nProd = new Set(rows.map(r => r.desc)).size;
    let prev = null; const D = g('anDesde').value, H = g('anHasta').value;
    if (D && H) {
      const a = new Date(D + 'T00:00:00'), b = new Date(H + 'T00:00:00'), n = Math.round((b - a) / 864e5) + 1;
      const pe = new Date(a); pe.setDate(pe.getDate() - 1); const ps = new Date(pe); ps.setDate(ps.getDate() - n + 1);
      const pr = filtrar({ d: iso(ps), h: iso(pe) });
      prev = { uni: pr.reduce((x, r) => x + r.cant, 0), monto: pr.reduce((x, r) => x + r.monto, 0) };
    }
    const delta = (v, q) => { if (!prev || !q) return ''; const x = (v - q) / q * 100; return '<em class="an-d ' + (x >= 0 ? 'up' : 'dn') + '">' + (x >= 0 ? '▲ ' : '▼ ') + Math.abs(x).toFixed(0) + '% vs período anterior</em>'; };
    const kp = (i, l, v, x) => '<div class="stat"><i>' + i + '</i><div><small>' + l + '</small><b>' + v + '</b>' + (x || '') + '</div></div>';
    g('anKpis').innerHTML = kp('📦', 'Unidades', uni, delta(uni, prev && prev.uni)) + kp('💵', 'Monto asignado', money(monto), delta(monto, prev && prev.monto)) + kp('👥', 'Empleados', nEmp) + kp('🛒', 'Productos distintos', nProd) + kp('💰', 'Por cobrar', money(saldo));

    // serie temporal
    const serie = agrupar(rows, r => bucket(r.f, gr)).sort((a, b) => a.k.localeCompare(b.k));
    const val = o => met === 'uni' ? o.uni : o.monto, mx = Math.max(1, ...serie.map(val));
    g('anSerieTit').textContent = '📈 ' + (g('anProd').value ? 'Evolución de "' + g('anProd').value + '"' : 'Evolución general');
    g('anChart').innerHTML = serie.length ? serie.map(o => '<div class="an-col" title="' + esc(o.k) + ': ' + o.uni + ' unid. · ' + money(o.monto) + '"><b>' + (met === 'uni' ? o.uni : o.monto.toFixed(0)) + '</b><div class="an-bw"><div class="an-bar' + (val(o) === mx ? ' top' : '') + '" style="height:' + Math.max(2, val(o) / mx * 100) + '%"></div></div><small>' + etiqueta(o.k, gr) + '</small></div>').join('') : '<div class="empty" style="margin:auto;color:var(--muted)">Sin datos para este filtro.</div>';

    // mapa por día de la semana
    const wd = [0, 0, 0, 0, 0, 0, 0];
    rows.forEach(r => { const [y, m, d] = r.f.split('-').map(Number); wd[(new Date(y, m - 1, d).getDay() + 6) % 7] += met === 'uni' ? r.cant : r.monto; });
    const wm = Math.max(1, ...wd);
    g('anWd').innerHTML = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((n, k) => '<div class="an-w" style="--a:' + (wd[k] / wm).toFixed(2) + '" title="' + n + ': ' + (met === 'uni' ? wd[k] : money(wd[k])) + '"><small>' + n + '</small><b>' + (met === 'uni' ? wd[k] : wd[k].toFixed(0)) + '</b></div>').join('');

    // empleados (con los productos que se llevó cada uno)
    const emp = agrupar(rows, r => r.ced).sort((a, b) => b.uni - a.uni), em = Math.max(1, ...emp.map(o => o.uni));
    const porEmp = new Map();
    rows.forEach(r => { let m = porEmp.get(r.ced); if (!m) porEmp.set(r.ced, m = new Map()); m.set(r.desc, (m.get(r.desc) || 0) + r.cant); });
    const lista = c => { const a = [...porEmp.get(c)].sort((x, y) => y[1] - x[1]); return a.slice(0, 4).map(([n, q]) => esc(n) + ' <b>×' + q + '</b>').join(' · ') + (a.length > 4 ? ' <small style="color:var(--muted)">+' + (a.length - 4) + ' más</small>' : ''); };
    g('anCntEmp').textContent = emp.length;
    g('anTblEmp').innerHTML = emp.length ? emp.slice(0, 100).map(o => '<tr class="an-click' + (g('anEmp').value.trim() === String(o.r.ced) ? ' an-fijo' : '') + '" data-emp="' + esc(o.r.ced) + '"><td><strong>' + esc(o.r.nom) + '</strong><br><small style="color:var(--muted)">' + esc(o.r.ced) + ' · ' + esc(o.r.cargo) + '</small></td><td class="an-prods">' + lista(o.r.ced) + '</td><td><strong>' + o.uni + '</strong></td><td>' + money(o.monto) + '</td><td>' + dmy(o.ult) + '</td></tr>').join('') : '<tr><td colspan="5" class="empty">Nadie coincide.</td></tr>';

    // productos
    const prod = agrupar(rows, r => r.desc.toLowerCase()).sort((a, b) => b.uni - a.uni), pm = Math.max(1, ...prod.map(o => o.uni));
    g('anCntProd').textContent = prod.length;
    g('anTblProd').innerHTML = prod.length ? prod.slice(0, 100).map(o => '<tr class="an-click' + (norm(g('anProd').value) === norm(o.r.desc) ? ' an-fijo' : '') + '" data-prod="' + esc(o.r.desc) + '"><td><strong>' + esc(o.r.desc) + '</strong></td><td><code>' + esc(o.r.cod) + '</code></td><td><strong>' + o.uni + '</strong><span class="an-inline" style="width:' + (o.uni / pm * 60) + 'px"></span></td><td>' + money(o.monto) + '</td><td>' + o.emps.size + '</td></tr>').join('') : '<tr><td colspan="5" class="empty">Sin productos.</td></tr>';

    cache = { emp, prod, serie, gr };
  }

  /* ---------- eventos ---------- */
  let tm; const dif = () => { clearTimeout(tm); tm = setTimeout(render, 200); };
  ['anProd', 'anEmp'].forEach(id => g(id).addEventListener('input', dif));
  ['anDesde', 'anHasta'].forEach(id => g(id).addEventListener('change', () => { marcar(''); render(); }));
  ['anCargo', 'anEstatus', 'anGran', 'anMetrica'].forEach(id => g(id).addEventListener('change', render));
  g('anChips').addEventListener('click', e => { const b = e.target.closest('.an-chip'); if (b) { preset(b.dataset.p); render(); } });
  g('anLimpiar').onclick = () => { ['anProd', 'anEmp', 'anCargo', 'anEstatus'].forEach(i => g(i).value = ''); preset('mes'); render(); };
  g('anTblEmp').addEventListener('click', e => { const r = e.target.closest('tr[data-emp]'); if (r && g('anEmp').value.trim() !== r.dataset.emp) { g('anEmp').value = r.dataset.emp; render(); } });
  g('anTblProd').addEventListener('click', e => { const r = e.target.closest('tr[data-prod]'); if (r && norm(g('anProd').value) !== norm(r.dataset.prod)) { g('anProd').value = r.dataset.prod; render(); } });

  g('anExcel').onclick = () => {
    if (typeof XLSX === 'undefined') return toast('Librería Excel no disponible', true);
    const rows = filtrar().sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'es') || a.f.localeCompare(b.f) || a.desc.localeCompare(b.desc, 'es'));
    if (!rows.length) return toast('No hay datos para exportar', true);
    const ET = { pend: 'Pendiente', par: 'Parcial', liq: 'Liquidado' }, sum = (l, f) => +l.reduce((a, r) => a + f(r), 0).toFixed(2);
    const wb = XLSX.utils.book_new();
    const add = (n, a, w, filtro) => {
      const ws = XLSX.utils.aoa_to_sheet(a); ws['!cols'] = w.map(x => ({ wch: x }));
      if (filtro) ws['!autofilter'] = { ref: filtro };
      XLSX.utils.book_append_sheet(wb, ws, n);
    };
    // 1) Detalle: una fila por producto que se llevó cada empleado
    add('Detalle', [['Fecha', 'Cédula', 'Empleado', 'Cargo', 'Código', 'Producto', 'Cantidad', 'Monto ($)', 'Abonado ($)', 'Saldo ($)', 'Estatus']]
      .concat(rows.map(r => [dmy(r.f), r.ced, r.nom, r.cargo, r.cod, r.desc, r.cant, +r.monto.toFixed(2), +r.abon.toFixed(2), +r.saldo.toFixed(2), ET[r.est]]))
      .concat([['', '', '', '', '', 'TOTAL', sum(rows, r => r.cant), sum(rows, r => r.monto), sum(rows, r => r.abon), sum(rows, r => r.saldo), '']]),
      [11, 12, 34, 22, 16, 40, 10, 11, 12, 11, 12], 'A1:K' + (rows.length + 1));
    // 2) Por empleado: todo lo que se llevó, en una sola celda
    const emp = agrupar(rows, r => r.ced).sort((a, b) => String(a.r.nom).localeCompare(String(b.r.nom), 'es'));
    const pe = new Map(); rows.forEach(r => { let m = pe.get(r.ced); if (!m) pe.set(r.ced, m = new Map()); m.set(r.desc, (m.get(r.desc) || 0) + r.cant); });
    add('Por empleado', [['Cédula', 'Empleado', 'Cargo', 'Productos que se llevó', 'Unidades', 'Monto ($)', 'Última vez']]
      .concat(emp.map(o => [o.r.ced, o.r.nom, o.r.cargo, [...pe.get(o.r.ced)].map(([n, q]) => n + ' (x' + q + ')').join('; '), o.uni, +o.monto.toFixed(2), dmy(o.ult)])),
      [12, 34, 22, 70, 10, 11, 12], 'A1:G' + (emp.length + 1));
    // 3) Por producto: quién se lo llevó
    const pp = new Map(); rows.forEach(r => { const k = r.desc.toLowerCase(); let m = pp.get(k); if (!m) pp.set(k, m = new Map()); m.set(r.nom, (m.get(r.nom) || 0) + r.cant); });
    const prod = agrupar(rows, r => r.desc.toLowerCase()).sort((a, b) => b.uni - a.uni);
    add('Por producto', [['Producto', 'Código', 'Unidades', 'Monto ($)', 'Empleados', 'Quién se lo llevó']]
      .concat(prod.map(o => [o.r.desc, o.r.cod, o.uni, +o.monto.toFixed(2), o.emps.size, [...pp.get(o.r.desc.toLowerCase())].map(([n, q]) => n + ' (x' + q + ')').join('; ')])),
      [40, 16, 10, 11, 10, 80], 'A1:F' + (prod.length + 1));
    // 4) Evolución
    const gr = g('anGran').value;
    add('Evolución', [['Periodo', 'Unidades', 'Monto ($)']].concat(agrupar(rows, r => bucket(r.f, gr)).sort((a, b) => a.k.localeCompare(b.k)).map(o => [etiqueta(o.k, gr), o.uni, +o.monto.toFixed(2)])), [14, 10, 11]);
    // 5) Filtros usados
    add('Filtros', [['Filtro', 'Valor'], ['Desde', dmy(g('anDesde').value) || 'Todo'], ['Hasta', dmy(g('anHasta').value) || 'Todo'], ['Producto', g('anProd').value || 'Todos'], ['Empleado', g('anEmp').value || 'Todos'],
      ['Cargo', g('anCargo').value || 'Todos'], ['Estatus', ET[g('anEstatus').value] || 'Todos'], ['Generado', new Date().toLocaleString('es-VE')]], [14, 40]);
    XLSX.writeFile(wb, 'analisis_descuentos_' + iso(new Date()) + '.xlsx');
  };

  /* ---------- engancharse al refresco del módulo ---------- */
  const orig = window.actualizarContadoresYTablas;
  if (typeof orig === 'function') window.actualizarContadoresYTablas = function () { orig.apply(this, arguments); render(); };
  preset('mes');
})();