// Panel de administrador: ingreso, lista de productos (agregar, editar, borrar)
// y el orden en que se ven en la página de inicio.
// La lista en pantalla está siempre en ese orden: el primero de acá es el
// primero del catálogo.

let productos = [];
let productoEnEdicion = null;   // null = se está agregando uno nuevo
let productoABorrar = null;
let fotoElegida = null;         // archivo nuevo elegido en el formulario
let fotoQuitada = false;

let modalProducto, modalBorrar, aviso;

// Lado más largo, en píxeles, con el que se guardan las fotos. Alcanza para
// que la tarjeta del catálogo se vea nítida y cada foto pesa unos 100 KB.
const LADO_MAXIMO_FOTO = 800;

document.addEventListener('DOMContentLoaded', async () => {
    if (!SUPABASE_CONFIGURADO && !MODO_PRUEBA) {
        mostrarVista('vista-sin-configurar');
        return;
    }
    if (MODO_PRUEBA) document.getElementById('aviso-prueba').classList.remove('d-none');

    modalProducto = new bootstrap.Modal(document.getElementById('modal-producto'));
    modalBorrar = new bootstrap.Modal(document.getElementById('modal-borrar'));
    aviso = new bootstrap.Toast(document.getElementById('aviso'), { delay: 2500 });

    document.getElementById('form-ingreso').addEventListener('submit', ingresar);
    document.getElementById('btn-salir').addEventListener('click', salir);
    document.getElementById('btn-agregar').addEventListener('click', () => abrirFormulario(null));
    document.getElementById('form-producto').addEventListener('submit', guardarFormulario);
    document.getElementById('prod-foto').addEventListener('change', elegirFoto);
    document.getElementById('btn-quitar-foto').addEventListener('click', quitarFoto);
    document.getElementById('btn-confirmar-borrar').addEventListener('click', confirmarBorrado);

    Sortable.create(document.getElementById('lista-productos'), {
        handle: '.agarre',
        animation: 150,
        onEnd: evento => {
            if (evento.oldIndex !== evento.newIndex) moverProducto(evento.oldIndex, evento.newIndex);
        }
    });

    apiAdmin.alVencerSesion(() => mostrarVista('vista-ingreso'));

    try {
        if (await apiAdmin.verSesion()) await entrarAlPanel();
        else mostrarVista('vista-ingreso');
    } catch (err) {
        mostrarVista('vista-ingreso');
    }
});

function mostrarVista(id) {
    ['vista-sin-configurar', 'vista-ingreso', 'vista-panel'].forEach(vista => {
        document.getElementById(vista).classList.toggle('d-none', vista !== id);
    });
    document.getElementById('btn-salir').classList.toggle('d-none', id !== 'vista-panel');
}

function avisar(texto, esError) {
    const elemento = document.getElementById('aviso');
    elemento.classList.toggle('text-bg-danger', Boolean(esError));
    elemento.classList.toggle('text-bg-success', !esError);
    document.getElementById('aviso-texto').textContent = texto;
    aviso.show();
}

function mostrarError(id, texto) {
    const elemento = document.getElementById(id);
    elemento.textContent = texto;
    elemento.classList.toggle('d-none', !texto);
}

function formatearPrecio(numero) {
    return '$' + Number(numero).toLocaleString('es-AR');
}

// --- Sesión ---------------------------------------------------------------

async function ingresar(evento) {
    evento.preventDefault();
    const boton = evento.target.querySelector('button[type="submit"]');
    mostrarError('ingreso-error', '');
    boton.disabled = true;
    try {
        await apiAdmin.iniciarSesion(
            document.getElementById('ingreso-correo').value,
            document.getElementById('ingreso-clave').value
        );
        document.getElementById('ingreso-clave').value = '';
        await entrarAlPanel();
    } catch (err) {
        mostrarError('ingreso-error', err.message);
    } finally {
        boton.disabled = false;
    }
}

async function salir() {
    await apiAdmin.cerrarSesion();
    mostrarVista('vista-ingreso');
}

async function entrarAlPanel() {
    productos = await apiAdmin.listarProductos();
    renderizarLista();
    mostrarVista('vista-panel');
}

// --- Lista ----------------------------------------------------------------

function crearMiniatura(url, clases) {
    const miniatura = document.createElement('div');
    miniatura.className = clases;
    if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.loading = 'lazy';
        miniatura.appendChild(img);
    } else {
        miniatura.textContent = 'Sin foto';
    }
    return miniatura;
}

function crearBoton(texto, clases, etiqueta, alHacerClick) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-sm ' + clases;
    boton.textContent = texto;
    boton.setAttribute('aria-label', etiqueta);
    boton.onclick = alHacerClick;
    return boton;
}

