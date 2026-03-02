const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/1/i/l/o for readability

export function generateId(length = 6): string {
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) {
    id += ALPHABET[b % ALPHABET.length];
  }
  return id;
}
