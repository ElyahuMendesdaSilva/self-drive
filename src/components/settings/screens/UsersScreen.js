// Usuários (administrador): criar, editar (permissões, fontes, grupos, preferências) e excluir.
// Alterar outros usuários exige a senha do administrador (header X-Password), pedida ao salvar.
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { useRemoteList } from "../../../hooks/useRemoteList";
import { useTask } from "../../../hooks/useTask";
import {
  addUserToGroup,
  createUser,
  deleteUser,
  getSessionUsername,
  getSourceSettings,
  getUserByName,
  listGroupsOfUser,
  listSourceNames,
  listUsers,
  patchUser,
  removeUserFromGroup,
} from "../../../lib/api";
import {
  applyUserValue,
  fromServer,
  PERMISSIONS_FONTE,
  PERMISSIONS_GLOBAIS,
  readUserValue,
  SELECT_OPTIONS,
  toServer,
  userPreferenceItems,
} from "../../../lib/settingsModel";
import { ActionButton, Card, Empty, ListEditor, SectionTitle } from "../controls";
import EditorModal from "../EditorModal";
import FormDialog from "../FormDialog";
import SettingRow from "../SettingRow";
import { useColors, useStyles } from "../../../lib/theme";

const FLAGS = [
  { id: "lockPassword", label: "Não permitir que o usuário altere a senha" },
  { id: "disableSettings", label: "Desativar a página de configurações do usuário" },
  { id: "disableUpdateNotifications", label: "Desativar o banner de notificação de atualização" },
];