function renderizarLista() {
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    document.getElementById('cantidad-productos').textContent = '(' + productos.length + ')';
    document.getElementById('lista-vacia').classList.toggle('d-none', productos.length > 0);

    productos.forEach((prod, posicion) => {
        const item = document.createElement('li');
        item.className = 'item-producto d-flex flex-wrap align-items-center gap-2 p-2 mb-2';
        item.dataset.id = prod.id;

        const agarre = document.createElement('span');
        agarre.className = 'agarre';
        agarre.textContent = '⠿';
        agarre.title = 'Arrastrar para cambiar el orden';
        agarre.setAttribute('aria-hidden', 'true');

        const info = document.createElement('div');
        info.className = 'item-info';

        const nombre = document.createElement('div');
        nombre.className = 'fw-semibold text-truncate';
        nombre.textContent = prod.nombre;

        const detalle = document.createElement('div');
        detalle.className = 'small text-white-50';
        detalle.textContent = prod.categoria + ' · ';

        const precio = document.createElement('span');
        precio.className = 'text-pediloya';
        if (prod.precio_promo) {
            const tachado = document.createElement('span');
            tachado.className = 'text-white-50 text-decoration-line-through me-1';
            tachado.textContent = formatearPrecio(prod.precio);
            detalle.appendChild(tachado);
            precio.textContent = formatearPrecio(prod.precio_promo) + ' promo';
        } else {
            precio.textContent = formatearPrecio(prod.precio);
        }
        detalle.appendChild(precio);

        if (!prod.disponible) {
            const agotado = document.createElement('span');
            agotado.className = 'badge text-bg-secondary ms-2';
            agotado.textContent = 'Sin stock';
            detalle.appendChild(agotado);
        }

        info.appendChild(nombre);
        info.appendChild(detalle);

        const acciones = document.createElement('div');
        acciones.className = 'item-acciones d-flex gap-1';

        const btnSubir = crearBoton('↑', 'btn-outline-light btn-subir', 'Subir ' + prod.nombre, () => moverConFlecha(prod, -1));
        btnSubir.disabled = posicion === 0;
        const btnBajar = crearBoton('↓', 'btn-outline-light btn-bajar', 'Bajar ' + prod.nombre, () => moverConFlecha(prod, 1));
        btnBajar.disabled = posicion === productos.length - 1;
        const btnEditar = crearBoton('Editar', 'btn-outline-pediloya ms-auto ms-md-2', 'Editar ' + prod.nombre, () => abrirFormulario(prod));
        const btnBorrar = crearBoton('Borrar', 'btn-outline-danger', 'Borrar ' + prod.nombre, () => pedirBorrado(prod));

        acciones.appendChild(btnSubir);
        acciones.appendChild(btnBajar);
        acciones.appendChild(btnEditar);
        acciones.appendChild(btnBorrar);

        item.appendChild(agarre);
        item.appendChild(crearMiniatura(prod.imagen_url, 'miniatura'));
        item.appendChild(info);
        item.appendChild(acciones);
        lista.appendChild(item);
    });
}

// --- Orden ----------------------------------------------------------------

function moverProducto(desde, hasta) {
    const [movido] = productos.splice(desde, 1);
    productos.splice(hasta, 0, movido);
    renderizarLista();
    guardarOrden();
}

function moverConFlecha(prod, pasos) {
    const desde = productos.indexOf(prod);
    moverProducto(desde, desde + pasos);

    // La lista se volvió a dibujar: el foco vuelve a la flecha del mismo
    // producto, para poder seguir moviéndolo con el teclado.
    const item = document.querySelector('#lista-productos li[data-id="' + prod.id + '"]');
    const flecha = item.querySelector(pasos < 0 ? '.btn-subir' : '.btn-bajar');
    (flecha.disabled ? item.querySelector(pasos < 0 ? '.btn-bajar' : '.btn-subir') : flecha).focus();
}

// Los guardados van de a uno y en fila: si se mueven varios productos
// seguidos, el último orden es el que queda.
let colaOrden = Promise.resolve();

function guardarOrden() {
    const ids = productos.map(p => p.id);
    colaOrden = colaOrden
        .then(() => apiAdmin.reordenarProductos(ids))
        .then(() => avisar('Orden guardado'))
        .catch(async err => {
            avisar(err.message, true);
            // No se guardó: se vuelve a mostrar el orden que quedó en la base.
            try { await entrarAlPanel(); } catch (e) {}
        });
}

// --- Agregar y editar -----------------------------------------------------

function abrirFormulario(prod) {
    productoEnEdicion = prod;
    fotoElegida = null;
    fotoQuitada = false;

    document.getElementById('modal-producto-titulo').textContent = prod ? 'Editar producto' : 'Agregar producto';
    document.getElementById('prod-nombre').value = prod ? prod.nombre : '';
    if (prod) document.getElementById('prod-categoria').value = prod.categoria;
    document.getElementById('prod-precio').value = prod ? prod.precio : '';
    document.getElementById('prod-promo').value = prod && prod.precio_promo ? prod.precio_promo : '';
    document.getElementById('prod-disponible').checked = prod ? prod.disponible : true;
    document.getElementById('prod-foto').value = '';
    mostrarFoto(prod ? prod.imagen_url : '');
    mostrarError('prod-error', '');
    modalProducto.show();
}

