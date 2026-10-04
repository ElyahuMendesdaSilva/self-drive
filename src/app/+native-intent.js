export function redirectSystemPath({ path }) {
  try {
    if (new URL(path).hostname === "expo-sharing") return "/";
  } catch {
    // Mantém o caminho original quando não for uma URL válida.
  }
  return path;
}
