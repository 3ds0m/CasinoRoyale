/**
 * Provably Fair Cryptographic Engine (SHA-256 & HMAC)
 */

export interface ProvablyFairPair {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

// Simple SHA-256 implementation using Web Crypto API or JS fallback for browser
export const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateRandomHex = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

export const generateProvablyFairPair = async (clientSeed?: string, nonce: number = 1): Promise<ProvablyFairPair> => {
  const serverSeed = generateRandomHex(32);
  const serverSeedHash = await sha256(serverSeed);
  const cSeed = clientSeed || generateRandomHex(16);

  return {
    serverSeed,
    serverSeedHash,
    clientSeed: cSeed,
    nonce,
  };
};

/**
 * Audit / Verify function to check if a server seed matches the hash
 */
export const verifyServerSeed = async (serverSeed: string, expectedHash: string): Promise<boolean> => {
  const actualHash = await sha256(serverSeed);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
};

/**
 * Calculates deterministic outcome roll (0 to 99999) from seeds
 */
export const calculateProvablyFairOutcome = async (serverSeed: string, clientSeed: string, nonce: number): Promise<number> => {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await sha256(combined);
  const subHash = hash.substring(0, 8);
  const numericVal = parseInt(subHash, 16);
  return numericVal % 100000;
};
