// Datos del proyecto de Supabase (ver DESPLIEGUE.md). Los dos son públicos:
// viajan dentro del sitio y cualquiera puede verlos. Lo que protege los datos
// son los permisos de la base, no esconder esta clave.
// NUNCA va acá la clave "secret" ni la "service_role": esas saltean todos los permisos.
//
// Mientras estén vacíos, el catálogo sigue leyendo la planilla de Google.
const SUPABASE = {
    // Forma: https://xxxxxxxxxxxx.supabase.co
    url: '',
    // La clave "publishable" (empieza con sb_publishable_) o la "anon".
    clave: ''
};
