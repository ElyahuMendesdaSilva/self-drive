// Tokens de API: listar, criar (mínimo ou com permissões escolhidas), copiar e excluir.
import { useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";

import { useRemoteList } from "../../../hooks/useRemoteList";
import { useTask } from "../../../hooks/useTask";
import { createApiToken, deleteApiToken, listApiTokens } from "../../../lib/api";
import { PERMISSIONS_GLOBAIS, topicItems } from "../../../lib/settingsModel";
import { useSettings } from "../../../lib/settingsStore";
import { ActionButton, Card, Empty, SectionTitle } from "../controls";
import EditorModal from "../EditorModal";
import FormDialog from "../FormDialog";
import SettingRow from "../SettingRow";
import { useStyles } from "../../../lib/theme";

const formatDate = (unix) => (unix ? new Date(unix * 1000).toLocaleDateString("pt-BR") : "sem validade");

export default function TokensScreen({ say }) {
  const styles = useStyles(createStyles);
  const { user } = useSettings();
  const { run, busy } = useTask();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState("");

  const items = Object.fromEntries(topicItems("tokens_api").map((item) => [item.id, item]));
  const [form, setForm] = useState({ name: "", duration: { amount: "30", unit: "days" }, customize: false, permissions: {} });

  const canApi = Boolean(user?.permissions?.api);
  const { rows: tokens, loading, error, reload: load } = useRemoteList(() => (canApi ? listApiTokens() : Promise.resolve([])), `tokens:${canApi}`);

  if (!user) return null;
  if (!user.permissions?.api) return <Text style={styles.note}>Você não tem permissão para criar tokens de API.</Text>;

  const allowed = PERMISSIONS_GLOBAIS.filter((permission) => Boolean(user.permissions?.[permission.id]));

  const open = () => {
    setForm({ name: "", duration: { amount: "30", unit: "days" }, customize: false, permissions: {} });
    setCreating(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const amount = Number(form.duration.amount);
    if (!name) return say("Dê um nome ao token.");
    if (!amount) return say("Informe a duração.");
    const days = form.duration.unit === "months" ? amount * 30 : amount;
    const permissions = form.customize ? allowed.filter((p) => form.permissions[p.id]).map((p) => p.id) : undefined;

    let token = "";
    const ok = await run(async () => {
      token = await createApiToken({ name, days, permissions });
    });
    if (!ok) return;
    setCreating(false);
    setCreated(token);
    load();
  };

  const confirmDelete = (token) =>
    Alert.alert("Excluir token", `Excluir “${token.name}”? Quem usa esse token perde o acesso.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (await run(() => deleteApiToken(token.name), "Token excluído.")) load();
        },
      },
    ]);

  const permissionText = (token) =>
    token.minimal
      ? "Token mínimo (WebDAV)"
      : PERMISSIONS_GLOBAIS.filter((p) => token.Permissions?.[p.id]).map((p) => p.label).join(", ") || "Sem permissões extras";

  return (
    <View style={styles.wrap}>
      <ActionButton label="Criar token" icon="add" filled onPress={open} />

      <View>
        <SectionTitle>Seus tokens</SectionTitle>
        <Card>
          {loading ? (
            <Empty>Carregando…</Empty>
          ) : error ? (
            <Empty>{error}</Empty>
          ) : tokens.length === 0 ? (
            <Empty>Nenhum token criado.</Empty>
          ) : (
            tokens.map((token, index) => (
              <View key={token.name} style={[styles.item, index > 0 && styles.divider]}>
                <Text style={styles.name}>{token.name}</Text>
                <Text style={styles.meta}>Expira em {formatDate(token.expiresAt)}</Text>
                <Text style={styles.meta}>{permissionText(token)}</Text>
                <View style={styles.actions}>
                  {!!token.token && <ActionButton label="Copiar" icon="copy-outline" onPress={() => Share.share({ message: token.token })} />}
                  <ActionButton label="Excluir" icon="trash-outline" danger onPress={() => confirmDelete(token)} />
                </View>
              </View>
            ))
          )}
        </Card>
      </View>

      <EditorModal visible={creating} title="Novo token" onClose={() => setCreating(false)} onSave={save} saving={busy} saveLabel="Criar token">
        <Card>
          {items.name && <SettingRow item={items.name} value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />}
          {items.duration && <SettingRow item={items.duration} value={form.duration} onChange={(duration) => setForm((f) => ({ ...f, duration }))} />}
          {items.customizeToken && (
            <SettingRow item={items.customizeToken} value={form.customize} onChange={(customize) => setForm((f) => ({ ...f, customize }))} />
          )}
        </Card>
        {form.customize && (
          <View>
            <SectionTitle>Permissões do token</SectionTitle>
            <Card>
              {allowed.map((permission) => (
                <SettingRow
                  key={permission.id}
                  item={{ kind: "toggle", label: permission.label }}
                  value={Boolean(form.permissions[permission.id])}
                  onChange={(on) => setForm((f) => ({ ...f, permissions: { ...f.permissions, [permission.id]: on } }))}
                />
              ))}
            </Card>
          </View>
        )}
      </EditorModal>

      <FormDialog
        visible={Boolean(created)}
        title="Token criado"
        message="Guarde este token agora. Use “Copiar” na lista para recuperá-lo depois."
        info={created}
        hideCancel
        confirmLabel="Copiar"
        onClose={() => setCreated("")}
        onSubmit={async () => {
          await Share.share({ message: created });
          setCreated("");
        }}
      />
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
  actions: { flexDirection: "row", gap: 4, marginTop: 8, marginLeft: -12 },
});
