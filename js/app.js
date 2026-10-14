let productos = [];
let carrito = [];
let productosMostrados = [];

document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('preloader');
    const logoPreloader = document.getElementById('logo-preloader');

    setTimeout(() => { if(logoPreloader) logoPreloader.classList.add('mostrar-logo'); }, 500);
    setTimeout(() => { if(preloader) preloader.classList.add('ocultar-preloader'); }, 1600);

    // Los productos llegan ya en el orden en que se muestran (ver api.js).
    obtenerProductos()
        .then(lista => {
            productos = lista;
            productosMostrados = [...productos];
            renderizarCatalogo(productosMostrados);
        })
        .catch(err => {
            console.error('Error al cargar datos:', err);
            mostrarErrorDeCarga();
        });
});

function mostrarErrorDeCarga() {
    const contenedor = document.getElementById('catalogo-container');
    if(!contenedor) return;
    const aviso = document.createElement('p');
    aviso.className = 'text-center text-white-50 py-5';
    aviso.textContent = 'No pudimos cargar los productos. Revisá tu conexión y recargá la página.';
    contenedor.appendChild(aviso);
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('catalogo-container');
    if(!contenedor) return;
    contenedor.innerHTML = '';

    lista.forEach(prod => {
        const precioFinal = prod.precio_promo ? prod.precio_promo : prod.precio;
        const itemEnCarrito = carrito.find(p => p.id === prod.id);

        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';

        const card = document.createElement('div');
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

        if (prod.imagen_url) {
            const img = document.createElement('img');
            img.src = prod.imagen_url;
            img.alt = prod.nombre;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center';
            imgContainer.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.className = 'text-muted';
            span.textContent = 'Sin Imagen';
            imgContainer.appendChild(span);
        }

        const body = document.createElement('div');
        body.className = 'p-3 d-flex flex-column flex-grow-1';

        const title = document.createElement('h6');
        title.className = 'mb-1 text-light';
        title.textContent = prod.nombre;

        const mtAuto = document.createElement('div');
        mtAuto.className = 'mt-auto';

        if (prod.precio_promo) {
            const tachado = document.createElement('small');
            tachado.className = 'text-white-50 text-decoration-line-through mb-1 d-block';
            tachado.style.fontSize = '0.9em';
            tachado.textContent = '$' + prod.precio;
            mtAuto.appendChild(tachado);
        }

        const precioTxt = document.createElement('h5');
        precioTxt.className = 'text-pediloya mb-3';
        precioTxt.textContent = '$' + precioFinal;
        mtAuto.appendChild(precioTxt);

        if (!prod.disponible) {
            const btnAgotado = document.createElement('button');
            btnAgotado.className = 'btn btn-sm btn-outline-secondary w-100';
            btnAgotado.textContent = 'Sin stock';
            btnAgotado.disabled = true;
            mtAuto.appendChild(btnAgotado);
        } else if (itemEnCarrito) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'd-flex justify-content-between align-items-center w-100 bg-black rounded border border-pediloya';
            
            const btnRestar = document.createElement('button');
            btnRestar.className = 'btn btn-sm text-pediloya fw-bold px-3 py-1 border-0';
            btnRestar.textContent = '-';
            btnRestar.onclick = () => restarDelCarrito(prod.id);

            const spanCant = document.createElement('span');
            spanCant.className = 'fw-bold text-light';
            spanCant.textContent = itemEnCarrito.cantidad;

            const btnSumar = document.createElement('button');
            btnSumar.className = 'btn btn-sm text-pediloya fw-bold px-3 py-1 border-0';
            btnSumar.textContent = '+';
            btnSumar.onclick = () => agregarAlCarrito(prod.id);

            btnGroup.appendChild(btnRestar);
            btnGroup.appendChild(spanCant);
            btnGroup.appendChild(btnSumar);
            mtAuto.appendChild(btnGroup);
        } else {
            const btnAgregar = document.createElement('button');
            btnAgregar.className = 'btn btn-sm btn-outline-pediloya w-100';
            btnAgregar.textContent = 'Agregar';
            btnAgregar.onclick = () => agregarAlCarrito(prod.id);
            mtAuto.appendChild(btnAgregar);
        }

        body.appendChild(title);
        body.appendChild(mtAuto);
        card.appendChild(imgContainer);
        card.appendChild(body);
        col.appendChild(card);
        contenedor.appendChild(col);
    });
}

