// Catálogo público: productos, buscador, filtros, pedido y envío por WhatsApp.

let productos = [];
// El pedido guarda solo qué producto y cuántos. El nombre y el precio se leen
// siempre de "productos": así nunca queda un precio viejo guardado.
let carrito = [];               // [{ id, cantidad }]
let categoriaActiva = 'Todos';
let textoBuscado = '';
let ubicacion = null;           // { latitud, longitud, precision } si el cliente la sumó al pedido

// Zona de botones de cada tarjeta en pantalla (id del producto -> elemento),
// para poder redibujar solo esa parte cuando cambia la cantidad.
let zonasDeAccion = new Map();

const CLAVE_CARRITO = 'pediloya-carrito';
const CLAVE_ENTREGA = 'pediloya-entrega';
const TARJETAS_DE_CARGA = 8;
// Ancho con el que se piden las fotos: alcanza para dos columnas en un celular de pantalla densa.
const ANCHO_FOTO = 480;
// Metros. Más allá de esto el link puede caer a una o dos cuadras: se avisa en el pedido.
const PRECISION_ACEPTABLE = 100;
const PLAN_B_UBICACION = 'Si no anda, mandá el pedido igual y después compartí tu ubicación en el chat de WhatsApp (clip → Ubicación).';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pie-whatsapp').href = 'https://wa.me/' + NEGOCIO.whatsapp;

    const buscador = document.getElementById('buscador');
    buscador.addEventListener('input', () => {
        textoBuscado = buscador.value;
        renderizarCatalogo();
    });
    // En el celular, "Buscar" en el teclado lo cierra para ver los resultados.
    buscador.addEventListener('keydown', evento => {
        if (evento.key === 'Enter') buscador.blur();
    });

    document.getElementById('filtros').addEventListener('click', evento => {
        const boton = evento.target.closest('.btn-filtro');
        if (boton) filtrar(boton.dataset.categoria);
    });
    document.getElementById('btn-limpiar-busqueda').addEventListener('click', limpiarBusqueda);
    document.getElementById('btn-reintentar').addEventListener('click', cargarProductos);
    document.getElementById('btn-vaciar').addEventListener('click', vaciarPedido);
    document.getElementById('btn-ubicacion').addEventListener('click', alternarUbicacion);
    document.getElementById('form-entrega').addEventListener('submit', enviarPedidoWhatsApp);

    prepararFormularioEntrega();
    cargarProductos();
});

// --- Utilidades -------------------------------------------------------------

function mostrar(id, visible) {
    document.getElementById(id).classList.toggle('d-none', !visible);
}

function formatearPrecio(numero) {
    return '$' + Number(numero).toLocaleString('es-AR');
}

function precioDe(prod) {
    return prod.precio_promo ? prod.precio_promo : prod.precio;
}

function buscarProducto(id) {
    return productos.find(p => p.id === id);
}

// localStorage puede no estar disponible (modo privado, espacio lleno): el
// sitio tiene que funcionar igual, solo que sin recordar.
function leerGuardado(clave, porDefecto) {
    try {
        const texto = localStorage.getItem(clave);
        return texto ? JSON.parse(texto) : porDefecto;
    } catch (e) {
        return porDefecto;
    }
}

function guardar(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {}
}

// Las fotos de Cloudinary se piden ya achicadas y en el formato más liviano
// que acepte el navegador (pesan unas seis veces menos). Las demás van tal cual.
function fotoOptimizada(url, ancho) {
    return url.replace(
        /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/)/,
        '$1f_auto,q_auto,w_' + ancho + '/$2'
    );
}

// Vuelve a dibujar un pedazo de la página sin que quien usa el teclado pierda
// el lugar: si el foco estaba en un botón de adentro, vuelve al equivalente.
function redibujarConFoco(contenedor, redibujar) {
    const activo = contenedor.contains(document.activeElement) ? document.activeElement : null;
    const marca = activo ? { id: activo.dataset.id, accion: activo.dataset.accion } : null;
    redibujar();
    if (!marca) return;
    const botones = [...contenedor.querySelectorAll('button[data-accion]')];
    const equivalente = botones.find(b => b.dataset.id === marca.id && b.dataset.accion === marca.accion)
        || botones.find(b => b.dataset.id === marca.id)
        || botones[0];
    if (equivalente) equivalente.focus();
}

