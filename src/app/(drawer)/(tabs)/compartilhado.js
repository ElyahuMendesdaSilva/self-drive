// src/app/(drawer)/(tabs)/compartilhado.js — links de compartilhamento criados pelo usuário.
import { useState } from "react";
import { Share, View } from "react-native";

import FileList from "../../../components/ListFile";
import HeaderListFile from "../../../components/HeaderListFile";
import { useFileActions } from "../../../hooks/useFileActions";
import { useRemoteList } from "../../../hooks/useRemoteList";
import * as api from "../../../lib/api";
import { baseName, fileTypeOf } from "../../../lib/format";
import { useColors } from "../../../lib/theme";

function shareToRow(share) {
  const isDir = Boolean(share.isDir ?? share.path?.endsWith("/"));
  const name = share.name || baseName(share.path) || "Item compartilhado";
  return {
    ...share,
    id: share.hash,
    name,
    isDir,
    kind: fileTypeOf(name, isDir),
    thumbnail: null,
    shared: true,
    action: share.hasPassword ? "Link com senha" : "Link público",
    date: "",
  };
}

export default function Compartilhado() {
  const colors = useColors();
  const [mode, setMode] = useState("list");
  const list = useRemoteList(async () => (await api.listShares()).map(shareToRow));
  const actions = useFileActions({ onChanged: () => list.reload({ silent: true }) });

  const openMenu = (row) =>
    actions.openCustomMenu(row, [
      {
        icon: "share-social-outline",
        label: "Compartilhar link",
        onPress: () => Share.share({ message: api.shareUrl(row) }).catch(() => {}),
      },
      {
        icon: "close-circle-outline",
        label: "Remover link",
        danger: true,
        onPress: () =>
          actions.confirm("Remover link?", `Quem tiver o link de “${row.name}” deixará de acessá-lo.`, "Remover", async () => {
            const ok = await actions.run("Removendo link…", () => api.deleteShare(row.hash));
            if (ok) list.reload({ silent: true });
          }),
      },
    ]);

  const deleteSelected = (rows) =>
    actions.confirm(
      rows.length === 1 ? "Remover link?" : "Remover links?",
      rows.length === 1
        ? `Quem tiver o link de “${rows[0].name}” deixará de acessá-lo.`
        : `Os ${rows.length} links selecionados deixarão de funcionar.`,
      "Remover",
      async () => {
        const ok = await actions.run("Removendo links…", async () => {
          for (const row of rows) await api.deleteShare(row.hash);
        });
        if (ok) list.reload({ silent: true });
      },
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FileList
        files={list.rows}
        mode={mode}
        header={<HeaderListFile title="Compartilhado" mode={mode} onChangeMode={setMode} />}
        loading={list.loading}
        error={list.error}
        emptyText="Você ainda não compartilhou nada. Abra o menu de um arquivo e escolha “Compartilhar link”."
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onRetry={() => list.reload()}
        onOpen={openMenu}
        onMenu={openMenu}
        onDeleteSelected={deleteSelected}
      />
      {actions.element}
    </View>
  );
}
