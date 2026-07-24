/** URL base del backend. El frontend se sirve por 8010 y la API por 3009. */
export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3009/api`;

export function apiUrl(url: string): string {
  return url.startsWith('/api/') ? `${API_BASE_URL}${url.slice('/api'.length)}` : url;
}
