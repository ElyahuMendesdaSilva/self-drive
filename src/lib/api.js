// src/lib/api.js
// Cliente do File Browser Quantum (backend do Self-Drive). Funciona com http:// e https://.
// Contrato espelhado de frontend-react/src/api/fileBrowser.js.
import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { fetch as expoFetch } from "expo/fetch";
import * as Sharing from "expo-sharing";

import { baseName, joinPath, parentPath } from "./format";
import { DEFAULT_HOST, normalizeHost } from "./host";
import { readTrashManifest, writeTrashManifest } from "./local";
import { buildStats } from "./statsModel";
import { secureGet, secureSet } from "./storage";

const KEYS = {
  token: "selfdrive.token",
  host: "selfdrive.host",
  username: "selfdrive.username",
  source: "selfdrive.source",
};
const TRASH_DIRECTORY = "/.self-drive-trash/";
const REQUEST_TIMEOUT_MS = 20000;

const state = { host: DEFAULT_HOST, token: null, username: null, source: null };
let onUnauthorized = null;

/* ---------- Sessão ---------- */
export const getSession = () => ({ ...state });

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function loadSession() {
  const [host, token, username, source] = await Promise.all([
    secureGet(KEYS.host),
    secureGet(KEYS.token),
    secureGet(KEYS.username),
    secureGet(KEYS.source),
  ]);
  state.host = normalizeHost(host) || DEFAULT_HOST;
  state.token = token || null;
  state.username = username || null;
  state.source = source || null;
  return getSession();
}

async function clearCredentials() {
  state.token = null;
  state.username = null;
  state.source = null;
  await Promise.all([
    secureSet(KEYS.token, null),
    secureSet(KEYS.username, null),
    secureSet(KEYS.source, null),
  ]);
}

export async function setHost(value) {
  const host = normalizeHost(value);
  if (!host) throw new Error("Endereço inválido. Exemplo: 192.168.0.10:3000");
  if (host !== state.host) await clearCredentials(); // o token pertence ao servidor antigo
  state.host = host;
  await secureSet(KEYS.host, host);
  invalidateIndex();
  return getSession();
}

export async function logout() {
  await clearCredentials();
  invalidateIndex();
}

/* ---------- HTTP ---------- */
const qs = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");

const authHeaders = () =>
  state.token ? { Authorization: `Bearer ${state.token}` } : {};

function apiError(message, status, detail) {
  const error = new Error(message);
  error.status = status;
  if (detail) error.detail = detail;
  return error;
}

function errorDetail(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      if (data.message) return String(data.message);
      const failed = Array.isArray(data.failed)
        ? data.failed.find((item) => item && item.message)
        : null;
      if (failed) return String(failed.message);
    }
  } catch {
    // corpo não é JSON: usa o texto puro
  }
  return raw;
}

function statusError(status, detail) {
  if (status === 401)
    return apiError(
      "Sua sessão expirou ou as credenciais são inválidas.",
      401,
      detail,
    );
  if (status === 403) {
    return apiError(
      `Você não tem permissão para esta ação${detail ? ` (${detail})` : ""}.`,
      403,
      detail,
    );
  }
  if (status === 409)
    return apiError(
      "Já existe um item com esse nome neste local.",
      409,
      detail,
    );
  return apiError(detail || `Erro do servidor (${status}).`, status, detail);
}

async function request(
  path,
  {
    auth = true,
    headers,
    timeoutMs = REQUEST_TIMEOUT_MS,
    fetcher = fetch,
    ...options
  } = {},
) {
  if (!state.host)
    throw new Error("Informe o endereço do servidor nas configurações.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetcher(`${state.host}${path}`, {
      ...options,
      headers: { ...(auth ? authHeaders() : {}), ...(headers || {}) },
      signal: controller.signal,
    });
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    const error = new Error(
      timedOut
        ? `Tempo esgotado ao conectar em ${state.host}. Confira o endereço e se o celular está na mesma rede.`
        : `Não foi possível conectar em ${state.host}. Verifique se o servidor está ligado e acessível.`,
    );
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = errorDetail(await response.text());
    if (response.status === 401 && auth && state.token) onUnauthorized?.();
    throw statusError(response.status, detail);
  }
  return response;
}

