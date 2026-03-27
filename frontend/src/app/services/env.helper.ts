/**
 * Returns the backend base URL.
 * - In development (localhost): uses http://localhost:8001
 * - In production (Render or other): uses relative URL (same origin)
 */
export function getBackendUrl(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  return '';
}

export function getApiUrl(path: string): string {
  return `${getBackendUrl()}/api${path}`;
}
