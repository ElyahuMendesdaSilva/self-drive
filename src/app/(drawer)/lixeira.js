// src/app/(drawer)/lixeira.js — itens movidos para a lixeira (restaurar / excluir de vez).
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import FileList from "../../components/ListFile";
import ScreenHeader from "../../components/ScreenHeader";
import { useFileActions } from "../../hooks/useFileActions";
import { useRemoteList } from "../../hooks/useRemoteList";
import * as api from "../../lib/api";
import { formatDate } from "../../lib/format";
import { toRow } from "../../lib/viewModel";
import { useColors, useStyles } from "../../lib/theme";

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/inicio"));

export default function Lixeira() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const list = useRemoteList(async () =>
    (await api.listTrash()).map((entry) => ({
      ...toRow({ ...entry, path: entry.trashPath }),
      thumbnail: null,
      action: entry.managed ? "Na lixeira" : "Lixeira (origem desconhecida)",
      date: formatDate(entry.trashedAt || entry.modified),
    })),
  );
  const actions = useFileActions({ onChanged: () => list.reload({ silent: true }) });

  const openMenu = (entry) =>
    actions.openCustomMenu(entry, [
      {
        icon: "arrow-undo-outline",
        label: "Restaurar",
        onPress: async () => {
          const ok = await actions.run("Restaurando…", () => api.restoreFromTrash(entry));
          if (ok) {
            actions.notify("Item restaurado");
            list.reload({ silent: true });
          }
        },
      },
      {
        icon: "trash-bin-outline",
        label: "Excluir permanentemente",
        danger: true,
        onPress: () =>
          actions.confirm("Excluir permanentemente?", `“${entry.name}” não poderá ser recuperado.`, "Excluir", async () => {
            const ok = await actions.run("Excluindo…", () => api.deleteFromTrash(entry));
            if (ok) list.reload({ silent: true });
          }),
      },
    ]);

  const emptyAll = () =>
    actions.confirm("Esvaziar a lixeira?", "Todos os itens serão excluídos permanentemente.", "Esvaziar", async () => {
      const ok = await actions.run("Esvaziando…", () => api.emptyTrash(list.rows));
      if (ok) list.reload({ silent: true });
    });

  const deleteSelected = (entries) =>
    actions.confirm(
      entries.length === 1 ? "Excluir permanentemente?" : "Excluir itens permanentemente?",
      entries.length === 1
        ? `“${entries[0].name}” não poderá ser recuperado.`
        : `${entries.length} itens não poderão ser recuperados.`,
      "Excluir",
      async () => {
        const ok = await actions.run("Excluindo itens…", async () => {
          for (const entry of entries) await api.deleteFromTrash(entry);
        });
        if (ok) list.reload({ silent: true });
      },
    );

  const restoreSelected = async (entries) => {
    const ok = await actions.run(`Restaurando ${entries.length} itens…`, async () => {
      for (const entry of entries) await api.restoreFromTrash(entry);
    });
    if (ok) {
      actions.notify(entries.length === 1 ? "Item restaurado" : `${entries.length} itens restaurados`);
      list.reload({ silent: true });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Lixeira"
        onBack={goBack}
        right={
          list.rows.length > 0 ? (
            <Pressable onPress={emptyAll} hitSlop={10} style={styles.empty}>
              <Ionicons name="trash-bin-outline" size={18} color={colors.error} />
              <Text style={styles.emptyText}>Esvaziar</Text>
            </Pressable>
          ) : null
        }
      />
      <FileList
        files={list.rows}
        mode="list"
        loading={list.loading}
        error={list.error}
        emptyText="A lixeira está vazia."
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onRetry={() => list.reload()}
        onOpen={openMenu}
        onMenu={openMenu}
        onRestoreSelected={restoreSelected}
        onDeleteSelected={deleteSelected}
      />
      {actions.element}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  empty: { flexDirection: "row", alignItems: "center", gap: 6 },
  emptyText: { color: colors.error, fontSize: 14, fontWeight: "500" },
});