const jsonBody = (body) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ---------- Autenticação ---------- */
async function getSources() {
  const response = await request("/api/settings/sources");
  const result = await response.json();
  return result && typeof result === "object" ? result : {};
}

export async function login(username, password) {
  const user = String(username || "").trim();
  if (!user || !password) throw new Error("Informe usuário e senha.");
  let response;
  try {
    // O Quantum exige a senha URL-encoded no header X-Password.
    response = await request(`/api/auth/login?${qs({ username: user })}`, {
      method: "POST",
      auth: false,
      headers: { "X-Password": encodeURIComponent(password) },
    });
  } catch (error) {
    if (error.status === 401)
      throw apiError("Usuário ou senha inválidos.", 401);
    if (error.status === 429)
      throw apiError(
        "Muitas tentativas de login. Aguarde um pouco e tente novamente.",
        429,
      );
    throw error;
  }
  const token = (await response.text()).trim().replace(/^"|"$/g, "");
  if (!token) throw new Error("O servidor não retornou um token de sessão.");

  state.token = token;
  state.username = user;
  try {
    const sources = await getSources();
    const names = Object.keys(sources);
    if (!names.length)
      throw new Error(
        "Nenhuma origem de arquivos está disponível para este usuário.",
      );
    state.source =
      state.source && sources[state.source] ? state.source : names[0];
  } catch (error) {
    await clearCredentials();
    throw error;
  }
  await Promise.all([
    secureSet(KEYS.token, state.token),
    secureSet(KEYS.username, state.username),
    secureSet(KEYS.source, state.source),
  ]);
  return getSession();
}

export async function getCurrentUser() {
  const response = await request(
    `/api/users?${qs({ username: state.username || "self" })}`,
  );
  const value = await response.json();
  return Array.isArray(value)
    ? value[0] || null
    : value?.user || value?.data || value;
}

export async function uploadCurrentUserAvatar(uri, filename, mimeType) {
  const file = new File(uri);
  const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
  const fileType = file.type || mimeType;
  if (fileType && !acceptedTypes.includes(fileType)) {
    throw new Error("Escolha uma imagem JPEG, PNG ou WebP.");
  }
  if (file.size > 2 * 1024 * 1024 - 8192) {
    throw new Error("A imagem deve ter menos de 2 MiB.");
  }
  const form = new FormData();
  form.append("avatar", file, filename || file.name || "avatar.jpg");
  const response = await request(
    `/api/users/avatar?${qs({ username: state.username })}`,
    {
      method: "PUT",
      body: form,
      fetcher: expoFetch,
    },
  );
  return response.json();
}

// Fontes para <Image>: o token vai no header (a rota exige autenticação).
export function avatarSource(avatarUrl) {
  const uri = avatarUrl?.startsWith("/")
    ? `${state.host}${avatarUrl}`
    : `${state.host}/api/users/avatar?${qs({ username: state.username })}`;
  return { uri, headers: authHeaders() };
}

export function thumbnailSource(path) {
  return {
    uri: `${state.host}/api/resources/preview?${qs({ source: state.source || "", path, size: "small" })}`,
    headers: authHeaders(),
  };
}

// Preview de um arquivo (imagem, vídeo, PDF…) gerado pelo servidor. size: "small" | "large" | "original".
export function previewSource(path, size = "large") {
  return {
    uri: `${state.host}/api/resources/preview?${qs({ source: state.source || "", path, size })}`,
    headers: authHeaders(),
  };
}

// Fonte autenticada para reprodução por streaming; o player busca os trechos necessários.
export function streamSource(path) {
  return {
    uri: `${state.host}/api/resources/download?${qs({ source: state.source || "", file: path })}`,
    headers: authHeaders(),
  };
}

export async function readTextResource(path) {
  const response = await request(
    `/api/resources/download?${qs({ source: state.source || "", file: path })}`,
  );
  return response.text();
}

