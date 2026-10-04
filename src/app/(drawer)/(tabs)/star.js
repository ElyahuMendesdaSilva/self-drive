// src/app/(drawer)/(tabs)/star.js — favoritos (guardados no aparelho, por origem).
import { useState } from "react";
import { View } from "react-native";

import FileList from "../../../components/ListFile";
import HeaderListFile from "../../../components/HeaderListFile";
import { useFileActions } from "../../../hooks/useFileActions";
import { useRemoteList } from "../../../hooks/useRemoteList";
import { getFavorites } from "../../../lib/local";
import { useSession } from "../../../lib/session";
import { toRow } from "../../../lib/viewModel";
import { useColors } from "../../../lib/theme";

export default function Star() {
  const colors = useColors();
  const { source } = useSession();
  const [mode, setMode] = useState("list");
  const list = useRemoteList(async () => getFavorites(source).map(toRow), source);
  const actions = useFileActions({ onChanged: () => list.reload({ silent: true }) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FileList
        files={list.rows}
        mode={mode}
        header={<HeaderListFile title="Com estrela" mode={mode} onChangeMode={setMode} />}
        loading={list.loading}
        error={list.error}
        emptyText="Nenhum favorito. Abra o menu de um arquivo e escolha “Adicionar aos favoritos”."
        onOpen={actions.openFile}
        onMenu={actions.openMenu}
        onFavoriteSelected={actions.favoriteSelected}
        onDeleteSelected={actions.deleteSelected}
        onCopySelected={actions.copySelected}
        onCutSelected={actions.cutSelected}
      />
      {actions.element}
    </View>
  );
}
