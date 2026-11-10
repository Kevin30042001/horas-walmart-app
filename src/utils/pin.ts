/** Hash simple de PIN (SHA-256) para no guardar el PIN en texto plano en Dexie. */
export async function hashPin(pin: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
