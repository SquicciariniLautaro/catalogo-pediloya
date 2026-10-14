// Todo lo que el panel le pide a Supabase. Solo lo carga admin.html.
// Lo que un usuario puede ver o cambiar lo decide la base (ver
// supabase/migrations/), no este archivo.

const BUCKET_FOTOS = 'productos';
const SIN_CONEXION = 'No hay conexión. Revisá la señal y probá de nuevo.';
// El mismo mensaje para "ese correo no existe", "contraseña incorrecta" y
// "ese usuario no es administrador": no se dan pistas de cuál fue.
const ERROR_INICIO = 'Correo o contraseña incorrectos';

// "supabase" es la librería, que admin.html carga antes que este archivo.
const cliente = SUPABASE_CONFIGURADO ? supabase.createClient(SUPABASE_URL, SUPABASE.clave) : null;

// Traduce un error de la base a un mensaje para mostrar.
// "code" es el código de error de Postgres.
function traducirError(error, estado) {
    // 23514: no pasó una regla de la tabla (precio en cero, promo mayor al precio, nombre muy largo...).
    if (error.code === '23514') return new Error('Hay un dato inválido. Revisá el nombre y los precios.');
    if (error.code === '42501' || estado === 401 || estado === 403) {
        return new Error('No tenés permiso para hacer eso. Volvé a iniciar sesión.');
    }
    // Cuando no hay red, la librería informa un error sin código HTTP.
    if (!estado && /fetch|network/i.test(error.message || '')) return new Error(SIN_CONEXION);
    return new Error('Algo falló. Probá de nuevo.');
}

// Desarma la respuesta de la librería: devuelve los datos o tira el error ya traducido.
function resultado({ data, error, status }) {
    if (error) throw traducirError(error, status);
    return data;
}

async function esAdmin() {
    return resultado(await cliente.rpc('es_admin')) === true;
}

const apiSupabase = {
    // Devuelve el correo si hay una sesión abierta y es de un administrador; si no, null.
    async verSesion() {
        const { data, error } = await cliente.auth.getSession();
        if (error || !data.session) return null;
        if (!(await esAdmin())) {
            await this.cerrarSesion();
            return null;
        }
        return data.session.user.email;
    },

    async iniciarSesion(correo, clave) {
        const { data, error } = await cliente.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) {
            // 429 = Supabase cortó los intentos por repetidos.
            if (error.status === 429) throw new Error('Demasiados intentos. Esperá unos minutos y volvé a probar.');
            if (!error.status) throw new Error(SIN_CONEXION);
            throw new Error(ERROR_INICIO);
        }
        // La contraseña estaba bien, pero falta saber si es administrador.
        if (!(await esAdmin())) {
            await this.cerrarSesion();
            throw new Error(ERROR_INICIO);
        }
        return data.user.email;
    },

    async cerrarSesion() {
        // scope local: cierra la sesión de este navegador, no la de otros dispositivos.
        await cliente.auth.signOut({ scope: 'local' });
    },

    // Avisa cuando la sesión se cerró o venció, para volver al formulario de ingreso.
    alVencerSesion(funcion) {
        cliente.auth.onAuthStateChange(evento => {
            if (evento === 'SIGNED_OUT') funcion();
        });
    },

    async listarProductos() {
        return resultado(await cliente.from('productos').select('*').order('orden').order('id'));
    },

    // Con id edita ese producto; sin id crea uno nuevo. Devuelve el producto guardado.
    async guardarProducto(datos, id) {
        const tabla = cliente.from('productos');
        const consulta = id ? tabla.update(datos).eq('id', id) : tabla.insert(datos);
        return resultado(await consulta.select().single());
    },

    async borrarProducto(id) {
        resultado(await cliente.from('productos').delete().eq('id', id));
    },

    // ids: todos los productos, en el orden en que tienen que verse.
    async reordenarProductos(ids) {
        resultado(await cliente.rpc('reordenar_productos', { p_ids: ids }));
    },

    // Sube una foto y devuelve su dirección pública.
    async subirImagen(blob) {
        const nombre = crypto.randomUUID() + '.jpg';
        const { error } = await cliente.storage.from(BUCKET_FOTOS).upload(nombre, blob, {
            contentType: 'image/jpeg',
            // El nombre es único, así que el navegador puede guardarla un año.
            cacheControl: '31536000'
        });
        if (error) throw new Error('No se pudo subir la foto. Probá de nuevo.');
        return cliente.storage.from(BUCKET_FOTOS).getPublicUrl(nombre).data.publicUrl;
    },

    // Borra una foto que ya no usa ningún producto. Las que no están en
    // nuestro Storage (por ejemplo las viejas de Cloudinary) se dejan como están.
    // Si falla no se avisa: queda una foto suelta, nada que el usuario pueda resolver.
    async borrarImagen(url) {
        const carpeta = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET_FOTOS + '/';
        if (!url || !url.startsWith(carpeta)) return;
        await cliente.storage.from(BUCKET_FOTOS).remove([url.slice(carpeta.length)]);
    }
};

const apiAdmin = MODO_PRUEBA ? apiPrueba : apiSupabase;
