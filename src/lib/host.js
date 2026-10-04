// src/lib/host.js
export const DEFAULT_HOST = "http://192.168.0.12:3000";

// Aceita "192.168.0.10:3000", "http://..." ou "https://...".
// Sem protocolo, assume http:// (servidor local sem certificado).
export function normalizeHost(value) {
  let host = String(value ?? "").trim().replace(/\/+$/, "");
  if (!host) return null;
  if (!/^https?:\/\//i.test(host)) host = `http://${host}`;
  try {
    const url = new URL(host);
    return url.hostname ? host : null;
  } catch {
    return null;
  }
}
