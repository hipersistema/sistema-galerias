/* usuarios-admin.js — "Crear usuario" en el menú de usuario de todos los módulos.
   Se carga justo después de conexion.js. Solo aparece si perfiles.rol === 'admin'.
   La seguridad real está en la Edge Function 'crear-usuario' (el botón oculto es solo comodidad). */
(function () {
  const DOMINIO = '@hipermarket.com';
  let esAdmin = false, modal = null;

  const css = `
.cu-ov{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:16px;background:rgba(8,20,12,.55);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s}
.cu-ov.on{opacity:1;pointer-events:auto}
.cu-card{position:relative;overflow:hidden;width:100%;max-width:420px;max-height:94vh;overflow-y:auto;padding:34px 32px 22px;background:#fff;color:#1f2937;border:1px solid #e2e8f0;border-radius:22px;box-shadow:0 30px 60px -15px rgba(0,0,0,.45);transform:translateY(18px) scale(.97);transition:transform .35s cubic-bezier(.22,.8,.3,1);font-family:'Inter',system-ui,sans-serif}
.cu-ov.on .cu-card{transform:none}
.cu-card:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#22a24f,#f5b000,#22a24f)}
.cu-card:after{content:"";position:absolute;left:50%;top:-130px;width:280px;height:280px;transform:translateX(-50%);background:radial-gradient(circle,rgba(34,162,79,.25),transparent 70%);pointer-events:none}
.cu-card>*{position:relative;z-index:1}
.cu-card.shake{animation:cu-shake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes cu-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}
.cu-logo{width:76px;height:76px;margin:0 auto 14px;display:grid;place-items:center;border-radius:50%;background:#fff;border:3px solid #f5b000;box-shadow:0 12px 26px -10px rgba(0,0,0,.45),0 0 0 7px rgba(34,162,79,.14)}
.cu-logo img{width:56px;height:56px;object-fit:contain}
.cu-card h3{margin:0 0 4px;text-align:center;font-size:1.4rem;font-weight:800;letter-spacing:-.02em;color:inherit}
.cu-card .cu-sub{margin:0 0 22px;text-align:center;font-size:.88rem;color:#64748b}
.cu-g{margin-bottom:14px}
.cu-g label{display:block;margin-bottom:6px;font-size:.82rem;font-weight:600;opacity:.85}
.cu-f{position:relative;display:flex;align-items:center}
.cu-f .cu-ico{position:absolute;left:14px;color:#64748b;pointer-events:none}
.cu-f input{width:100%;padding:13px 14px 13px 44px;font:inherit;font-size:.92rem;color:inherit;background:#f4f6f8;border:1px solid #e2e8f0;border-radius:12px;transition:border-color .2s,box-shadow .2s}
.cu-f input:focus{outline:none;border-color:#22a24f;box-shadow:0 0 0 4px rgba(34,162,79,.22)}
.cu-ghost{position:absolute;left:45px;right:12px;overflow:hidden;white-space:pre;pointer-events:none;font:inherit;font-size:.92rem;color:#9aa5b1}
.cu-ghost i{font-style:normal;visibility:hidden}
.cu-f.pw input{padding-right:48px}
.cu-eye{position:absolute;right:8px;width:34px;height:34px;display:grid;place-items:center;border:0;background:transparent;color:#64748b;border-radius:8px;cursor:pointer}
.cu-eye:hover{background:rgba(34,162,79,.12)}
.cu-msg{display:none;margin:2px 0 12px;padding:10px 12px;font-size:.82rem;font-weight:600;line-height:1.35;border-radius:10px}
.cu-msg.err{color:#b91c1c;background:#fef2f2;border:1px solid #fecaca}
.cu-msg.ok{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}
.cu-btn{width:100%;margin-top:4px;padding:14px;font:inherit;font-weight:700;font-size:.95rem;color:#fff;background:linear-gradient(135deg,#22a24f,#14532d);border:0;border-radius:12px;cursor:pointer;box-shadow:0 12px 24px -12px rgba(20,83,45,.75);transition:transform .15s,box-shadow .2s}
.cu-btn:hover{transform:translateY(-1px)}
.cu-btn:active{transform:scale(.98)}
.cu-btn:disabled{opacity:.65;cursor:wait}
.cu-cancel{display:block;margin:12px auto 0;padding:6px 12px;border:0;background:transparent;font:inherit;font-size:.82rem;font-weight:600;color:#64748b;cursor:pointer}
.cu-cancel:hover{text-decoration:underline}
.cu-foot{margin:14px 0 0;text-align:center;font-size:.72rem;font-weight:600;color:#64748b;opacity:.85}
body.dark-mode .cu-card,body.theme-dark .cu-card,body.dark .cu-card,[data-theme=dark] .cu-card{background:#16211a;color:#e6f0e9;border-color:#263329}
body.dark-mode .cu-f input,body.theme-dark .cu-f input,body.dark .cu-f input,[data-theme=dark] .cu-f input{background:#101a14;border-color:#263329}
body.dark-mode .cu-msg.err,body.theme-dark .cu-msg.err,body.dark .cu-msg.err,[data-theme=dark] .cu-msg.err{background:#7f1d1d;color:#fecaca;border-color:#b91c1c}
body.dark-mode .cu-msg.ok,body.theme-dark .cu-msg.ok,body.dark .cu-msg.ok,[data-theme=dark] .cu-msg.ok{background:#14532d;color:#bbf7d0;border-color:#166534}`;

  const svg = (d) => `<svg class="cu-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICO = {
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    check: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="m9.5 16 2 2 3.5-4"/>'),
  };
  const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  function pw(id, label, ico, auto) {
    return `<div class="cu-g"><label for="${id}">${label}</label><div class="cu-f pw">${ico}
      <input type="password" id="${id}" placeholder="••••••••" autocomplete="${auto}" required>
      <button type="button" class="cu-eye" data-eye="${id}" aria-label="Mostrar contraseña">${EYE}</button></div></div>`;
  }

  function construir() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    modal = document.createElement('div');
    modal.className = 'cu-ov'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="cu-card">
      <div class="cu-logo"><img src="logo solo g.png" alt="" onerror="this.onerror=null;this.src='logo.png'"></div>
      <h3>Crear usuario</h3>
      <p class="cu-sub">Registra una nueva cuenta corporativa.</p>
      <form id="cuForm" novalidate>
        <div class="cu-g"><label for="cuNombre">Nombre de usuario</label><div class="cu-f">${ICO.user}
          <input id="cuNombre" placeholder="Ej: María Pérez" autocomplete="off" required></div></div>
        <div class="cu-g"><label for="cuEmail">Correo electrónico</label><div class="cu-f suf">${ICO.mail}
          <input id="cuEmail" placeholder="usuario" autocomplete="off" autocapitalize="off" required>
          <span class="cu-ghost" aria-hidden="true"><i id="cuGhostTxt">usuario</i>${DOMINIO}</span></div></div>
        ${pw('cuPass', 'Contraseña', ICO.lock, 'new-password')}
        ${pw('cuPass2', 'Confirmar contraseña', ICO.check, 'new-password')}
        <div class="cu-msg" id="cuMsg" role="alert"></div>
        <button type="submit" class="cu-btn" id="cuBtn">Crear usuario</button>
        <button type="button" class="cu-cancel" id="cuCancel">Cancelar</button>
      </form>
      <p class="cu-foot">🔒 Solo administradores · Hipergalerias C.A.</p></div>`;
    document.body.appendChild(modal);

    modal.addEventListener('mousedown', (e) => { if (e.target === modal) cerrar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('on')) cerrar(); });
    modal.querySelector('#cuCancel').onclick = cerrar;
    modal.querySelectorAll('[data-eye]').forEach((b) => b.onclick = () => {
      const i = modal.querySelector('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password';
    });
    // Si pegan un correo completo, nos quedamos solo con la parte antes de la @
    modal.querySelector('#cuEmail').addEventListener('input', (e) => { e.target.value = e.target.value.split('@')[0].replace(/\s/g, '').toLowerCase(); $('cuGhostTxt').textContent = e.target.value || 'usuario'; });
    modal.querySelector('#cuForm').addEventListener('submit', enviar);
  }

  const $ = (id) => modal.querySelector('#' + id);
  function msg(t, tipo) { const m = $('cuMsg'); m.textContent = t; m.className = 'cu-msg ' + tipo; m.style.display = 'block'; }
  function error(t) { msg(t, 'err'); const c = modal.querySelector('.cu-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

  function abrir() {
    if (!esAdmin) return;
    if (!modal) construir();
    modal.querySelector('#cuForm').reset(); $('cuGhostTxt').textContent = 'usuario'; $('cuMsg').style.display = 'none';
    try { if (typeof cerrarUserMenu === 'function') cerrarUserMenu(); if (typeof toggleMenuUsuario === 'function') toggleMenuUsuario(false); } catch (_) {} // cierra el menú de usuario
    modal.classList.add('on');
    setTimeout(() => $('cuNombre').focus(), 250);
  }
  function cerrar() { modal && modal.classList.remove('on'); }

  async function enviar(e) {
    e.preventDefault();
    const nombre = $('cuNombre').value.trim(), local = $('cuEmail').value.trim();
    const p1 = $('cuPass').value, p2 = $('cuPass2').value;
    $('cuMsg').style.display = 'none';
    if (nombre.length < 2) return error('Escribe el nombre de usuario.');
    if (!/^[a-z0-9._-]+$/.test(local)) return error('El correo solo admite letras, números, punto, guion y guion bajo.');
    if (p1.length < 8) return error('La contraseña debe tener al menos 8 caracteres.');
    if (p1 !== p2) return error('Las contraseñas no coinciden.');

    const btn = $('cuBtn'); btn.disabled = true; btn.textContent = 'Creando...';
    try {
      const { data, error: err } = await supabaseClient.functions.invoke('crear-usuario', {
        body: { nombre, email: local + DOMINIO, password: p1 },
      });
      if (err) {
        let t = 'No se pudo crear el usuario.';
        try { t = (await err.context.json()).error || t; } catch (_) {}
        return error(t);
      }
      if (data && data.error) return error(data.error);
      msg('✅ Usuario creado: ' + local + DOMINIO, 'ok');
      $('cuForm').reset();
      setTimeout(cerrar, 2200);
    } catch (ex) { error('Error de conexión: ' + ex.message); }
    finally { btn.disabled = false; btn.textContent = 'Crear usuario'; }
  }

  // ---- Inserta/quita la opción en el menú de usuario (cualquier módulo) ----
  function sincronizar() {
    document.querySelectorAll('button[onclick*="ejecutarLogout"]').forEach((logout) => {
      const previo = logout.previousElementSibling;
      const hay = previo && previo.classList.contains('cu-item');
      if (esAdmin && !hay) {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'menuitem');
        b.className = logout.className.replace(/\b(danger|user-item-danger)\b/g, '').trim() + ' cu-item';
        b.textContent = '＋ Crear usuario';
        b.onclick = abrir;
        logout.before(b);
      } else if (!esAdmin && hay) previo.remove();
    });
  }
  let pend = false;
  const programar = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; sincronizar(); }); };

  async function evaluarRol(session) {
    esAdmin = false;
    try {
      if (session && session.user) {
        const { data } = await supabaseClient.from('perfiles').select('rol').eq('id', session.user.id).maybeSingle();
        esAdmin = !!data && data.rol === 'admin';
        console.info('[usuarios-admin] rol en perfiles:', data ? data.rol : '(sin fila)', '→ admin:', esAdmin);
      }
    } catch (ex) { console.warn('[usuarios-admin] no se pudo leer perfiles', ex); }
    sincronizar();
  }

  function iniciar() {
    console.info('[usuarios-admin] cargado');
    if (typeof supabaseClient === 'undefined' || !supabaseClient) { console.warn('[usuarios-admin] supabaseClient no existe: revisa que conexion.js cargue antes'); return; }
    new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
    supabaseClient.auth.getSession().then(({ data }) => evaluarRol(data.session));
    supabaseClient.auth.onAuthStateChange((_ev, s) => setTimeout(() => evaluarRol(s), 0));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
