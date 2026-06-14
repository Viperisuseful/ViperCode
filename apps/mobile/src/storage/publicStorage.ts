import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readPublicJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writePublicJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removePublic(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
