// src/lib/viewModel.js — transforma itens da API no formato que o ListFile exibe.
import { thumbnailSource } from "./api";
import { fileTypeOf, formatDate, formatSize } from "./format";

export function toRow(item) {
  const kind = fileTypeOf(item.name, item.isDir);
  const hasThumbnail = !item.isDir && (item.hasPreview ?? kind === "image");
  return {
    ...item,
    id: item.path,
    kind,
    thumbnail: hasThumbnail ? thumbnailSource(item.path) : null,
    shared: false,
    action: item.isDir ? "Pasta" : formatSize(item.size),
    date: formatDate(item.modified),
  };
}

// pastas primeiro, depois ordem alfabética
export const sortRows = (rows) =>
  [...rows].sort(
    (a, b) =>
      Number(b.isDir) - Number(a.isDir) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
