/**
 * Small, non-secret values kept on this device as files in the app's own
 * documents folder (`localStorage` on web). Unlike SecureStore (the iOS
 * Keychain), they go away with the app, so a reinstall starts fresh. Every
 * call is best effort and never throws.
 */

import { Platform } from "react-native";

const NAME = /^[a-z0-9.-]{1,80}$/;

function file(name: string) {
  // Loaded on first use, so a screen that never stores never loads it.
  const { Directory, File, Paths } =
    require("expo-file-system") as typeof import("expo-file-system");
  const dir = new Directory(Paths.document, "device");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return new File(dir, `${name}.txt`);
}

export async function readDeviceText(name: string): Promise<string | null> {
  if (!NAME.test(name)) return null;
  try {
    if (Platform.OS === "web") {
      return typeof window === "undefined"
        ? null
        : window.localStorage.getItem(`mukoko.${name}`);
    }
    const f = file(name);
    return f.exists ? await f.text() : null;
  } catch {
    return null;
  }
}

export async function writeDeviceText(
  name: string,
  value: string,
): Promise<void> {
  if (!NAME.test(name)) return;
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`mukoko.${name}`, value);
      }
      return;
    }
    const f = file(name);
    if (!f.exists) f.create();
    await f.write(value);
  } catch {
    /* best effort */
  }
}
