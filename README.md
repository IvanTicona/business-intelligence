# Business Intelligence Course

App web para material y prácticas del curso de Business Intelligence.

## Estructura

- `front/`: SPA (Vite + React + antd) con los capítulos y las prácticas.
- `back/`: API Express + Postgres para las entregas de prácticas.
- `compose.yaml`: despliegue completo (front + back + db).

Monorepo con **npm workspaces**. Requiere Node 22+.

## Prácticas

| # | Tema | Interacción | Se valida |
|---|------|-------------|-----------|
| 1 | Diagnóstico de un CSV de reclutamiento | Respuestas guiadas + crítica a la IA | Manual (docente) |
| 2 | MER del caso ExpoCruz | Clasificar entidad/atributo, elegir PKs, definir cardinalidades | Automática, con explicación del *por qué* en cada opción |
| 3 | SQL sobre el modelo relacional | Editor SQL con **SQLite real corriendo en el navegador** | Ejecuta la consulta del alumno y la de referencia sobre la misma base, y compara |
| 4 | OLTP → OLAP, estrella de SpazioGym | Elegir grain, métricas y dimensiones; escribir los KPIs en SQL | Automática, con distractores que enseñan (cupo en el hecho, promedios no aditivos) |

Las prácticas 3 y 4 usan `sql.js` (SQLite compilado a WebAssembly, ~660 kB) servido
desde el propio contenedor. No hay llamadas a servicios externos ni backend de SQL:
todo corre en el navegador del alumno.

Los datasets viven en `front/src/practices/data/`. Los retos se validan ejecutando
la consulta de referencia, no comparando strings — cualquier SQL equivalente pasa.

Todas las entregas se guardan en Postgres y el docente las descarga en CSV desde
`/docente/entregas`.

### Habilitar un módulo

Los módulos bloqueados se listan en `disabledKeys`, al principio de `front/src/App.jsx`.
No hay calendario ni fechas: lo que está en la lista está bloqueado.

Para habilitar el Capítulo 2, por ejemplo, borrá `'chapter-2'` de esa lista y redesplegá:

```bash
docker compose up -d --build front
```

> El bloqueo es de interfaz, no de seguridad: el contenido viaja igual en el bundle
> del navegador. Sirve para ordenar el ritmo de la clase, no para proteger material
> confidencial.

## Desarrollo local

```bash
npm install
npm run dev:back    # http://localhost:4000
npm run dev:front   # http://localhost:5173
```

El back necesita `ADMIN_TOKEN` y `DATABASE_URL` — copiá `back/.env.example` a `back/.env`.
Sin `ADMIN_TOKEN` el backend **no arranca** a propósito: el panel docente quedaría abierto.

Para que el front pegue al back en dev, copiá `front/.env.example` a `front/.env`
(`VITE_API_URL="http://localhost:4000"`).

## Despliegue en VPS

TLS lo termina Cloudflare; el origen escucha en HTTP.

```bash
cp .env.example .env      # completá POSTGRES_PASSWORD y ADMIN_TOKEN
docker compose up -d --build
```

Arquitectura del despliegue:

```
Cloudflare (TLS) → :18742 front (nginx)
                        ├── /       → SPA estática
                        └── /api/   → proxy a back:4000
                                          └── db:5432 (sin puerto público)
```

El origen escucha en el puerto **18742** del host (`HTTP_PORT` en el `.env`), alto y
poco común para no chocar con lo que ya corra en la VPS.

> **Cloudflare en modo proxy (nube naranja) pega al origen por 80 o 443**, no por un
> puerto arbitrario. Para usar 18742 necesitás una de estas tres:
> 1. **cloudflared tunnel** — el túnel apunta a `http://localhost:18742` y no exponés ningún puerto público. Es la opción más simple y más segura.
> 2. **Origin Rule** en Cloudflare que reescriba el puerto de destino a 18742.
> 3. Un **reverse proxy** en la VPS escuchando en 443 que reenvíe a 18742.
>
> Si no hacés ninguna, poné `HTTP_PORT=80` (o `443`) en el `.env`.

`VITE_API_URL` queda vacío en Docker: el front pega a `/api` en su mismo origen,
así que no hay CORS ni URL de backend horneada en el bundle.

El esquema se aplica con migraciones: archivos `.sql` numerados en
`back/src/db/migraciones/`, que el backend corre al arrancar y anota en la tabla
`schema_migrations`. Si una falla, el contenedor no levanta — es preferible a
atender pedidos contra un esquema a medias.

Una migración ya aplicada **no se edita**: el runner guarda una huella de cada
archivo y aborta si cambió, porque editarla dejaría tu base y la de la VPS
distintas sin que nadie se entere. Para cambiar algo, agregá una migración nueva.

El rol de Postgres que ejecuta el SQL de los alumnos (`bi_alumno`) también lo
crea el backend al arrancar, y es idempotente. No va en el script de arranque de
la imagen de Postgres porque ese solo corre con el volumen vacío, y el de la VPS
ya tiene datos. Necesitás `DATABASE_ALUMNO_PASSWORD` en el `.env`; si falta, el
resto de la aplicación funciona pero las consolas no, y `/health` lo dice.

### Operación

```bash
docker compose logs -f back
docker compose ps
docker compose exec db psql -U bi -d bi_course
docker compose down          # los datos sobreviven en el volumen pgdata
```

Panel docente: `https://tu-dominio/docente/entregas` (pide el `ADMIN_TOKEN`).
