let productos = [];
let carrito = [];

// Cargar datos
document.addEventListener('DOMContentLoaded', () => {
    // Aquí luego cambiaremos 'productos.json' por la URL de la API de Google Sheets
    fetch('productos.json')
        .then(res => res.json())
        .then(data => {
            productos = data;
            renderizarCatalogo(productos);
        })
        .catch(err => console.error("Error al cargar productos:", err));
});

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('catalogo-container');
    contenedor.innerHTML = '';

    lista.forEach(prod => {
        // Lógica para precios y promociones
        let precioFinal = prod.Precio_Promo ? prod.Precio_Promo : prod.Precio;
        let htmlPromo = prod.Precio_Promo 
            ? `<div class="etiqueta-promo">¡Promo!</div>` 
            : '';
        
        let htmlPrecioOriginal = prod.Precio_Promo 
            ? `<small class="text-muted text-decoration-line-through">$${prod.Precio}</small>` 
            : '';

        const card = document.createElement('div');
        card.className = 'col-6 col-md-4 col-lg-3';
        card.innerHTML = `
            <div class="card-producto h-100 d-flex flex-column">
                <div class="img-container">
                    ${htmlPromo}
                    <img src="${prod.Imagen_URL}" alt="${prod.Nombre}" class="img-fluid p-3" style="max-height: 100%; object-fit: contain;">
                </div>
                <div class="p-3 d-flex flex-column flex-grow-1">
                    <h6 class="mb-1">${prod.Nombre}</h6>
                    <div class="mt-auto">
                        ${htmlPrecioOriginal}
                        <h5 class="text-pediloya mb-2">$${precioFinal}</h5>
                        <button class="btn btn-sm btn-outline-pediloya w-100" onclick="agregarAlCarrito('${prod.ID}')">Agregar</button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function filtrar(categoria) {
    // Capturamos el botón exacto al que le hicieron clic
    const btnClickeado = event.currentTarget;
    
    // 1. Reiniciar todos los botones: les quitamos el fondo sólido y les devolvemos el borde (outline)
    document.querySelectorAll('#filtros .btn').forEach(btn => {
        btn.classList.remove('active', 'btn-pediloya');
        btn.classList.add('btn-outline-pediloya');
    });

    // 2. Al botón clickeado: le quitamos el borde y le ponemos el fondo amarillo sólido
    btnClickeado.classList.remove('btn-outline-pediloya');
    btnClickeado.classList.add('active', 'btn-pediloya');

    // 3. Filtrar el catálogo
    if (categoria === 'Todos') {
        renderizarCatalogo(productos);
    } else if (categoria === 'Promos') {
        const promos = productos.filter(p => p.Precio_Promo !== "");
        renderizarCatalogo(promos);
    } else {
        const filtrados = productos.filter(p => p.Categoria === categoria);
        renderizarCatalogo(filtrados);
    }
}

function agregarAlCarrito(id) {
    const producto = productos.find(p => p.ID === id);
    const precio = producto.Precio_Promo ? producto.Precio_Promo : producto.Precio;
    
    carrito.push({ ...producto, precioVenta: precio });
    actualizarCarrito();
}

function actualizarCarrito() {
    const contenedor = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    const countElement = document.getElementById('cart-count'); // El de la barra superior
    
    // Capturamos los elementos del botón flotante
    const btnFlotante = document.getElementById('btn-flotante-carrito');
    const countFlotante = document.getElementById('cart-count-flotante');
    
    contenedor.innerHTML = '';
    let total = 0;

    carrito.forEach((item, index) => {
        total += item.precioVenta;
        contenedor.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 bg-black p-2 rounded">
                <small>${item.Nombre}</small>
                <div class="d-flex align-items-center">
                    <span class="text-pediloya me-2">$${item.precioVenta}</span>
                    <button class="btn btn-sm btn-danger py-0 px-2" onclick="eliminarDelCarrito(${index})">X</button>
                </div>
            </div>
        `;
    });

    totalElement.innerText = `$${total}`;
    
    // Actualizamos los números de los carritos
    countElement.innerText = carrito.length;
    if (countFlotante) countFlotante.innerText = carrito.length;

    // Lógica para mostrar/ocultar el botón flotante
    if (carrito.length > 0) {
        btnFlotante.classList.remove('d-none');
    } else {
        btnFlotante.classList.add('d-none');
    }
}

// Enviar pedido a WhatsApp
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;

    let mensaje = "¡Hola PediloYa! Quiero hacer este pedido:\n\n";
    let total = 0;

    carrito.forEach(item => {
        mensaje += `1x ${item.Nombre} - $${item.precioVenta}\n`;
        total += item.precioVenta;
    });

    mensaje += `\n*Total a pagar: $${total}*\n\n`;
    mensaje += "¿Me confirmas el tiempo de demora y cómo te lo pago?";

    // Número formateado con el código de Argentina (54) y el área (9)
    const numeroWhatsApp = "5493885830234";
    
    // encodeURIComponent convierte los espacios y saltos de línea para que la URL sea válida
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(url, '_blank');
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// Manejo visual del botón flotante cuando se abre/cierra el carrito
document.addEventListener('DOMContentLoaded', () => {
    
    // Capturamos el panel lateral (Offcanvas)
    const carritoOffcanvas = document.getElementById('carritoOffcanvas');
    const btnFlotante = document.getElementById('btn-flotante-carrito');

    // Evento de Bootstrap: Cuando el panel empieza a ABRIRSE
    carritoOffcanvas.addEventListener('show.bs.offcanvas', event => {
        // Ocultamos el botón flotante forzosamente
        btnFlotante.style.display = 'none';
    });

    // Evento de Bootstrap: Cuando el panel termina de CERRARSE
    carritoOffcanvas.addEventListener('hidden.bs.offcanvas', event => {
        // Solo lo volvemos a mostrar si hay cosas en el carrito
        if (carrito.length > 0) {
            btnFlotante.style.display = 'block';
        }
    });
});