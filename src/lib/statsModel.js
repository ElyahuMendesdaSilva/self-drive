// src/lib/statsModel.js — transforma o índice de arquivos + uso de disco nas estatísticas da tela.
// Função pura (sem rede): recebe os dados já carregados e devolve um objeto pronto para a interface.
import { fileTypeOf } from "./format";

// Cada categoria aponta para um PAPEL do tema (ex.: "primary"); a tela resolve a cor do esquema atual.
export const CATEGORY_META = {
  image: { label: "Imagens", color: "primary" },
  video: { label: "Vídeos", color: "error" },
  audio: { label: "Áudios", color: "tertiary" },
  pdf: { label: "PDFs", color: "warning" },
  sheet: { label: "Planilhas", color: "secondary" },
  zip: { label: "Compactados", color: "primaryContainer" },
  doc: { label: "Documentos e outros", color: "onPrimaryContainer" },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const sizeOf = (item) => Math.max(0, Number(item.size) || 0);
const timeOf = (item) => {
  const value = new Date(item.modified).getTime();
  return Number.isNaN(value) ? 0 : value;
};
const percentOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/**
 * @param {object} input
 * @param {Array}  input.index      itens de getIndex() (arquivos e pastas, com path/name/size/modified/isDir)
 * @param {{used:number,total:number}} input.usage  retorno de getDiskUsage()
 * @param {boolean} [input.truncated] true se a varredura parou no limite de pastas
 * @param {Array|null} [input.trash]  itens da lixeira (null se não foi possível ler)
 * @param {number|null} [input.shareCount] quantidade de links compartilhados (null se indisponível)
 * @param {number} [input.topFiles]  quantos "maiores arquivos" devolver
 */
export function buildStats({
  index = [],
  usage = {},
  truncated = false,
  trash = null,
  shareCount = null,
  topFiles = 10,
}) {
  const files = index.filter((item) => !item.isDir);
  const folderCount = index.length - files.length;
  const filesSize = files.reduce((sum, item) => sum + sizeOf(item), 0);

  // por categoria (imagens, vídeos, PDFs…)
  const categories = new Map();
  // por extensão (jpg, mp4…), como no app web
  const extensions = new Map();
  for (const file of files) {
    const size = sizeOf(file);
    const key = fileTypeOf(file.name, false);
    const category = categories.get(key) || { key, count: 0, size: 0 };
    category.count += 1;
    category.size += size;
    categories.set(key, category);

    const ext = file.name?.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "";
    const extKey = ext || "sem extensão";
    const entry = extensions.get(extKey) || { name: extKey, count: 0, size: 0 };
    entry.count += 1;
    entry.size += size;
    extensions.set(extKey, entry);
  }

  const byCategory = [...categories.values()]
    .map((category) => ({
      ...category,
      label: CATEGORY_META[category.key]?.label || category.key,
      color: CATEGORY_META[category.key]?.color || "onSurfaceVariant",
      percent: percentOf(category.size, filesSize),
    }))
    .sort((a, b) => b.size - a.size);

  const byExtension = [...extensions.values()]
    .map((entry) => ({ ...entry, percent: percentOf(entry.size, filesSize) }))
    .sort((a, b) => b.size - a.size);

  const largestFiles = [...files]
    .sort((a, b) => sizeOf(b) - sizeOf(a))
    .slice(0, topFiles);

  const weekAgo = Date.now() - 7 * DAY_MS;
  const modifiedLast7Days = files.filter(
    (file) => timeOf(file) >= weekAgo,
  ).length;

  const used = Number(usage.used) || 0;
  const total = Number(usage.total) || 0;
  const hasLimit = total > 0;

  return {
    // espaço do servidor (mesma fonte da barra do menu lateral)
    storage: {
      used,
      total,
      free: hasLimit ? Math.max(0, total - used) : null,
      percent: hasLimit ? Math.min(100, Math.round((used / total) * 100)) : 0,
      hasLimit,
    },
    // o que foi encontrado percorrendo as pastas
    totals: {
      files: files.length,
      folders: folderCount,
      filesSize,
      modifiedLast7Days,
    },
    byCategory,
    byExtension,
    largestFiles, // itens crus da API: use toRow() de viewModel.js se quiser exibir em <ListFile>
    trash: trash
      ? {
          count: trash.length,
          size: trash.reduce((sum, item) => sum + sizeOf(item), 0),
        }
      : null,
    shares: shareCount,
    truncated, // true = havia mais pastas do que o limite da varredura; os totais são parciais
    updatedAt: Date.now(),
  };
}