function mostrarFoto(url) {
    const vista = crearMiniatura(url, 'miniatura miniatura-grande');
    vista.id = 'prod-foto-vista';
    document.getElementById('prod-foto-vista').replaceWith(vista);
    document.getElementById('btn-quitar-foto').classList.toggle('d-none', !url);
}

function elegirFoto(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    fotoElegida = archivo;
    fotoQuitada = false;
    mostrarFoto(URL.createObjectURL(archivo));
}

function quitarFoto() {
    fotoElegida = null;
    fotoQuitada = true;
    document.getElementById('prod-foto').value = '';
    mostrarFoto('');
}

// Achica la foto y la pasa a JPG antes de subirla: las del celular pesan
// varios MB y harían lento el catálogo.
async function achicarFoto(archivo) {
    const imagen = new Image();
    const direccion = URL.createObjectURL(archivo);
    try {
        imagen.src = direccion;
        await imagen.decode();
    } catch (err) {
        throw new Error('Ese archivo no es una imagen que se pueda usar.');
    } finally {
        URL.revokeObjectURL(direccion);
    }

    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.naturalWidth * escala);
    lienzo.height = Math.round(imagen.naturalHeight * escala);
    const contexto = lienzo.getContext('2d');
    // JPG no tiene transparencia: sin esto, el fondo de un PNG transparente saldría negro.
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    return new Promise((resolve, reject) => {
        lienzo.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('No se pudo preparar la foto.'));
        }, 'image/jpeg', 0.85);
    });
}

// Lee y valida el formulario. Las mismas reglas están en la base (ver la
// migración); acá se revisan antes para poder explicar qué está mal.
function leerFormulario() {
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = Number(document.getElementById('prod-precio').value);
    const promoEscrita = document.getElementById('prod-promo').value.trim();
    const promo = promoEscrita ? Number(promoEscrita) : null;

    if (!nombre) throw new Error('Falta el nombre.');
    if (!Number.isInteger(precio) || precio <= 0) throw new Error('El precio tiene que ser un número entero mayor a cero.');
    if (promo !== null) {
        if (!Number.isInteger(promo) || promo <= 0) throw new Error('El precio promo tiene que ser un número entero mayor a cero.');
        if (promo >= precio) throw new Error('El precio promo tiene que ser menor que el precio.');
    }

    return {
        nombre: nombre,
        categoria: document.getElementById('prod-categoria').value,
        precio: precio,
        precio_promo: promo,
        disponible: document.getElementById('prod-disponible').checked
    };
}

async function guardarFormulario(evento) {
    evento.preventDefault();
    let datos;
    try {
        datos = leerFormulario();
    } catch (err) {
        mostrarError('prod-error', err.message);
        return;
    }

    const boton = document.getElementById('btn-guardar');
    const anterior = productoEnEdicion;
    let fotoSubida = '';
    mostrarError('prod-error', '');
    boton.disabled = true;
    boton.textContent = 'Guardando...';

    try {
        if (fotoElegida) {
            fotoSubida = await apiAdmin.subirImagen(await achicarFoto(fotoElegida));
            datos.imagen_url = fotoSubida;
        } else if (fotoQuitada) {
            datos.imagen_url = '';
        }
        // Un producto nuevo entra al final de la lista.
        if (!anterior) datos.orden = Math.max(0, ...productos.map(p => p.orden || 0)) + 1;

        const guardado = await apiAdmin.guardarProducto(datos, anterior ? anterior.id : null);

        if (anterior) {
            productos[productos.indexOf(anterior)] = guardado;
            // La foto vieja ya no la usa nadie.
            if (anterior.imagen_url !== guardado.imagen_url) apiAdmin.borrarImagen(anterior.imagen_url).catch(() => {});
        } else {
            productos.push(guardado);
        }
        renderizarLista();
        modalProducto.hide();
        avisar(anterior ? 'Cambios guardados' : 'Producto agregado');
    } catch (err) {
        // El producto no se guardó: la foto recién subida quedaría suelta.
        if (fotoSubida) apiAdmin.borrarImagen(fotoSubida).catch(() => {});
        mostrarError('prod-error', err.message);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

// --- Borrar ---------------------------------------------------------------

function pedirBorrado(prod) {
    productoABorrar = prod;
    document.getElementById('borrar-nombre').textContent = prod.nombre;
    modalBorrar.show();
}

async function confirmarBorrado() {
    const prod = productoABorrar;
    const boton = document.getElementById('btn-confirmar-borrar');
    boton.disabled = true;
    try {
        await apiAdmin.borrarProducto(prod.id);
        apiAdmin.borrarImagen(prod.imagen_url).catch(() => {});
        productos = productos.filter(p => p !== prod);
        renderizarLista();
        modalBorrar.hide();
        avisar('Producto borrado');
    } catch (err) {
        avisar(err.message, true);
    } finally {
        boton.disabled = false;
    }
}
