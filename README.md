# catalogo-pediloya

Catálogo de PediloYa con pedido por WhatsApp y panel de administrador.

- `index.html`: el catálogo público, con buscador y filtros. El cliente arma el pedido,
  completa nombre, dirección, indicaciones y forma de pago, y lo envía por WhatsApp.
- `admin.html`: el panel. Permite agregar, editar y borrar productos, marcarlos sin stock
  y elegir el orden en que se ven en la página de inicio.
- `supabase/`: las tablas y los permisos de la base.

Cómo conectar el panel con la base y cómo probarlo en tu PC: ver [DESPLIEGUE.md](DESPLIEGUE.md).
