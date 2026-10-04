// Compartilhamentos próprios: lista, copiar link, excluir e editar as opções de cada link.
import { useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";

import { useRemoteList } from "../../../hooks/useRemoteList";
import { useTask } from "../../../hooks/useTask";
import { deleteShare, listShares, shareUrl, updateShare } from "../../../lib/api";
import { fromServer, toServer, topicItems } from "../../../lib/settingsModel";
import { useSettings } from "../../../lib/settingsStore";
import { ActionButton, Card, Empty, SectionTitle } from "../controls";
import EditorModal from "../EditorModal";
import SettingRow from "../SettingRow";
import { useStyles } from "../../../lib/theme";

const baseName = (path = "") => path.replace(/\/+$/, "").split("/").pop() || "/";

// valor do servidor → valor da tela (a lista de usuários vira "toggle + lista")
function toDraft(items, share) {
  return Object.fromEntries(
    items.map((item) => {
      const raw = share[item.binding.field];
      if (item.kind === "toggleList") {
        const list = Array.isArray(raw) ? raw : [];
        return [item.id, { enabled: list.length > 0, items: list }];
      }
      return [item.id, fromServer(item, raw)];
    }),
  );
}

function toChanges(items, draft) {
  return Object.fromEntries(
    items.map((item) => {
      const value = draft[item.id];
      if (item.kind === "toggleList") return [item.binding.field, value.enabled ? value.items : []];
      return [item.binding.field, toServer(item, value)];
    }),
  );
}

export default function SharesScreen() {
  const styles = useStyles(createStyles);
  const { user } = useSettings();
  const { run, busy } = useTask();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const items = topicItems("compartilhamentos").filter((item) => item.binding?.type === "share");

  const canShare = Boolean(user?.permissions?.share);
  const { rows: shares, loading, error, reload: load } = useRemoteList(() => (canShare ? listShares() : Promise.resolve([])), `shares:${canShare}`);

  if (!user) return null;
  if (!user.permissions?.share) return <Text style={styles.note}>Você não tem permissão para compartilhar arquivos.</Text>;

  const failed = error ? <Empty>{error}</Empty> : null;

  const edit = (share) => {
    setDraft(toDraft(items, share));
    setEditing(share);
  };

  const save = async () => {
    const ok = await run(() => updateShare(editing, toChanges(items, draft)), "Compartilhamento atualizado.");
    if (ok) {
      setEditing(null);
      load();
    }
  };

  const confirmDelete = (share) =>
    Alert.alert("Excluir compartilhamento", `O link de “${baseName(share.path)}” deixará de funcionar.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (await run(() => deleteShare(share.hash), "Compartilhamento excluído.")) load();
        },
      },
    ]);

  const expiry = (share) => (share.expire ? `Expira em ${new Date(share.expire * 1000).toLocaleDateString("pt-BR")}` : "Sem expiração");

  return (
    <View style={styles.wrap}>
      <View>
        <SectionTitle>Seus links</SectionTitle>
        <Card>
          {loading ? (
            <Empty>Carregando…</Empty>
          ) : failed ? (
            failed
          ) : shares.length === 0 ? (
            <Empty>Você ainda não compartilhou nada. Compartilhe um arquivo ou pasta pelo menu dele.</Empty>
          ) : (
            shares.map((share, index) => (
              <View key={share.hash} style={[styles.item, index > 0 && styles.divider]}>
                <Text style={styles.name} numberOfLines={1}>
                  {baseName(share.path)}
                </Text>
                <Text style={styles.meta}>{expiry(share)}</Text>
                <View style={styles.actions}>
                  <ActionButton label="Editar" icon="create-outline" onPress={() => edit(share)} />
                  <ActionButton label="Link" icon="link-outline" onPress={() => Share.share({ message: shareUrl(share) })} />
                  <ActionButton label="Excluir" icon="trash-outline" danger onPress={() => confirmDelete(share)} />
                </View>
              </View>
            ))
          )}
        </Card>
      </View>

      <EditorModal
        visible={Boolean(editing)}
        title={editing ? baseName(editing.path) : ""}
        onClose={() => setEditing(null)}
        onSave={save}
        saving={busy}
      >
        <Card>
          {items.map((item, index) => (
            <View key={item.key} style={index > 0 && styles.divider}>
              <SettingRow item={item} value={draft[item.id]} onChange={(value) => setDraft((d) => ({ ...d, [item.id]: value }))} />
            </View>
          ))}
        </Card>
      </EditorModal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  note: { color: colors.onSurfaceVariant, fontSize: 14, textAlign: "center", padding: 24 },
  item: { padding: 16, gap: 2 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  name: { color: colors.onSurface, fontSize: 16 },
  meta: { color: colors.onSurfaceVariant, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8, marginLeft: -12 },
});
