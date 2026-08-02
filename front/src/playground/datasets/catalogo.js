/*
 * Fichas de las bases del playground.
 *
 * ARCHIVO GENERADO. No lo edites a mano: se regenera con
 *   node scripts/datasets/catalogo.mjs
 *
 * Acá NO va el seedSql: ese es el punto. Esta lista se importa siempre y pesa
 * poco; los datos de cada base bajan por separado al elegirla.
 */

export const catalogo = [
  {
    id: "ketal",
    nombre: "Ketal",
    subtitulo: "Supermercados · La Paz",
    dominio: "Retail",
    tipo: "estrella",
    concepto: "El caso canónico de Kimball: ventas por producto, sucursal y tiempo. Es la única base que trae el OLTP y su estrella juntos, para responder la misma pregunta con los dos modelos.",
    nota: "Ketal opera cinco sucursales en La Paz. Las sucursales, los productos y las marcas son reales. Las ventas son una MUESTRA didáctica de dos años: la forma de los datos (estacionalidad, mezcla de categorías, peso de cada sucursal) es realista, pero los totales no son los de la empresa.",
    tablas: 10,
    hechos: 1,
    retos: 12,
    bloques: [
      "navegar",
      "slice",
      "granularidad",
      "aditividad",
      "tiempo",
      "ventanas",
      "trampas",
      "comparacion"
    ]
  },
  {
    id: "teleferico",
    nombre: "Mi Teleférico",
    subtitulo: "Transporte por cable · La Paz y El Alto",
    dominio: "Transporte",
    tipo: "estrella",
    concepto: "Grain de evento: cada fila es un viaje, no un resumen. Por eso se puede preguntar por hora pico, por transbordo y por par origen-destino. También es la única base con una dimensión que juega dos papeles (origen y destino apuntan a dim_estacion).",
    nota: "Las diez líneas, sus colores y las estaciones son reales, igual que las tarifas diferenciadas. Los viajes son una muestra didáctica de un año.",
    tablas: 6,
    hechos: 1,
    retos: 12,
    bloques: [
      "navegar",
      "slice",
      "granularidad",
      "aditividad",
      "tiempo",
      "ventanas",
      "trampas"
    ]
  },
  {
    id: "bancosol",
    nombre: "BancoSol",
    subtitulo: "Microfinanzas · La Paz",
    dominio: "Finanzas",
    tipo: "estrella",
    concepto: "Hechos semi-aditivos, el concepto que más se resiste. Trae dos hechos con las mismas dimensiones: los desembolsos se suman en cualquier corte, pero el saldo de cartera NO se suma entre meses. También es la base para practicar drill-across entre dos hechos de distinto grain.",
    nota: "BancoSol es el primer banco de microfinanzas de Bolivia, fundado en 1992 y con sede en La Paz. Las zonas de las agencias y la familia de productos son reales. Los clientes, montos y saldos son una muestra didáctica: no corresponden a la cartera de la entidad.",
    tablas: 6,
    hechos: 2,
    retos: 12,
    bloques: [
      "navegar",
      "aditividad",
      "slice",
      "tiempo",
      "ventanas",
      "drill-across",
      "trampas"
    ]
  },
  {
    id: "arcoiris",
    nombre: "Hospital Arco Iris",
    subtitulo: "Salud · Villa Fátima, La Paz",
    dominio: "Salud",
    tipo: "estrella",
    concepto: "Dimensión lentamente cambiante (SCD tipo 2). dim_paciente guarda versiones, no personas: cuando alguien se muda de zona se abre una fila nueva en vez de pisar la anterior. Toda consulta tiene que decidir entre la foto histórica y la foto actual, y elegir mal cambia el resultado.",
    nota: "El Hospital Arco Iris está en Villa Fátima, La Paz, y fue la primera institución privada de salud acreditada de segundo nivel en la ciudad. Las especialidades y las zonas son reales. Pacientes, médicos e importes son inventados: ningún dato clínico de esta base corresponde a personas reales.",
    tablas: 5,
    hechos: 1,
    retos: 12,
    bloques: [
      "navegar",
      "trampas",
      "slice",
      "granularidad",
      "tiempo",
      "ventanas"
    ]
  },
  {
    id: "yaigo",
    nombre: "Yaigo",
    subtitulo: "Delivery · La Paz y El Alto",
    dominio: "Logística",
    tipo: "estrella",
    concepto: "Drill-across con dimensiones conformadas. Dos hechos de distinto grain (pedidos y envíos) que comparten tiempo y zona, pero no tienen la misma cantidad de filas porque los pedidos cancelados nunca se despachan. Unirlos con un JOIN directo da mal: hay que resumir cada uno y cruzar los resúmenes.",
    nota: "Yaigo es una empresa boliviana de delivery (\"You Ask I Go\"), fundada por un equipo local. Las zonas de reparto son reales. Los comercios, pedidos y repartidores son una muestra didáctica.",
    tablas: 6,
    hechos: 2,
    retos: 12,
    bloques: [
      "navegar",
      "slice",
      "drill-across",
      "aditividad",
      "tiempo",
      "ventanas",
      "trampas",
      "comparacion"
    ]
  },
  {
    id: "entel",
    nombre: "Entel",
    subtitulo: "Telecomunicaciones · Bolivia",
    dominio: "Telecom",
    tipo: "estrella",
    concepto: "Por qué existen las tablas agregadas. La base trae el mismo dato dos veces: al detalle (una fila por SIM y día) y precalculado por mes. Las dos dan el mismo número en las preguntas de alto nivel, pero solo el detalle puede bajar al día. Elegir la tabla correcta es la decisión.",
    nota: "Entel es la operadora estatal de telecomunicaciones de Bolivia. Los planes, regiones y tecnologías son plausibles y las líneas son inventadas. Ningún número corresponde a la operación real de la empresa.",
    tablas: 7,
    hechos: 2,
    retos: 12,
    bloques: [
      "navegar",
      "granularidad",
      "slice",
      "aditividad",
      "tiempo",
      "ventanas",
      "comparacion"
    ]
  },
  {
    id: "upb",
    nombre: "UPB",
    subtitulo: "Universidad Privada Boliviana · La Paz",
    dominio: "Educación",
    tipo: "estrella",
    concepto: "Dimensión degenerada y jerarquías. El paralelo vive dentro del hecho porque no tiene atributos propios: saber cuándo NO crear una dimensión es parte del oficio. Además el grain es el semestre, no el día, así que la dimensión de tiempo es el período académico.",
    nota: "Las carreras y facultades corresponden a la oferta de la UPB. Estudiantes, docentes y notas son inventados: cualquier parecido con una persona real es casualidad.",
    tablas: 6,
    hechos: 1,
    retos: 12,
    bloques: [
      "navegar",
      "slice",
      "aditividad",
      "granularidad",
      "tiempo",
      "ventanas",
      "trampas"
    ]
  },
  {
    id: "cinemateca",
    nombre: "Cinemateca Boliviana",
    subtitulo: "Cultura · La Paz",
    dominio: "Cultura",
    tipo: "estrella",
    concepto: "Hecho sin métrica (factless fact table). hecho_asistencia solo tiene claves: la métrica es que la fila exista, y se cuenta con COUNT(*). De ahí sale la otra mitad de la lección: para saber qué película NO se proyectó hay que salir del hecho con un LEFT JOIN, porque lo que no ocurrió no deja fila.",
    nota: "La Cinemateca Boliviana fue fundada en 1976 en La Paz y conserva el patrimonio audiovisual del país; la entrada general ronda los Bs 20. Las películas y los ciclos son reales o plausibles; la programación y la asistencia corresponden a un trimestre didáctico de 2025.",
    tablas: 7,
    hechos: 2,
    retos: 12,
    bloques: [
      "navegar",
      "trampas",
      "slice",
      "aditividad",
      "tiempo",
      "ventanas",
      "granularidad"
    ]
  }
]

export const fichasPorId = Object.fromEntries(catalogo.map(ficha => [ficha.id, ficha]))
