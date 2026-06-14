import * as SecureStore from "expo-secure-store";

export async function readSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writeSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function removeSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function readSecureJson<T>(key: string): Promise<T | null> {
  const raw = await readSecure(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeSecureJson(key: string, value: unknown): Promise<void> {
  await writeSecure(key, JSON.stringify(value));
}
