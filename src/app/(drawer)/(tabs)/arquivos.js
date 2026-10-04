// src/app/(drawer)/(tabs)/arquivos.js — navegador de pastas e arquivos.
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, View } from "react-native";

import FileList from "../../../components/ListFile";
import HeaderListFile from "../../../components/HeaderListFile";
import NewMenuButton from "../../../components/NewMenuButton";
import { useFileActions } from "../../../hooks/useFileActions";
import { useRemoteList } from "../../../hooks/useRemoteList";
import * as api from "../../../lib/api";
import { baseName, parentPath } from "../../../lib/format";
import { sortRows, toRow } from "../../../lib/viewModel";
import { useColors } from "../../../lib/theme";

export default function Arquivos() {
  const colors = useColors();
  const [path, setPath] = useState("/");
  const [mode, setMode] = useState("list");
  const list = useRemoteList(async () => sortRows((await api.listResources(path)).items.map(toRow)), path);
  const actions = useFileActions({ onChanged: () => list.reload({ silent: true }) });

  const goUp = useCallback(() => setPath((current) => parentPath(current)), []);

  // botão voltar do Android sobe uma pasta antes de sair da aba
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (path === "/") return false;
        goUp();
        return true;
      });
      return () => subscription.remove();
    }, [path, goUp]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FileList
        files={list.rows}
        mode={mode}
        header={
          <HeaderListFile
            title={path === "/" ? "Meus arquivos" : baseName(path)}
            mode={mode}
            onChangeMode={setMode}
            onBack={path === "/" ? undefined : goUp}
          />
        }
        loading={list.loading}
        error={list.error}
        emptyText="Esta pasta está vazia."
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onRetry={() => list.reload()}
        onOpen={(file) => (file.isDir ? setPath(file.path) : actions.openFile(file))}
        onMenu={actions.openMenu}
        onFavoriteSelected={actions.favoriteSelected}
        onDeleteSelected={actions.deleteSelected}
        onCopySelected={actions.copySelected}
        onCutSelected={actions.cutSelected}
        onPaste={() => actions.paste(path)}
      />

      <NewMenuButton onNewFolder={() => actions.newFolder(path)} onUpload={() => actions.upload(path)} onUploadFolder={() => actions.uploadFolder(path)} />
      {actions.element}
    </View>
  );
}
