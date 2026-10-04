// src/lib/local.js — dados guardados só no aparelho (favoritos e manifesto da lixeira).
import { readJson, writeJson } from "./storage";

const FAVORITES_FILE = "self-drive-favorites.json";
const TRASH_FILE = "self-drive-trash.json";

const list = (name) => {
  const value = readJson(name, []);
  return Array.isArray(value) ? value : [];
};

/* ---------- Favoritos ---------- */
export function getFavorites(source) {
  return list(FAVORITES_FILE).filter((item) => item.source === source);
}

export function isFavorite(source, path) {
  return list(FAVORITES_FILE).some((item) => item.source === source && item.path === path);
}

export function toggleFavorite(source, resource) {
  const records = list(FAVORITES_FILE);
  const exists = records.some((item) => item.source === source && item.path === resource.path);
  const updated = exists
    ? records.filter((item) => item.source !== source || item.path !== resource.path)
    : [
        ...records,
        favoriteRecord(source, resource),
      ];
  writeJson(FAVORITES_FILE, updated);
  return !exists;
}

function favoriteRecord(source, resource) {
  return {
    source,
    path: resource.path,
    name: resource.name,
    size: resource.size,
    modified: resource.modified,
    type: resource.type,
    hasPreview: resource.hasPreview,
    isDir: Boolean(resource.isDir),
  };
}

export function addFavorite(source, resource) {
  const records = list(FAVORITES_FILE);
  const exists = records.some((item) => item.source === source && item.path === resource.path);
  const updated = exists
    ? records.map((item) => item.source === source && item.path === resource.path ? favoriteRecord(source, resource) : item)
    : [...records, favoriteRecord(source, resource)];
  writeJson(FAVORITES_FILE, updated);
}

export function removeFavoritesForPath(source, path) {
  const prefix = `${path.replace(/\/$/, "")}/`;
  writeJson(
    FAVORITES_FILE,
    list(FAVORITES_FILE).filter(
      (item) => item.source !== source || (item.path !== path && !item.path.startsWith(prefix)),
    ),
  );
}

export function renameFavorite(source, oldPath, newPath, newName, isDir = false) {
  const oldPrefix = `${oldPath.replace(/\/$/, "")}/`;
  const newPrefix = `${newPath.replace(/\/$/, "")}/`;
  writeJson(
    FAVORITES_FILE,
    list(FAVORITES_FILE).map((item) => {
      if (item.source !== source) return item;
      if (item.path === oldPath) return { ...item, path: newPath, name: newName };
      if (isDir && item.path.startsWith(oldPrefix)) {
        return { ...item, path: `${newPrefix}${item.path.slice(oldPrefix.length)}` };
      }
      return item;
    }),
  );
}

/* ---------- Manifesto da lixeira ---------- */
export const readTrashManifest = () => list(TRASH_FILE);
export const writeTrashManifest = (entries) => writeJson(TRASH_FILE, entries);
