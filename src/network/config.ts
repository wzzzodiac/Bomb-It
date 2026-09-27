export function resolveServerUrl(configured: string | undefined, hostname: string): string | null {
  const url = configured?.trim();
  if (url) return url;
  return ['localhost', '127.0.0.1'].includes(hostname) ? 'http://localhost:8080' : null;
}
