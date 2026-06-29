/**
 * Jest setup. Mocks expo-crypto's UUID + random-bytes so identity / auth
 * tests run in node without bridging to native code. Mirrors the contract
 * jest-expo's default mock leaves unfilled.
 *
 * The factory is required to be hoist-safe (no closure refs), so we resolve
 * `node:crypto` lazily inside the mock body.
 */

jest.mock('expo-crypto', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto') as typeof import('node:crypto');
  return {
    __esModule: true,
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomBytes: (n: number) => Uint8Array.from(nodeCrypto.randomBytes(n)),
    getRandomBytesAsync: async (n: number) =>
      Uint8Array.from(nodeCrypto.randomBytes(n)),
    digestStringAsync: jest.fn(async () => 'mocked-digest'),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { BASE64: 'base64', HEX: 'hex', UTF8: 'utf8' },
  };
});

// SecureStore is bridged to native code; in node tests we keep an in-memory
// store so getOrCreateDeviceId() is genuinely idempotent across calls.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});
