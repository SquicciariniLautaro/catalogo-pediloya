// Base de mentira para el modo prueba (ver MODO_PRUEBA en api.js): hace lo
// mismo que api-admin.js pero guarda los productos en este navegador, sin
// tocar Supabase. Arranca con lo que haya en la planilla de Google. Sirve para
// probar el panel o mostrárselo al cliente antes de conectar la base real.
// El ingreso acepta cualquier correo y contraseña.

const MARCA_SESION_PRUEBA = 'pediloya-sesion-prueba';

const apiPrueba = {
    async verSesion() {
        return sessionStorage.getItem(MARCA_SESION_PRUEBA);
    },

    async iniciarSesion(correo) {
        sessionStorage.setItem(MARCA_SESION_PRUEBA, correo.trim() || 'prueba@local');
        return sessionStorage.getItem(MARCA_SESION_PRUEBA);
    },

    async cerrarSesion() {
        sessionStorage.removeItem(MARCA_SESION_PRUEBA);
    },

    alVencerSesion() {},

    async listarProductos() {
        const guardados = localStorage.getItem(CLAVE_PRUEBA);
        if (guardados) return JSON.parse(guardados);
        const iniciales = await leerDeGoogleSheets();
        this.guardarTodo(iniciales);
        return iniciales;
    },

    guardarTodo(lista) {
        localStorage.setItem(CLAVE_PRUEBA, JSON.stringify(lista));
    },

    async guardarProducto(datos, id) {
        const lista = await this.listarProductos();
        let producto = lista.find(p => p.id === id);
        if (producto) {
            Object.assign(producto, datos);
        } else {
            producto = { id: 'N' + Date.now(), ...datos };
            lista.push(producto);
        }
        this.guardarTodo(lista);
        return producto;
    },

    async borrarProducto(id) {
        const lista = await this.listarProductos();
        this.guardarTodo(lista.filter(p => p.id !== id));
    },

    async reordenarProductos(ids) {
        const lista = await this.listarProductos();
        this.guardarTodo(ids.map(id => lista.find(p => p.id === id)).filter(Boolean));
    },

    // La "foto subida" queda como texto dentro del mismo producto.
    subirImagen(blob) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => resolve(lector.result);
            lector.onerror = () => reject(new Error('No se pudo leer la foto.'));
            lector.readAsDataURL(blob);
        });
    },

    async borrarImagen() {}
};