/* ---------- Imagens autenticadas (miniaturas, avatar e visualizador) ---------- */
// O <Image> do React Native nem sempre envia headers. Aqui baixamos a imagem para o cache do
// app já com o token e devolvemos o file:// local, que qualquer <Image> exibe sem problema.
const imageCache = new Map(); // chave -> Promise<uri local>
let imageSlots = 0;
const imageQueue = [];
const MAX_IMAGE_DOWNLOADS = 4; // evita abrir dezenas de conexões ao rolar a lista

const takeImageSlot = () =>
  new Promise((resolve) => {
    if (imageSlots < MAX_IMAGE_DOWNLOADS) {
      imageSlots += 1;
      resolve();
    } else {
      imageQueue.push(resolve);
    }
  });

const releaseImageSlot = () => {
  const next = imageQueue.shift();
  if (next)
    next(); // passa a vaga adiante
  else imageSlots -= 1;
};

const hashText = (text) => {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1)
    hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
  return hash.toString(36);
};

// source: { uri, headers? } (como thumbnailSource/avatarSource). version: ex. data de modificação,
// para buscar de novo quando o arquivo mudar.
export function getAuthImage(source, version = "") {
  const url = typeof source === "string" ? source : source?.uri;
  if (!url) return Promise.reject(new Error("Imagem sem endereço."));
  const key = `${state.username || ""}|${url}|${version}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const headers =
    (typeof source === "object" && source?.headers) || authHeaders();
  const promise = (async () => {
    const directory = new Directory(Paths.cache, "images");
    directory.create({ idempotent: true, intermediates: true });
    const target = new File(directory, `${hashText(key)}.img`);
    if (target.exists && target.size > 0) return target.uri; // já baixada antes (inclusive em outra sessão)

    await takeImageSlot();
    try {
      const file = await File.downloadFileAsync(url, target, {
        headers,
        idempotent: true,
      });
      if (!file?.exists || file.size === 0)
        throw new Error("O servidor devolveu uma imagem vazia.");
      return file.uri;
    } finally {
      releaseImageSlot();
    }
  })().catch((error) => {
    imageCache.delete(key); // permite tentar de novo depois
    throw error;
  });
  imageCache.set(key, promise);
  return promise;
}

export async function getDiskUsage() {
  const usage = (await getSources())[state.source] || {};
  return { used: usage.usedAlt ?? usage.used ?? 0, total: usage.total ?? 0 };
}

/* ---------- Arquivos e pastas ---------- */
const resourceUrl = (path, extra = {}) =>
  `/api/resources?${qs({ path: path || "/", source: state.source || "", ...extra })}`;

function normalizeItem(item, forcedIsDir) {
  const isDir = forcedIsDir ?? item.isDir ?? item.type === "directory";
  return { ...item, isDir: Boolean(isDir) };
}

export async function listResources(path = "/") {
  const response = await request(resourceUrl(path));
  const result = await response.json();
  const items = Array.isArray(result)
    ? result.map((item) => normalizeItem(item))
    : [
        ...(result.folders || []).map((item) => normalizeItem(item, true)),
        ...(result.files || []).map((item) => normalizeItem(item, false)),
        ...(result.items || []).map((item) => normalizeItem(item)),
      ];
  const trashName = TRASH_DIRECTORY.replace(/\//g, "");
  const insideTrash = path.replace(/^\/+/, "").startsWith(trashName);
  return {
    path,
    items: (insideTrash
      ? items
      : items.filter((item) => !(item.isDir && item.name === trashName))
    ).map((item) => ({
      ...item,
      path: joinPath(path, item.name, item.isDir),
    })),
  };
}

export async function createFolder(parent, name) {
  await request(resourceUrl(joinPath(parent, name, true), { isDir: "true" }), {
    method: "POST",
  });
  invalidateIndex();
}

export async function deleteResource(path) {
  await request(resourceUrl(path), { method: "DELETE" });
  invalidateIndex();
}

async function moveResource(path, destination, action = "move") {
  await request("/api/resources", {
    method: "PATCH",
    ...jsonBody({
      action,
      items: [
        {
          fromSource: state.source,
          fromPath: path,
          toSource: state.source,
          toPath: destination,
        },
      ],
      overwrite: false,
      rename: false,
    }),
  });
  invalidateIndex();
}

export async function transferResources(
  files,
  destination,
  action,
  fromSource = state.source,
) {
  const topLevelFiles = files.filter(
    (file) =>
      !files.some(
        (parent) =>
          parent !== file &&
          parent.isDir &&
          file.path.startsWith(`${parent.path.replace(/\/$/, "")}/`),
      ),
  );
  const items = topLevelFiles.flatMap((file) => {
    const toPath = joinPath(destination, file.name, Boolean(file.isDir));
    if (
      action === "move" &&
      (fromSource || "") === (state.source || "") &&
      file.path === toPath
    )
      return [];
    if (
      file.isDir &&
      destination.startsWith(`${file.path.replace(/\/$/, "")}/`)
    ) {
      throw new Error(`Não é possível colar “${file.name}” dentro dela mesma.`);
    }
    return [
      {
        fromSource: fromSource || "",
        fromPath: file.path,
        toSource: state.source || "",
        toPath,
      },
    ];
  });
  if (!items.length) return;
  await request("/api/resources", {
    method: "PATCH",
    ...jsonBody({ action, items, overwrite: false, rename: false }),
  });
  invalidateIndex();
}

export async function renameResource(path, newName) {
  const isDir = path.endsWith("/");
  await moveResource(
    path,
    joinPath(parentPath(path), newName, isDir),
    "rename",
  );
}

/* ---------- Upload e download ---------- */
export async function pickFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    // Keep a readable local copy for expo-file-system's native upload task.
    copyToCacheDirectory: true,
  });
  return result.canceled
    ? []
    : result.assets.map((asset) => ({
        // DocumentPicker exposes the provider's original display name. The
        // URI's last segment can instead be an opaque ID such as "msf:...".
        file: new File(asset.uri),
        name: asset.name,
      }));
}

export async function pickDirectoryFiles() {
  const root = await Directory.pickDirectoryAsync();
  const files = [];
  const directories = [root.name];

  const walk = (directory, relativePath) => {
    for (const entry of directory.list()) {
      const entryPath = `${relativePath}/${entry.name}`;
      if (entry instanceof Directory) {
        directories.push(entryPath);
        walk(entry, entryPath);
      } else {
        files.push({ file: entry, name: entryPath });
      }
    }
  };

  walk(root, root.name);
  return { files, directories };
}

export function filesFromSharedPayloads(payloads = []) {
  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };

  return payloads
    .filter(
      (payload) =>
        payload?.contentUri &&
        ["audio", "file", "image", "video"].includes(payload.contentType),
    )
    .map((payload, index) => {
      const candidate = String(payload.originalName || "")
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        .trim();
      const nameIsUsable =
        candidate &&
        candidate.toLowerCase() !== "unknown" &&
        !/^(msf:|content:)/i.test(candidate);
      const extension = extensionByMimeType[payload.contentMimeType] || "";
      const name = nameIsUsable
        ? candidate
        : `arquivo-compartilhado-${index + 1}${extension ? `.${extension}` : ""}`;

      return { file: new File(payload.contentUri), name };
    });
}

// Envia os arquivos um a um; devolve { sent, failures }.
export async function uploadFiles(parent, files, onProgress, directories = []) {
  const failures = [];
  let sent = 0;
  const createdDirectories = new Set();
  for (const directory of directories) {
    const parts = directory.split("/").filter(Boolean);
    let target = parent;
    try {
      for (const [partIndex, part] of parts.entries()) {
        const relativePath = parts.slice(0, partIndex + 1).join("/");
        if (!createdDirectories.has(relativePath)) {
          await createFolder(target, part);
          createdDirectories.add(relativePath);
        }
        target = joinPath(target, part, true);
      }
    } catch (error) {
      failures.push(`${directory}/: ${error.message}`);
    }
  }
  for (const [index, file] of files.entries()) {
    onProgress?.({ index, total: files.length, name: file.name, fraction: 0 });
    try {
      const url = `${state.host}${resourceUrl(joinPath(parent, file.name))}`;
      const uploadable = file.file ?? file;
      const result = await uploadable.upload(url, {
        httpMethod: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/octet-stream",
        },
        onProgress: ({ bytesSent, totalBytes }) =>
          onProgress?.({
            index,
            total: files.length,
            name: file.name,
            fraction: totalBytes ? bytesSent / totalBytes : 0,
          }),
      });
      if (result.status < 200 || result.status >= 300) {
        if (result.status === 401) onUnauthorized?.();
        throw statusError(result.status, errorDetail(result.body));
      }
      sent += 1;
    } catch (error) {
      if (error.status === 401) throw error;
      failures.push(`${file.name}: ${error.message}`);
    }
  }
  invalidateIndex();
  return { sent, failures };
}

// Baixa para o cache do app e abre a folha de compartilhamento do sistema (salvar, abrir com…).
export async function downloadAndShare(path, name, isDir = false) {
  const directory = new Directory(Paths.cache, "downloads");
  directory.create({ idempotent: true, intermediates: true });
  const fileName =
    isDir && !name.toLowerCase().endsWith(".zip")
      ? `${name}.zip`
      : name || baseName(path) || "arquivo";
  const target = new File(directory, fileName);
  if (target.exists) target.delete();

  let file;
  try {
    const task = File.createDownloadTask(
      `${state.host}/api/resources/download?${qs({ source: state.source || "", file: path })}`,
      target,
      {
        headers: authHeaders(),
        sessionType: "background",
      },
    );
    try {
      file = await task.downloadAsync();
    } finally {
      task.release();
    }
  } catch (cause) {
    throw new Error(
      `Não foi possível baixar "${fileName}". Verifique a conexão e a permissão de download.`,
      { cause },
    );
  }
  if (!file?.exists || file.size === 0) {
    throw new Error(
      `O servidor não enviou o arquivo "${fileName}". Verifique a permissão de download.`,
    );
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: fileName });
  }
  return file;
}

/* ---------- Índice (recentes e busca) ---------- */
let indexCache = null;
let indexAt = 0;
let indexPromise = null;
let indexTruncated = false; // true se a varredura parou no limite de pastas

export function invalidateIndex() {
  indexCache = null;
  indexAt = 0;
}

// Percorre a árvore (4 pastas em paralelo, no máximo maxFolders) e guarda o resultado por 60 s.
async function getIndex(maxFolders = 300) {
  if (indexCache && Date.now() - indexAt < 60_000) return indexCache;
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const queue = ["/"];
    const resources = [];
    let visited = 0;
    while (queue.length && visited < maxFolders) {
      const batch = queue.splice(0, 4);
      visited += batch.length;
      const results = await Promise.all(
        batch.map(async (path) => {
          try {
            return await listResources(path);
          } catch (error) {
            if (path === "/") throw error;
            return null;
          }
        }),
      );
      for (const result of results) {
        if (!result) continue;
        for (const item of result.items) {
          resources.push(item);
          if (item.isDir) queue.push(item.path);
        }
      }
    }
    indexTruncated = queue.length > 0;
    indexCache = resources;
    indexAt = Date.now();
    return resources;
  })();
  try {
    return await indexPromise;
  } finally {
    indexPromise = null;
  }
}

const timeOf = (item) => {
  const value = new Date(item.modified).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export async function getRecentFiles(limit = 40) {
  const index = await getIndex();
  return index
    .filter((item) => !item.isDir)
    .sort((a, b) => timeOf(b) - timeOf(a))
    .slice(0, limit);
}

export async function searchResources(query) {
  const term = String(query || "")
    .trim()
    .toLocaleLowerCase();
  if (!term) return [];
  const index = await getIndex();
  return index
    .filter((item) => item.name?.toLocaleLowerCase().includes(term))
    .sort(
      (a, b) =>
        Number(b.isDir) - Number(a.isDir) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}

/* ---------- Estatísticas ---------- */
export async function getActivity({
  page = 1,
  limit = 50,
  scope = "all",
} = {}) {
  const response = await request(
    `/api/tools/activity?${qs({ page, limit, scope })}`,
  );
  const result = await response.json();
  return {
    items: Array.isArray(result?.items) ? result.items.filter(Boolean) : [],
    total: Number(result?.total) || 0,
    page: Number(result?.page) || page,
    totalPages: Number(result?.totalPages) || 1,
  };
}

// Reaproveita o índice (cache de 60 s, o mesmo de Recentes/Busca) + uso de disco, lixeira e links.
// Lixeira e links são opcionais: se falharem (ex.: sem permissão de compartilhar), viram null.
export async function getStats() {
  const [index, usage, trash, shares] = await Promise.all([
    getIndex(),
    getDiskUsage(),
    listTrash().catch(() => null),
    listShares().catch(() => null),
  ]);
  return buildStats({
    index,
    usage,
    truncated: indexTruncated,
    trash,
    shareCount: shares ? shares.length : null,
  });
}

/* ---------- Compartilhamento ---------- */
export async function createShare(path, options = {}) {
  const response = await request("/api/share", {
    method: "POST",
    ...jsonBody({
      path,
      source: state.source || "",
      password: options.password || "",
      expires: options.expires ?? "0",
      unit: options.unit || "days",
      shareType: options.shareType || "normal",
      disableAnonymous: Boolean(options.disableAnonymous),
      allowedUsernames: options.allowedUsernames || [],
      allowModify: Boolean(options.allowModify),
      allowCreate: Boolean(options.allowCreate),
      allowDelete: Boolean(options.allowDelete),
      allowReplacements: Boolean(options.allowReplacements),
      disableDownload: Boolean(options.disableDownload),
      disableThumbnails: Boolean(options.disableThumbnails),
      keepAfterExpiration: Boolean(options.keepAfterExpiration),
      disableSidebar: Boolean(options.disableSidebar),
      downloadsLimit: Number(options.downloadsLimit) || 0,
      maxBandwidth: Number(options.maxBandwidth) || 0,
    }),
  });
  return response.json();
}

export async function searchShareUsers(query) {
  const response = await request(
    `/api/users?${qs({ q: String(query || "").trim() })}`,
  );
  const value = await response.json();
  const users = Array.isArray(value)
    ? value
    : Array.isArray(value?.users)
      ? value.users
      : Array.isArray(value?.data)
        ? value.data
        : [];
  return users
    .map((user) => {
      if (typeof user === "string") return { username: user };
      const username = user?.username || user?.name;
      return username ? { ...user, username: String(username) } : null;
    })
    .filter(Boolean);
}

export async function listShares() {
  const response = await request("/api/share/list");
  const result = await response.json();
  return Array.isArray(result) ? result : result?.shares || result?.data || [];
}

export async function deleteShare(hash) {
  await request(`/api/share?${qs({ hash })}`, { method: "DELETE" });
}

export const shareUrl = (share) =>
  share?.shareURL ||
  `${state.host}/public/share/${encodeURIComponent(share.hash)}`;

/* ---------- Lixeira (pasta oculta + manifesto local, como no app web) ---------- */
async function ensureTrashDirectory() {
  try {
    await listResources(TRASH_DIRECTORY);
  } catch (error) {
    if (error.status !== 404) throw error;
    await createFolder(
      "/",
      TRASH_DIRECTORY.replace(/^\//, "").replace(/\/$/, ""),
    );
  }
}

export async function listTrash() {
  let result;
  try {
    result = await listResources(TRASH_DIRECTORY);
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
  const byPath = new Map(
    readTrashManifest().map((entry) => [entry.trashPath, entry]),
  );
  return result.items.map((item) => {
    const metadata = byPath.get(item.path);
    const fallbackName = item.name.includes("__")
      ? item.name.split("__").slice(1).join("__")
      : item.name;
    return {
      ...item,
      ...metadata,
      name: metadata?.name || fallbackName,
      trashPath: item.path,
      managed: Boolean(metadata),
    };
  });
}

export async function moveToTrash(path, name, isDir = false) {
  await ensureTrashDirectory();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const trashPath = `${TRASH_DIRECTORY}${id}__${name}${isDir ? "/" : ""}`;
  await moveResource(path, trashPath);
  writeTrashManifest([
    ...readTrashManifest(),
    {
      name,
      originalPath: path,
      trashPath,
      isDir,
      trashedAt: new Date().toISOString(),
    },
  ]);
}

export async function restoreFromTrash(entry) {
  if (!entry.originalPath)
    throw new Error("O caminho original não está disponível para este item.");
  await moveResource(entry.trashPath, entry.originalPath);
  writeTrashManifest(
    readTrashManifest().filter((item) => item.trashPath !== entry.trashPath),
  );
}

export async function deleteFromTrash(entry) {
  await deleteResource(entry.trashPath);
  writeTrashManifest(
    readTrashManifest().filter((item) => item.trashPath !== entry.trashPath),
  );
}

export async function emptyTrash(entries) {
  for (const entry of entries) await deleteResource(entry.trashPath);
  const removed = new Set(entries.map((entry) => entry.trashPath));
  writeTrashManifest(
    readTrashManifest().filter((item) => !removed.has(item.trashPath)),
  );
}

/* ---------- Configurações: usuário, padrões, segurança, tokens e administração ---------- */
// O servidor aceita respostas vazias (204) em vários PATCH/DELETE; esta função lida com os dois casos.
async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };
// Ações sensíveis exigem a senha de quem está logado (URL-encoded) no header X-Password.
const passwordHeader = (password) =>
  password ? { "X-Password": encodeURIComponent(password) } : {};

export const getSessionUsername = () => state.username;

export async function getUserByName(username) {
  const response = await request(`/api/users?${qs({ username })}`);
  const value = await response.json();
  return Array.isArray(value) ? value[0] || null : value;
}

export async function listUsers() {
  const response = await request("/api/users");
  const value = await response.json();
  return Array.isArray(value) ? value : [];
}

// PATCH /api/users: `which` lista campos do TOPO do usuário (ex.: "showHidden", "fileLoading").
// Objetos aninhados (preview, fileLoading) são substituídos por inteiro, então `data` deve levar o objeto completo.
export async function patchUser(username, which, data, { password } = {}) {
  await request(`/api/users?${qs({ username })}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, ...passwordHeader(password) },
    body: JSON.stringify({ which, data: { ...data, username } }),
  });
}