// --- Catálogo ---------------------------------------------------------------

function cargarProductos() {
    mostrar('error-carga', false);
    mostrar('sin-resultados', false);
    mostrarTarjetasDeCarga();

    // Los productos llegan ya en el orden en que se muestran (ver api.js).
    obtenerProductos()
        .then(lista => {
            productos = lista;
            // Del pedido guardado quedan los productos que siguen existiendo y con stock.
            const guardado = leerGuardado(CLAVE_CARRITO, []);
            carrito = (Array.isArray(guardado) ? guardado : []).filter(item => {
                const prod = buscarProducto(item.id);
                return prod && prod.disponible && item.cantidad > 0;
            });
            renderizarCatalogo();
            actualizarCarrito();
        })
        .catch(err => {
            console.error('Error al cargar datos:', err);
            document.getElementById('catalogo-container').innerHTML = '';
            mostrar('error-carga', true);
        });
}

// Tarjetas grises con la forma de un producto, mientras llegan los datos.
function mostrarTarjetasDeCarga() {
    const contenedor = document.getElementById('catalogo-container');
    contenedor.innerHTML = '';
    for (let i = 0; i < TARJETAS_DE_CARGA; i++) {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        col.setAttribute('aria-hidden', 'true');
        const card = document.createElement('div');
        card.className = 'card-producto tarjeta-cargando';
        ['img-container', 'linea', 'linea linea-corta', 'linea linea-boton'].forEach(clases => {
            const bloque = document.createElement('div');
            bloque.className = clases;
            card.appendChild(bloque);
        });
        col.appendChild(card);
        contenedor.appendChild(col);
    }
}