function filtrar(categoria) {
    const btnClickeado = event ? event.currentTarget : null;
    document.querySelectorAll('#filtros .btn').forEach(btn => {
        btn.classList.remove('active', 'btn-pediloya');
        btn.classList.add('btn-outline-pediloya');
    });
    if (btnClickeado) {
        btnClickeado.classList.remove('btn-outline-pediloya');
        btnClickeado.classList.add('active', 'btn-pediloya');
    }
    if (categoria === 'Todos') {
        productosMostrados = [...productos];
    } else if (categoria === 'Promos') {
        productosMostrados = productos.filter(p => p.precio_promo);
    } else {
        productosMostrados = productos.filter(p => p.categoria === categoria);
    }
    renderizarCatalogo(productosMostrados);
}

function agregarAlCarrito(id) {
    const itemExistente = carrito.find(p => p.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        const prod = productos.find(p => p.id === id);
        if (!prod) return;
        carrito.push({ ...prod, precioVenta: (prod.precio_promo || prod.precio), cantidad: 1 });
    }
    actualizarCarrito();
    renderizarCatalogo(productosMostrados);
}

function restarDelCarrito(id) {
    const item = carrito.find(p => p.id === id);
    if (item) {
        if (item.cantidad > 1) item.cantidad--;
        else carrito = carrito.filter(p => p.id !== id);
    }
    actualizarCarrito();
    renderizarCatalogo(productosMostrados);
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(p => p.id !== id);
    actualizarCarrito();
    renderizarCatalogo(productosMostrados);
}

function actualizarCarrito() {
    const contenedor = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    const countElement = document.getElementById('cart-count'); 
    const btnFlotante = document.getElementById('btn-flotante-carrito');
    const countFlotante = document.getElementById('cart-count-flotante');
    
    if(!contenedor) return;
    contenedor.innerHTML = '';
    let total = 0;
    let cantidadTotalArticulos = 0;

    carrito.forEach(item => {
        const subtotal = item.precioVenta * item.cantidad;
        total += subtotal;
        cantidadTotalArticulos += item.cantidad;

        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center mb-2 bg-black p-2 rounded border border-secondary border-opacity-25';
        
        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.paddingRight = '10px';
        
        const title = document.createElement('small');
        title.className = 'd-block lh-sm mb-1';
        title.textContent = item.nombre;
        
        const price = document.createElement('span');
        price.className = 'text-pediloya fw-bold';
        price.textContent = '$' + subtotal;
        
        infoDiv.appendChild(title);
        infoDiv.appendChild(price);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center gap-2';
        
        const btnMinus = document.createElement('button');
        btnMinus.className = 'btn btn-sm btn-outline-light py-0 px-2';
        btnMinus.textContent = '-';
        btnMinus.onclick = () => restarDelCarrito(item.id);
        
        const spanQty = document.createElement('span');
        spanQty.className = 'fw-bold text-light';
        spanQty.textContent = item.cantidad;
        
        const btnPlus = document.createElement('button');
        btnPlus.className = 'btn btn-sm btn-pediloya py-0 px-2 text-black';
        btnPlus.textContent = '+';
        btnPlus.onclick = () => agregarAlCarrito(item.id);
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-sm btn-danger py-0 px-2 ms-2';
        btnDel.textContent = 'X';
        btnDel.onclick = () => eliminarDelCarrito(item.id);
        
        controlsDiv.appendChild(btnMinus);
        controlsDiv.appendChild(spanQty);
        controlsDiv.appendChild(btnPlus);
        controlsDiv.appendChild(btnDel);
        
        div.appendChild(infoDiv);
        div.appendChild(controlsDiv);
        contenedor.appendChild(div);
    });

    if(totalElement) totalElement.textContent = '$' + total;
    if(countElement) countElement.textContent = cantidadTotalArticulos;
    if(countFlotante) countFlotante.textContent = cantidadTotalArticulos;

    if (btnFlotante) {
        if (carrito.length > 0) btnFlotante.classList.remove('d-none');
        else btnFlotante.classList.add('d-none');
    }
}

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;
    let mensaje = '¡Hola PediloYa! Quiero hacer este pedido:\n\n';
    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precioVenta * item.cantidad;
        mensaje += '*' + item.cantidad + 'x* ' + item.nombre + ' - $' + subtotal + '\n';
        total += subtotal;
    });
    mensaje += '\n*Total a pagar: $' + total + '*\n\n¿Me confirmas el tiempo de demora y cómo te lo pago?';
    window.open('https://wa.me/5493885830234?text=' + encodeURIComponent(mensaje), '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    const carritoOffcanvas = document.getElementById('carritoOffcanvas');
    const btnFlotante = document.getElementById('btn-flotante-carrito');
    if (carritoOffcanvas && btnFlotante) {
        carritoOffcanvas.addEventListener('show.bs.offcanvas', () => { btnFlotante.style.display = 'none'; });
        carritoOffcanvas.addEventListener('hidden.bs.offcanvas', () => { if (carrito.length > 0) btnFlotante.style.display = 'block'; });
    }
});