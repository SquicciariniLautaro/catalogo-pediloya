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

// Pasa el texto CSV a una lista de objetos, uno por fila, usando la primera
// fila como nombres de columna. Respeta los campos entre comillas: un nombre
// con coma llega como "Combo Vino, Hielo" y no tiene que partirse en dos.
function parsearCSV(csv) {
    const filas = [];
    let fila = [];
    let celda = '';
    let entreComillas = false;

    for (let i = 0; i < csv.length; i++) {
        const c = csv[i];
        if (entreComillas) {
            // Dos comillas seguidas dentro de un campo son una comilla escrita.
            if (c === '"' && csv[i + 1] === '"') { celda += '"'; i++; }
            else if (c === '"') entreComillas = false;
            else celda += c;
        } else if (c === '"') {
            entreComillas = true;
        } else if (c === ',') {
            fila.push(celda);
            celda = '';
        } else if (c === '\n') {
            fila.push(celda);
            filas.push(fila);
            fila = [];
            celda = '';
        } else if (c !== '\r') {
            celda += c;
        }
    }
    fila.push(celda);
    filas.push(fila);

    const headers = filas[0].map(h => h.trim());
    return filas.slice(1).filter(valores => valores.some(v => v.trim())).map(valores => {
        const obj = {};
        headers.forEach((header, i) => {
            let val = (valores[i] || '').trim();
            if (header === 'Precio' || header === 'Precio_Promo') val = val ? Number(val) : '';
            obj[header] = val;
        });
        return obj;
    });
}