function normalizar(texto) {
    // Minúsculas y sin tildes: "limon" encuentra "Limón".
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function productosVisibles() {
    const palabras = normalizar(textoBuscado).split(/\s+/).filter(Boolean);
    return productos.filter(prod => {
        if (categoriaActiva === 'Promos') {
            if (!prod.precio_promo) return false;
        } else if (categoriaActiva !== 'Todos' && prod.categoria !== categoriaActiva) {
            return false;
        }
        const dondeBuscar = normalizar(prod.nombre + ' ' + prod.categoria);
        return palabras.every(palabra => dondeBuscar.includes(palabra));
    });
}

function renderizarCatalogo() {
    const contenedor = document.getElementById('catalogo-container');
    const lista = productosVisibles();
    contenedor.innerHTML = '';
    zonasDeAccion = new Map();
    lista.forEach(prod => contenedor.appendChild(crearTarjeta(prod)));

    const filtrando = textoBuscado.trim() !== '' || categoriaActiva !== 'Todos';
    mostrar('sin-resultados', lista.length === 0);
    if (lista.length === 0) {
        const buscado = textoBuscado.trim();
        document.getElementById('sin-resultados-texto').textContent = buscado
            ? 'No hay productos que coincidan con “' + buscado + '”' + (categoriaActiva === 'Todos' ? '.' : ' en esta categoría.')
            : (categoriaActiva === 'Promos' ? 'Por ahora no hay promos.' : 'Todavía no hay productos en esta categoría.');
    }
    document.getElementById('resultado-busqueda').textContent = filtrando
        ? (lista.length === 1 ? '1 producto' : lista.length + ' productos')
        : '';
}

function crearTarjeta(prod) {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';

    const card = document.createElement('article');
    card.className = 'card-producto h-100 d-flex flex-column';
    if (!prod.disponible) card.classList.add('sin-stock');

    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';

    if (!prod.disponible) {
        const agotado = document.createElement('div');
        agotado.className = 'etiqueta-promo etiqueta-sin-stock';
        agotado.textContent = 'Sin stock';
        imgContainer.appendChild(agotado);
    } else if (prod.precio_promo) {
        const promo = document.createElement('div');
        promo.className = 'etiqueta-promo';
        promo.textContent = '¡Promo!';
        imgContainer.appendChild(promo);
    }

    const sinImagen = document.createElement('span');
    sinImagen.className = 'sin-imagen';
    sinImagen.textContent = 'Sin imagen';

    if (prod.imagen_url) {
        const img = document.createElement('img');
        img.src = fotoOptimizada(prod.imagen_url, ANCHO_FOTO);
        // El nombre está escrito justo debajo: repetirlo acá sería ruido para un lector de pantalla.
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = () => img.replaceWith(sinImagen);
        imgContainer.appendChild(img);
    } else {
        imgContainer.appendChild(sinImagen);
    }

    const body = document.createElement('div');
    body.className = 'tarjeta-cuerpo d-flex flex-column flex-grow-1';

    const title = document.createElement('h2');
    title.className = 'tarjeta-nombre';
    title.textContent = prod.nombre;

    const precios = document.createElement('p');
    precios.className = 'tarjeta-precios mt-auto';
    if (prod.precio_promo) {
        const tachado = document.createElement('s');
        tachado.className = 'precio-tachado';
        tachado.textContent = formatearPrecio(prod.precio);
        precios.appendChild(tachado);
    }
    const precioTxt = document.createElement('span');
    precioTxt.className = 'precio';
    precioTxt.textContent = formatearPrecio(precioDe(prod));
    precios.appendChild(precioTxt);

    const zona = document.createElement('div');
    zona.className = 'tarjeta-accion';
    zonasDeAccion.set(prod.id, zona);
    dibujarAccion(prod);

    body.appendChild(title);
    body.appendChild(precios);
    body.appendChild(zona);
    card.appendChild(imgContainer);
    card.appendChild(body);
    col.appendChild(card);
    return col;
}

// Los botones de una tarjeta: "Agregar", o el contador si ya está en el pedido.
function dibujarAccion(prod) {
    const zona = zonasDeAccion.get(prod.id);
    if (!zona) return; // la tarjeta no está en pantalla (quedó fuera del filtro)

    redibujarConFoco(zona, () => {
        zona.innerHTML = '';
        const cantidad = cantidadEnPedido(prod.id);

        if (!prod.disponible) {
            const btnAgotado = document.createElement('button');
            btnAgotado.type = 'button';
            btnAgotado.className = 'btn btn-outline-secondary w-100';
            btnAgotado.textContent = 'Sin stock';
            btnAgotado.disabled = true;
            zona.appendChild(btnAgotado);
        } else if (cantidad > 0) {
            zona.appendChild(crearControlCantidad(prod, cantidad));
        } else {
            const btnAgregar = crearBotonCantidad(prod, 'sumar', 'Agregar', 'Agregar ' + prod.nombre + ' al pedido');
            btnAgregar.className = 'btn btn-outline-pediloya w-100';
            zona.appendChild(btnAgregar);
        }
    });
}

function crearBotonCantidad(prod, accion, texto, etiqueta) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = texto;
    boton.dataset.id = prod.id;
    boton.dataset.accion = accion;
    boton.setAttribute('aria-label', etiqueta);
    boton.onclick = () => cambiarCantidad(prod.id, accion === 'sumar' ? 1 : -1);
    return boton;
}

// El contador  − 2 +  que se usa en la tarjeta y en el pedido.
function crearControlCantidad(prod, cantidad) {
    const control = document.createElement('div');
    control.className = 'control-cantidad';

    const btnRestar = crearBotonCantidad(prod, 'restar', '−', 'Quitar uno de ' + prod.nombre);
    const btnSumar = crearBotonCantidad(prod, 'sumar', '+', 'Agregar otro de ' + prod.nombre);

    const numero = document.createElement('span');
    numero.className = 'control-numero';
    numero.textContent = cantidad;
    numero.setAttribute('aria-label', cantidad + ' en el pedido');

    control.appendChild(btnRestar);
    control.appendChild(numero);
    control.appendChild(btnSumar);
    return control;
}

function filtrar(categoria) {
    categoriaActiva = categoria;
    document.querySelectorAll('#filtros .btn-filtro').forEach(btn => {
        const activo = btn.dataset.categoria === categoria;
        btn.classList.toggle('active', activo);
        btn.setAttribute('aria-pressed', activo);
    });
    renderizarCatalogo();

    // Si se cambió de categoría estando abajo en la página, vuelve al principio de la lista.
    const catalogo = document.getElementById('catalogo');
    if (catalogo.getBoundingClientRect().top < 0) catalogo.scrollIntoView();
}

function limpiarBusqueda() {
    textoBuscado = '';
    document.getElementById('buscador').value = '';
    filtrar('Todos');
}

