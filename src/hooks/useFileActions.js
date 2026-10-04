// src/hooks/useFileActions.js
// Ações sobre arquivos e pastas (menu, nova pasta, upload, renomear, lixeira…) + diálogos.
// Uso: const actions = useFileActions({ onChanged: reload }); … {actions.element}
import { useCallback, useRef, useState } from "react";
import { Alert, Share } from "react-native";

import FileMenu from "../components/FileMenu";
import ImageViewer from "../components/ImageViewer";
import ShareDialog from "../components/ShareDialog";
import { typeMeta } from "../components/ListFile";
import { useColors } from "../lib/theme";
import PromptDialog from "../components/PromptDialog";
import Toast from "../components/Toast";
import * as api from "../lib/api";
import { fileTypeOf, joinPath, parentPath } from "../lib/format";
import * as local from "../lib/local";
import { clearTransferClipboard, getTransferClipboard, setTransferClipboard } from "../lib/transferClipboard";
import { useSession } from "../lib/session";

export function useFileActions({ onChanged } = {}) {
  const colors = useColors();
  const { source } = useSession();
  const [menu, setMenu] = useState(null); // { file, actions }
  const [prompt, setPrompt] = useState(null); // { title, initial, confirm, onSubmit }
  const [viewer, setViewer] = useState(null); // arquivo de imagem aberto em tela cheia
  const [shareDialog, setShareDialog] = useState(null);
  const [toast, setToast] = useState({ message: "", busy: false });
  const timer = useRef(null);

  const changed = useCallback(() => onChanged?.(), [onChanged]);

  const notify = useCallback((message, { busy = false, duration = 3000 } = {}) => {
    clearTimeout(timer.current);
    setToast({ message, busy });
    if (message && !busy) timer.current = setTimeout(() => setToast({ message: "", busy: false }), duration);
  }, []);

  // Executa uma tarefa assíncrona mostrando progresso; erros viram Alert. Devolve undefined se falhou.
  const run = useCallback(
    async (label, task) => {
      notify(label, { busy: true });
      try {
        const result = await task();
        notify("");
        return result ?? true;
      } catch (error) {
        notify("");
        Alert.alert("Algo deu errado", error?.message || String(error));
        return undefined;
      }
    },
    [notify],
  );

  const confirm = useCallback((title, message, confirmLabel, action) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: action },
    ]);
  }, []);

  /* ---------- ações ---------- */
  const download = (file) => run("Baixando…", () => api.downloadAndShare(file.path, file.name, file.isDir));

  const favorite = (file) => {
    const added = local.toggleFavorite(source, file);
    notify(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
    changed();
  };

  const favoriteSelected = (files) => {
    if (!files?.length) return;
    const allAreFavorites = files.every((file) => local.isFavorite(source, file.path));
    if (allAreFavorites) {
      files.forEach((file) => local.removeFavoritesForPath(source, file.path));
      notify(files.length === 1 ? "Removido dos favoritos" : `${files.length} itens removidos dos favoritos`);
    } else {
      files.forEach((file) => local.addFavorite(source, file));
      notify(files.length === 1 ? "Adicionado aos favoritos" : `${files.length} itens adicionados aos favoritos`);
    }
    changed();
  };

  const copySelected = (files) => {
    if (!files?.length) return;
    setTransferClipboard("copy", files, source);
    notify(`${files.length} item(ns) copiado(s). Abra uma pasta e toque em Colar.`);
  };

  const cutSelected = (files) => {
    if (!files?.length) return;
    setTransferClipboard("move", files, source);
    notify(`${files.length} item(ns) recortado(s). Abra uma pasta e toque em Colar.`);
  };

  const paste = async (destination) => {
    const clipboard = getTransferClipboard();
    if (!clipboard.items.length) return;
    const actionLabel = clipboard.mode === "move" ? "Movendo" : "Copiando";
    const ok = await run(`${actionLabel} ${clipboard.items.length} item(ns)…`, () =>
      api.transferResources(clipboard.items, destination, clipboard.mode, clipboard.source),
    );
    if (ok) {
      if (clipboard.mode === "move") {
        clipboard.items.forEach((file) => local.removeFavoritesForPath(clipboard.source || source, file.path));
        clearTransferClipboard();
      }
      notify(clipboard.mode === "move" ? "Itens movidos" : "Itens copiados");
      changed();
    }
  };

  const deleteSelected = (files) => {
    if (!files?.length) return;
    const topLevelFiles = files.filter((file) => !files.some((parent) =>
      parent !== file && parent.isDir && file.path.startsWith(`${parent.path.replace(/\/$/, "")}/`),
    ));
    const count = topLevelFiles.length;
    confirm(
      count === 1 ? "Mover para a lixeira?" : "Mover itens para a lixeira?",
      count === 1
        ? `“${topLevelFiles[0].name}” será movido para a lixeira.`
        : `${count} itens serão movidos para a lixeira.`,
      count === 1 ? "Mover" : `Mover ${count}`,
      async () => {
        const ok = await run(`Movendo ${count} itens…`, async () => {
          for (const file of topLevelFiles) {
            await api.moveToTrash(file.path, file.name, file.isDir);
            local.removeFavoritesForPath(source, file.path);
          }
        });
        if (ok) {
          notify(count === 1 ? "Movido para a lixeira" : `${count} itens movidos para a lixeira`);
          changed();
        }
      },
    );
  };

  const rename = (file) =>
    setPrompt({
      title: file.isDir ? "Renomear pasta" : "Renomear arquivo",
      initial: file.name,
      confirm: "Renomear",
      onSubmit: async (name) => {
        setPrompt(null);
        if (name === file.name) return;
        const ok = await run("Renomeando…", async () => {
          await api.renameResource(file.path, name);
          local.renameFavorite(source, file.path, joinPath(parentPath(file.path), name, file.isDir), name, file.isDir);
        });
        if (ok) changed();
      },
    });

  const shareLink = (file) => {
    setMenu(null);
    setShareDialog(file);
  };

  const createShare = async (options) => {
    if (!shareDialog) return undefined;
    const created = await run("Criando link…", () => api.createShare(shareDialog.path, options));
    if (!created || created === true) return undefined;
    changed();
    return created;
  };

  const shareCreated = (created) => {
    Share.share({ message: api.shareUrl(created), title: "Compartilhar link" }).catch(() => {});
  };

  const shareImageToDiscord = async (file) => {
    await run("Preparando imagem para compartilhar…", () => api.downloadAndShare(file.path, file.name));
  };

  const trash = (file) =>
    confirm("Mover para a lixeira?", `"${file.name}" será movido para a lixeira.`, "Mover", async () => {
      const ok = await run("Movendo para a lixeira…", async () => {
        await api.moveToTrash(file.path, file.name, file.isDir);
        local.removeFavoritesForPath(source, file.path);
      });
      if (ok) {
        notify("Movido para a lixeira");
        changed();
      }
    });

  const newFolder = (parent) =>
    setPrompt({
      title: "Nova pasta",
      initial: "",
      confirm: "Criar",
      onSubmit: async (name) => {
        setPrompt(null);
        const ok = await run("Criando pasta…", () => api.createFolder(parent, name));
        if (ok) changed();
      },
    });

  const sendUploads = async (parent, files, directories = []) => {
    if (!files.length && !directories.length) return;
    notify(files.length ? `Enviando ${files[0].name}…` : "Criando pastas…", { busy: true });
    let lastPercent = -1;
    try {
      const { sent, failures } = await api.uploadFiles(parent, files, ({ index, total, name, fraction }) => {
        const percent = Math.round(fraction * 100);
        if (percent === lastPercent && fraction < 1) return;
        lastPercent = percent;
        notify(`Enviando ${index + 1} de ${total}: ${name} (${percent}%)`, { busy: true });
      }, directories);
      notify(sent ? `${sent} arquivo(s) enviado(s)` : directories.length && !failures.length ? "Pasta enviada" : "");
      if (failures.length) Alert.alert("Falha no envio", failures.join("\n"));
    } catch (error) {
      notify("");
      Alert.alert("Falha no envio", error?.message || String(error));
    }
    changed();
  };

  const upload = async (parent) => {
    try {
      const files = await api.pickFiles();
      await sendUploads(parent, files);
    } catch (error) {
      notify("");
      Alert.alert("Não foi possível abrir o seletor", error?.message || String(error));
    }
  };

  const uploadFolder = async (parent) => {
    try {
      const { files, directories } = await api.pickDirectoryFiles();
      await sendUploads(parent, files, directories);
    } catch (error) {
      notify("");
      Alert.alert("Não foi possível abrir a pasta", error?.message || String(error));
    }
  };

  /* ---------- menus ---------- */
  const openMenu = (file) => {
    const kind = file.kind ?? fileTypeOf(file.name, file.isDir);
    const starred = !file.isDir && local.isFavorite(source, file.path);
    const actions = [
      { icon: "download-outline", label: file.isDir ? "Baixar como .zip" : "Baixar / abrir com…", onPress: () => download(file) },
      !file.isDir && {
        icon: starred ? "star" : "star-outline",
        label: starred ? "Remover dos favoritos" : "Adicionar aos favoritos",
        onPress: () => favorite(file),
      },
      { icon: "create-outline", label: "Renomear", onPress: () => rename(file) },
      { icon: "share-outline", label: "Compartilhar link", onPress: () => shareLink(file) },
      !file.isDir && kind === "image" && !/\.svg$/i.test(file.name) && {
        icon: "images-outline",
        label: "Enviar como embed",
        onPress: () => shareImageToDiscord(file),
      },
      { icon: "trash-outline", label: "Mover para a lixeira", danger: true, onPress: () => trash(file) },
    ].filter(Boolean);
    setMenu({ file, actions });
  };

  // toque no arquivo: imagem abre o visualizador; os demais tipos abrem o menu de ações
  const openFile = (file) => {
    const kind = file.kind ?? fileTypeOf(file.name, file.isDir);
    if (["image", "video", "audio", "markdown", "text"].includes(kind) && !file.isDir) setViewer({ ...file, kind });
    else openMenu(file);
  };

  // menu com ações próprias (lixeira, links compartilhados)
  const openCustomMenu = (file, actions) => setMenu({ file, actions });

  const meta = menu ? typeMeta(menu.file.kind, colors) : null;
  const element = (
    <>
      <FileMenu
        visible={!!menu}
        title={menu?.file.name}
        icon={meta?.icon}
        iconColor={meta?.color}
        actions={menu?.actions}
        onClose={() => setMenu(null)}
      />
      <PromptDialog
        visible={!!prompt}
        title={prompt?.title}
        initialValue={prompt?.initial}
        confirmLabel={prompt?.confirm}
        onSubmit={(name) => prompt?.onSubmit(name)}
        onClose={() => setPrompt(null)}
      />
      <ImageViewer
        file={viewer}
        onClose={() => setViewer(null)}
        onDownload={() => viewer && download(viewer)}
      />
      <ShareDialog
        visible={!!shareDialog}
        item={shareDialog}
        onClose={() => setShareDialog(null)}
        onCreate={createShare}
        onCreated={shareCreated}
      />
      <Toast message={toast.message} busy={toast.busy} />
    </>
  );

  return { element, openFile, openMenu, openCustomMenu, newFolder, upload, uploadFolder, run, confirm, notify, favoriteSelected, deleteSelected, copySelected, cutSelected, paste };
}
