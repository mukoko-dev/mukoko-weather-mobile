/**
 * Device registration with the Nyuchi Platform `device.devices` collection.
 *
 * STATUS: STUBBED. The server endpoint POST /api/py/devices/register does not
 * yet exist in mukoko-weather. Until it does we:
 *   1. ensure we have a stable local deviceId (see ./identity)
 *   2. log the payload we WOULD send so QA can verify the shape
 *   3. resolve successfully so the UI doesn't gate on this
 *
 * Once the endpoint lands in mukoko-weather, set REGISTER_ENABLED = true and
 * the same payload below will be POSTed.
 *
 * Schema target (device.devices, v3.1):
 *   _id: <serverGenerated UUID>
 *   _schemaVersion: "v3.1"
 *   category: "user_device"
 *   deviceIdentifier: <our local UUID>
 *   ownerType: "person" | "anonymous"
 *   ownerEntityId: <personId | null>
 *   usagePattern: "personal"
 *   trustState: "uninspected"
 *   capabilities: ["weather", "geolocation", "push?"]
 *   softwareInventory.operatingSystem: { name, version }
 *   honeycombParticipation: { enrolled: false }
 *   msasaManagement: { enrolled: false }
 *   isActive: true
 *   userDevice: {
 *     platformIdentifier: "ios" | "android",
 *     formFactor: "phone" | "tablet",
 *     displayName: <Device.deviceName | "Mukoko Mobile">,
 *     localDataLayer: { hasSecureStore: true },
 *     consentSettings: { analytics: false, crashReports: false },
 *     associatedUsers: [],
 *     registeredAt: <iso>
 *   }
 *   bundle: { appVersion, buildNumber, expoSdk }
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { apiFetch, ApiError } from '@/api/client';
import { getOrCreateDeviceId } from '@/device/identity';

const REGISTER_ENABLED = false; // flip to true once the server endpoint exists
const REGISTER_PATH = '/api/py/devices/register';

export type RegisterDevicePayload = {
  deviceIdentifier: string;
  category: 'user_device';
  userDevice: {
    platformIdentifier: 'ios' | 'android' | 'web';
    formFactor: 'phone' | 'tablet' | 'desktop';
    displayName: string;
    localDataLayer: { hasSecureStore: boolean };
    consentSettings: { analytics: boolean; crashReports: boolean };
    associatedUsers: string[];
    registeredAt: string;
  };
  softwareInventory: {
    operatingSystem: { name: string; version: string | null };
    mukokoApp: { version: string | null; buildNumber: string | null; expoSdk: string | null };
  };
  capabilities: string[];
};

export type RegisterDeviceResult =
  | { ok: true; serverId: string | null; stubbed: boolean }
  | { ok: false; error: string };

function platformIdentifier(): RegisterDevicePayload['userDevice']['platformIdentifier'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function formFactor(): RegisterDevicePayload['userDevice']['formFactor'] {
  if (Platform.OS === 'web') return 'desktop';
  if (Device.deviceType === Device.DeviceType.TABLET) return 'tablet';
  return 'phone';
}

export function buildRegistrationPayload(deviceId: string): RegisterDevicePayload {
  return {
    deviceIdentifier: deviceId,
    category: 'user_device',
    userDevice: {
      platformIdentifier: platformIdentifier(),
      formFactor: formFactor(),
      displayName: Device.deviceName ?? 'Mukoko Mobile',
      localDataLayer: { hasSecureStore: Platform.OS !== 'web' },
      consentSettings: { analytics: false, crashReports: false },
      associatedUsers: [],
      registeredAt: new Date().toISOString(),
    },
    softwareInventory: {
      operatingSystem: {
        name: Platform.OS,
        version: typeof Platform.Version === 'string' ? Platform.Version : String(Platform.Version),
      },
      mukokoApp: {
        version: Application.nativeApplicationVersion ?? null,
        buildNumber: Application.nativeBuildVersion ?? null,
        expoSdk: Constants.expoConfig?.sdkVersion ?? null,
      },
    },
    capabilities: ['weather', 'geolocation'],
  };
}

/**
 * Idempotent: safe to call on every cold start. Returns immediately if the
 * server endpoint is disabled (stubbed mode).
 */
export async function registerDevice(): Promise<RegisterDeviceResult> {
  const deviceId = await getOrCreateDeviceId();
  const payload = buildRegistrationPayload(deviceId);

  if (!REGISTER_ENABLED) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[device.register] stubbed — would POST', REGISTER_PATH, payload);
    }
    return { ok: true, serverId: null, stubbed: true };
  }

  try {
    const response = await apiFetch<{ serverId: string }>(REGISTER_PATH, {
      method: 'POST',
      json: payload,
    });
    return { ok: true, serverId: response.serverId ?? null, stubbed: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // Already registered — treat as success.
      return { ok: true, serverId: null, stubbed: false };
    }
    const message = err instanceof Error ? err.message : 'unknown error';
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[device.register] failed', message);
    }
    return { ok: false, error: message };
  }
}
