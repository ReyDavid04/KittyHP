const REQUIRED_ENVIRONMENT_VARIABLES = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'AUTH_EMAIL',
  'AUTH_PASSWORD',
  'AUTH_TOKEN_SECRET',
  'AUTH_TOKEN_LIFETIME_MS',
  'EMAIL_WORKER_INTERVAL_MS',
  'EMAIL_WORKER_STALE_MINUTES',
] as const;

const POSITIVE_INTEGER_VARIABLES = [
  'PORT',
  'DB_PORT',
  'AUTH_TOKEN_LIFETIME_MS',
  'EMAIL_WORKER_INTERVAL_MS',
  'EMAIL_WORKER_STALE_MINUTES',
] as const;

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => {
    const value = config[name];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables obligatorias en backend/.env: ${missingVariables.join(', ')}`,
    );
  }

  for (const name of POSITIVE_INTEGER_VARIABLES) {
    const value = Number(config[name]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`La variable ${name} debe ser un número entero mayor que cero.`);
    }
  }

  const tokenSecret = String(config.AUTH_TOKEN_SECRET);
  if (tokenSecret.length < 32) {
    throw new Error('AUTH_TOKEN_SECRET debe contener al menos 32 caracteres.');
  }

  return config;
}
