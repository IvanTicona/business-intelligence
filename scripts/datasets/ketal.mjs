/*
 * Genera front/src/playground/datasets/ketal.js
 *
 * Ketal es la base insignia: trae el OLTP Y su estrella en la MISMA base, para
 * que el bloque "OLTP contra estrella" pueda responder la misma pregunta con
 * los dos modelos sin cambiar de pestaña.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/ketal.js', import.meta.url)
const r = rng(20260802)

// --- Dimensiones escritas a mano: son pocas y tienen que ser reconocibles ---

const categorias = [
  [1, 'Abarrotes', 'Alimentos secos'],
  [2, 'Lacteos', 'Refrigerados'],
  [3, 'Bebidas', 'Alimentos liquidos'],
  [4, 'Limpieza', 'No alimentos'],
  [5, 'Panaderia', 'Frescos'],
  [6, 'Frutas y Verduras', 'Frescos'],
]

// Marcas bolivianas que el alumno ve en la gondola todas las semanas.
const productos = [
  [1, 'Leche PIL entera 1L', 2, 'PIL', 7.5],
  [2, 'Yogurt PIL frutilla 1L', 2, 'PIL', 14.0],
  [3, 'Queso Sofia laminado 250g', 2, 'Sofia', 22.5],
  [4, 'Mantequilla PIL 200g', 2, 'PIL', 16.0],
  [5, 'Fideo Princesa spaghetti 400g', 1, 'Princesa', 6.5],
  [6, 'Arroz Grano de Oro 1kg', 1, 'Grano de Oro', 9.0],
  [7, 'Aceite Fino 900ml', 1, 'Fino', 15.5],
  [8, 'Azucar Guabira 1kg', 1, 'Guabira', 7.0],
  [9, 'Harina Famosa 1kg', 1, 'Famosa', 8.5],
  [10, 'Te Windsor 25 sobres', 1, 'Windsor', 11.0],
  [11, 'Coca-Cola 2L', 3, 'Coca-Cola', 13.0],
  [12, 'Agua Vital 2L', 3, 'Vital', 6.0],
  [13, 'Jugo Del Valle 1L', 3, 'Del Valle', 10.5],
  [14, 'Cerveza Pacena 620ml', 3, 'Pacena', 12.0],
  [15, 'Singani Casa Real 750ml', 3, 'Casa Real', 78.0],
  [16, 'Detergente Ola 1kg', 4, 'Ola', 21.0],
  [17, 'Lavandina Patito 1L', 4, 'Patito', 8.0],
  [18, 'Papel higienico Elite 4u', 4, 'Elite', 18.5],
  [19, 'Jabon Bolivar 3u', 4, 'Bolivar', 12.5],
  [20, 'Pan marraqueta 6u', 5, 'Ketal', 4.0],
  [21, 'Salteña de pollo 1u', 5, 'Ketal', 8.0],
  [22, 'Torta de chocolate porcion', 5, 'Ketal', 15.0],
  [23, 'Papa holandesa 1kg', 6, 'Local', 5.5],
  [24, 'Platano de seda 1kg', 6, 'Local', 7.0],
  [25, 'Tomate riñon 1kg', 6, 'Local', 8.5],
  [26, 'Palta hass 1kg', 6, 'Local', 18.0],
]

// Las cinco sucursales de Ketal en La Paz.
const sucursales = [
  [1, 'Ketal San Miguel', 'San Miguel', 'Zona Sur', 1998, 1200],
  [2, 'Ketal Calacoto', 'Calacoto', 'Zona Sur', 2004, 950],
  [3, 'Ketal Sopocachi', 'Sopocachi', 'Centro', 2001, 780],
  [4, 'Ketal Miraflores', 'Miraflores', 'Centro', 2009, 640],
  [5, 'Ketal Achumani', 'Achumani', 'Zona Sur', 2015, 1050],
]

const segmentos = ['Familiar', 'Joven', 'Adulto mayor', 'Corporativo']
const clientes = []
const nombresPila = ['Ana', 'Luis', 'Carla', 'Jorge', 'Marisol', 'Diego', 'Paola', 'Ruben', 'Silvia', 'Marco',
  'Gabriela', 'Fernando', 'Rocio', 'Ivan', 'Daniela', 'Oscar', 'Lucia', 'Pablo', 'Veronica', 'Sergio']
const apellidos = ['Quispe', 'Mamani', 'Choque', 'Flores', 'Condori', 'Aguilar', 'Terceros', 'Salazar',
  'Vargas', 'Rojas', 'Camacho', 'Villarroel', 'Peñaranda', 'Loayza', 'Arce']
for (let i = 1; i <= 40; i++) {
  const nombre = `${nombresPila[(i * 7) % nombresPila.length]} ${apellidos[(i * 5) % apellidos.length]}`
  clientes.push([i, nombre, segmentos[(i * 3) % segmentos.length], pesado(r, [['Zona Sur', 5], ['Centro', 3], ['El Alto', 2]])])
}

const promociones = [
  [1, 'Sin promocion', 'ninguna', 0],
  [2, '2x1 lacteos', 'multicompra', 50],
  [3, 'Descuento 15% bebidas', 'descuento', 15],
  [4, 'Combo desayuno', 'combo', 20],
  [5, 'Miercoles de feria', 'descuento', 10],
]

// --- Hechos generados: 2024 y 2025 completos para poder comparar año contra año ---

const dias = fechas('2024-01-01', '2025-12-31')
const hechos = []
let idVenta = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  const finDeSemana = d.getUTCDay() === 0 || d.getUTCDay() === 6
  const diciembre = d.getUTCMonth() === 11
  // Fin de semana y diciembre venden mas: sin estacionalidad los retos de
  // analisis temporal no tendrian nada que descubrir.
  const lineas = entre(r, finDeSemana ? 3 : 1, finDeSemana ? 6 : 4) + (diciembre ? 2 : 0)

  for (let i = 0; i < lineas; i++) {
    idVenta++
    const producto = productos[entre(r, 0, productos.length - 1)]
    const sucursal = Number(pesado(r, [['1', 5], ['2', 4], ['3', 3], ['4', 2], ['5', 4]]))
    const cliente = entre(r, 1, clientes.length)
    const promo = pesado(r, [[1, 12], [2, 2], [3, 2], [4, 1], [5, 3]])
    const cantidad = entre(r, 1, 4)
    const precio = decimal(r, producto[4] * 0.95, producto[4] * 1.08)
    const descuento = promo === 1 ? 0 : Number((precio * cantidad * (promociones[promo - 1][3] / 100)).toFixed(2))
    const importe = Number((precio * cantidad - descuento).toFixed(2))
    const costo = Number((precio * cantidad * 0.72).toFixed(2))

    hechos.push([idVenta, idTiempo(fecha), producto[0], sucursal, cliente, promo, cantidad, precio, descuento, importe, costo])
  }
}

// --- SQL ---

const seed = `
-- ==========================================================================
-- KETAL  ·  Supermercados de La Paz
-- Modelo OLTP de origen Y su data mart en estrella, en la misma base.
-- ==========================================================================

-- ---------- ORIGEN TRANSACCIONAL (OLTP) ----------

CREATE TABLE categoria (
  id_categoria INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo_conservacion TEXT NOT NULL
);

CREATE TABLE producto (
  id_producto INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  id_categoria INTEGER NOT NULL REFERENCES categoria(id_categoria),
  marca TEXT NOT NULL,
  precio_lista REAL NOT NULL
);

CREATE TABLE sucursal (
  id_sucursal INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL,
  macrozona TEXT NOT NULL,
  anio_apertura INTEGER NOT NULL,
  superficie_m2 INTEGER NOT NULL
);

CREATE TABLE cliente (
  id_cliente INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  segmento TEXT NOT NULL,
  macrozona TEXT NOT NULL
);

CREATE TABLE promocion (
  id_promocion INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  mecanica TEXT NOT NULL,
  porcentaje INTEGER NOT NULL
);

CREATE TABLE venta (
  id_venta INTEGER PRIMARY KEY,
  fecha DATE NOT NULL,
  id_sucursal INTEGER NOT NULL REFERENCES sucursal(id_sucursal),
  id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente)
);

CREATE TABLE detalle_venta (
  id_detalle INTEGER PRIMARY KEY,
  id_venta INTEGER NOT NULL REFERENCES venta(id_venta),
  id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
  id_promocion INTEGER NOT NULL REFERENCES promocion(id_promocion),
  cantidad INTEGER NOT NULL,
  precio_unitario REAL NOT NULL,
  descuento REAL NOT NULL
);

${insert('categoria', ['id_categoria', 'nombre', 'tipo_conservacion'], categorias)}

${insert('producto', ['id_producto', 'nombre', 'id_categoria', 'marca', 'precio_lista'], productos)}

${insert('sucursal', ['id_sucursal', 'nombre', 'zona', 'macrozona', 'anio_apertura', 'superficie_m2'], sucursales)}

${insert('cliente', ['id_cliente', 'nombre', 'segmento', 'macrozona'], clientes)}

${insert('promocion', ['id_promocion', 'nombre', 'mecanica', 'porcentaje'], promociones)}

-- ---------- DATA MART EN ESTRELLA ----------

${dimTiempo('2024-01-01', '2025-12-31')}

CREATE TABLE dim_producto (
  id_producto INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  marca TEXT NOT NULL,
  tipo_conservacion TEXT NOT NULL,
  precio_lista REAL NOT NULL
);

CREATE TABLE dim_sucursal (
  id_sucursal INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL,
  macrozona TEXT NOT NULL,
  anio_apertura INTEGER NOT NULL,
  superficie_m2 INTEGER NOT NULL
);

CREATE TABLE dim_cliente (
  id_cliente INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  segmento TEXT NOT NULL,
  macrozona TEXT NOT NULL
);

CREATE TABLE dim_promocion (
  id_promocion INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  mecanica TEXT NOT NULL,
  porcentaje INTEGER NOT NULL
);

-- Grain: una fila por producto vendido en una venta.
CREATE TABLE hecho_venta (
  id_venta INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_producto INTEGER NOT NULL REFERENCES dim_producto(id_producto),
  id_sucursal INTEGER NOT NULL REFERENCES dim_sucursal(id_sucursal),
  id_cliente INTEGER NOT NULL REFERENCES dim_cliente(id_cliente),
  id_promocion INTEGER NOT NULL REFERENCES dim_promocion(id_promocion),
  cantidad INTEGER NOT NULL,
  precio_unitario REAL NOT NULL,
  descuento REAL NOT NULL,
  importe REAL NOT NULL,
  costo REAL NOT NULL
);

-- Las dimensiones se cargan DESDE el OLTP: es la misma informacion
-- desnormalizada, que es exactamente lo que hace un proceso de ETL.
INSERT INTO dim_producto (id_producto, nombre, categoria, marca, tipo_conservacion, precio_lista)
SELECT p.id_producto, p.nombre, c.nombre, p.marca, c.tipo_conservacion, p.precio_lista
FROM producto p JOIN categoria c ON p.id_categoria = c.id_categoria;

INSERT INTO dim_sucursal SELECT * FROM sucursal;
INSERT INTO dim_cliente SELECT * FROM cliente;
INSERT INTO dim_promocion SELECT * FROM promocion;

${insert('hecho_venta',
  ['id_venta', 'id_tiempo', 'id_producto', 'id_sucursal', 'id_cliente', 'id_promocion', 'cantidad', 'precio_unitario', 'descuento', 'importe', 'costo'],
  hechos, 40)}

-- El OLTP se rellena desde el hecho para que los dos modelos cuenten lo mismo
-- y el bloque "OLTP contra estrella" compare peras con peras.
INSERT INTO venta (id_venta, fecha, id_sucursal, id_cliente)
SELECT h.id_venta, t.fecha, h.id_sucursal, h.id_cliente
FROM hecho_venta h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo;

INSERT INTO detalle_venta (id_detalle, id_venta, id_producto, id_promocion, cantidad, precio_unitario, descuento)
SELECT id_venta, id_venta, id_producto, id_promocion, cantidad, precio_unitario, descuento
FROM hecho_venta;
`.trim()

// --- Descripción del modelo para el diagrama y el panel de esquema ---

const tablas = [
  { nombre: 'hecho_venta', rol: 'hecho', x: 470, y: 430, columnas: [
    { nombre: 'id_venta', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_producto', tipo: 'INTEGER', fk: 'dim_producto' },
    { nombre: 'id_sucursal', tipo: 'INTEGER', fk: 'dim_sucursal' },
    { nombre: 'id_cliente', tipo: 'INTEGER', fk: 'dim_cliente' },
    { nombre: 'id_promocion', tipo: 'INTEGER', fk: 'dim_promocion' },
    { nombre: 'cantidad', tipo: 'INTEGER', metrica: true },
    { nombre: 'precio_unitario', tipo: 'REAL' },
    { nombre: 'descuento', tipo: 'REAL', metrica: true },
    { nombre: 'importe', tipo: 'REAL', metrica: true },
    { nombre: 'costo', tipo: 'REAL', metrica: true },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 130, y: 130, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_producto', rol: 'dimension', x: 470, y: 110, columnas: [
    { nombre: 'id_producto', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'categoria', tipo: 'TEXT' },
    { nombre: 'marca', tipo: 'TEXT' },
    { nombre: 'tipo_conservacion', tipo: 'TEXT' },
    { nombre: 'precio_lista', tipo: 'REAL' },
  ] },
  { nombre: 'dim_sucursal', rol: 'dimension', x: 810, y: 130, columnas: [
    { nombre: 'id_sucursal', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'zona', tipo: 'TEXT' },
    { nombre: 'macrozona', tipo: 'TEXT' },
    { nombre: 'anio_apertura', tipo: 'INTEGER' },
    { nombre: 'superficie_m2', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_cliente', rol: 'dimension', x: 130, y: 640, columnas: [
    { nombre: 'id_cliente', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'segmento', tipo: 'TEXT' },
    { nombre: 'macrozona', tipo: 'TEXT' },
  ] },
  { nombre: 'dim_promocion', rol: 'dimension', x: 810, y: 640, columnas: [
    { nombre: 'id_promocion', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'mecanica', tipo: 'TEXT' },
    { nombre: 'porcentaje', tipo: 'INTEGER' },
  ] },
  { nombre: 'venta', rol: 'tabla', oltp: true, x: 130, y: 880, columnas: [
    { nombre: 'id_venta', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'id_sucursal', tipo: 'INTEGER', fk: 'sucursal' },
    { nombre: 'id_cliente', tipo: 'INTEGER', fk: 'cliente' },
  ] },
  { nombre: 'detalle_venta', rol: 'tabla', oltp: true, x: 470, y: 880, columnas: [
    { nombre: 'id_detalle', tipo: 'INTEGER', pk: true },
    { nombre: 'id_venta', tipo: 'INTEGER', fk: 'venta' },
    { nombre: 'id_producto', tipo: 'INTEGER', fk: 'producto' },
    { nombre: 'id_promocion', tipo: 'INTEGER', fk: 'promocion' },
    { nombre: 'cantidad', tipo: 'INTEGER' },
    { nombre: 'precio_unitario', tipo: 'REAL' },
    { nombre: 'descuento', tipo: 'REAL' },
  ] },
  { nombre: 'producto', rol: 'tabla', oltp: true, x: 810, y: 880, columnas: [
    { nombre: 'id_producto', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'id_categoria', tipo: 'INTEGER', fk: 'categoria' },
    { nombre: 'marca', tipo: 'TEXT' },
    { nombre: 'precio_lista', tipo: 'REAL' },
  ] },
  { nombre: 'categoria', rol: 'tabla', oltp: true, x: 810, y: 1080, columnas: [
    { nombre: 'id_categoria', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'tipo_conservacion', tipo: 'TEXT' },
  ] },
]

const retos = [
  {
    id: 'ketal-01', bloque: 'navegar', concept: 'JOIN hecho + dimensión',
    title: 'Del hecho a la dimensión',
    prompt: 'Muestra el nombre de la categoría y las unidades vendidas (SUM de cantidad), de mayor a menor.',
    hint: 'El hecho no guarda el nombre de la categoría: está en dim_producto. Une por id_producto.',
    starter: 'SELECT p.categoria, ...\nFROM hecho_venta h\nJOIN dim_producto p ON ...\nGROUP BY ...;',
    expectedSql: `SELECT p.categoria, SUM(h.cantidad) AS unidades
FROM hecho_venta h JOIN dim_producto p ON h.id_producto = p.id_producto
GROUP BY p.categoria ORDER BY unidades DESC;`,
    orderMatters: true,
  },
  {
    id: 'ketal-02', bloque: 'navegar', concept: 'Dos dimensiones',
    title: 'Cruzar dos dimensiones',
    prompt: 'Importe total vendido por macrozona de sucursal y por año. Ordena por macrozona y luego por año.',
    hint: 'Necesitas dos JOIN: uno a dim_sucursal y otro a dim_tiempo.',
    starter: 'SELECT s.macrozona, t.anio, ...\nFROM hecho_venta h\nJOIN ...;',
    expectedSql: `SELECT s.macrozona, t.anio, ROUND((SUM(h.importe))::numeric, 2) AS importe
FROM hecho_venta h
JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
GROUP BY s.macrozona, t.anio ORDER BY s.macrozona, t.anio;`,
    orderMatters: true,
  },
  {
    id: 'ketal-03', bloque: 'slice', concept: 'Filtrar por atributo',
    title: 'Slice: cortar por un atributo',
    prompt: 'Importe total de 2025 solo para la marca PIL, por nombre de producto, de mayor a menor.',
    hint: 'El filtro por año vive en dim_tiempo y el de marca en dim_producto. Ninguno está en el hecho.',
    starter: "SELECT p.nombre, ...\nFROM hecho_venta h\nJOIN ...\nWHERE p.marca = 'PIL' AND ...;",
    expectedSql: `SELECT p.nombre, ROUND((SUM(h.importe))::numeric, 2) AS importe
FROM hecho_venta h
JOIN dim_producto p ON h.id_producto = p.id_producto
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE p.marca = 'PIL' AND t.anio = 2025
GROUP BY p.nombre ORDER BY importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ketal-04', bloque: 'slice', concept: 'HAVING contra WHERE',
    title: 'Dice: filtrar después de agrupar',
    prompt: 'Sucursales que en 2025 vendieron por encima del promedio de unidades por sucursal. Muestra nombre y unidades, de mayor a menor.',
    hint: 'El año se filtra ANTES de agrupar (WHERE) y el total DESPUÉS (HAVING). El promedio sale de una subconsulta.',
    starter: 'SELECT s.nombre, SUM(h.cantidad) AS unidades\nFROM hecho_venta h\nJOIN ...\nGROUP BY s.nombre\nHAVING SUM(h.cantidad) > ( ... );',
    expectedSql: `SELECT s.nombre, SUM(h.cantidad) AS unidades
FROM hecho_venta h
JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.anio = 2025
GROUP BY s.nombre
HAVING SUM(h.cantidad) > (
  SELECT AVG(u) FROM (
    SELECT SUM(h2.cantidad) AS u
    FROM hecho_venta h2 JOIN dim_tiempo t2 ON h2.id_tiempo = t2.id_tiempo
    WHERE t2.anio = 2025 GROUP BY h2.id_sucursal
  )
)
ORDER BY unidades DESC;`,
    orderMatters: true,
  },
  {
    id: 'ketal-05', bloque: 'granularidad', concept: 'Roll-up',
    title: 'Roll-up: subir de nivel',
    prompt: 'El importe de 2025 agrupado por trimestre. Dos columnas: trimestre e importe.',
    hint: 'dim_tiempo ya trae la columna trimestre calculada: no la deduzcas del mes.',
    starter: 'SELECT t.trimestre, ...\nFROM hecho_venta h\nJOIN dim_tiempo t ON ...\nWHERE ...;',
    expectedSql: `SELECT t.trimestre, ROUND((SUM(h.importe))::numeric, 2) AS importe
FROM hecho_venta h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.anio = 2025 GROUP BY t.trimestre ORDER BY t.trimestre;`,
    orderMatters: true,
  },
  {
    id: 'ketal-06', bloque: 'granularidad', concept: 'Drill-down',
    title: 'Drill-down: bajar al detalle',
    prompt: 'Dentro del primer trimestre de 2025, el importe mes a mes. Muestra nombre_mes e importe.',
    hint: 'Es la consulta anterior bajando un nivel: agrupa por mes en vez de por trimestre.',
    starter: 'SELECT t.nombre_mes, ...\nFROM hecho_venta h\nJOIN ...\nWHERE t.anio = 2025 AND ...;',
    expectedSql: `SELECT t.nombre_mes, ROUND((SUM(h.importe))::numeric, 2) AS importe
FROM hecho_venta h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.anio = 2025 AND t.trimestre = 1
GROUP BY t.mes, t.nombre_mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'ketal-07', bloque: 'aditividad', concept: 'Métrica derivada',
    title: 'El margen no se promedia',
    prompt: 'Margen porcentual de 2025 por categoría: (importe - costo) / importe * 100, redondeado a 2. Ordena de mayor a menor margen.',
    hint: 'Suma primero y divide después. Promediar el margen de cada fila da otro número, y está mal.',
    starter: 'SELECT p.categoria,\n  ROUND((... / ... * 100)::numeric, 2) AS margen_pct\nFROM ...;',
    expectedSql: `SELECT p.categoria, ROUND(((SUM(h.importe) - SUM(h.costo)) / SUM(h.importe) * 100)::numeric, 2) AS margen_pct
FROM hecho_venta h
JOIN dim_producto p ON h.id_producto = p.id_producto
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.anio = 2025 GROUP BY p.categoria ORDER BY margen_pct DESC;`,
    orderMatters: true,
    trampa: 'AVG((importe - costo) / importe) da un numero parecido y equivocado: promedia porcentajes de ventas de distinto tamaño como si pesaran igual.',
  },
  {
    id: 'ketal-08', bloque: 'tiempo', concept: 'Año contra año',
    title: 'Comparar 2025 contra 2024',
    prompt: 'Por mes (1 a 12), el importe de 2024 y el de 2025 en columnas separadas: mes, importe_2024, importe_2025.',
    hint: 'Un SUM con CASE WHEN por año dentro del mismo GROUP BY: no necesitas dos consultas.',
    starter: 'SELECT t.mes,\n  ROUND((SUM(CASE WHEN ... THEN h.importe ELSE 0 END))::numeric, 2) AS importe_2024,\n  ...\nFROM ...;',
    expectedSql: `SELECT t.mes,
  ROUND((SUM(CASE WHEN t.anio = 2024 THEN h.importe ELSE 0 END))::numeric, 2) AS importe_2024,
  ROUND((SUM(CASE WHEN t.anio = 2025 THEN h.importe ELSE 0 END))::numeric, 2) AS importe_2025
FROM hecho_venta h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
GROUP BY t.mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'ketal-09', bloque: 'ventanas', concept: 'SUM OVER acumulado',
    title: 'Acumulado del año',
    prompt: 'Importe mensual de 2025 y su acumulado corrido: mes, importe, acumulado.',
    hint: 'SUM(...) OVER (ORDER BY mes) acumula. Calcula el total mensual en una subconsulta primero.',
    starter: 'SELECT mes, importe,\n  ROUND((SUM(importe) OVER (ORDER BY ...))::numeric, 2) AS acumulado\nFROM ( ... );',
    expectedSql: `SELECT mes, importe, ROUND((SUM(importe) OVER (ORDER BY mes))::numeric, 2) AS acumulado
FROM (
  SELECT t.mes AS mes, ROUND((SUM(h.importe))::numeric, 2) AS importe
  FROM hecho_venta h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
  WHERE t.anio = 2025 GROUP BY t.mes
) ORDER BY mes;`,
    orderMatters: true,
  },
  {
    id: 'ketal-10', bloque: 'ventanas', concept: 'Participación',
    title: 'Cuánto pesa cada sucursal',
    prompt: 'Para 2025: nombre de sucursal, su importe y qué porcentaje representa del total, redondeado a 2. De mayor a menor.',
    hint: 'SUM(...) OVER () sin ORDER BY da el total general contra el que dividir.',
    starter: 'SELECT nombre, importe,\n  ROUND((importe * 100.0 / SUM(importe) OVER ())::numeric, 2) AS participacion\nFROM ( ... );',
    expectedSql: `SELECT nombre, importe, ROUND((importe * 100.0 / SUM(importe) OVER ())::numeric, 2) AS participacion
FROM (
  SELECT s.nombre AS nombre, ROUND((SUM(h.importe))::numeric, 2) AS importe
  FROM hecho_venta h
  JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
  JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
  WHERE t.anio = 2025 GROUP BY s.nombre
) ORDER BY importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ketal-11', bloque: 'trampas', concept: 'Doble conteo',
    title: 'La trampa del conteo de clientes',
    prompt: 'Cuántos clientes DISTINTOS compraron en 2025 en cada macrozona de sucursal. Columnas: macrozona, clientes.',
    hint: 'Cada cliente aparece en muchas filas del hecho. COUNT(*) cuenta líneas de venta, no personas.',
    starter: 'SELECT s.macrozona, COUNT(...) AS clientes\nFROM hecho_venta h\nJOIN ...;',
    expectedSql: `SELECT s.macrozona, COUNT(DISTINCT h.id_cliente) AS clientes
FROM hecho_venta h
JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.anio = 2025 GROUP BY s.macrozona ORDER BY s.macrozona;`,
    orderMatters: true,
    trampa: 'COUNT(*) devuelve miles y parece razonable, pero cuenta lineas de venta. La pregunta era por personas.',
  },
  {
    id: 'ketal-12', bloque: 'comparacion', concept: 'OLTP contra estrella',
    title: 'La misma pregunta, los dos modelos',
    prompt: 'Responde con el modelo OLTP (venta, detalle_venta, producto, categoria): importe por categoría en 2025. El importe en el OLTP hay que calcularlo: cantidad * precio_unitario - descuento.',
    hint: 'Son tres JOIN y un cálculo. En la estrella la misma pregunta fue un JOIN y un SUM: esa diferencia es el punto del ejercicio.',
    starter: 'SELECT c.nombre, ...\nFROM detalle_venta d\nJOIN venta v ON ...\nJOIN producto p ON ...\nJOIN categoria c ON ...;',
    expectedSql: `SELECT c.nombre AS categoria, ROUND((SUM(d.cantidad * d.precio_unitario - d.descuento))::numeric, 2) AS importe
FROM detalle_venta d
JOIN venta v ON d.id_venta = v.id_venta
JOIN producto p ON d.id_producto = p.id_producto
JOIN categoria c ON p.id_categoria = c.id_categoria
WHERE v.fecha >= '2025-01-01' AND v.fecha <= '2025-12-31'
GROUP BY c.nombre ORDER BY importe DESC;`,
    orderMatters: true,
  },
]

const dataset = {
  id: 'ketal',
  nombre: 'Ketal',
  subtitulo: 'Supermercados · La Paz',
  dominio: 'Retail',
  tipo: 'estrella',
  concepto: 'El caso canónico de Kimball: ventas por producto, sucursal y tiempo. Es la única base que trae el OLTP y su estrella juntos, para responder la misma pregunta con los dos modelos.',
  nota: 'Ketal opera cinco sucursales en La Paz. Las sucursales, los productos y las marcas son reales. Las ventas son una MUESTRA didáctica de dos años: la forma de los datos (estacionalidad, mezcla de categorías, peso de cada sucursal) es realista, pero los totales no son los de la empresa.',
  tablas,
  retos,
}

const archivo = `${encabezado('Ketal · Supermercados de La Paz', 'ketal.mjs')}

export const ketal = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

ketal.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`ketal.js escrito · ${hechos.length} filas de hecho · ${(archivo.length / 1024).toFixed(0)} KB`)
