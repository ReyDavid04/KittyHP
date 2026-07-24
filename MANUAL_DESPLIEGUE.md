# Manual sencillo de despliegue de KittyHP

## 1. Preparar el proyecto

Abre PowerShell en el equipo de desarrollo:

```powershell
cd C:\Users\IMP102595\Projects\KittyHP
```

Verifica que existan:

- `backend/package-lock.json`
- `frontend/package-lock.json`
- `tools/offline/package-all-offline.ps1`

## 2. Generar los paquetes offline

Ejecuta:

```powershell
.\tools\offline\package-all-offline.ps1 `
  -ProjectRoot "C:\Users\IMP102595\Projects\KittyHP" `
  -OutputDir "C:\Users\IMP102595\Projects\KittyHP\offline-bundles"
```

Se generarán:

```text
offline-bundles\kittyhp-backend-offline.zip
offline-bundles\kittyhp-frontend-offline.zip
```

El proceso compila ambos proyectos. Si falla, no copies los paquetes al servidor.

## 3. Preparar el servidor

En el servidor crea:

```text
C:\Deploy
C:\Services\kittyhp-backend
C:\inetpub\kittyhp-frontend
```

Copia a `C:\Deploy`:

- `kittyhp-backend-offline.zip`
- `kittyhp-frontend-offline.zip`
- `tools\offline\update-server-offline.ps1` (cópialo también al servidor).
- Un archivo `kittyhp.env` con la configuración real de producción.

Ejemplo mínimo de `kittyhp.env`:

```env
PORT=3009
NODE_ENV=production
DB_HOST=servidor-mysql
DB_PORT=3306
DB_USER=usuario
DB_PASSWORD=contraseña
DB_NAME=kittyhp
AUTH_TOKEN_SECRET=secreto-largo-y-seguro
```

No incluyas credenciales reales dentro del repositorio ni dentro de los ZIP.

## 4. Ejecutar la actualización

Abre PowerShell como administrador y ejecuta desde `C:\Deploy`:

```powershell
.\update-server-offline.ps1 `
  -BackendZip "C:\Deploy\kittyhp-backend-offline.zip" `
  -FrontendZip "C:\Deploy\kittyhp-frontend-offline.zip" `
  -EnvFile "C:\Deploy\kittyhp.env" `
  -BackendPort 3009 `
  -FrontendPort 8010
```

El script:

1. Respaldará la versión anterior.
2. Detendrá y actualizará el backend.
3. Conservará `.env`, `uploads` y `logs`.
4. Configurará el puerto de API `3009`.
5. Publicará el frontend en IIS.
6. Creará el binding IIS en el puerto `8010`.
7. Reiniciará el servicio y el App Pool.

## 5. Configurar el worker de Outlook

En el servidor verifica que exista el proyecto y el archivo:

```text
C:\Services\kittyhp-backend\...
```

Para iniciar el worker manualmente:

```powershell
cd C:\Services\kittyhp-backend
npm run email-worker
```

Para iniciarlo automáticamente:

1. Copia `tools\start-outlook-email-worker.bat` al servidor.
2. Ajusta la ruta del proyecto dentro del `.bat` si es necesario.
3. Presiona `Win + R`.
4. Ejecuta `shell:startup`.
5. Crea un acceso directo al archivo `.bat`.

El log queda en:

```text
backend\logs\email-worker.log
```

## 6. Verificar la instalación

Comprueba:

- Frontend: `http://servidor:8010`
- API: `http://servidor:3009`
- Servicio NSSM en estado `Running`.
- App Pool de IIS iniciado.
- Conexión correcta a MySQL.
- Inicio de sesión.
- Creación y consulta de un reporte.
- Importación de un Excel de prueba.
- Carga y visualización de imágenes.
- Ejecución del worker y escritura del log.

## 7. Si algo falla

Backend:

```text
C:\Services\kittyhp-backend\logs\out.log
C:\Services\kittyhp-backend\logs\err.log
```

Worker:

```text
C:\Services\kittyhp-backend\logs\email-worker.log
```

Frontend:

- Revisa el binding IIS del puerto `8010`.
- Confirma que `web.config` exista en `C:\inetpub\kittyhp-frontend`.
- Verifica permisos de lectura para IIS.

Si la actualización falla, conserva el backup generado en `C:\Backups` y no elimines la versión anterior hasta validar la nueva.

## 8. Actualizaciones posteriores

Para cada nueva versión repite los pasos 1, 2 y 4. No reemplaces manualmente el `.env`, `uploads` ni `logs`; el script los conserva automáticamente.
