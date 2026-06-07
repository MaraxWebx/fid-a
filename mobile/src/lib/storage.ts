import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform key/value storage.
 *
 * On native (iOS/Android) it uses expo-secure-store, which is backed by the
 * Keychain / Keystore. On web there is no native SecureStore module
 * (ExpoSecureStore.getValueWithKeyAsync is undefined), so we fall back to
 * window.localStorage. This keeps the same async API on every platform.
 */

const isWeb = Platform.OS === 'web';

function webStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    return webStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