// --- Pedido -----------------------------------------------------------------

function cantidadEnPedido(id) {
    const item = carrito.find(i => i.id === id);
    return item ? item.cantidad : 0;
}

function cambiarCantidad(id, pasos) {
    const prod = buscarProducto(id);
    if (!prod || !prod.disponible) return;

    const item = carrito.find(i => i.id === id);
    if (item) item.cantidad += pasos;
    else if (pasos > 0) carrito.push({ id: id, cantidad: pasos });
    carrito = carrito.filter(i => i.cantidad > 0);

    guardar(CLAVE_CARRITO, carrito);
    dibujarAccion(prod);
    actualizarCarrito();
}

function eliminarDelCarrito(id) {
    cambiarCantidad(id, -cantidadEnPedido(id));
}

function vaciarPedido() {
    const quitados = carrito.map(item => buscarProducto(item.id));
    carrito = [];
    guardar(CLAVE_CARRITO, carrito);
    quitados.forEach(dibujarAccion);
    actualizarCarrito();
}

function totalDelPedido() {
    return carrito.reduce((suma, item) => suma + precioDe(buscarProducto(item.id)) * item.cantidad, 0);
}

function actualizarCarrito() {
    const lista = document.getElementById('carrito-items');
    const teniaFoco = lista.contains(document.activeElement);
    let cantidadTotalArticulos = 0;

    redibujarConFoco(lista, () => {
        lista.innerHTML = '';
        carrito.forEach(item => {
            const prod = buscarProducto(item.id);
            cantidadTotalArticulos += item.cantidad;
            lista.appendChild(crearItemDelPedido(prod, item.cantidad));
        });
    });

    const total = formatearPrecio(totalDelPedido());
    document.getElementById('carrito-total').textContent = total;
    document.getElementById('barra-total').textContent = total;
    document.getElementById('cart-count').textContent = cantidadTotalArticulos;
    document.getElementById('barra-cantidad').textContent = cantidadTotalArticulos;

    const vacio = carrito.length === 0;
    mostrar('pedido-vacio', vacio);
    mostrar('pedido-lleno', !vacio);
    mostrar('barra-pedido', !vacio);
    // Se quitó el último producto desde el panel: el foco pasa a "Ver productos".
    if (vacio && teniaFoco) document.querySelector('#pedido-vacio button').focus();
}

