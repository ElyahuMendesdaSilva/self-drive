// src/lib/settingsModel.js
// Converte src/data/configuracoes.json (gerado a partir do frontend web) em tópicos prontos para a UI.
// O JSON descreve o "tipo" de cada item em texto livre; aqui ele vira um `kind` que a tela sabe desenhar
// e um `binding` que diz ONDE o valor mora no servidor (usuário, padrões de usuário, compartilhamento…).
import raw from "../data/configuracoes.json";

/* ---------- metadados visuais dos cartões (ícone + descrição curta) ---------- */
const TOPIC_META = {
  preferencias_arquivos: { icon: "folder-open-outline", description: "Comportamento da listagem e dos arquivos" },
  preferencias_visualizador: { icon: "eye-outline", description: "Visualizador e editor de arquivos" },
  carregamento_arquivos: { icon: "cloud-download-outline", description: "Uploads e downloads" },
  seguranca_conta: { icon: "shield-checkmark-outline", description: "Senha e verificação em duas etapas" },
  compartilhamentos: { icon: "share-social-outline", description: "Seus links de compartilhamento" },
  tokens_api: { icon: "key-outline", description: "Tokens de acesso à API" },
  usuarios: { icon: "people-outline", description: "Criar e editar usuários" },
  padroes_usuario: { icon: "options-outline", description: "Padrões e política para todos os usuários" },
  acesso: { icon: "lock-closed-outline", description: "Regras de acesso por fonte e caminho" },
  grupos: { icon: "people-circle-outline", description: "Gerenciar grupos e membros" },
  sistema: { icon: "server-outline", description: "Análises, configuração e atualizações" },
};

/* ---------- o que NÃO existe no servidor ou não dá para fazer no app (removido, com o motivo) ---------- */
export const REMOVED_TOPICS = {
  notificacoes: "Usa a API de notificações do navegador; o app não tem como receber eventos em segundo plano.",
  padroes_ferramentas: "O servidor não tem 'acesso a ferramentas' por usuário; não há onde gravar.",
  compartilhamentos_admin: "O servidor não guarda padrões nem política obrigatória para novos compartilhamentos.",
};
const REMOVED_ITEMS = {
  passkeys: "Passkeys (WebAuthn) exigem um módulo nativo de passkeys que o Expo não traz.",
  newFileTemplate: "Não existe no servidor, e o app não tem a função 'novo arquivo' que o usaria.",
  shareQuota: "O servidor não tem cota por compartilhamento.",
  scopeQuota: "O servidor não tem cota de armazenamento por fonte.",
  userToolAccess: "O servidor não tem acesso a ferramentas por usuário.",
};
export const REMOVED = { topics: REMOVED_TOPICS, items: REMOVED_ITEMS };

/* ---------- telas próprias (listas, formulários e fluxos que não cabem numa linha de configuração) ---------- */
const CUSTOM_SCREENS = {
  seguranca_conta: "security",
  sistema: "system",
  compartilhamentos: "shares",
  tokens_api: "tokens",
  usuarios: "users",
  acesso: "access",
  grupos: "groups",
};

/* ---------- onde cada item do próprio usuário mora (PATCH /api/users) ---------- */
// field: campo do topo do usuário. sub: chave dentro de um objeto (preview, fileLoading), que o servidor
// substitui por inteiro. enforce: caminho que o administrador pode impor em /api/settings/user-defaults.
export const USER_BINDINGS = {
  showHidden: { field: "showHidden", enforce: "listing.showHidden" },
  deleteWithoutConfirming: { field: "deleteWithoutConfirming", enforce: "listing.deleteWithoutConfirming" },
  deleteAfterArchive: { field: "deleteAfterArchive", enforce: "listing.deleteAfterArchive" },
  autoplayMedia: { field: "preview", sub: "autoplayMedia", enforce: "fileViewer.autoplayMedia" },
  preferEditorForMarkdown: { field: "preferEditorForMarkdown", enforce: "fileViewer.preferEditorForMarkdown" },
  disableViewingExt: { field: "disableViewingExt", enforce: "fileViewer.disableViewingExt" },
  disableOnlyOfficeExt: { field: "disableOnlyOfficeExt", enforce: "fileViewer.disableOnlyOfficeExt" },
  debugOffice: { field: "debugOffice", enforce: "fileViewer.debugOffice" },
  maxConcurrentUpload: { field: "fileLoading", sub: "maxConcurrentUpload", enforce: "fileLoading.maxConcurrentUpload" },
  uploadChunkSizeMb: { field: "fileLoading", sub: "uploadChunkSizeMb", enforce: "fileLoading.uploadChunkSizeMb" },
  downloadChunkSizeMb: { field: "fileLoading", sub: "downloadChunkSizeMb", enforce: "fileLoading.downloadChunkSizeMb" },
  clearAll: { field: "fileLoading", sub: "clearAll" },
  disableUpdateNotifications: { field: "disableUpdateNotifications", enforce: "account.disableUpdateNotifications" },
};

