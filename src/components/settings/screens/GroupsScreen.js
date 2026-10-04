// Grupos (administrador): o servidor só guarda grupos como "usuário pertence ao grupo",
// então a lista de membros é montada consultando os grupos de cada usuário.
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { useRemoteList } from "../../../hooks/useRemoteList";
import { useTask } from "../../../hooks/useTask";
import { addUserToGroup, listGroupsOfUser, listUsers, removeUserFromGroup } from "../../../lib/api";
import { ActionButton, Card, Empty, ListEditor, SectionTitle } from "../controls";
import EditorModal from "../EditorModal";
import FormDialog from "../FormDialog";
import { useStyles } from "../../../lib/theme";

export default function GroupsScreen({ say }) {
  const styles = useStyles(createStyles);
  const { run } = useTask();
  const [usernames, setUsernames] = useState([]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  // devolve a lista de grupos como [{ name, members }]
  const { rows: list, loading, error, reload } = useRemoteList(async () => {
    const users = await listUsers();
    const names = users.map((u) => u.username);
    const map = {};
    await Promise.all(
      names.map(async (name) => {
        for (const group of await listGroupsOfUser(name)) (map[group] ||= []).push(name);
      }),
    );
    setUsernames(names);
    return Object.keys(map).sort().map((name) => ({ name, members: map[name] }));
  }, "groups");
  const load = () => reload({ silent: true });
  const groups = Object.fromEntries(list.map((g) => [g.name, g.members]));

  const members = selected ? groups[selected] || [] : [];

  const changeMembers = async (next) => {
    const added = next.filter((name) => !members.includes(name));
    const removed = members.filter((name) => !next.includes(name));
    const unknown = added.find((name) => !usernames.includes(name));
    if (unknown) return say(`O usuário “${unknown}” não existe.`, 3500);
    const ok = await run(async () => {
      for (const name of added) await addUserToGroup(selected, name);
      for (const name of removed) await removeUserFromGroup(selected, name);
    });
    await load();
    if (!ok) say("Não foi possível alterar o grupo.");
  };

  const confirmDelete = (group) =>
    Alert.alert("Excluir grupo", `Remover todos os membros de “${group}”? Um grupo sem membros deixa de existir.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await run(async () => {
            for (const name of groups[group] || []) await removeUserFromGroup(group, name);
          }, "Grupo excluído.");
          setSelected(null);
          load();
        },
      },
    ]);

  const names = Object.keys(groups);

  return (
    <View style={styles.wrap}>
      <ActionButton label="Novo grupo" icon="add" filled onPress={() => setCreating(true)} />

      <View>
        <SectionTitle>Grupos</SectionTitle>
        <Card>
          {loading ? (
            <Empty>Carregando…</Empty>
          ) : error ? (
            <Empty>{error}</Empty>
          ) : names.length === 0 ? (
            <Empty>Nenhum grupo criado ainda.</Empty>
          ) : (
            names.map((group, index) => (
              <View key={group} style={[styles.item, index > 0 && styles.divider]}>
                <View style={styles.info}>
                  <Text style={styles.name}>{group}</Text>
                  <Text style={styles.meta}>{groups[group].length} membro(s)</Text>
                </View>
                <ActionButton label="Editar" icon="create-outline" onPress={() => setSelected(group)} />
              </View>
            ))
          )}
        </Card>
      </View>

      <EditorModal visible={Boolean(selected)} title={selected || ""} onClose={() => setSelected(null)}>
        <Text style={styles.meta}>Toque num nome para remover o usuário do grupo; digite um nome e toque em + para adicionar.</Text>
        <ListEditor items={members} onChange={changeMembers} placeholder="Nome de usuário" />
        <ActionButton label="Excluir grupo" icon="trash-outline" danger onPress={() => confirmDelete(selected)} />
      </EditorModal>

      <FormDialog
        visible={creating}
        title="Novo grupo"
        message="Um grupo existe enquanto tiver membros. Informe o nome e o primeiro usuário."
        confirmLabel="Criar"
        fields={[
          { key: "group", label: "Nome do grupo" },
          { key: "user", label: "Primeiro membro (usuário)" },
        ]}
        onClose={() => setCreating(false)}
        onSubmit={async ({ group, user }) => {
          if (!usernames.includes(user.trim())) throw new Error(`O usuário “${user.trim()}” não existe.`);
          await addUserToGroup(group.trim(), user.trim());
          setCreating(false);
          say("Grupo criado.");
          load();
        }}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingLeft: 16, paddingRight: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  info: { flex: 1 },
  name: { color: colors.onSurface, fontSize: 16 },
  meta: { color: colors.onSurfaceVariant, fontSize: 13 },
});
