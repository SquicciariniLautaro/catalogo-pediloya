let productos = [];
let carrito = [];
let productosMostrados = [];

const urlGoogleSheets = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyizdc2peg8eyYkmf0EPVVum7tMve6mhzAjYLoUQ13KS0RkHN6UKvQT1eIiaSSQgHIkAOlPzLJUft4/pub?output=csv';

document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('preloader');
    const logoPreloader = document.getElementById('logo-preloader');
    
    setTimeout(() => { if(logoPreloader) logoPreloader.classList.add('mostrar-logo'); }, 500);
    setTimeout(() => { if(preloader) preloader.classList.add('ocultar-preloader'); }, 1600);

    fetch(urlGoogleSheets)
        .then(res => res.text())
        .then(csv => {
            productos = parsearCSV(csv);
            productosMostrados = [...productos];
            renderizarCatalogo(productosMostrados);
        })
        .catch(err => console.error('Error al cargar datos:', err));
});

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

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('catalogo-container');
    if(!contenedor) return;
    contenedor.innerHTML = '';

    lista.sort((a, b) => {
        if (a.Destacado === 'Sí' && b.Destacado !== 'Sí') return -1;
        if (a.Destacado !== 'Sí' && b.Destacado === 'Sí') return 1;
        return 0;
    });

    lista.forEach(prod => {
        const precioFinal = prod.Precio_Promo ? prod.Precio_Promo : prod.Precio;
        const itemEnCarrito = carrito.find(p => p.ID === prod.ID);

        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';

        const card = document.createElement('div');
        card.className = 'card-producto h-100 d-flex flex-column';

        const imgContainer = document.createElement('div');
        imgContainer.className = 'img-container';

        if (prod.Precio_Promo) {
            const promo = document.createElement('div');
            promo.className = 'etiqueta-promo';
            promo.textContent = '¡Promo!';
            imgContainer.appendChild(promo);
        }

        if (prod.Imagen_URL) {
            const img = document.createElement('img');
            img.src = prod.Imagen_URL;
            img.alt = prod.Nombre;
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
        title.textContent = prod.Nombre;

        const mtAuto = document.createElement('div');
        mtAuto.className = 'mt-auto';

        if (prod.Precio_Promo) {
            const tachado = document.createElement('small');
            tachado.className = 'text-white-50 text-decoration-line-through mb-1 d-block';
            tachado.style.fontSize = '0.9em';
            tachado.textContent = '$' + prod.Precio;
            mtAuto.appendChild(tachado);
        }

        const precioTxt = document.createElement('h5');
        precioTxt.className = 'text-pediloya mb-3';
        precioTxt.textContent = '$' + precioFinal;
        mtAuto.appendChild(precioTxt);

        if (itemEnCarrito) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'd-flex justify-content-between align-items-center w-100 bg-black rounded border border-pediloya';
            
            const btnRestar = document.createElement('button');
            btnRestar.className = 'btn btn-sm text-pediloya fw-bold px-3 py-1 border-0';
            btnRestar.textContent = '-';
            btnRestar.onclick = () => restarDelCarrito(prod.ID);

            const spanCant = document.createElement('span');
            spanCant.className = 'fw-bold text-light';
            spanCant.textContent = itemEnCarrito.cantidad;

            const btnSumar = document.createElement('button');
            btnSumar.className = 'btn btn-sm text-pediloya fw-bold px-3 py-1 border-0';
            btnSumar.textContent = '+';
            btnSumar.onclick = () => agregarAlCarrito(prod.ID);

            btnGroup.appendChild(btnRestar);
            btnGroup.appendChild(spanCant);
            btnGroup.appendChild(btnSumar);
            mtAuto.appendChild(btnGroup);
        } else {
            const btnAgregar = document.createElement('button');
            btnAgregar.className = 'btn btn-sm btn-outline-pediloya w-100';
            btnAgregar.textContent = 'Agregar';
            btnAgregar.onclick = () => agregarAlCarrito(prod.ID);
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
        productosMostrados = productos.filter(p => p.Precio_Promo !== '');
    } else {
        productosMostrados = productos.filter(p => p.Categoria === categoria);
    }
    renderizarCatalogo(productosMostrados);
}

function agregarAlCarrito(id) {
    const itemExistente = carrito.find(p => p.ID === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        const prod = productos.find(p => p.ID === id);
        if (!prod) return;
        carrito.push({ ...prod, precioVenta: (prod.Precio_Promo || prod.Precio), cantidad: 1 });
    }
    actualizarCarrito();
    renderizarCatalogo(productosMostrados);
}

function restarDelCarrito(id) {
    const item = carrito.find(p => p.ID === id);
    if (item) {
        if (item.cantidad > 1) item.cantidad--;
        else carrito = carrito.filter(p => p.ID !== id);
    }
    actualizarCarrito();
    renderizarCatalogo(productosMostrados);
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(p => p.ID !== id);
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
        title.textContent = item.Nombre;
        
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
        btnMinus.onclick = () => restarDelCarrito(item.ID);
        
        const spanQty = document.createElement('span');
        spanQty.className = 'fw-bold text-light';
        spanQty.textContent = item.cantidad;
        
        const btnPlus = document.createElement('button');
        btnPlus.className = 'btn btn-sm btn-pediloya py-0 px-2 text-black';
        btnPlus.textContent = '+';
        btnPlus.onclick = () => agregarAlCarrito(item.ID);
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-sm btn-danger py-0 px-2 ms-2';
        btnDel.textContent = 'X';
        btnDel.onclick = () => eliminarDelCarrito(item.ID);
        
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
        mensaje += '*' + item.cantidad + 'x* ' + item.Nombre + ' - $' + subtotal + '\n';
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