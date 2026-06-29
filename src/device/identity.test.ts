/**
 * Device identity persistence. SecureStore is mocked by jest-expo so the
 * underlying calls resolve in-memory.
 */

import { getOrCreateDeviceId, resetDeviceId } from '@/device/identity';

describe('device identity', () => {
  beforeEach(async () => {
    await resetDeviceId();
  });

  it('generates a UUID v4 on first call', async () => {
    const id = await getOrCreateDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the same id on subsequent calls (idempotent)', async () => {
    const a = await getOrCreateDeviceId();
    const b = await getOrCreateDeviceId();
    expect(a).toBe(b);
  });

  it('regenerates after reset', async () => {
    const a = await getOrCreateDeviceId();
    await resetDeviceId();
    const b = await getOrCreateDeviceId();
    expect(a).not.toBe(b);
  });
});
