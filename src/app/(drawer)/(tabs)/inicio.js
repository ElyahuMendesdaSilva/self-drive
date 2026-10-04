// src/app/(drawer)/(tabs)/inicio.js — arquivos recentes (mais recentemente modificados).
import { useState } from "react";
import { View } from "react-native";

import FileList from "../../../components/ListFile";
import HeaderListFile from "../../../components/HeaderListFile";
import NewMenuButton from "../../../components/NewMenuButton";
import { useFileActions } from "../../../hooks/useFileActions";
import { useRemoteList } from "../../../hooks/useRemoteList";
import * as api from "../../../lib/api";
import { toRow } from "../../../lib/viewModel";
import { useColors } from "../../../lib/theme";

export default function Inicio() {
  const colors = useColors();
  const [mode, setMode] = useState("grid");
  const list = useRemoteList(async () => (await api.getRecentFiles()).map(toRow));
  const actions = useFileActions({
    onChanged: () => {
      api.invalidateIndex();
      list.reload({ silent: true });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FileList
        files={list.rows}
        mode={mode}
        header={<HeaderListFile title="Recentes" mode={mode} onChangeMode={setMode} />}
        loading={list.loading}
        error={list.error}
        emptyText="Nenhum arquivo ainda. Use o botão + para enviar o primeiro."
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onRetry={() => list.reload()}
        onOpen={actions.openFile}
        onMenu={actions.openMenu}
        onFavoriteSelected={actions.favoriteSelected}
        onDeleteSelected={actions.deleteSelected}
        onCopySelected={actions.copySelected}
        onCutSelected={actions.cutSelected}
        onPaste={() => actions.paste("/")}
      />

      <NewMenuButton onNewFolder={() => actions.newFolder("/")} onUpload={() => actions.upload("/")} onUploadFolder={() => actions.uploadFolder("/")} />
      {actions.element}
    </View>
  );
}
