export function validateRedirectDestination(dest: unknown): string | null {
  if (typeof dest !== 'string') return null;
  const trimmed = dest.trim();
  if (trimmed === '') return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  try {
    const url = new URL(trimmed, 'http://localhost');
    if (url.origin !== 'http://localhost') return null;
  } catch {
    return null;
  }
  return trimmed;
}
