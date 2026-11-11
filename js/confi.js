// Initialisation Supabase
// ⚠️ N'oublie pas de remplacer les 2 valeurs ci-dessous par tes clés Supabase
const SUPABASE_URL = "https://dzvyxoacyyhzrkfefwam.supabase.co"; // Récupéré de ton écran Supabase
const SUPABASE_ANON_KEY = "sb_publishable_UP-KE7IIsAgqUfJWGXT7Hg_H4Q_lb8T";

// Clé API ImgBB
const IMGBB_API_KEY = "a967cb75f5184ae7d46427d5fce27d43";

// Instance globale Supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);