// Itens que viram uma ação (abrem diálogo ou tela) em vez de guardar valor.
const ACTION_BINDINGS = {
  seguranca_conta: {
    password: { type: "action", action: "changePassword" },
    generateOtp: { type: "action", action: "otpSetup" },
    otpEnabled: { type: "otp" },
  },
  sistema: {
    viewAnalytics: { type: "action", action: "viewAnalytics" },
    viewConfig: { type: "action", action: "viewConfig" },
    analyticsEnabled: { type: "analytics" },
  },
};

function bindingFor(topicId, item) {
  const action = ACTION_BINDINGS[topicId]?.[item.id];
  if (action) return action;
  if (topicId === "padroes_usuario") return { type: "defaults", path: item.campo || `account.${item.id}` };
  if (topicId === "compartilhamentos") return { type: "share", field: item.id };
  const user = USER_BINDINGS[item.id];
  return user ? { type: "user", ...user } : null;
}

/* ---------- filhos dos itens do tipo "N toggles" ---------- */
export const PERMISSIONS_GLOBAIS = [
  { id: "admin", label: "Administrador" },
  { id: "share", label: "Compartilhar arquivos" },
  { id: "api", label: "Tokens de API de longa duração" },
  { id: "realtime", label: "Conexões em tempo real" },
];
export const PERMISSIONS_FONTE = [
  { id: "view", label: "Visualizar" },
  { id: "download", label: "Baixar" },
  { id: "modify", label: "Modificar" },
  { id: "create", label: "Criar" },
  { id: "delete", label: "Excluir" },
];

// Opções fixas dos itens de seleção (o JSON só diz "seleção").
export const SELECT_OPTIONS = {
  shareType: [
    { value: "normal", label: "Normal" },
    { value: "upload", label: "Somente upload" },
  ],
  loginMethod: [
    { value: "password", label: "Senha" },
    { value: "oidc", label: "OIDC" },
    { value: "proxy", label: "Proxy" },
    { value: "ldap", label: "LDAP" },
  ],
};

export const DURATION_UNITS = [
  { value: "days", label: "Dias" },
  { value: "months", label: "Meses" },
];

/* ---------- normalização ---------- */
function kindOf(item, binding) {
  const tipo = (item.tipo || "").toLowerCase();
  if (binding?.type === "action") return { kind: "action" };

  if (tipo.startsWith("slider")) {
    const [, min, max] = tipo.match(/(\d+)\s*a\s*(\d+)/) || [];
    return { kind: "slider", min: Number(min ?? 0), max: Number(max ?? 10) };
  }
  if (tipo.startsWith("toggle + lista")) return { kind: "toggleList" };
  if (tipo.startsWith("toggle")) return { kind: "toggle" };

  if (tipo.startsWith("número + unidade")) return { kind: "numberUnit", units: DURATION_UNITS };
  if (tipo.startsWith("número")) return { kind: "number" };
  if (tipo.startsWith("texto")) return { kind: "text" };
  if (tipo.startsWith("lista de") || tipo.startsWith("lista (adicionar")) return { kind: "list" };

  if (tipo.startsWith("seleção") && SELECT_OPTIONS[item.id]) return { kind: "select", options: SELECT_OPTIONS[item.id] };
  return { kind: "action" };
}

function normalizeItem(topicId, sectionId, item) {
  const binding = bindingFor(topicId, item);
  const isCustomScreen = Boolean(CUSTOM_SCREENS[topicId]);
  // Em telas próprias o item só serve de rótulo/descrição; sem binding ele continua disponível por id.
  if (!binding && !isCustomScreen) return null;
  if (REMOVED_ITEMS[item.id]) return null;
  const base = kindOf(item, binding);
  return {
    key: [topicId, sectionId, item.id].join("."),
    id: item.id,
    label: item.rotulo,
    description: item.descricao || null,
    hint: item.condicao ? `Requer: ${item.condicao}` : null,
    // "Aplicar" = o administrador impõe o valor aos usuários que não são administradores
    policy: binding?.type === "defaults",
    binding,
    ...base,
  };
}

function normalizeTopic(topic, role) {
  const sections = [];
  const add = (id, title, list) => {
    const items = (list ?? []).map((item) => normalizeItem(topic.id, id, item)).filter(Boolean);
    if (items.length) sections.push({ id, title, items });
  };
  add("itens", null, topic.itens);
  add("opcoes", "Opções de cada compartilhamento", topic.opcoes_de_cada_compartilhamento);
  add("preferencias", "Preferências", topic.preferencias);
  add("conta", "Conta", topic.conta);

  const meta = TOPIC_META[topic.id] ?? { icon: "settings-outline", description: "" };
  return {
    id: topic.id,
    role,
    title: topic.titulo,
    icon: meta.icon,
    description: meta.description,
    screen: CUSTOM_SCREENS[topic.id] ?? null,
    // avisos mostrados no topo da tela do tópico
    notices: [topic.descricao, topic.condicao && `Disponível para: ${topic.condicao}`, topic.observacao].filter(Boolean),
    sections,
  };
}

