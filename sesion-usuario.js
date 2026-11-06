/* sesion-usuario.js — Hipergalerias
   1) Botón "En línea" (Supabase Realtime Presence): quién está conectado ahora y en qué módulo.
   2) Cambiar contraseña (pide la actual).
   3) Cerrar mis sesiones abiertas en otros equipos.
   Se incluye en cada módulo con:  <script src="sesion-usuario.js"></script>  (antes de i18n.js) */
(function () {
  if (window.__hgSesion) return; window.__hgSesion = true;
  /* supabaseClient suele declararse con const (no cuelga de window): se lee por su nombre global */
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  if (!sb()) { console.warn('[sesion-usuario] No encontré supabaseClient (revisa conexion.js y el orden de los scripts).'); return; }
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nombreDe = u => { const m = u.user_metadata || {}; const n = m.display_name || m.full_name || (u.email || '').split('@')[0]; return n.charAt(0).toUpperCase() + n.slice(1); };
  const PAGINAS = { 'index.html': 'Panel principal', 'recepcionyfechas.html': 'Recepción de Producto', 'descuentos.html': 'Descuentos a empleados', 'recetarioycostos.html': 'Recetario y costos', 'auditoria.html': 'Auditoría', 'modulo4.html': 'TI Equipos' };
  const modulo = () => PAGINAS[location.pathname.split('/').pop() || 'index.html'] || 'Sistema';
  const hue = s => [...s].reduce((t, c) => t + c.charCodeAt(0), 0) * 47 % 360;

  let canal = null, uid = null, yo = null, wrap = null, vigia = null;

  /* ---------- estilos (se adaptan a modo claro/oscuro de cualquier módulo) ---------- */
  const st = document.createElement('style');
  st.textContent = `
  .hg{--bg:#fff;--tx:#17231b;--mu:#5d6f63;--ln:#dfe6e0;--hv:#e8f4ec;--ok:#22c55e}
  body.dark .hg,body.dark-mode .hg,body.theme-dark .hg,[data-theme=dark] .hg{--bg:#121e19;--tx:#e8f2ec;--mu:#9bb2a5;--ln:#233a30;--hv:#163a28}
  .hg-wrap{position:relative;display:inline-block}
  .hg-wrap[hidden]{display:none}
  .hg-btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--ln);background:var(--bg);color:var(--tx);font-weight:700;font-size:.82rem;font-family:inherit;cursor:pointer;transition:border-color .2s,box-shadow .2s}
  .hg-btn:hover{border-color:var(--ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 20%,transparent)}
  .hg-dot{width:9px;height:9px;border-radius:50%;background:var(--ok);animation:hgp 2s infinite}
  @keyframes hgp{50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--ok) 0%,transparent);opacity:.7}0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 55%,transparent)}}
  .hg-pop{position:absolute;right:0;top:calc(100% + 10px);z-index:9000;width:310px;max-width:calc(100vw - 24px);background:var(--bg);color:var(--tx);border:1px solid var(--ln);border-radius:16px;box-shadow:0 18px 44px rgba(0,0,0,.28);padding:8px;animation:hgi .2s ease}
  .hg-pop[hidden]{display:none}
  @keyframes hgi{from{opacity:0;transform:translateY(-6px) scale(.98)}}
  .hg-h{padding:8px 10px;font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}
  .hg-l{max-height:46vh;overflow:auto}
  .hg-r{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px}
  .hg-r:hover{background:var(--hv)}
  .hg-av{position:relative;flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;background:hsl(var(--h) 55% 42%)}
  .hg-av:after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:var(--ok);border:2px solid var(--bg)}
  .hg-r b{display:block;font-size:.88rem}.hg-r small{display:block;color:var(--mu);font-size:.74rem}
  .hg-s{height:1px;background:var(--ln);margin:6px 4px}
  .hg-a{display:flex;width:100%;align-items:center;gap:8px;padding:10px;border:0;background:none;border-radius:10px;color:var(--tx);font-weight:600;font-size:.84rem;font-family:inherit;text-align:left;cursor:pointer}
  .hg-a:hover{background:var(--hv)}
  .hg-ov{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:16px;background:rgba(8,20,13,.6);backdrop-filter:blur(4px)}
  .hg-c{width:400px;max-width:100%;background:var(--bg);color:var(--tx);border-radius:16px;border-top:5px solid #f4b400;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.4);animation:hgi .25s ease}
  .hg-c h3{margin:0 0 4px}.hg-c p{margin:0 0 14px;color:var(--mu);font-size:.84rem}
  .hg-c label{display:block;margin:10px 0 4px;font-size:.78rem;font-weight:700}
  .hg-c input{width:100%;padding:11px 12px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit}
  .hg-c input:focus{outline:2px solid var(--ok);outline-offset:0}
  .hg-e{min-height:1.2em;margin-top:10px;color:#dc2626;font-size:.8rem;font-weight:600}
  .hg-f{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
  .hg-f button{border:0;border-radius:999px;padding:9px 18px;font-weight:700;font-size:.84rem;font-family:inherit;cursor:pointer;background:#166534;color:#fff}
  .hg-f button.o{background:none;color:var(--tx);border:1px solid var(--ln)}.hg-f button:disabled{opacity:.6;cursor:wait}
  @media(prefers-reduced-motion:reduce){.hg-dot,.hg-pop,.hg-c{animation:none}}`;
  document.head.appendChild(st);

  /* ---------- botón y panel "En línea" ---------- */
  function montar() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.className = 'hg hg-wrap';
    wrap.innerHTML = `<button type="button" class="hg-btn" aria-haspopup="true" aria-expanded="false"><span class="hg-dot"></span>En línea <b id="hgN">0</b></button>
      <div class="hg-pop" hidden role="menu"><div class="hg-h">En línea ahora</div><div class="hg-l" id="hgL"></div><div class="hg-s"></div>
      <button class="hg-a" data-a="pass">🔑 Cambiar mi contraseña</button><button class="hg-a" data-a="otras">🖥️ Cerrar mis sesiones en otros equipos</button></div>`;
    const ancla = $('#userMenu') || $('#userAuthContainer');
    if (ancla) ancla.parentNode.insertBefore(wrap, ancla); else ($('.hr') || $('.header-actions') || $('.hright') || $('header') || document.body).appendChild(wrap);
    const pop = $('.hg-pop', wrap), btn = $('.hg-btn', wrap);
    btn.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', !pop.hidden); };
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') pop.hidden = true; });
    pop.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; pop.hidden = true; a.dataset.a === 'pass' ? abrirPass() : cerrarOtras(); });
  }

  function pintar() {
    if (!canal || !wrap) return;
    const filas = Object.entries(canal.presenceState()).map(([id, metas]) => ({
      id, nombre: metas[0].nombre, equipos: metas.length,
      mods: [...new Set(metas.map(m => m.modulo))].join(' · '),
      desde: metas.map(m => m.desde).sort()[0]
    })).sort((a, b) => (b.id === uid) - (a.id === uid) || a.nombre.localeCompare(b.nombre, 'es'));
    $('#hgN', wrap).textContent = filas.length;
    $('#hgL', wrap).innerHTML = filas.map(f => `<div class="hg-r"><span class="hg-av" style="--h:${hue(f.nombre)}">${esc(f.nombre.charAt(0))}</span>
      <div><b>${esc(f.nombre)}${f.id === uid ? ' (tú)' : ''}</b><small>${esc(f.mods)} · desde ${new Date(f.desde).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}${f.equipos > 1 ? ' · ' + f.equipos + ' pestañas/equipos' : ''}</small></div></div>`).join('')
      || '<div class="hg-h">Nadie conectado</div>';
  }

  function iniciar(user) {
    if (uid === user.id && canal) return;
    console.info('[sesion-usuario] activo para', user.email);
    detener(); montar(); uid = user.id; yo = user; wrap.hidden = false;
    canal = sb().channel('hg-en-linea', { config: { presence: { key: user.id } } });
    canal.on('presence', { event: 'sync' }, pintar).subscribe(async s => {
      if (s === 'SUBSCRIBED') await canal.track({ nombre: nombreDe(user), email: user.email, modulo: modulo(), desde: new Date().toISOString() });
    });
    
  }
  function detener() {
    if (canal) { sb().removeChannel(canal); canal = null; }
    clearInterval(vigia); uid = null; yo = null; if (wrap) wrap.hidden = true;
  }

  /* ---------- si cerraron esta sesión desde otro equipo ---------- */
  async function verificarSesion() {
    if (document.hidden || !uid) return;
    const { error } = await sb().auth.getUser();
    if (error && (error.status === 401 || error.status === 403 || ['session_not_found', 'bad_jwt', 'user_not_found'].includes(error.code))) {
      detener(); await sb().auth.signOut({ scope: 'local' }).catch(() => { });
      alert('Tu sesión fue cerrada desde otro equipo. Inicia sesión de nuevo.'); location.href = 'index.html';
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarSesion(); });

  /* ---------- cerrar mis otras sesiones ---------- */
  async function cerrarOtras(silencioso) {
    if (!silencioso && !confirm('¿Cerrar tu sesión en todos los demás equipos?\nEste equipo seguirá conectado.')) return;
    const { error } = await sb().auth.signOut({ scope: 'others' });
    alert(error ? 'No se pudo cerrar las otras sesiones: ' + error.message : '✅ Listo. Tus sesiones en otros equipos se cerrarán en menos de un minuto.');
  }

  /* ---------- cambiar contraseña ---------- */
  function abrirPass() {
    const ov = document.createElement('div'); ov.className = 'hg hg-ov';
    ov.innerHTML = `<form class="hg-c" autocomplete="off"><h3>🔑 Cambiar contraseña</h3><p>${esc(yo.email || '')}</p>
      <label>Contraseña actual</label><input type="password" id="hgP0" autocomplete="current-password" required>
      <label>Nueva contraseña (mínimo 8 caracteres)</label><input type="password" id="hgP1" autocomplete="new-password" minlength="8" required>
      <label>Repite la nueva contraseña</label><input type="password" id="hgP2" autocomplete="new-password" minlength="8" required>
      <div class="hg-e" id="hgE" role="alert"></div>
      <div class="hg-f"><button type="button" class="o" id="hgX">Cancelar</button><button type="submit" id="hgOk">Guardar</button></div></form>`;
    document.body.appendChild(ov);
    const cerrar = () => ov.remove(), err = t => $('#hgE', ov).textContent = t;
    $('#hgX', ov).onclick = cerrar; ov.addEventListener('mousedown', e => { if (e.target === ov) cerrar(); });
    setTimeout(() => $('#hgP0', ov).focus(), 50);
    $('form', ov).onsubmit = async e => {
      e.preventDefault(); err('');
      const a = $('#hgP0', ov).value, n = $('#hgP1', ov).value, r = $('#hgP2', ov).value, ok = $('#hgOk', ov);
      if (n.length < 8) return err('La nueva contraseña debe tener al menos 8 caracteres.');
      if (n !== r) return err('Las contraseñas nuevas no coinciden.');
      if (n === a) return err('La nueva contraseña debe ser distinta de la actual.');
      ok.disabled = true; ok.textContent = 'Verificando…';
      try {
        /* Se comprueba la contraseña actual con un cliente aparte (no toca tu sesión) */
        const c = window.supabase.createClient(sb().supabaseUrl, sb().supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const v = await c.auth.signInWithPassword({ email: yo.email, password: a });
        if (v.error) { err('La contraseña actual es incorrecta.'); return; }
        await c.auth.signOut().catch(() => { });
        const { error } = await sb().auth.updateUser({ password: n });
        if (error) { err('No se pudo cambiar: ' + error.message); return; }
        cerrar(); alert('✅ Contraseña actualizada.');
        if (confirm('¿Quieres cerrar también tus sesiones abiertas en otros equipos?')) cerrarOtras(true);
      } catch (x) { err('Error: ' + (x.message || x)); }
      finally { ok.disabled = false; ok.textContent = 'Guardar'; }
    };
  }

  /* ---------- arranque ---------- */
  sb().auth.getSession().then(({ data: { session } }) => { if (session) iniciar(session.user); });
  sb().auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT' || !s) detener(); else if (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') setTimeout(() => iniciar(s.user), 0); });
})();