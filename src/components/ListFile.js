// src/components/FileList.js
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import AuthImage from "./AuthImage";
import LoadingSpinner from "./LoadingSpinner";
import { useColors, useStyles } from "../lib/theme";
import { avatarSource } from "../lib/api";
import useCurrentUserAvatar from "../hooks/useCurrentUserAvatar";
import { clearTransferClipboard, useTransferClipboard } from "../lib/transferClipboard";


// ícone e cor por tipo de arquivo (como o Drive faz)
const fileTypes = (colors) => ({
  doc: { icon: "document-text", color: colors.primary },
  markdown: { icon: "document-text", color: colors.primary },
  text: { icon: "document-text-outline", color: colors.onSurfaceVariant },
  image: { icon: "image", color: colors.error },
  sheet: { icon: "grid", color: colors.secondary },
  pdf: { icon: "document", color: colors.error },
  folder: { icon: "folder", color: colors.onSurfaceVariant },
  video: { icon: "videocam", color: colors.warning },
  audio: { icon: "musical-notes", color: colors.tertiary },
  zip: { icon: "archive", color: colors.warning },
});
export const typeMeta = (kind, colors) => {
  const types = fileTypes(colors);
  return types[kind] ?? types.doc;
};
const typeOf = (file, colors) => typeMeta(file.kind, colors);
// thumbnail pode ser uma URL ou { uri, headers } (rotas autenticadas)
const imageSource = (thumbnail) => (typeof thumbnail === "string" ? { uri: thumbnail } : thumbnail);

