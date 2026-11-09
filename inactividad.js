/**
 * Cierre de sesion por inactividad (tipo banco).
 * - A los 3 min sin actividad: franja arriba con cuenta regresiva y boton "Mantener sesion".
 * - A los 5 min: se cierra la sesion y se vuelve a index.html.
 * - La actividad se comparte entre pestanas (localStorage): si usas otra pestana, esta no se cierra.
 * - Para probarlo rapido, abre cualquier modulo con ?idletest (avisa a los 10 s, cierra a los 20 s).
 * Agregar al final de cada modulo, DESPUES de conexion.js:  <script src="inactividad.js"></script>
 */
(function () {
    if (window.__hgIdle) return;
    window.__hgIdle = true;

    const prueba = /[?&]idletest/.test(location.search);
    const AVISO = (prueba ? 10 : 180) * 1000;
    const LIMITE = (prueba ? 20 : 300) * 1000;
    const KEY = 'hg_ultima_actividad';

    let ultimo = Date.now(), activo = false, avisando = false, cerrando = false, timer = null, banda = null;

    const marcar = () => {
        ultimo = Date.now();
        try { localStorage.setItem(KEY, String(ultimo)); } catch (e) { }
    };
    const ultimaGlobal = () => {
        let v = 0;
        try { v = Number(localStorage.getItem(KEY)) || 0; } catch (e) { }
        return Math.max(ultimo, v);
    };

    /* ---------- Franja de aviso ---------- */
    function crearBanda() {
        const st = document.createElement('style');
        st.textContent =
            '@keyframes hgDown{from{transform:translateY(-100%)}}' +
            '#hgIdle{position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;padding:12px 20px 16px;background:linear-gradient(90deg,#f4b400,#f59e0b);color:#2b1d00;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);animation:hgDown .35s cubic-bezier(.22,.8,.3,1)}' +
            '#hgIdle b{font-size:15px}#hgIdle small{display:block;font-weight:500;opacity:.8}' +
            '#hgIdle button{border:0;border-radius:99px;padding:9px 20px;font:700 14px system-ui,sans-serif;background:#123e1b;color:#fff;cursor:pointer}' +
            '#hgIdle button:hover{background:#166534}' +
            '#hgIdle .bar{position:absolute;left:0;bottom:0;height:5px;width:100%;background:rgba(0,0,0,.15)}' +
            '#hgIdle .bar u{display:block;height:100%;width:100%;background:#123e1b;transition:width 1s linear}' +
            '@media(prefers-reduced-motion:reduce){#hgIdle{animation:none}}';
        document.head.appendChild(st);
        banda = document.createElement('div');
        banda.id = 'hgIdle';
        banda.setAttribute('role', 'alertdialog');
        banda.setAttribute('aria-live', 'assertive');
        banda.innerHTML = '<span style="font-size:22px">⏳</span><div><b>Tu sesión se cerrará por inactividad en <span id="hgT">2:00</span></b>' +
            '<small>Por seguridad, cerramos la sesión cuando no hay actividad.</small></div>' +
            '<button type="button" id="hgMantener">Mantener sesión</button><i class="bar"><u id="hgBar"></u></i>';
        banda.querySelector('#hgMantener').onclick = extender;
        document.body.appendChild(banda);
    }
    function mostrar(idle) {
        if (!banda) crearBanda();
        const resta = Math.max(0, LIMITE - idle), s = Math.ceil(resta / 1000);
        banda.querySelector('#hgT').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        banda.querySelector('#hgBar').style.width = (resta / (LIMITE - AVISO) * 100) + '%';
        banda.style.display = 'flex';
        avisando = true;
    }
    function ocultar() {
        avisando = false;
        if (banda) banda.style.display = 'none';
    }
    function extender() { marcar(); ocultar(); }

    /* ---------- Cierre ---------- */
    async function cerrar() {
        if (cerrando) return;
        cerrando = true;
        ocultar();
        try { sessionStorage.setItem('hg_expirada', '1'); } catch (e) { }
        try { localStorage.removeItem('recepcion_cache_v1'); } catch (e) { }
        try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (e) { }
        location.href = 'index.html';
    }

    /* ---------- Reloj: se mide por hora real, no por contador (aguanta pestanas dormidas) ---------- */
    function tick() {
        if (!activo || cerrando) return;
        const idle = Date.now() - ultimaGlobal();
        if (idle >= LIMITE) cerrar();
        else if (idle >= AVISO) mostrar(idle);
        else if (avisando) ocultar();
    }
    function iniciar() {
        if (activo) return;
        activo = true; marcar();
        timer = setInterval(tick, 1000);
    }
    function detener() {
        activo = false; ocultar();
        clearInterval(timer); timer = null;
    }

    /* ---------- Actividad del usuario (con el aviso visible solo cuenta el boton) ---------- */
    ['mousedown', 'keydown', 'touchstart', 'wheel', 'scroll', 'mousemove'].forEach(ev =>
        window.addEventListener(ev, () => {
            if (!activo || avisando || cerrando) return;
            if (Date.now() - ultimo < 1000) return;
            marcar();
        }, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });

    /* ---------- Aviso en el index tras un cierre automatico ---------- */
    function avisoCierre() {
        let f = false;
        try { f = sessionStorage.getItem('hg_expirada'); sessionStorage.removeItem('hg_expirada'); } catch (e) { }
        if (!f) return;
        const n = document.createElement('div');
        n.textContent = '🔒 Tu sesión se cerró por inactividad.';
        n.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:12px 22px;border-radius:99px;background:#123e1b;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .4s';
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 450); }, 6000);
    }

    /* ---------- Arranque ---------- */
    async function arrancar() {
        avisoCierre();
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) iniciar();
        } catch (e) { }
        supabaseClient.auth.onAuthStateChange((_ev, s) => {
            if (s && !activo) iniciar();   // SIGNED_IN repetido al volver a la pestana: no reinicia el reloj
            else if (!s) detener();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})();