function crearItemDelPedido(prod, cantidad) {
    const item = document.createElement('li');
    item.className = 'pedido-item';

    const foto = document.createElement('div');
    foto.className = 'pedido-foto';
    if (prod.imagen_url) {
        const img = document.createElement('img');
        img.src = fotoOptimizada(prod.imagen_url, 120);
        img.alt = '';
        img.onerror = () => img.remove();
        foto.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'pedido-info';

    const nombre = document.createElement('p');
    nombre.className = 'pedido-nombre';
    nombre.textContent = prod.nombre;

    const unidad = document.createElement('p');
    unidad.className = 'pedido-unidad';
    unidad.textContent = formatearPrecio(precioDe(prod)) + ' c/u';

    const renglon = document.createElement('div');
    renglon.className = 'd-flex justify-content-between align-items-center';

    const subtotal = document.createElement('span');
    subtotal.className = 'precio';
    subtotal.textContent = formatearPrecio(precioDe(prod) * cantidad);

    renglon.appendChild(crearControlCantidad(prod, cantidad));
    renglon.appendChild(subtotal);

    info.appendChild(nombre);
    info.appendChild(unidad);
    info.appendChild(renglon);

    const btnQuitar = document.createElement('button');
    btnQuitar.type = 'button';
    btnQuitar.className = 'btn-close pedido-quitar';
    btnQuitar.dataset.id = prod.id;
    btnQuitar.dataset.accion = 'quitar';
    btnQuitar.setAttribute('aria-label', 'Quitar ' + prod.nombre + ' del pedido');
    btnQuitar.onclick = () => eliminarDelCarrito(prod.id);

    item.appendChild(foto);
    item.appendChild(info);
    item.appendChild(btnQuitar);
    return item;
}

// --- Datos de entrega -------------------------------------------------------

const CAMPOS_ENTREGA = ['entrega-nombre', 'entrega-direccion', 'entrega-indicaciones'];

function valorDe(id) {
    return document.getElementById(id).value.trim();
}

function formaDePagoElegida() {
    const marcada = document.querySelector('input[name="entrega-pago"]:checked');
    return marcada ? marcada.value : '';
}

// Completa el formulario con lo que el cliente puso la última vez, para que
// en el próximo pedido no tenga que escribir todo de nuevo.
function prepararFormularioEntrega() {
    const guardada = leerGuardado(CLAVE_ENTREGA, {});
    CAMPOS_ENTREGA.forEach(id => {
        const campo = document.getElementById(id);
        campo.value = guardada[id] || '';
        campo.addEventListener('input', () => {
            campo.classList.remove('is-invalid');
            guardarEntrega();
        });
    });

    const pagos = document.getElementById('entrega-pagos');
    NEGOCIO.formasDePago.forEach((forma, posicion) => {
        const opcion = document.createElement('input');
        opcion.type = 'radio';
        opcion.className = 'btn-check';
        opcion.name = 'entrega-pago';
        opcion.id = 'entrega-pago-' + posicion;
        opcion.value = forma;
        opcion.checked = guardada.pago ? guardada.pago === forma : posicion === 0;

        const etiqueta = document.createElement('label');
        etiqueta.className = 'btn btn-outline-pediloya';
        etiqueta.htmlFor = opcion.id;
        etiqueta.textContent = forma;

        pagos.appendChild(opcion);
        pagos.appendChild(etiqueta);
    });
    // Por si la forma guardada ya no se ofrece.
    if (!formaDePagoElegida() && pagos.firstElementChild) pagos.firstElementChild.checked = true;

    pagos.addEventListener('change', () => {
        actualizarPagaCon();
        guardarEntrega();
    });
    document.getElementById('entrega-paga-con').addEventListener('input', evento => {
        evento.target.classList.remove('is-invalid');
    });
    actualizarPagaCon();
}

// "¿Con cuánto pagás?" solo tiene sentido si paga en efectivo.
function actualizarPagaCon() {
    mostrar('grupo-paga-con', formaDePagoElegida() === 'Efectivo');
}

function guardarEntrega() {
    const datos = { pago: formaDePagoElegida() };
    CAMPOS_ENTREGA.forEach(id => { datos[id] = valorDe(id); });
    guardar(CLAVE_ENTREGA, datos);
}

// Suma (o quita) la ubicación actual del cliente. Solo se usa para poner un
// link al mapa en el mensaje del pedido: no se guarda ni se manda a otro lado.
function alternarUbicacion() {
    const boton = document.getElementById('btn-ubicacion');
    const texto = document.getElementById('btn-ubicacion-texto');
    const estado = document.getElementById('ubicacion-estado');

    if (ubicacion) {
        ubicacion = null;
        texto.textContent = 'Sumar mi ubicación actual';
        estado.textContent = '';
        return;
    }
    if (!navigator.geolocation) {
        estado.textContent = 'Este navegador no permite compartir la ubicación. ' + PLAN_B_UBICACION;
        return;
    }

    const alEncontrar = posicion => {
        boton.disabled = false;
        ubicacion = {
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            precision: Math.round(posicion.coords.accuracy)
        };
        texto.textContent = 'Quitar mi ubicación';
        estado.textContent = ubicacion.precision > PRECISION_ACEPTABLE
            ? 'Listo, pero es aproximada (unos ' + ubicacion.precision + ' m). Revisá que la dirección esté bien escrita.'
            : 'Listo: el pedido va a llevar un link con tu ubicación en el mapa.';
    };
    const alFallar = error => {
        boton.disabled = false;
        estado.textContent = explicarErrorUbicacion(error) + ' ' + PLAN_B_UBICACION;
    };

    boton.disabled = true;
    estado.textContent = 'Buscando tu ubicación…';
    // Primero con el GPS. Bajo techo o con la ubicación del celular recién
    // prendida suele tardar o no encontrar nada; ahí se vuelve a probar con la
    // ubicación aproximada (wifi y antenas), que casi siempre responde.
    navigator.geolocation.getCurrentPosition(
        alEncontrar,
        error => {
            if (error.code === error.PERMISSION_DENIED) return alFallar(error);
            estado.textContent = 'Seguimos buscando tu ubicación…';
            navigator.geolocation.getCurrentPosition(
                alEncontrar,
                alFallar,
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 10 * 60 * 1000 }
            );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }
    );
}