export async function createUser(user, { password } = {}) {
  await request("/api/users", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...passwordHeader(password) },
    body: JSON.stringify({ which: [], data: user }),
  });
}

export async function deleteUser(username, { password } = {}) {
  await request(`/api/users?${qs({ username })}`, {
    method: "DELETE",
    headers: passwordHeader(password),
  });
}

/* ----- padrões de usuário (administrador) ----- */
export async function getUserDefaults() {
  const response = await request("/api/settings/user-defaults");
  return (await readBody(response)) || {};
}

// O servidor exige UMA propriedade por requisição, e "valores" e "impostos" nunca na mesma chamada.
export async function patchUserDefaults(partial) {
  await request("/api/settings/user-defaults", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(partial),
  });
}

export async function getSourceSettings() {
  const response = await request("/api/settings/source");
  return (await readBody(response)) || {};
}

export async function patchSourceSettings(partial) {
  const response = await request("/api/settings/source", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(partial),
  });
  return readBody(response);
}

export async function listSourceNames() {
  return Object.keys(await getSources());
}

/* ----- senha e verificação em duas etapas ----- */
export async function changePassword(currentPassword, newPassword) {
  if (!currentPassword) throw new Error("Informe a senha atual.");
  if (!newPassword) throw new Error("Informe a nova senha.");
  await patchUser(
    state.username,
    ["password"],
    { password: newPassword },
    { password: currentPassword },
  );
}

