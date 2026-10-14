# Puesta en marcha del panel

Cómo queda repartido:

| Pieza | Dónde vive |
| --- | --- |
| Productos, fotos, usuarios y permisos | Supabase |
| Catálogo (`index.html`) y panel (`admin.html`) | GitHub Pages: `https://squicciarinilautaro.github.io/catalogo-pediloya/` |

El navegador habla directo con Supabase. No hay servidor propio en el medio: lo que cada
uno puede ver o cambiar lo deciden los permisos escritos en `supabase/migrations/`.

Mientras `js/config.js` esté vacío, el catálogo sigue leyendo la planilla de Google como
hasta ahora y el panel avisa que falta conectarlo. Publicar este código antes de terminar
los pasos no rompe nada.

Los nombres de botones pueden variar según la versión del panel de Supabase.

---

## Paso 1 - Crear el proyecto en Supabase

1. supabase.com → `New project`.
2. *Name*: `pediloya`. *Region*: `South America (São Paulo)`, la más cercana.
3. *Database Password*: usá `Generate a password` y guardala en un gestor de contraseñas.
   No va en el código ni en ningún chat; el sitio no la usa.
4. `Create new project` y esperá un par de minutos.

A tener en cuenta del plan gratuito: admite dos proyectos activos, **pausa el proyecto si
pasa una semana sin uso** y no hace copias de seguridad automáticas. Cada visita al
catálogo cuenta como uso, así que con clientes entrando no se pausa; si el negocio cierra
una temporada, hay que reactivarlo a mano desde supabase.com.

## Paso 2 - Crear las tablas y los permisos

1. En el proyecto: `SQL Editor` → `New query`.
2. Abrí `supabase/migrations/20261013000000_inicial.sql`, copiá **todo** y pegalo.
3. `Run`. Tiene que decir *Success. No rows returned*.

Comprobación: en `Table Editor` aparecen `productos` y `administradores`, las dos con
*RLS enabled*, y en `Storage` aparece el bucket `productos`.

## Paso 3 - Cargar los productos actuales

Igual que el paso 2, con `supabase/datos_iniciales.sql`. Carga los 23 productos que tenía
la planilla, en el mismo orden en que se ven hoy. Si la tabla ya tiene productos no hace
nada, así que no se duplican.

## Paso 4 - Cerrar el registro de usuarios

`Authentication` → `Sign In / Providers`:

- **Allow new users to sign up**: apagado. Nadie puede crearse una cuenta solo.
- **Confirm email**: prendido.

## Paso 5 - Crear los administradores

Una vez por persona que vaya a usar el panel.

1. En el `SQL Editor`, con el correo **en minúsculas**:

   ```sql
   insert into public.administradores (correo) values ('correo@ejemplo.com');
   ```

2. `Authentication` → `Users` → `Add user` → `Create new user`:
   - *Email*: el mismo correo.
   - *Password*: la escribe cada uno, o se la pasás por un canal privado.
   - *Auto Confirm User*: marcado.

Un usuario cuyo correo no figura en `administradores` puede iniciar sesión pero no puede
cambiar nada. Los correos no van en el código porque este repositorio es público.

## Paso 6 - Conectar el sitio

1. En Supabase: `Project Settings` → `API Keys` (o el botón `Connect`). Copiá:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **Publishable key** (empieza con `sb_publishable_`). Sirve también la `anon`.

   Nunca copies la `secret` ni la `service_role`: saltean todos los permisos.
2. Pegá los dos valores en `js/config.js`.
3. Subí el cambio a `main`. GitHub Pages lo publica solo en un par de minutos.

Desde ese momento el catálogo lee de Supabase y la planilla de Google deja de usarse.

## Paso 7 - Comprobaciones

- [ ] El catálogo muestra los productos en el mismo orden que antes.
- [ ] `…/catalogo-pediloya/admin.html` deja entrar con un administrador.
- [ ] Agregar un producto con foto, editarlo, moverlo de lugar y borrarlo; después de cada
      cambio, recargar el catálogo y ver que se refleja.
- [ ] Marcar un producto sin stock: en el catálogo aparece gris y no se puede pedir.
- [ ] Lo mismo desde un celular.
- [ ] Probar entrar con un correo que no es administrador: no tiene que dejar.

---

## Cómo se usa el panel

- **Orden de la página de inicio**: la lista del panel está en el mismo orden que el
  catálogo. Se cambia arrastrando un producto desde `⠿` o con las flechas `↑` `↓`. Se guarda
  solo.
- **Agregar**: el producto nuevo entra al final de la lista; después se lo sube adonde haga
  falta.
- **Fotos**: se eligen desde el celular o la PC. El panel las achica antes de subirlas
  (800 px de lado máximo), así que no hace falta prepararlas.
- **Promo**: si se completa *Precio promo*, el catálogo muestra el precio tachado, el de
  promo y la etiqueta *¡Promo!*, y el producto aparece en el filtro *Promos*.
- **Categorías**: son las tres del formulario. Para sumar una hay que agregarla en dos
  lugares: el botón de filtro en `index.html` y la opción del desplegable en `admin.html`.

## Datos del negocio

Están en `js/config.js`, en `NEGOCIO`:

- `whatsapp`: el número que recibe los pedidos, con código de país y sin `+` ni espacios.
- `formasDePago`: las opciones que ve el cliente al armar el pedido. Si figura `Efectivo`,
  el formulario pregunta además con cuánto paga, para llevar el vuelto.

Si el sitio se muda a un dominio propio, hay que cambiar las dos direcciones `og:url` y
`og:image` del `<head>` de `index.html`: son las que usan WhatsApp e Instagram para armar
la vista previa del link.

## Probar en tu PC sin tocar los datos reales

Con `js/config.js` vacío, el sitio abierto en tu PC funciona en **modo prueba**: el panel
guarda los productos en el navegador (arranca con lo que haya en la planilla) y el
catálogo los lee de ahí. El ingreso acepta cualquier correo y contraseña. Sirve para
mostrarle el panel al cliente o probar un cambio sin riesgo.

```bash
python -m http.server 5500
```

y abrí `http://localhost:5500/admin.html`. Este modo no se activa en el sitio publicado.
Una vez cargados los datos en `js/config.js`, el sitio abierto en tu PC trabaja contra la
base real.

## Cambios en la base más adelante

Cada cambio es un archivo nuevo en `supabase/migrations/`, que se pega en el `SQL Editor`.
Una migración ya aplicada no se edita: se agrega otra.
