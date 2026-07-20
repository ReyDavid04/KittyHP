# Worker de correo de KittyHP

Este worker procesa los registros `pending` de la tabla `email_queue` y los envía utilizando la cuenta abierta en Microsoft Outlook para Windows.

## Requisitos

- Windows.
- Microsoft Outlook de escritorio instalado y con la cuenta corporativa iniciada.
- Node.js instalado.
- Acceso desde esta computadora a MySQL del servidor de KittyHP.

## Configuración

En la computadora que ejecutará el worker, crea `backend/.env` con los datos de la base de KittyHP:

```env
DB_HOST=IP_O_NOMBRE_DEL_SERVIDOR_MYSQL
DB_PORT=3306
DB_USER=usuario_mysql
DB_PASSWORD=contraseña_mysql
DB_NAME=kittyhp

EMAIL_WORKER_INTERVAL_MS=5000
EMAIL_WORKER_STALE_MINUTES=15
```

Cuando el worker se ejecuta en una computadora diferente al servidor, `DB_HOST` no debe ser `localhost`; debe ser la IP o nombre del servidor MySQL.

## Instalación y ejecución

Abre PowerShell o CMD en la carpeta `backend`:

```powershell
npm install
npm run email-worker
```

La ventana debe permanecer abierta. Cuando se envía un correo, se muestra un mensaje como:

```text
[KittyHP Email Worker] Enviado #1 a Ramos.Rey@inventec.com
```

## Estados de la cola

- `pending`: esperando que el worker lo tome.
- `processing`: el worker lo está enviando.
- `sent`: Outlook lo envió.
- `error`: se agotaron los intentos o ocurrió un error permanente.

Para volver a intentar un correo con error:

```sql
UPDATE email_queue
SET status = 'pending', attempts = 0, error_message = NULL,
    locked_by = NULL, locked_at = NULL
WHERE id = 1;
```

## Ejecución automática

Se recomienda crear una tarea en el Programador de tareas de Windows que se ejecute al iniciar sesión, usando como programa:

```text
C:\Program Files\nodejs\npm.cmd
```

Argumentos:

```text
run email-worker
```

Iniciar en:

```text
C:\ruta\a\KittyHP\backend
```

La tarea debe ejecutarse con el mismo usuario de Windows que tiene Outlook configurado. No se recomienda ejecutarla como `SYSTEM`, porque Outlook no tendrá acceso al perfil del usuario.
