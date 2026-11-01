/**
 * Device preference profiles on the weather Worker: `POST /v1/devices`.
 *
 * A profile is the preferences a device keeps (theme, saved places, ...),
 * stored by the API against the device's own random id. Creating one is
 * idempotent when the caller supplies the id: the existing profile comes
 * back. The app sends nothing else about the device, no name, no model, no
 * operating system. Reading (`GET /v1/devices/{id}`) and changing
 * (`PATCH /v1/devices/{id}`) exist on the Worker and nothing here uses them
 * yet.
 */

import { apiFetch, ROUTES } from "@/api/client";

export type DevicePreferences = {
  theme: "light" | "dark" | "system";
  selectedLocation: string;
  savedLocations: string[];
  selectedActivities: string[];
  hasOnboarded: boolean;
  selectedForecastModel: string;
};

export type DeviceProfile = {
  deviceId: string;
  preferences?: DevicePreferences;
  createdAt?: string;
  updatedAt?: string;
};

/** Create (or fetch) the profile for `deviceId`, with the default preferences. */
export function createDeviceProfile(
  deviceId: string,
  signal?: AbortSignal,
): Promise<DeviceProfile> {
  return apiFetch<DeviceProfile>(ROUTES.devices, {
    method: "POST",
    json: { deviceId },
    signal,
  });
}
