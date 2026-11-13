// --- CONFIGURATION SUPABASE ---
// Remplace ces valeurs par tes propres identifiants Supabase (Project URL & Anon Key)
const SUPABASE_URL = "https://dzvyxoacyyhzrkfefwam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UP-KE7IIsAgqUfJWGXT7Hg_H4Q_lb8T";

// --- CONFIGURATION IMGBB ---
// Clé API ImgBB pour l'hébergement direct des images de produits
const IMGBB_API_KEY = "a967cb75f5184ae7d46427d5fce27d43";

// Initialisation globale de l'instance Supabase (utilisée dans index.js et admin.js)
// On utilise window.supabase si chargé via CDN, ou l'objet global
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
