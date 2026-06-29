/**
 * registerDevice + payload shape. Network is stubbed because REGISTER_ENABLED
 * is false in the bootstrap; the helper should resolve { ok, stubbed: true }.
 */

import { buildRegistrationPayload, registerDevice } from '@/device/register';
import { resetDeviceId } from '@/device/identity';

describe('device registration', () => {
  beforeEach(async () => {
    await resetDeviceId();
  });

  it('builds a v3.1-compliant payload', () => {
    const payload = buildRegistrationPayload('1d29bf12-a3a3-4a3a-9a3a-fefefefefefe');
    expect(payload.category).toBe('user_device');
    expect(payload.deviceIdentifier).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.userDevice.platformIdentifier).toMatch(/^(ios|android|web)$/);
    expect(payload.userDevice.formFactor).toMatch(/^(phone|tablet|desktop)$/);
    expect(payload.userDevice.associatedUsers).toEqual([]);
    expect(payload.capabilities).toContain('weather');
  });

  it('returns a stubbed success result while the endpoint is disabled', async () => {
    const result = await registerDevice();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stubbed).toBe(true);
      expect(result.serverId).toBeNull();
    }
  });
});