export default function UsersScreen({ say }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { busy } = useTask();
  const [sources, setSources] = useState([]);
  const [defaultPerms, setDefaultPerms] = useState({});
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { draft, original, groups, originalGroups }
  const [askPassword, setAskPassword] = useState(null); // "save" | { delete: username }
  const preferenceItems = userPreferenceItems().filter((item) => item.binding?.type === "user" && !item.binding.sub?.startsWith?.("clearAll") && item.id !== "clearAll");

  const { rows: users, loading, error, reload: load } = useRemoteList(listUsers, "users");

  useEffect(() => {
    listSourceNames().then(setSources).catch(() => {});
    getSourceSettings().then((body) => setDefaultPerms(body?.defaultPermissions || {})).catch(() => {});
  }, []);

  const edit = async (username) => {
    say("Carregando…", 0);
    try {
      const [full, groups] = await Promise.all([getUserByName(username), listGroupsOfUser(username)]);
      setEditing({ draft: full, original: full, groups, originalGroups: groups });
      say("");
    } catch (cause) {
      say(cause?.message || "Não foi possível abrir o usuário.", 4000);
    }
  };

  const patchDraft = (changes) => setEditing((e) => ({ ...e, draft: { ...e.draft, ...changes } }));
  const draft = editing?.draft;

  /* ----- fontes e escopos ----- */
  const scopes = draft?.scopes || [];
  const scopeOf = (name) => scopes.find((s) => s.name === name);
  const toggleSource = (name, on) =>
    patchDraft({
      scopes: on
        ? [...scopes, { name, scope: "/", permissions: { view: true, download: true, modify: false, create: false, delete: false, ...defaultPerms } }]
        : scopes.filter((s) => s.name !== name),
    });
  const updateScope = (name, changes) => patchDraft({ scopes: scopes.map((s) => (s.name === name ? { ...s, ...changes } : s)) });

  /* ----- salvar ----- */
  const save = async (adminPassword) => {
    const { draft: next, original } = editing;
    const which = ["loginMethod", "permissions", "scopes", ...FLAGS.map((f) => f.id)];
    const prefFields = [...new Set(preferenceItems.map((item) => item.binding.field))];
    which.push(...prefFields);
    if (original.otpEnabled && !next.otpEnabled) which.push("otpEnabled");

    const data = {};
    which.forEach((field) => (data[field] = next[field]));

    await patchUser(next.username, which, data, { password: adminPassword });
    const added = editing.groups.filter((g) => !editing.originalGroups.includes(g));
    const removed = editing.originalGroups.filter((g) => !editing.groups.includes(g));
    for (const group of added) await addUserToGroup(group, next.username);
    for (const group of removed) await removeUserFromGroup(group, next.username);
    setAskPassword(null);
    setEditing(null);
    say("Usuário atualizado.");
    load({ silent: true });
  };

  const remove = async (username, adminPassword) => {
    await deleteUser(username, { password: adminPassword });
    setAskPassword(null);
    say("Usuário excluído.");
    load();
  };

  const confirmDelete = (username) => {
    if (username === getSessionUsername()) return say("Você não pode excluir o próprio usuário.");
    Alert.alert("Excluir usuário", `Excluir “${username}”? Essa ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => setAskPassword({ delete: username }) },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <ActionButton label="Novo usuário" icon="person-add-outline" filled onPress={() => setCreating(true)} />

      <View>
        <SectionTitle>Usuários</SectionTitle>
        <Card>
          {loading ? (
            <Empty>Carregando…</Empty>
          ) : error ? (
            <Empty>{error}</Empty>
          ) : users.length === 0 ? (
            <Empty>Nenhum usuário encontrado.</Empty>
          ) : (
            users.map((u, index) => (
              <View key={u.username} style={[styles.item, index > 0 && styles.divider]}>
                <View style={styles.info}>
                  <Text style={styles.name}>{u.username}</Text>
                  <Text style={styles.meta}>{u.permissions?.admin ? "Administrador" : "Usuário"}</Text>
                </View>
                <ActionButton label="Editar" icon="create-outline" onPress={() => edit(u.username)} />
                <ActionButton label="Excluir" icon="trash-outline" danger onPress={() => confirmDelete(u.username)} />
              </View>
            ))
          )}
        </Card>
      </View>

      <EditorModal
        visible={Boolean(editing)}
        title={draft?.username || ""}
        onClose={() => setEditing(null)}
        onSave={() => setAskPassword("save")}
        saving={busy}
      >
        {draft && (
          <>
            <View>
              <SectionTitle>Login</SectionTitle>
              <Card>
                <SettingRow
                  item={{ kind: "select", label: "Método de login", options: SELECT_OPTIONS.loginMethod }}
                  value={draft.loginMethod || "password"}
                  onChange={(loginMethod) => patchDraft({ loginMethod })}
                />
                {FLAGS.map((flag) => (
                  <View key={flag.id} style={styles.divider}>
                    <SettingRow item={{ kind: "toggle", label: flag.label }} value={Boolean(draft[flag.id])} onChange={(on) => patchDraft({ [flag.id]: on })} />
                  </View>
                ))}
                {editing.original.otpEnabled && (
                  <View style={styles.divider}>
                    <SettingRow
                      item={{ kind: "toggle", label: "Autenticação de dois fatores do usuário", description: "Só dá para desativar; o próprio usuário ativa." }}
                      value={Boolean(draft.otpEnabled)}
                      onChange={(on) => on === false && patchDraft({ otpEnabled: false })}
                    />
                  </View>
                )}
              </Card>
            </View>

            <View>
              <SectionTitle>Permissões globais</SectionTitle>
              <Card>
                {PERMISSIONS_GLOBAIS.map((permission, index) => (
                  <View key={permission.id} style={index > 0 && styles.divider}>
                    <SettingRow
                      item={{ kind: "toggle", label: permission.label }}
                      value={Boolean(draft.permissions?.[permission.id])}
                      onChange={(on) => patchDraft({ permissions: { ...draft.permissions, [permission.id]: on } })}
                    />
                  </View>
                ))}
              </Card>
            </View>

            <View>
              <SectionTitle>Fontes e permissões</SectionTitle>
              {sources.map((name) => {
                const scope = scopeOf(name);
                return (
                  <View key={name} style={styles.source}>
                    <Card>
                      <SettingRow item={{ kind: "toggle", label: name }} value={Boolean(scope)} onChange={(on) => toggleSource(name, on)} />
                      {scope && (
                        <View style={styles.scopeBody}>
                          <TextInput
                            style={styles.input}
                            value={scope.scope}
                            onChangeText={(text) => updateScope(name, { scope: text })}
                            placeholder="Caminho (ex.: /)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          {PERMISSIONS_FONTE.map((permission) => (
                            <SettingRow
                              key={permission.id}
                              item={{ kind: "toggle", label: permission.label }}
                              value={Boolean(scope.permissions?.[permission.id])}
                              onChange={(on) => updateScope(name, { permissions: { ...scope.permissions, [permission.id]: on } })}
                            />
                          ))}
                        </View>
                      )}
                    </Card>
                  </View>
                );
              })}
              {sources.length === 0 && <Empty>Nenhuma fonte configurada no servidor.</Empty>}
            </View>

            <View>
              <SectionTitle>Grupos do usuário</SectionTitle>
              <Card>
                <View style={styles.pad}>
                  <ListEditor items={editing.groups} onChange={(groups) => setEditing((e) => ({ ...e, groups }))} placeholder="Nome do grupo" />
                </View>
              </Card>
            </View>

            <View>
              <SectionTitle>Preferências do usuário</SectionTitle>
              <Card>
                {preferenceItems.map((item, index) => (
                  <View key={item.key} style={index > 0 && styles.divider}>
                    <SettingRow
                      item={item}
                      value={fromServer(item, readUserValue(draft, item.binding))}
                      onChange={(value) => setEditing((e) => ({ ...e, draft: applyUserValue(e.draft, item.binding, toServer(item, value)) }))}
                    />
                  </View>
                ))}
              </Card>
            </View>
          </>
        )}
      </EditorModal>

      <FormDialog
        visible={creating}
        title="Novo usuário"
        message="Para criar um usuário, confirme também a sua senha de administrador."
        confirmLabel="Criar"
        fields={[
          { key: "username", label: "Nome de usuário" },
          { key: "password", label: "Senha do novo usuário", secure: true },
          { key: "admin", label: "Sua senha (administrador)", secure: true },
        ]}
        onClose={() => setCreating(false)}
        onSubmit={async ({ username, password, admin }) => {
          await createUser({ username: username.trim(), password, loginMethod: "password" }, { password: admin });
          setCreating(false);
          say("Usuário criado.");
          load();
        }}
      />
      <FormDialog
        visible={Boolean(askPassword)}
        title="Confirme sua senha"
        message="Alterações em outros usuários exigem a senha do administrador."
        confirmLabel={askPassword?.delete ? "Excluir" : "Salvar"}
        danger={Boolean(askPassword?.delete)}
        fields={[{ key: "password", label: "Sua senha", secure: true }]}
        onClose={() => setAskPassword(null)}
        onSubmit={({ password }) => (askPassword?.delete ? remove(askPassword.delete, password) : save(password))}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 16, paddingRight: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  info: { flex: 1 },
  name: { color: colors.onSurface, fontSize: 16 },
  meta: { color: colors.onSurfaceVariant, fontSize: 13 },
  pad: { padding: 16 },
  source: { marginBottom: 12 },
  scopeBody: { paddingHorizontal: 8, paddingBottom: 8, gap: 4 },
  input: { color: colors.onSurface, fontSize: 16, height: 44, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: 8, marginBottom: 4 },
});
