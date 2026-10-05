// Pure, dependency-free, alias-free. Uses only Web Crypto and btoa so it runs
// in the Proxy runtime (Node.js or Edge) without Buffer. Not wired anywhere yet.

export const NONCE_BYTE_LENGTH = 16; // 128 bits

// Standard base64 alphabet only. None of `; , ' " whitespace < > &` can appear,
// so a valid nonce cannot break out of a CSP source expression or an HTML
// attribute.
const NONCE_PATTERN = /^[A-Za-z0-9+/]{22,}={0,2}$/;

/** Per-request nonce: 128 random bits from Web Crypto, base64 (24 chars). */
export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTE_LENGTH);

  crypto.getRandomValues(bytes);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/** True when the value is base64 and carries at least 128 bits of encoding. */
export function isValidNonce(value: unknown): value is string {
  return typeof value === "string" && NONCE_PATTERN.test(value);
}