function MenuButton({ onPress }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityLabel="Mais ações">
      <Ionicons name="ellipsis-vertical" size={20} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

// modo "grid": card grande com pré-visualização
function FileCard({ file, onOpen, onMenu, currentUserAvatar, selected, selectionMode, onToggleSelection }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const meta = typeOf(file, colors);
  const avatar = file.avatar
    ? typeof file.avatar === "string" && file.avatar.startsWith("/")
      ? avatarSource(file.avatar)
      : file.avatar
    : currentUserAvatar;
  const avatarUri = typeof avatar === "string" ? avatar : avatar?.uri;

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => (selectionMode ? onToggleSelection?.(file) : onOpen?.(file))}
      onLongPress={() => onToggleSelection?.(file)}
      delayLongPress={350}
    >
      <View style={styles.cardHeader}>
        {selectionMode ? (
          <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? colors.primary : colors.onSurfaceVariant} />
        ) : (
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        )}
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        {!selectionMode && <MenuButton onPress={() => onMenu?.(file)} />}
      </View>

      <View style={styles.preview}>
        {file.thumbnail ? (
          <AuthImage
            source={imageSource(file.thumbnail)}
            version={file.modified}
            style={styles.previewImage}
            resizeMode="cover"
            fallback={<Ionicons name={meta.icon} size={48} color={meta.color} />}
          />
        ) : (
          <Ionicons name={meta.icon} size={48} color={meta.color} />
        )}
        {file.shared && (
          <View style={styles.sharedBadge}>
            <Ionicons name="people" size={14} color={colors.onSurface} />
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        {avatar ? (
          <AuthImage
            source={avatar}
            version={avatarUri}
            style={styles.avatar}
            fallback={<Ionicons name="person-circle" size={32} color={colors.onSurfaceVariant} />}
          />
        ) : (
          <Ionicons name="person-circle" size={32} color={colors.onSurfaceVariant} />
        )}
        <View>
          <Text style={styles.footerTitle}>{file.action}</Text>
          <Text style={styles.footerDate}>{file.date}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// modo "list": linha compacta
function FileRow({ file, onOpen, onMenu, selected, selectionMode, onToggleSelection }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const meta = typeOf(file, colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, selected && styles.rowSelected]}
      onPress={() => (selectionMode ? onToggleSelection?.(file) : onOpen?.(file))}
      onLongPress={() => onToggleSelection?.(file)}
      delayLongPress={350}
    >
      {selectionMode ? (
        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={28} color={selected ? colors.primary : colors.onSurfaceVariant} />
      ) : file.thumbnail ? (
        <AuthImage
          source={imageSource(file.thumbnail)}
          version={file.modified}
          style={styles.rowThumb}
          resizeMode="cover"
          fallback={<Ionicons name={meta.icon} size={28} color={meta.color} />}
        />
      ) : (
        <Ionicons name={meta.icon} size={28} color={meta.color} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.footerDate} numberOfLines={1}>
          {[file.action, file.date].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {!selectionMode && <MenuButton onPress={() => onMenu?.(file)} />}
    </Pressable>
  );
}

export default function FileList({
  files,
  mode = "grid",
  header,
  onOpen,
  onMenu,
  onFavoriteSelected,
  onRestoreSelected,
  onDeleteSelected,
  onCopySelected,
  onCutSelected,
  onPaste,
  loading = false,
  error = null,
  emptyText = "Nada por aqui.",
  onRefresh,
  refreshing = false,
  onRetry,
}) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const currentUserAvatar = useCurrentUserAvatar();
  const clipboard = useTransferClipboard();
  const [selectedKeys, setSelectedKeys] = useState([]);
  const selectionMode = selectedKeys.length > 0;
  const itemKey = (file) => String(file.id ?? file.path ?? file.name);
  const toggleSelection = (file) => {
    const key = itemKey(file);
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((selectedKey) => selectedKey !== key)
      : [...current, key]);
  };
  const clearSelection = () => setSelectedKeys([]);
  const selectedFiles = files.filter((file) => selectedKeys.includes(itemKey(file)));
  const runSelectedAction = (callback) => {
    callback?.(selectedFiles);
    clearSelection();
  };
  const selectionToolbar = selectionMode ? (
    <View style={styles.selectionBar}>
      <Pressable onPress={clearSelection} hitSlop={10} accessibilityRole="button" accessibilityLabel="Sair da seleção">
        <Ionicons name="close" size={23} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.selectionTitle}>{selectedKeys.length} selecionado(s)</Text>
      <View style={styles.selectionActions}>
        {onFavoriteSelected && (
          <Pressable onPress={() => runSelectedAction(onFavoriteSelected)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Alternar favoritos dos selecionados">
            <Ionicons name="star-outline" size={22} color={colors.onSurface} />
          </Pressable>
        )}
        {onCopySelected && (
          <Pressable onPress={() => runSelectedAction(onCopySelected)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Copiar selecionados">
            <Ionicons name="copy-outline" size={22} color={colors.onSurface} />
          </Pressable>
        )}
        {onCutSelected && (
          <Pressable onPress={() => runSelectedAction(onCutSelected)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Recortar selecionados">
            <Ionicons name="cut-outline" size={22} color={colors.onSurface} />
          </Pressable>
        )}
        {onRestoreSelected && (
          <Pressable
            onPress={() => runSelectedAction(onRestoreSelected)}
            style={({ pressed }) => [styles.restoreButton, pressed && styles.selectionActionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Restaurar selecionados"
          >
            <Ionicons name="arrow-undo-outline" size={18} color={colors.onPrimaryContainer} />
            <Text style={styles.restoreButtonText}>Restaurar</Text>
          </Pressable>
        )}
        {onDeleteSelected && (
          <Pressable onPress={() => runSelectedAction(onDeleteSelected)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Excluir selecionados">
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        )}
      </View>
    </View>
  ) : null;
  const clipboardToolbar = !selectionMode && onPaste && clipboard.items.length > 0 ? (
    <View style={styles.clipboardBar}>
      <Text style={styles.clipboardText} numberOfLines={1}>
        {clipboard.mode === "move" ? "Recortado" : "Copiado"}: {clipboard.items.length} item(ns)
      </Text>
      <Pressable style={styles.pasteButton} onPress={() => onPaste(clipboard)} accessibilityRole="button">
        <Ionicons name="clipboard-outline" size={18} color={colors.onPrimaryContainer} />
        <Text style={styles.pasteButtonText}>Colar</Text>
      </Pressable>
      <Pressable onPress={clearTransferClipboard} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar área de transferência">
        <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  ) : null;
  const empty = loading ? (
    <View style={styles.state}>
      <LoadingSpinner />
    </View>
  ) : error ? (
    <View style={styles.state}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.onSurfaceVariant} />
      <Text style={styles.stateText}>{error}</Text>
      {onRetry && (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      )}
    </View>
  ) : (
    <View style={styles.state}>
      <Ionicons name="folder-open-outline" size={40} color={colors.onSurfaceVariant} />
      <Text style={styles.stateText}>{emptyText}</Text>
    </View>
  );

  return (
    <View style={styles.listContainer}>
      {selectionToolbar}
      {clipboardToolbar}
      <FlatList
        data={loading || error ? [] : files}
        keyExtractor={itemKey}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        stickyHeaderIndices={header ? [0] : undefined}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) =>
          mode === "grid" ? (
            <FileCard
              file={item}
              onOpen={onOpen}
              onMenu={onMenu}
              currentUserAvatar={currentUserAvatar}
              selectionMode={selectionMode}
              selected={selectedKeys.includes(itemKey(item))}
              onToggleSelection={toggleSelection}
            />
          ) : (
            <FileRow
              file={item}
              onOpen={onOpen}
              onMenu={onMenu}
              selectionMode={selectionMode}
              selected={selectedKeys.includes(itemKey(item))}
              onToggleSelection={toggleSelection}
            />
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }} // espaço para o botão "+" não cobrir o último item
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  listContainer: { flex: 1 },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    gap: 12,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surfaceContainerHigh },
  selectionBar: {
    minHeight: 56,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
  },
  selectionTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "500", flexShrink: 1 },
  selectionActions: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 14 },
  clipboardBar: { minHeight: 52, backgroundColor: colors.surfaceContainer, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18 },
  clipboardText: { color: colors.onSurface, fontSize: 14, flex: 1 },
  pasteButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryContainer, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100 },
  pasteButtonText: { color: colors.onPrimaryContainer, fontSize: 14, fontWeight: "600" },
  restoreButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryContainer, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100 },
  restoreButtonText: { color: colors.onPrimaryContainer, fontSize: 13, fontWeight: "600" },
  selectionActionPressed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 15,
  },
  preview: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  sharedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.scrim,
    borderRadius: 10,
    padding: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  footerTitle: {
    color: colors.onSurface,
    fontSize: 13,
  },
  footerDate: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.pressed,
  },
  rowSelected: { backgroundColor: colors.surfaceContainerHigh },
  rowText: {
    flex: 1,
  },
  rowThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: "hidden",
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  stateText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: "center",
  },
  retry: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
});