// Cada falla se arregla distinto, así que se explica según el caso.
function explicarErrorUbicacion(error) {
    if (error.code !== error.PERMISSION_DENIED) {
        return 'No encontramos tu ubicación. Fijate que la ubicación del celular esté prendida y volvé a tocar el botón; cerca de una ventana anda mejor.';
    }
    const agente = navigator.userAgent;
    // Los navegadores que traen adentro Instagram, Facebook y otras apps no dejan compartirla.
    if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|; wv\)/i.test(agente)) {
        return 'Estás viendo la página dentro de otra app, que no deja compartir la ubicación. Abrila en Chrome o Safari desde el menú de la app (⋮ o …).';
    }
    if (/iPhone|iPad|iPod/.test(agente)) {
        return 'El iPhone tiene bloqueada la ubicación para el navegador. Entrá a Ajustes → Privacidad y seguridad → Localización, prendela y en tu navegador elegí "Al usar la app". Después recargá la página (tu pedido no se pierde) y volvé a tocar el botón.';
    }
    return 'El navegador tiene bloqueada la ubicación para esta página. Tocá el ícono que está al lado de la dirección de la página, entrá a Permisos y poné Ubicación en Permitir. Después recargá la página (tu pedido no se pierde) y volvé a tocar el botón.';
}

// --- Envío por WhatsApp -----------------------------------------------------

// Marca en rojo lo que falta y devuelve true si se puede enviar.
function validarEntrega() {
    const nombre = document.getElementById('entrega-nombre');
    const direccion = document.getElementById('entrega-direccion');
    const pagaCon = document.getElementById('entrega-paga-con');

    nombre.classList.toggle('is-invalid', !nombre.value.trim());
    direccion.classList.toggle('is-invalid', !direccion.value.trim());
    // Opcional, pero si lo completa tiene que alcanzar para pagar el pedido.
    const pagaConInvalido = formaDePagoElegida() === 'Efectivo'
        && pagaCon.value.trim() !== ''
        && !(Number(pagaCon.value) >= totalDelPedido());
    pagaCon.classList.toggle('is-invalid', pagaConInvalido);

    const primerError = document.querySelector('#form-entrega .is-invalid');
    if (primerError) primerError.focus();
    return !primerError;
}

function armarMensaje() {
    let mensaje = '¡Hola PediloYa! Quiero hacer este pedido:\n\n';
    carrito.forEach(item => {
        const prod = buscarProducto(item.id);
        mensaje += '*' + item.cantidad + 'x* ' + prod.nombre + ' - ' + formatearPrecio(precioDe(prod) * item.cantidad) + '\n';
    });
    mensaje += '\n*Total: ' + formatearPrecio(totalDelPedido()) + '*\n';

    mensaje += '\n*Datos de entrega*\n';
    mensaje += 'Nombre: ' + valorDe('entrega-nombre') + '\n';
    mensaje += 'Dirección: ' + valorDe('entrega-direccion') + '\n';
    if (valorDe('entrega-indicaciones')) mensaje += 'Indicaciones: ' + valorDe('entrega-indicaciones') + '\n';
    if (ubicacion) {
        mensaje += 'Ubicación: https://www.google.com/maps?q=' + ubicacion.latitud + ',' + ubicacion.longitud;
        if (ubicacion.precision > PRECISION_ACEPTABLE) mensaje += ' (aproximada, unos ' + ubicacion.precision + ' m)';
        mensaje += '\n';
    }

    const pago = formaDePagoElegida();
    if (pago) {
        const pagaCon = valorDe('entrega-paga-con');
        mensaje += 'Pago: ' + pago;
        if (pago === 'Efectivo' && pagaCon) mensaje += ' (pago con ' + formatearPrecio(pagaCon) + ')';
        mensaje += '\n';
    }

    mensaje += '\n¿Me confirmás el tiempo de demora?';
    return mensaje;
}

function enviarPedidoWhatsApp(evento) {
    evento.preventDefault();
    if (carrito.length === 0) return;
    if (!validarEntrega()) return;
    guardarEntrega();
    window.open('https://wa.me/' + NEGOCIO.whatsapp + '?text=' + encodeURIComponent(armarMensaje()), '_blank', 'noopener');
}
