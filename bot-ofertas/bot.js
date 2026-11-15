// Bot de ofertas: lee productos_descuento (enviado = false) y las publica en un grupo de WhatsApp.
// Uso:  node bot.js grupos   -> lista tus grupos con su JID
//       node bot.js          -> deja el bot corriendo
import 'dotenv/config';
import makeWASocket, {
    useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, WA_PHONE, GRUPO_JID } = process.env;
const INTERVALO_MS = 30_000;
const modoGrupos = process.argv[2] === 'grupos';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en .env'); process.exit(1); }
if (!WA_PHONE) { console.error('Falta WA_PHONE en .env (solo números, con código de país)'); process.exit(1); }
if (!modoGrupos && !GRUPO_JID) { console.error('Falta GRUPO_JID en .env. Corre primero: node bot.js grupos'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const logger = pino({ level: 'silent' });
const espera = ms => new Promise(r => setTimeout(r, ms));

let sock, conectado = false, codigoPedido = false, bucle = null, enviando = false;
const yaEnviadas = new Set(); // evita duplicados si falla marcar "enviado"

function mensaje(o) {
    const l = [
        '🏷️ *OFERTA*', '',
        '*' + o.descripcion + '*',
        '💲 Precio: *$' + Number(o.precio).toFixed(2) + '*',
        '📦 Disponibles: ' + Number(o.stock || 0) + ' unidades'
    ];
    if (o.codigo) l.push('🔢 Código: ' + o.codigo);
    if (o.nota) l.push('', o.nota);
    return l.join('\n');
}

async function enviarPendientes() {
    if (!conectado || enviando) return;
    enviando = true;
    try {
        const { data, error } = await supabase.from('productos_descuento').select('*')
            .eq('enviado', false).order('creado_en', { ascending: true }).limit(10);
        if (error) { console.error('Supabase:', error.message); return; }

        for (const o of data) {
            if (yaEnviadas.has(o.id)) continue;
            const texto = mensaje(o);
            try {
                if (o.imagen_url) await sock.sendMessage(GRUPO_JID, { image: { url: o.imagen_url }, caption: texto });
                else await sock.sendMessage(GRUPO_JID, { text: texto });
            } catch (e) {
                console.error('No se pudo enviar "' + o.descripcion + '":', e.message);
                break;
            }
            yaEnviadas.add(o.id);
            const { error: e2 } = await supabase.from('productos_descuento').update({ enviado: true }).eq('id', o.id);
            if (e2) console.error('Enviada pero no se pudo marcar como enviada:', e2.message);
            console.log('Enviada:', o.descripcion);
            await espera(4000 + Math.random() * 4000); // pausa entre mensajes
        }
    } finally {
        enviando = false;
    }
}

async function iniciar() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, auth: state, logger, browser: Browsers.ubuntu('Chrome') });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        // Primera vez: pedir el código de vinculación (hay que esperar al evento qr)
        if (qr && !sock.authState.creds.registered && !codigoPedido) {
            codigoPedido = true;
            try {
                const code = await sock.requestPairingCode(WA_PHONE);
                console.log('\n=== CÓDIGO DE VINCULACIÓN: ' + code + ' ===');
                console.log('WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono\n');
            } catch (e) {
                console.error('No se pudo pedir el código:', e.message);
                codigoPedido = false;
            }
        }

        if (connection === 'open') {
            conectado = true;
            console.log('Conectado a WhatsApp.');
            if (modoGrupos) {
                const grupos = await sock.groupFetchAllParticipating();
                console.log('\nTus grupos:');
                Object.values(grupos).forEach(g => console.log('  ' + g.subject + '  ->  ' + g.id));
                console.log('\nCopia el JID (termina en @g.us) en GRUPO_JID dentro de .env');
                process.exit(0);
            }
            if (!bucle) {
                bucle = setInterval(enviarPendientes, INTERVALO_MS);
                enviarPendientes();
                console.log('Revisando ofertas nuevas cada ' + INTERVALO_MS / 1000 + ' s...');
            }
        }

        if (connection === 'close') {
            conectado = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.error('Sesión cerrada desde el teléfono. Borra la carpeta "auth" y vuelve a vincular.');
                process.exit(1);
            }
            console.log('Conexión cerrada (' + code + '). Reintentando...');
            setTimeout(iniciar, 3000);
        }
    });
}

iniciar();
