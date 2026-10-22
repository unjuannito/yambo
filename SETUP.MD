# Setup de Desarrollo

## 0) Configuración de variables de entorno

Antes de ejecutar cualquier proceso, debes crear los archivos `.env` basándote en los archivos `.env.example` disponibles. Ejecuta los siguientes comandos desde la raíz del proyecto:

```bash
# En la raíz del proyecto (para docker-compose)
cp .env.example .env

# En la carpeta .devcontainer (para el contenedor de desarrollo)
cp .devcontainer/.env.example .devcontainer/.env
```

Asegúrate de revisar y ajustar los valores en los archivos `.env` según tu configuración local si es necesario. **Nota:** Frontend y Backend obtienen sus variables del `.env` de la raíz, no tienen `.env.example` propios.

---

Este repositorio se desarrolla con 3 procesos separados en terminales distintas:

1. **Frontend** (Vite dev server)
2. **Backend** (Spring Boot)
3. **Nginx** (opcional, usando Docker Compose)


## 1) Frontend en desarrollo

Desde la raíz del proyecto, abre una terminal y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

Esto levantará el frontend en modo desarrollo en:

- `http://localhost:5173`

Deja esta terminal abierta mientras desarrollas.

## 2) Backend en desarrollo

Abre otra terminal y ejecuta:

```bash
cd backend
./mvnw spring-boot:run
```

Esto lanza el backend en:

- `http://localhost:8080`

La API principal estará disponible en:

- `http://localhost:8080/api`

## 3) Nginx en desarrollo

Abre una tercera terminal y escribe exactamente:

```bash
nginx
```

Esto arranca el servicio nginx en tu máquina local.

## Abrir la aplicación en el navegador

- Frontend dev: `http://localhost`
- Backend health: `http://localhost:8080/api/health`

## VS Code: configuración de lanzamiento

Se ha añadido una configuración de VS Code para arrancar los tres procesos en terminales separadas.

### Cómo usarla

1. Abre la carpeta del proyecto en VS Code.
2. Ve a la sección **Ejecutar y depurar**.
3. Selecciona **Desarrollo: Frontend + Backend + Nginx**.
4. Presiona `F5` o el botón verde de ejecución.

Esto abrirá tres terminales integradas y ejecutará los siguientes comandos:

- `cd frontend && npm run dev`
- `cd backend && ./mvnw spring-boot:run`
- `nginx`

---

## Resumen de terminales

Terminal 1:

```bash
cd frontend
npm run dev
```

Terminal 2:

```bash
cd backend
./mvnw spring-boot:run
```

Terminal 3:

```bash
nginx
```
