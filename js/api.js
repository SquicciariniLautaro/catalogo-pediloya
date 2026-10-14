// Lo que el sitio pide SIN iniciar sesión: la lista de productos.
// Usa fetch a secas, sin la librería de Supabase, para que quien solo mira el
// catálogo no tenga que descargarla. La librería se carga con el panel (api-admin.js).

const SUPABASE_URL = SUPABASE.url.replace(/\/+$/, '');
const SUPABASE_CONFIGURADO = Boolean(SUPABASE_URL && SUPABASE.clave);

// Modo prueba: mientras Supabase no esté configurado, al abrir el sitio en esta
// PC el panel guarda los productos en el navegador (ver modo-prueba.js) y el
// catálogo los lee de ahí. En el sitio publicado no se activa nunca.
const MODO_PRUEBA = !SUPABASE_CONFIGURADO && ['localhost', '127.0.0.1', ''].includes(location.hostname);
const CLAVE_PRUEBA = 'pediloya-productos-prueba';

const urlGoogleSheets = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyizdc2peg8eyYkmf0EPVVum7tMve6mhzAjYLoUQ13KS0RkHN6UKvQT1eIiaSSQgHIkAOlPzLJUft4/pub?output=csv';

// Devuelve los productos ya en el orden en que se muestran:
// { id, nombre, categoria, precio, precio_promo, imagen_url, disponible }
async function obtenerProductos() {
    if (SUPABASE_CONFIGURADO) return leerDeSupabase();
    if (MODO_PRUEBA) {
        const guardados = localStorage.getItem(CLAVE_PRUEBA);
        if (guardados) return JSON.parse(guardados);
    }
    return leerDeGoogleSheets();
}

async function leerDeSupabase() {
    const campos = 'id,nombre,categoria,precio,precio_promo,imagen_url,disponible';
    const res = await fetch(SUPABASE_URL + '/rest/v1/productos?select=' + campos + '&order=orden.asc,id.asc', {
        headers: { apikey: SUPABASE.clave }
    });
    if (!res.ok) throw new Error('Supabase respondió ' + res.status);
    return res.json();
}

// La planilla es la fuente vieja: queda hasta que Supabase esté configurado.
async function leerDeGoogleSheets() {
    const res = await fetch(urlGoogleSheets);
    if (!res.ok) throw new Error('Google Sheets respondió ' + res.status);
    const filas = parsearCSV(await res.text());
    const destacados = filas.filter(f => f.Destacado === 'Sí');
    const resto = filas.filter(f => f.Destacado !== 'Sí');
    return [...destacados, ...resto].map(f => ({
        id: f.ID,
        nombre: f.Nombre,
        categoria: f.Categoria,
        precio: f.Precio,
        precio_promo: f.Precio_Promo || null,
        imagen_url: f.Imagen_URL,
        disponible: f.Stock !== 'No'
    }));
}

function parsearCSV(csv) {
    const lineas = csv.split('\n');
    const headers = lineas[0].split(',');
    return lineas.slice(1).filter(l => l.trim()).map(linea => {
        const valores = linea.split(',');
        let obj = {};
        headers.forEach((h, i) => {
            let header = h.trim().replace('\r', '');
            let val = valores[i] ? valores[i].trim().replace('\r', '') : '';
            if (header === 'Precio' || header === 'Precio_Promo') val = val ? Number(val) : '';
            obj[header] = val;
        });
        return obj;
    });
}