// Gera um segredo novo e devolve { url, secret }. `url` é o otpauth:// que apps autenticadores abrem direto.
export async function generateOtp(password) {
  const response = await request(
    `/api/auth/otp/generate?${qs({ username: state.username })}`,
    {
      method: "POST",
      headers: passwordHeader(password),
    },
  );
  const body = await response.json();
  const url = String(body?.url || "");
  let secret = "";
  try {
    secret = new URL(url).searchParams.get("secret") || "";
  } catch {
    secret = (url.match(/[?&]secret=([^&]+)/) || [])[1] || "";
  }
  return { url, secret: decodeURIComponent(secret) };
}

// Confirma o código de 6 dígitos e ativa o 2FA.
export async function verifyOtp(password, code) {
  await request(`/api/auth/otp/verify?${qs({ username: state.username })}`, {
    method: "POST",
    headers: { ...passwordHeader(password), "X-Secret": String(code).trim() },
  });
}

export async function disableOtp(password) {
  await patchUser(
    state.username,
    ["otpEnabled"],
    { otpEnabled: false },
    { password },
  );
}

/* ----- tokens de API ----- */
export async function listApiTokens() {
  try {
    const response = await request("/api/auth/token/list");
    const value = await response.json();
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.status === 404) return []; // o servidor responde 404 quando não há nenhum token
    throw error;
  }
}

