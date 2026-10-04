// src/lib/storage.js
import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";

// Credenciais: Keychain (iOS) / Keystore (Android).
export async function secureGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key, value) {
  if (value === null || value === undefined || value === "") {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, String(value));
  }
}

// Dados locais maiores (favoritos, manifesto da lixeira): arquivo JSON no armazenamento do app.
export function readJson(name, fallback) {
  try {
    const file = new File(Paths.document, name);
    if (!file.exists) return fallback;
    return JSON.parse(file.textSync());
  } catch {
    return fallback;
  }
}

export function writeJson(name, value) {
  try {
    const file = new File(Paths.document, name);
    if (!file.exists) file.create();
    file.write(JSON.stringify(value));
  } catch (error) {
    console.warn(`Não foi possível salvar ${name}`, error);
  }
}
