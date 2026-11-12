/**
 * Cierre de sesion por inactividad (tipo banco).
 * - A los 5 min sin actividad: franja arriba con cuenta regresiva y boton "Mantener sesion".
 * - A los 7 min: se cierra la sesion y se vuelve a index.html.
 * - Si la pestana estaba dormida/oculta y el limite ya paso, NO cierra en seco: muestra la franja
 *   con una gracia de 30 s para que la persona pueda pulsar "Mantener sesion".
 * - La actividad se comparte entre pestanas (localStorage): si usas otra pestana, esta no se cierra.
 * - Para probarlo rapido, abre cualquier modulo con ?idletest (avisa a los 15 s, cierra a los 30 s).
 * Agregar al final de cada modulo, DESPUES de conexion.js:  <script src="inactividad.js"></script>
 */
(function () {
    if (window.__hgIdle) return;
    window.__hgIdle = true;

    const prueba = /[?&]idletest/.test(location.search);
    const AVISO = (prueba ? 15 : 300) * 1000;   // 5 min
    const LIMITE = (prueba ? 30 : 420) * 1000;  // 7 min
    const GRACIA = (prueba ? 10 : 30) * 1000;   // margen si el aviso no alcanzo a mostrarse
    const KEY = 'hg_ultima_actividad';
    const log = (...a) => { if (prueba) console.log('[inactividad]', ...a); };

    let ultimo = Date.now(), activo = false, avisando = false, cerrando = false;
    let timer = null, banda = null, avisoVisto = false, graciaHasta = 0;

    const marcar = () => {
        ultimo = Date.now();
        avisoVisto = false; graciaHasta = 0;
        try { localStorage.setItem(KEY, String(ultimo)); } catch (e) { }
    };
    const ultimaGlobal = () => {
        let v = 0;
        try { v = Number(localStorage.getItem(KEY)) || 0; } catch (e) { }
        return Math.min(Date.now(), Math.max(ultimo, v)); // nunca en el futuro
    };

    /* ---------- Tipografia Inter (se carga una sola vez; si falla, cae a system-ui) ---------- */
    function cargarInter() {
        if (document.getElementById('hgInterFont')) return;
        const l = document.createElement('link');
        l.id = 'hgInterFont';
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap';
        (document.head || document.documentElement).appendChild(l);
    }

    /* ---------- Franja de aviso ---------- */
    function crearBanda() {
        cargarInter();
        const st = document.createElement('style');
        st.textContent =
            '@keyframes hgDown{from{transform:translateY(-100%)}}' +
            '#hgIdle{position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;padding:12px 20px 16px;background:linear-gradient(90deg,#f4b400,#f59e0b);color:#2b1d00;font:600 14px/1.35 Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);animation:hgDown .35s cubic-bezier(.22,.8,.3,1)}' +
            '#hgIdle b{font-size:15px}#hgIdle small{display:block;font-weight:500;opacity:.8}' +
            '#hgIdle button{border:0;border-radius:99px;padding:9px 20px;font:700 14px Inter,system-ui,sans-serif;background:#123e1b;color:#fff;cursor:pointer}' +
            '#hgIdle button:hover{background:#166534}' +
            '#hgIdle .bar{position:absolute;left:0;bottom:0;height:5px;width:100%;background:rgba(0,0,0,.15)}' +
            '#hgIdle .bar u{display:block;height:100%;width:100%;background:#123e1b;transition:width 1s linear}' +
            '@media(prefers-reduced-motion:reduce){#hgIdle{animation:none}}';
        (document.head || document.documentElement).appendChild(st);
        banda = document.createElement('div');
        banda.id = 'hgIdle';
        banda.setAttribute('role', 'alertdialog');
        banda.setAttribute('aria-live', 'assertive');
        banda.innerHTML = '<span style="font-size:22px">⏳</span><div><b>Tu sesión se cerrará por inactividad en <span id="hgT">2:00</span></b>' +
            '<small>Por seguridad, cerramos la sesión cuando no hay actividad.</small></div>' +
            '<button type="button" id="hgMantener">Mantener sesión</button><i class="bar"><u id="hgBar"></u></i>';
        banda.querySelector('#hgMantener').onclick = extender;
        document.documentElement.appendChild(banda); // fuera de <body>: ningun CSS del modulo lo esconde
    }
    function mostrar(resta) {
        if (!banda) crearBanda();
        const s = Math.ceil(Math.max(0, resta) / 1000);
        banda.querySelector('#hgT').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        banda.querySelector('#hgBar').style.width = Math.min(100, resta / (LIMITE - AVISO) * 100) + '%';
        banda.style.setProperty('display', 'flex', 'important');
        if (!avisando) log('aviso mostrado');
        avisando = true;
        avisoVisto = true;
    }
    function ocultar() {
        avisando = false;
        if (banda) banda.style.setProperty('display', 'none', 'important');
    }
    function extender() { marcar(); ocultar(); log('sesion extendida'); }

    /* ---------- Cierre ---------- */
    async function cerrar() {
        if (cerrando) return;
        cerrando = true;
        log('cerrando sesion');
        ocultar();
        try { sessionStorage.setItem('hg_expirada', '1'); } catch (e) { }
        try { localStorage.removeItem('recepcion_cache_v1'); } catch (e) { }
        try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (e) { }
        location.href = 'index.html';
    }

    /* ---------- Reloj: se mide por hora real, no por contador (aguanta pestanas dormidas) ---------- */
    function tick() {
        if (!activo || cerrando) return;
        const ahora = Date.now();
        const ult = ultimaGlobal();
        const idle = ahora - ult;

        if (idle < AVISO) {                       // hubo actividad (aqui o en otra pestana)
            avisoVisto = false; graciaHasta = 0;
            if (avisando) ocultar();
            return;
        }
        // Limite vencido pero el aviso nunca se vio (pestana dormida): damos gracia
        if (idle >= LIMITE && !avisoVisto && !graciaHasta) {
            graciaHasta = ahora + GRACIA;
            log('limite vencido sin aviso previo: gracia de', GRACIA / 1000, 's');
        }
        const fin = Math.max(ult + LIMITE, graciaHasta);
        if (ahora >= fin) cerrar();
        else mostrar(fin - ahora);
    }
    function iniciar() {
        if (activo) return;
        activo = true; marcar();
        timer = setInterval(tick, 1000);
        log('vigilancia iniciada. aviso:', AVISO / 1000, 's, limite:', LIMITE / 1000, 's');
    }
    function detener() {
        activo = false; ocultar();
        clearInterval(timer); timer = null;
        log('vigilancia detenida (sin sesion)');
    }

    /* ---------- Actividad del usuario (con el aviso visible solo cuenta el boton) ---------- */
    ['mousedown', 'keydown', 'touchstart', 'wheel', 'scroll', 'mousemove'].forEach(ev =>
        window.addEventListener(ev, () => {
            if (!activo || avisando || cerrando) return;
            if (Date.now() - ultimo < 1000) return;
            marcar();
        }, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
    window.addEventListener('focus', tick);

    /* ---------- Aviso en el index tras un cierre automatico ---------- */
    function avisoCierre() {
        let f = false;
        try { f = sessionStorage.getItem('hg_expirada'); sessionStorage.removeItem('hg_expirada'); } catch (e) { }
        if (!f) return;
        cargarInter();
        const n = document.createElement('div');
        n.textContent = '🔒 Tu sesión se cerró por inactividad.';
        n.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:12px 22px;border-radius:99px;background:#123e1b;color:#fff;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .4s';
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 450); }, 6000);
    }

    /* ---------- Arranque ---------- */
    async function arrancar() {
        avisoCierre();
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn('[inactividad] No encontre supabaseClient: carga conexion.js ANTES de inactividad.js');
            return;
        }
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