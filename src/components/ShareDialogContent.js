import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AuthImage from "./AuthImage";
import { avatarSource, searchShareUsers } from "../lib/api";
import { useColors, useStyles } from "../lib/theme";
import { SwitchControl } from "./settings/controls";

const EXPIRATIONS = [
  { id: "hour", label: "1 hora", expires: "1", unit: "hours" },
  { id: "day", label: "1 dia", expires: "1", unit: "days" },
  { id: "week", label: "7 dias", expires: "7", unit: "days" },
  { id: "month", label: "30 dias", expires: "30", unit: "days" },
  { id: "never", label: "Nunca", expires: "0", unit: "days" },
];

function ToggleRow({ title, description, value, onChange }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {!!description && (
          <Text style={styles.toggleDescription}>{description}</Text>
        )}
      </View>
      <SwitchControl value={value} onChange={onChange} />
    </View>
  );
}

function TextField({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      style={styles.field}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

export default function ShareDialogContent({
  item,
  bottomInset = 0,
  busy = false,
  onClose,
  onCreate,
  onCreated,
}) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [expirationId, setExpirationId] = useState("week");
  const [restricted, setRestricted] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState({ query: "", users: [] });
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareType, setShareType] = useState("normal");
  const [password, setPassword] = useState("");
  const [downloadsLimit, setDownloadsLimit] = useState("");
  const [maxBandwidth, setMaxBandwidth] = useState("");
  const [disableAnonymous, setDisableAnonymous] = useState(false);
  const [allowModify, setAllowModify] = useState(false);
  const [allowCreate, setAllowCreate] = useState(false);
  const [allowDelete, setAllowDelete] = useState(false);
  const [allowReplacements, setAllowReplacements] = useState(false);
  const [disableDownload, setDisableDownload] = useState(false);
  const [disableThumbnails, setDisableThumbnails] = useState(false);
  const [keepAfterExpiration, setKeepAfterExpiration] = useState(false);
  const [disableSidebar, setDisableSidebar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isBusy = busy || submitting;

  useEffect(() => {
    const query = userQuery.trim();
    if (!restricted || query.length < 2) return undefined;
    const timer = setTimeout(() => {
      setSearchingUsers(true);
      searchShareUsers(query)
        .then((users) => setUserResults({ query, users }))
        .catch(() => setUserResults({ query, users: [] }))
        .finally(() => setSearchingUsers(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [restricted, userQuery]);

  const expiration =
    EXPIRATIONS.find((option) => option.id === expirationId) || EXPIRATIONS[2];
  const suggestions =
    userResults.query === userQuery.trim() ? userResults.users : [];
  const addUser = (user) => {
    const username = user?.username;
    if (
      !username ||
      selectedUsers.some(
        (selectedUser) =>
          selectedUser.username.toLowerCase() === username.toLowerCase(),
      )
    )
      return;
    setSelectedUsers((users) => [...users, user]);
    setUserQuery("");
  };
  const submit = async () => {
    if (isBusy) return;
    if (restricted && selectedUsers.length === 0) {
      Alert.alert(
        "Escolha pessoas",
        "Adicione pelo menos um usuário para restringir o compartilhamento.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await onCreate({
        expires: expiration.expires,
        unit: expiration.unit,
        password: password.trim(),
        shareType,
        disableAnonymous,
        allowedUsernames: restricted
          ? selectedUsers.map((user) => user.username)
          : [],
        downloadsLimit,
        maxBandwidth,
        allowModify: shareType === "normal" && allowModify,
        allowCreate: shareType === "normal" && allowCreate,
        allowDelete: shareType === "normal" && allowDelete,
        allowReplacements: shareType === "normal" && allowReplacements,
        disableDownload: shareType === "normal" && disableDownload,
        disableThumbnails: shareType === "normal" && disableThumbnails,
        keepAfterExpiration,
        disableSidebar,
      });
      if (created && created !== true) {
        await onClose();
        onCreated?.(created);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Compartilhar</Text>
        <Pressable
          onPress={onClose}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <Ionicons name="close" size={23} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fileCard}>
          <View style={styles.fileBadge}>
            <Ionicons
              name={item?.isDir ? "folder-outline" : "document-outline"}
              size={23}
              color={colors.primary}
            />
          </View>
          <View style={styles.fileText}>
            <Text style={styles.fileName} numberOfLines={2}>
              {item?.path || item?.name}
            </Text>
            <Text style={styles.fileMeta}>
              {item?.isDir ? "Pasta" : "Arquivo"}
            </Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Expira em</Text>
          <View style={styles.expirationList}>
            {EXPIRATIONS.map((option) => {
              const selected = expirationId === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setExpirationId(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.expirationOption,
                    selected && styles.expirationSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.expirationText,
                      selected && styles.expirationTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <ToggleRow
            title="Somente certas pessoas"
            description="Exige login."
            value={restricted}
            onChange={setRestricted}
          />
          {restricted && (
            <View style={styles.people}>
              {selectedUsers.length > 0 && (
                <View style={styles.chips}>
                  {selectedUsers.map((user) => (
                    <View key={user.username} style={styles.chip}>
                      <View style={styles.avatar}>
                        {user.avatarUrl ? (
                          <AuthImage
                            source={avatarSource(user.avatarUrl)}
                            version={user.avatarUrl}
                            style={styles.avatarImage}
                            fallback={(
                              <Ionicons
                                name="person"
                                size={17}
                                color={colors.onPrimaryContainer}
                              />
                            )}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={17}
                            color={colors.onPrimaryContainer}
                          />
                        )}
                      </View>
                      <Text style={styles.chipName}>{user.username}</Text>
                      <Pressable
                        onPress={() =>
                          setSelectedUsers((users) =>
                            users.filter(
                              (selectedUser) =>
                                selectedUser.username !== user.username,
                            ),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${user.username}`}
                        style={styles.removeChip}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={colors.onSurfaceVariant}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <TextField
                value={userQuery}
                onChangeText={setUserQuery}
                placeholder="Buscar usuário…"
              />
              {searchingUsers && userQuery.trim().length >= 2 && (
                <View style={styles.searchStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.searchStatusText}>Buscando pessoas…</Text>
                </View>
              )}
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.slice(0, 5).map((user) => (
                    <Pressable
                      key={user.username}
                      onPress={() => addUser(user)}
                      style={styles.suggestion}
                    >
                      <View style={styles.avatar}>
                        {user.avatarUrl ? (
                          <AuthImage
                            source={avatarSource(user.avatarUrl)}
                            version={user.avatarUrl}
                            style={styles.avatarImage}
                            fallback={(
                              <Ionicons
                                name="person"
                                size={17}
                                color={colors.onPrimaryContainer}
                              />
                            )}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={17}
                            color={colors.onPrimaryContainer}
                          />
                        )}
                      </View>
                      <Text style={styles.suggestionName}>{user.username}</Text>
                      <Ionicons
                        name="add-circle-outline"
                        size={21}
                        color={colors.primary}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
              {!searchingUsers && userQuery.trim().length >= 2 && suggestions.length === 0 && (
                <Text style={styles.searchStatusText}>Nenhuma pessoa encontrada.</Text>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => setMoreOpen((open) => !open)}
          style={styles.moreButton}
          accessibilityRole="button"
        >
          <Text style={styles.moreText}>
            {moreOpen ? "Menos opções" : "Mais opções"}
          </Text>
          <Ionicons
            name={moreOpen ? "chevron-up" : "chevron-down"}
            size={21}
            color={colors.primary}
          />
        </Pressable>

        {moreOpen && (
          <View style={styles.moreContent}>
            <View style={styles.group}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.segment}>
                {[
                  { value: "normal", label: "Normal" },
                  { value: "upload", label: "Somente upload" },
                ].map((option) => {
                  const selected = shareType === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setShareType(option.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.segmentOption,
                        selected && styles.segmentSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Senha</Text>
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder="Sem senha"
                secureTextEntry
              />
            </View>

            {shareType === "normal" && (
              <View style={styles.numberRow}>
                <View style={[styles.group, styles.numberColumn]}>
                  <Text style={styles.label}>Downloads</Text>
                  <TextField
                    value={downloadsLimit}
                    onChangeText={(value) =>
                      setDownloadsLimit(value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Ilimitado"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.group, styles.numberColumn]}>
                  <Text style={styles.label}>Banda KB/s</Text>
                  <TextField
                    value={maxBandwidth}
                    onChangeText={(value) =>
                      setMaxBandwidth(value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Ilimitada"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}

            <View style={styles.card}>
              <ToggleRow
                title="Bloquear acesso anônimo"
                value={disableAnonymous}
                onChange={setDisableAnonymous}
              />
              {shareType === "normal" && (
                <>
                  <ToggleRow
                    title="Permitir editar"
                    value={allowModify}
                    onChange={setAllowModify}
                  />
                  <ToggleRow
                    title="Permitir criar e enviar"
                    value={allowCreate}
                    onChange={setAllowCreate}
                  />
                  <ToggleRow
                    title="Permitir excluir"
                    value={allowDelete}
                    onChange={setAllowDelete}
                  />
                  <ToggleRow
                    title="Permitir substituir arquivos"
                    value={allowReplacements}
                    onChange={setAllowReplacements}
                  />
                  <ToggleRow
                    title="Desativar download"
                    value={disableDownload}
                    onChange={setDisableDownload}
                  />
                  <ToggleRow
                    title="Desativar miniaturas"
                    value={disableThumbnails}
                    onChange={setDisableThumbnails}
                  />
                </>
              )}
              <ToggleRow
                title="Manter após expirar"
                value={keepAfterExpiration}
                onChange={setKeepAfterExpiration}
              />
              <ToggleRow
                title="Ocultar barra lateral"
                value={disableSidebar}
                onChange={setDisableSidebar}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(bottomInset, 12) }]}
      >
        <Pressable
          onPress={submit}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.button,
            styles.createButton,
            pressed && styles.primaryPressed,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Ionicons name="link-outline" size={20} color={colors.onPrimary} />
          )}
          <Text style={styles.createText}>
            {isBusy ? "Criando…" : "Criar link"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 12,
    gap: 8,
  },
  heading: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "600",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 18,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 16,
  },
  fileBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  fileText: { flex: 1, minWidth: 0 },
  fileName: { color: colors.onSurface, fontWeight: "600", fontSize: 15 },
  fileMeta: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  group: { gap: 8 },
  label: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  expirationList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  expirationOption: {
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "transparent",
  },
  expirationSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  expirationText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "500",
  },
  expirationTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerHigh,
  },
  toggleRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  toggleText: { flex: 1, minWidth: 0 },
  toggleTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  toggleDescription: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  people: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 14, gap: 10 ,marginTop:10},
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
    paddingRight: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
    overflow: "hidden",
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarText: {
    color: colors.onPrimaryContainer,
    fontSize: 12,
    fontWeight: "700",
  },
  chipName: { color: colors.onSurface, fontSize: 13 },
  removeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 14,
    color: colors.onSurface,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    borderRadius: 12,
    fontSize: 15,
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  searchStatus: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  searchStatusText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestion: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  suggestionName: { flex: 1, color: colors.onSurface, fontSize: 14 },
  moreButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  moreText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  moreContent: { gap: 16, paddingBottom: 4 },
  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHigh,
  },
  segmentOption: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentSelected: { backgroundColor: colors.surface, elevation: 2 },
  segmentText: {
    color: colors.onSurfaceVariant,
    fontWeight: "600",
    fontSize: 14,
  },
  segmentTextSelected: { color: colors.onSurface },
  numberRow: { flexDirection: "row", gap: 10 },
  numberColumn: { flex: 1, minWidth: 0 },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  cancelButton: { flex: 1, backgroundColor: colors.surfaceContainerHigh },
  createButton: { flex: 1.6, backgroundColor: colors.primary },
  cancelText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  createText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  primaryPressed: { opacity: 0.88 },
});
