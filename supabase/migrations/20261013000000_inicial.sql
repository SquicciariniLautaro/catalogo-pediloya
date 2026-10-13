-- 20261013000000_inicial.sql
-- Base de PediloYa en Supabase (Postgres): los productos del catálogo, quién
-- puede administrarlos y dónde se guardan las fotos.
-- Se puede correr más de una vez sin romper nada. Una vez aplicada no se
-- edita: cualquier cambio posterior va en un archivo nuevo dentro de
-- supabase/migrations/.
--
-- CÓMO SE PROTEGEN LOS DATOS
-- El navegador habla directo con la base, así que la seguridad vive acá
-- adentro y no en el frontend:
--   * Todas las tablas tienen RLS activado ("seguridad por fila"): cada tabla
--     tiene reglas ("políticas") que dicen quién puede ver o cambiar cada fila.
--   * Un visitante sin sesión (rol "anon") solo puede LEER los productos.
--   * Un usuario con sesión (rol "authenticated") solo puede escribir si
--     es_admin() dice que sí.

-- ---------------------------------------------------------------------------
-- productos: una fila por producto del catálogo.
-- ---------------------------------------------------------------------------
create table if not exists public.productos (
  id           bigint generated always as identity primary key,
  nombre       text        not null,
  categoria    text        not null,                 -- 'Con Alcohol', 'Sin Alcohol', 'Kiosco'
  precio       integer     not null,                 -- en pesos, sin centavos
  precio_promo integer,                              -- NULL = no está en promo
  imagen_url   text        not null default '',      -- '' = sin foto
  disponible   boolean     not null default true,    -- false = se muestra "Sin stock"
  -- Posición en la página de inicio: el de menor número va primero.
  orden        integer     not null default 0,
  creado       timestamptz not null default now(),

  constraint productos_largos
    check (char_length(nombre) between 1 and 80 and char_length(categoria) between 1 and 40
       and char_length(imagen_url) <= 500),
  constraint productos_precio_valido check (precio > 0),
  constraint productos_promo_valida
    check (precio_promo is null or (precio_promo > 0 and precio_promo < precio)),
  constraint productos_imagen_segura check (imagen_url = '' or imagen_url like 'https://%')
);

create index if not exists productos_orden on public.productos (orden, id);

-- ---------------------------------------------------------------------------
-- administradores: correos que pueden usar el panel.
-- Las contraseñas NO están acá: las guarda Supabase en su sistema de usuarios
-- (Authentication). Esta tabla solo dice cuáles de esos usuarios son
-- administradores. Un usuario que no figura acá puede iniciar sesión pero no
-- puede cambiar nada.
-- Se carga a mano desde el SQL Editor (ver DESPLIEGUE.md): este repositorio es
-- público y los correos no van en el código.
-- ---------------------------------------------------------------------------
create table if not exists public.administradores (
  correo text        primary key,                    -- siempre en minúsculas
  creado timestamptz not null default now(),
  constraint administradores_minusculas check (correo = lower(correo))
);

-- ---------------------------------------------------------------------------
-- es_admin(): true si quien llama tiene sesión, su correo está confirmado y
-- figura en "administradores".
--
-- "security definer" hace que la función corra con los permisos de su dueño y
-- no con los de quien la llama: así puede leer la tabla de usuarios de
-- Supabase, que un usuario común no ve. "set search_path = ''" obliga a
-- escribir cada tabla con su esquema adelante y evita que alguien la engañe
-- con una tabla del mismo nombre.
-- ---------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from auth.users usuario
      join public.administradores administrador
        on administrador.correo = lower(usuario.email)
     where usuario.id = (select auth.uid())
       -- Sin esto, alguien podría registrarse con un correo ajeno sin demostrar que es suyo.
       and usuario.email_confirmed_at is not null
  );
$$;

-- ---------------------------------------------------------------------------
-- reordenar_productos(): recibe los ids en el orden en que tienen que verse y
-- le pone a cada producto su posición (1, 2, 3...). Todo junto o nada.
-- ---------------------------------------------------------------------------
create or replace function public.reordenar_productos(p_ids bigint[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No tenés permiso para hacer eso.' using errcode = '42501';
  end if;

  update public.productos producto
     set orden = lista.posicion
    from unnest(p_ids) with ordinality as lista(id, posicion)
   where producto.id = lista.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

revoke all on function public.reordenar_productos(bigint[]) from public, anon;
grant execute on function public.reordenar_productos(bigint[]) to authenticated;

revoke all on table public.productos, public.administradores from anon, authenticated;
grant select on table public.productos to anon, authenticated;
grant insert, update, delete on table public.productos to authenticated;
-- "administradores" no se abre a nadie: solo la lee es_admin().

alter table public.productos       enable row level security;
alter table public.administradores enable row level security;

-- El catálogo es público: cualquiera lo lee.
drop policy if exists lectura_publica on public.productos;
create policy lectura_publica on public.productos
  for select to anon, authenticated
  using (true);

-- Agregar, editar y borrar: solo los administradores. "using" filtra las filas
-- existentes y "with check" las nuevas o modificadas. El (select ...) hace que
-- es_admin() se calcule una vez por consulta y no una vez por fila.
drop policy if exists solo_administradores on public.productos;
create policy solo_administradores on public.productos
  for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- ---------------------------------------------------------------------------
-- Fotos: van al Storage de Supabase, en el "bucket" (carpeta) productos.
-- Es público para leer (las fotos se ven en el catálogo) y solo los
-- administradores pueden subir, reemplazar o borrar. Máximo 2 MB por foto.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_solo_administradores on storage.objects;
create policy fotos_solo_administradores on storage.objects
  for all to authenticated
  using (bucket_id = 'productos' and (select public.es_admin()))
  with check (bucket_id = 'productos' and (select public.es_admin()));
