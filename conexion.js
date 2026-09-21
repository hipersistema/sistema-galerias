// URL de tu proyecto en Supabase (extraída de tu panel)
const SUPABASE_URL = 'https://dsnihbjwhmzfgzqtvqyz.supabase.co';

// Pega aquí la 'Publishable key' o 'Legacy anon key' de tu panel (Settings > API Keys)
const SUPABASE_KEY = 'sb_publishable_i1ITZ86VPmkQ6uJ_N0gmGw_-1GSyGTT'; 

// Inicializar cliente global
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);