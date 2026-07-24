# KittyHP

Sistema empresarial para registrar, consultar y analizar reportes de reparación. El proyecto integra una API NestJS, una aplicación Angular standalone, MySQL, importación de Excel, imágenes de evidencia y el cálculo de Overall FPF Trend.

## Stack

- Backend: NestJS, TypeScript, TypeORM, MySQL, `xlsx`.
- Frontend: Angular 18 standalone, Reactive Forms, RxJS y Tailwind CSS.
- Archivos: almacenamiento local en `backend/uploads`.
- Autenticación: usuarios con roles `admin`, `user` y `viewer`.
- Producción: Node.js/NSSM para la API e IIS para el frontend.

## Estructura

```text
backend/                 API NestJS, entidades, servicios y uploads
frontend/                Aplicación Angular standalone
database/                Scripts SQL y estructura inicial
tools/offline/           Empaquetado y actualización offline
tools/start-*.bat        Automatización del worker de correo
```

## Requisitos

- Node.js 20 o superior.
- npm.
- MySQL 8 compatible.
- Angular CLI y Nest CLI se instalan desde los `package.json`.
- IIS y NSSM solo son necesarios para el despliegue de producción en Windows.

## Instalación local

Instala dependencias por separado:

```powershell
cd backend
npm ci

cd ..\frontend
npm ci
```

Configura `backend/.env` a partir de `backend/.env.example` y completa la conexión MySQL, credenciales iniciales y el secreto de autenticación.

Inicia la API:

```powershell
cd backend
npm run start:dev
```

Inicia Angular en otra terminal:

```powershell
cd frontend
npm start
```

## Puertos

- API de producción: `3009` (`PORT=3009` en `backend/.env`).
- Frontend IIS: `8010`.
- En desarrollo, Angular utiliza su proxy configurado para comunicarse con la API.

## Roles

- `admin`: acceso completo, incluida la administración de usuarios.
- `user`: puede crear, editar, importar y consultar reportes, pero no administrar usuarios.
- `viewer`: acceso de solo lectura; no puede crear, editar, eliminar ni importar.

## Reportes e importación Excel

La importación se realiza desde las pestañas:

- `Station-50_Fail`.
- `Station-50_Input`.

El sistema calcula y normaliza automáticamente fecha, familia, Top Issue, Failure Qty, Build Qty, F/R, categoría, Major Part y Overall FPF Trend. La familia se normaliza por prefijo según las reglas del negocio; por ejemplo, variantes de Machu/Lapaz se agrupan en `G12 800`.

El flujo de importación es:

1. Se carga y valida el archivo.
2. Se muestra una vista previa editable.
3. Se pueden eliminar registros, restablecer filas o toda la vista previa.
4. Se puede filtrar por familia.
5. Se pueden aplicar exclusiones por Causa, MajorPart, Shift Fail y Repeat.
6. La importación se confirma explícitamente.

Los archivos incorrectos se notifican mediante toast en la interfaz. No se guardan registros hasta confirmar la vista previa.

## Imágenes

Cada reporte admite hasta 10 imágenes para `Fail picture` y hasta 10 para `Evidence`. Se almacenan en `backend/uploads` y se muestran mediante carruseles en crear, editar, visualizar y listar reportes.

Al eliminar un reporte, se eliminan sus imágenes físicas si ningún otro reporte las utiliza.

## Worker de correo Outlook

El worker se ejecuta desde `backend` con:

```powershell
npm run email-worker
```

Para iniciarlo automáticamente con Windows, utiliza [tools/start-outlook-email-worker.bat](tools/start-outlook-email-worker.bat). Abre `Win + R`, ejecuta `shell:startup` y crea allí un acceso directo al `.bat`.

El log se guarda en:

```text
backend/logs/email-worker.log
```

## Pruebas y builds

Compila el backend:

```powershell
cd backend
npm run build
```

Compila el frontend:

```powershell
cd frontend
npm run build
```

Antes de producción revisa también las vulnerabilidades:

```powershell
cd backend
npm audit --omit=dev

cd ..\frontend
npm audit
```

## Despliegue offline

Genera ambos paquetes:

```powershell
.\tools\offline\package-all-offline.ps1
```

Los ZIP se generan en `offline-bundles/`:

- `kittyhp-backend-offline.zip`.
- `kittyhp-frontend-offline.zip`.

Para actualizar el servidor como administrador:

```powershell
.\tools\offline\update-server-offline.ps1 `
  -BackendZip 'C:\Deploy\kittyhp-backend-offline.zip' `
  -FrontendZip 'C:\Deploy\kittyhp-frontend-offline.zip' `
  -BackendPort 3009 `
  -FrontendPort 8010
```

El proceso crea backups, conserva `.env`, `uploads` y `logs`, configura el servicio NSSM y crea el binding IIS del frontend en el puerto `8010` cuando no existe.

## Variables importantes

Consulta `backend/.env.example`. Como mínimo se requieren:

```text
PORT=3009
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=kittyhp
AUTH_TOKEN_SECRET=
```

No subas `.env`, credenciales, `uploads` ni backups al repositorio.

## Troubleshooting

- Si la API no inicia, revisa `backend/logs` y la conexión MySQL.
- Si el frontend devuelve 404 al refrescar una ruta, verifica el `web.config` de IIS.
- Si no se envían correos, revisa `backend/logs/email-worker.log` y la configuración Outlook.
- Si la importación falla, confirma que existan ambas pestañas y que sus encabezados correspondan al formato esperado.
- Si el paquete offline tarda demasiado, usa dependencias cacheadas y las opciones `--prefer-offline --no-audit --no-fund` incorporadas en los scripts.
