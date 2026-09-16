let productos = [];
let carrito = [];

const urlGoogleSheets = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyizdc2peg8eyYkmf0EPVVum7tMve6mhzAjYLoUQ13KS0RkHN6UKvQT1eIiaSSQgHIkAOlPzLJUft4/pub?output=csv';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE LA ANIMACIÓN DE ENTRADA ---
    const preloader = document.getElementById('preloader');
    const logoPreloader = document.getElementById('logo-preloader');
    
    // Mostramos el logo 1 segundo después (cuando la moto está pasando)
    setTimeout(() => {
        logoPreloader.classList.add('mostrar-logo');
    }, 700);

    // Ocultamos toda la pantalla amarilla a los 2.8 segundos para mostrar el catálogo
    setTimeout(() => {
        preloader.classList.add('ocultar-preloader');
    }, 1700);
    // -----------------------------------------

    // --- CARGA DE DATOS DE GOOGLE SHEETS ---
    fetch(urlGoogleSheets)
        .then(res => res.text()) // Leemos el CSV
        .then(csv => {
            productos = parsearCSV(csv);
            renderizarCatalogo(productos);
        })
        .catch(err => console.error("Error al cargar productos:", err));
});

// Función que convierte el CSV de Google Sheets en datos para tu web
function parsearCSV(csv) {
    const lineas = csv.split('\n');
    const headers = lineas[0].split(',');
    const data = [];
    
    // Empezamos desde 1 para saltar la fila de los títulos (headers)
    for(let i = 1; i < lineas.length; i++) {
        if(!lineas[i].trim()) continue;
        const valores = lineas[i].split(',');
        let obj = {};
        
        headers.forEach((h, index) => {
            // Limpiamos espacios y caracteres ocultos
            let headerLimpio = h.trim().replace('\r', '');
            let valor = valores[index] ? valores[index].trim().replace('\r', '') : "";
            
            // Si es la columna Precio o Precio_Promo, lo convertimos a número
            if (headerLimpio === 'Precio' || headerLimpio === 'Precio_Promo') {
                valor = valor ? Number(valor) : "";
            }
            
            obj[headerLimpio] = valor;
        });
        data.push(obj);
    }
    return data;
}

// ESTA ES LA FUNCIÓN QUE FALTABA
function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('catalogo-container');
    contenedor.innerHTML = '';
    
    lista.sort((a, b) => {
        if (a.Destacado === 'Sí' && b.Destacado !== 'Sí') return -1;
        if (a.Destacado !== 'Sí' && b.Destacado === 'Sí') return 1;
        return 0; // Si son iguales, los deja como están
    });

    lista.forEach(prod => {
        let precioFinal = prod.Precio_Promo ? prod.Precio_Promo : prod.Precio;
        let htmlPromo = prod.Precio_Promo 
            ? `<div class="etiqueta-promo">¡Promo!</div>` 
            : '';
        
        let htmlPrecioOriginal = prod.Precio_Promo 
            ? `<small class="text-muted text-decoration-line-through">$${prod.Precio}</small>` 
            : '';

        // Si hay una URL en el Excel, la usa. Si no, muestra un recuadro gris.
        let htmlImagen = prod.Imagen_URL 
            ? `<img src="${prod.Imagen_URL}" alt="${prod.Nombre}" class="img-fluid p-3" style="max-height: 100%; object-fit: contain;">`
            : `<span class="text-muted">Sin Imagen</span>`;

        const card = document.createElement('div');
        card.className = 'col-6 col-md-4 col-lg-3';
        card.innerHTML = `
            <div class="card-producto h-100 d-flex flex-column">
                <div class="img-container">
                    ${htmlPromo}
                    ${htmlImagen}
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
    const btnClickeado = event.currentTarget;
    
    document.querySelectorAll('#filtros .btn').forEach(btn => {
        btn.classList.remove('active', 'btn-pediloya');
        btn.classList.add('btn-outline-pediloya');
    });

    btnClickeado.classList.remove('btn-outline-pediloya');
    btnClickeado.classList.add('active', 'btn-pediloya');

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
    const countElement = document.getElementById('cart-count'); 
    
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
    
    countElement.innerText = carrito.length;
    if (countFlotante) countFlotante.innerText = carrito.length;

    if (carrito.length > 0) {
        btnFlotante.classList.remove('d-none');
    } else {
        btnFlotante.classList.add('d-none');
    }
}

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

    const numeroWhatsApp = "5493885830234";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(url, '_blank');
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

document.addEventListener('DOMContentLoaded', () => {
    const carritoOffcanvas = document.getElementById('carritoOffcanvas');
    const btnFlotante = document.getElementById('btn-flotante-carrito');

    carritoOffcanvas.addEventListener('show.bs.offcanvas', event => {
        btnFlotante.style.display = 'none';
    });

    carritoOffcanvas.addEventListener('hidden.bs.offcanvas', event => {
        if (carrito.length > 0) {
            btnFlotante.style.display = 'block';
        }
    });
});