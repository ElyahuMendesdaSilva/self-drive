// src/lib/format.js
const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const base = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear() ? base : `${base} de ${date.getFullYear()}`;
}

export function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** index;
  const text = scaled >= 10 || index === 0 ? Math.round(scaled).toString() : scaled.toFixed(1).replace(".", ",");
  return `${text} ${units[index]}`;
}

const EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "avif"],
  video: ["mp4", "mkv", "mov", "avi", "webm", "m4v"],
  audio: ["mp3", "wav", "flac", "ogg", "m4a", "aac"],
  pdf: ["pdf"],
  markdown: ["md", "markdown", "mdown", "mkd"],
  text: ["txt"],
  sheet: ["xls", "xlsx", "csv", "ods"],
  zip: ["zip", "rar", "7z", "tar", "gz"],
};

// Mesmas chaves usadas pelo ListFile (FILE_TYPES).
export function fileTypeOf(name = "", isDir = false) {
  if (isDir) return "folder";
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  for (const [type, list] of Object.entries(EXTENSIONS)) {
    if (list.includes(extension)) return type;
  }
  return "doc";
}

export function baseName(path = "") {
  return path.split("/").filter(Boolean).pop() || "";
}

export function parentPath(path = "/") {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join("/")}/` : "/";
}

export function joinPath(parent, name, isDir = false) {
  const joined = `${parent.replace(/\/+$/, "")}/${name}`;
  return isDir ? `${joined}/` : joined;
}