// permissions: undefined → token mínimo (compatível com WebDAV); array → token personalizado.
export async function createApiToken({ name, days, permissions }) {
  const params = { name, days: String(days) };
  if (Array.isArray(permissions)) {
    params.minimal = "false";
    if (permissions.length) params.permissions = permissions.join(",");
  } else {
    params.permissions = "minimal";
  }
  const response = await request(`/api/auth/token?${qs(params)}`, {
    method: "POST",
  });
  const body = await response.json();
  return String(body?.token || "");
}

export async function deleteApiToken(name) {
  await request(`/api/auth/token?${qs({ name })}`, { method: "DELETE" });
}

/* ----- compartilhamentos: editar as opções de um link existente ----- */
// POST /api/share com `hash` atualiza o link. O servidor substitui todas as opções pelo que vier no corpo,
// então enviamos o link inteiro. A expiração volta como segundos restantes para não virar "nunca expira".
export async function updateShare(share, changes) {
  const expire = Number(share.expire) || 0;
  const remaining =
    expire > 0 ? Math.max(1, expire - Math.floor(Date.now() / 1000)) : 0;
  const response = await request("/api/share", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ...share,
      ...changes,
      hash: share.hash,
      expires: String(remaining),
      unit: "seconds",
    }),
  });
  return readBody(response);
}