const build = (group, role) =>
  group.topicos.filter((topic) => !REMOVED_TOPICS[topic.id]).map((topic) => normalizeTopic(topic, role));

const userTopics = build(raw.usuario_normal, "user");
const adminTopics = build(raw.administrador, "admin");
const allTopics = [...userTopics, ...adminTopics];
const appUpdatesTopic = {
  id: "atualizacoes_app",
  role: "user",
  title: "Atualizações do app",
  icon: "cloud-download-outline",
  description: "Verificar atualizações do Self Drive",
  screen: "updates",
  notices: [],
  sections: [],
};

/** Tópicos do usuário comum + (se for admin) os exclusivos do administrador. */
export function getTopicGroups(isAdmin) {
  return { user: [...userTopics, appUpdatesTopic], admin: isAdmin ? adminTopics : [] };
}

/** Procura um tópico respeitando o perfil (usuário comum não acessa tópicos de admin). */
export function findTopic(id, isAdmin) {
  const { user, admin } = getTopicGroups(isAdmin);
  return [...user, ...admin].find((t) => t.id === id) ?? null;
}

/** Itens de um tópico pelo id (para as telas próprias reaproveitarem rótulos e tipos do JSON). */
export function topicItems(topicId) {
  const topic = allTopics.find((t) => t.id === topicId);
  return topic ? topic.sections.flatMap((section) => section.items) : [];
}

/** Rótulo e descrição de um item do JSON, mesmo quando ele não vira linha genérica. */
export function itemInfo(topicId, itemId) {
  const source = [...raw.usuario_normal.topicos, ...raw.administrador.topicos].find((t) => t.id === topicId);
  const lists = [source?.itens, source?.opcoes_de_cada_compartilhamento, source?.preferencias, source?.conta];
  const found = lists.flatMap((list) => list ?? []).find((item) => item.id === itemId);
  return { label: found?.rotulo ?? itemId, description: found?.descricao ?? null };
}

/** Itens de preferência do usuário (os mesmos do perfil), na ordem em que aparecem no JSON. */
export function userPreferenceItems() {
  return ["preferencias_arquivos", "preferencias_visualizador", "carregamento_arquivos"].flatMap((id) => topicItems(id));
}

/* ---------- valores ---------- */
/** Valor inicial de um item quando ainda não há nada no servidor. */
export function defaultValue(item) {
  switch (item.kind) {
    case "toggle":
      return false;
    case "slider":
      return Math.round((item.min + item.max) / 2);
    case "number":
    case "text":
      return "";
    case "list":
      return [];
    case "select":
      return item.options[0].value;
    case "numberUnit":
      return { amount: "", unit: item.units[0].value };
    case "toggleList":
      return { enabled: false, items: [] };
    default:
      return null;
  }
}

/** Do formato do servidor para o da tela. */
export function fromServer(item, value) {
  if (value === undefined || value === null) return defaultValue(item);
  if (item.kind === "number") return String(value);
  if (item.kind === "toggle") return Boolean(value);
  if (item.kind === "slider") return Number(value) || defaultValue(item);
  return value;
}

/** Da tela para o formato do servidor. */
export function toServer(item, value) {
  if (item.kind === "number") return Number(value) || 0;
  if (item.kind === "slider") return Math.round(Number(value) || 0);
  return value;
}

/** Lê/escreve `a.b.c` em objetos aninhados (usado nos padrões e nos campos com `sub`). */
export function getPath(object, path) {
  return path.split(".").reduce((current, key) => (current == null ? undefined : current[key]), object);
}

export function nestedPatch(path, value) {
  return path.split(".").reduceRight((inner, key) => ({ [key]: inner }), value);
}

/* ---------- leitura/escrita dos itens ligados ao usuário (PATCH /api/users) ---------- */
export function readUserValue(user, binding) {
  if (!user) return undefined;
  return binding.sub ? user[binding.field]?.[binding.sub] : user[binding.field];
}

// Devolve uma cópia do usuário com o valor trocado. Objetos aninhados são copiados por inteiro,
// porque o servidor substitui `preview`/`fileLoading` inteiros.
export function applyUserValue(user, binding, value) {
  if (binding.sub) return { ...user, [binding.field]: { ...(user[binding.field] || {}), [binding.sub]: value } };
  return { ...user, [binding.field]: value };
}
