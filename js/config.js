// Datos del proyecto de Supabase (ver DESPLIEGUE.md). Los dos son públicos:
// viajan dentro del sitio y cualquiera puede verlos. Lo que protege los datos
// son los permisos de la base, no esconder esta clave.
// NUNCA va acá la clave "secret" ni la "service_role": esas saltean todos los permisos.
//
// Mientras estén vacíos, el catálogo sigue leyendo la planilla de Google.
const SUPABASE = {
    // Forma: https://xxxxxxxxxxxx.supabase.co
    url: 'https://csyioblpbupaaqlxvonn.supabase.co',
    // La clave "publishable" (empieza con sb_publishable_) o la "anon".
    clave: 'sb_publishable_-U7aKq69jjHxOdI7po2cfQ_8MD3udOq'
};

// Datos del negocio que usa el catálogo.
const NEGOCIO = {
    // Número que recibe los pedidos: con código de país, sin "+" ni espacios.
    whatsapp: '5493885838257',
    // Formas de pago que se ofrecen al armar el pedido.
    formasDePago: ['Efectivo', 'Transferencia']
};