/* ----- grupos e regras de acesso (administrador) ----- */
export async function listGroups() {
  const response = await request("/api/access/groups");
  const body = await response.json();
  return Array.isArray(body?.groups) ? body.groups : [];
}

export async function listGroupsOfUser(username) {
  const response = await request(
    `/api/access/groups?${qs({ user: username })}`,
  );
  const body = await response.json();
  return Array.isArray(body?.groups) ? body.groups : [];
}

export async function addUserToGroup(group, username) {
  await request(`/api/access/group?${qs({ group, user: username })}`, {
    method: "POST",
  });
}

export async function removeUserFromGroup(group, username) {
  await request(`/api/access/group?${qs({ group, user: username })}`, {
    method: "DELETE",
  });
}

export async function getAccessRule(source, path) {
  const response = await request(`/api/access?${qs({ source, path })}`);
  return (await readBody(response)) || {};
}

export async function listAccessRules(source) {
  const response = await request(`/api/access?${qs({ source })}`);
  return (await readBody(response)) || {};
}

export async function addAccessRule(
  source,
  path,
  { allow, ruleCategory, value },
) {
  await request(`/api/access?${qs({ source, path })}`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ allow, ruleCategory, value: value || "" }),
  });
}

export async function deleteAccessRule(
  source,
  path,
  { ruleType, ruleCategory, value, cascade },
) {
  await request(
    `/api/access?${qs({ source, path, ruleType, ruleCategory, value: value || "", cascade: cascade ? "true" : "false" })}`,
    {
      method: "DELETE",
    },
  );
}

export async function moveAccessRule(source, oldPath, newPath) {
  await request("/api/access", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ source, oldPath, newPath }),
  });
}

/* ----- sistema (administrador) ----- */
export async function getAnalytics() {
  const response = await request("/api/settings/analytics");
  return (await readBody(response)) || {};
}

export async function setAnalyticsEnabled(enabled) {
  const response = await request("/api/settings/analytics", {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ enabled }),
  });
  return readBody(response);
}

export async function getAnalyticsPreview() {
  const response = await request("/api/settings/analytics/preview", {
    timeoutMs: 30000,
  });
  return JSON.stringify(await response.json(), null, 2);
}

export async function getServerConfig() {
  const response = await request("/api/settings/config?full=true", {
    timeoutMs: 30000,
  });
  return response.text();
}
