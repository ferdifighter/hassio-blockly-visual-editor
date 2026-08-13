/**
 * Basis-URL für API-Aufrufe.
 * Unterstützt lokale Entwicklung (localhost:8099) und Home Assistant Ingress.
 */
export function getApiUrl(endpoint: string): string {
  const path = endpoint.replace(/^\//, '');

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:8099/${path}`;
  }

  const base = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;

  return `${window.location.protocol}//${window.location.host}${base}${path}`;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(getApiUrl(endpoint));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiSend<T>(endpoint: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(getApiUrl(endpoint), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
