-- datos_iniciales.sql
-- Los productos que tenía la planilla de Google al pasar a Supabase, en el
-- mismo orden en que se veían en la página.
-- Se corre UNA vez, después de la migración inicial. Si la tabla ya tiene
-- productos no hace nada.
insert into public.productos (nombre, categoria, precio, precio_promo, imagen_url, disponible, orden)
select *
  from (values
  ('Cigarros Hills', 'Kiosco', 3000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789882592/cigarros_hills_unidad.jpg', true, 1),
  ('Chicle Topline', 'Kiosco', 2500, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789789485/Topline_seven_unidad.jpg', true, 2),
  ('Cigarros Malboro Crafted Uva 20', 'Kiosco', 7000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789789494/Malboro_crafted_unidad.jpg', true, 3),
  ('Hielo Chico', 'Kiosco', 1500, null::integer, '', true, 4),
  ('Combo Un Vino Colon + Frutos Rojos + Vaso', 'Con Alcohol', 14000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789581888/combo_colon.jpg', true, 5),
  ('Combo Skyy + Frutos Rojos + Sprite 3L + Vaso', 'Con Alcohol', 22000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789684234/combo_skyy_frutos_rojos.jpg', true, 6),
  ('Frutos Rojos 100g', 'Kiosco', 3500, null::integer, '', true, 7),
  ('Fernet Branca 750ml', 'Con Alcohol', 21000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789693965/Fernet_Branca_unidad.jpg', true, 8),
  ('Skyy Berry 700ml', 'Con Alcohol', 13000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789685520/Skyy_Berry_Unidad.jpg', true, 9),
  ('Skyy Chicle 700ml', 'Con Alcohol', 13000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789685762/skyy_chicle_unidad.jpg', true, 10),
  ('SixPack Budweiser 473ml', 'Con Alcohol', 18000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789684622/Budweiser_SixPack.jpg', true, 11),
  ('Cerveza Quilmes Rubia 1L', 'Con Alcohol', 5000, null::integer, '', true, 12),
  ('Dr. Lemon 1L', 'Con Alcohol', 5000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789696674/Dr_lemon_unidad.jpg', true, 13),
  ('Vino Colón Blanco 750ml', 'Con Alcohol', 9000, null::integer, '', true, 14),
  ('Vino Colón Durazno 750ml', 'Con Alcohol', 9000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789696654/Colon_durazno_unidad.jpg', true, 15),
  ('Vino Colón Tinto 750ml', 'Con Alcohol', 9000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789789345/Colon_tinto_unidad.jpg', true, 16),
  ('Speed 473ml', 'Sin Alcohol', 3700, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789789454/Speed_473ml_unidad.jpg', true, 17),
  ('Speed 250ml', 'Sin Alcohol', 2500, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789789415/Speed_250ml_unidad.jpg', true, 18),
  ('Monster Clásico 473ml', 'Sin Alcohol', 3700, null::integer, '', true, 19),
  ('Gatorade Rojo 1L', 'Sin Alcohol', 5000, null::integer, '', true, 20),
  ('Coca-Cola 1.5L', 'Sin Alcohol', 5000, null::integer, 'https://res.cloudinary.com/a2pwrbfk/image/upload/v1789882620/coca_cola_1.5_unidad.jpg', true, 21),
  ('Coca-Cola 3L', 'Sin Alcohol', 7000, null::integer, '', true, 22),
  ('Sprite 3L', 'Sin Alcohol', 7000, null::integer, '', true, 23)
  ) as inicial (nombre, categoria, precio, precio_promo, imagen_url, disponible, orden)
 where not exists (select 1 from public.productos);
