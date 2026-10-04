import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoadingSpinner from "../../components/LoadingSpinner";
import { getActivity } from "../../lib/api";
import { useColors, useStyles } from "../../lib/theme";

const EVENT_LABELS = {
  download: ["Download", "download-outline"],
  move: ["Movido", "move-outline"],
  copy: ["Copiado", "copy-outline"],
  rename: ["Renomeado", "create-outline"],
  upload: ["Enviado", "cloud-upload-outline"],
  delete: ["Excluído", "trash-outline"],
  bulkDelete: ["Itens excluídos", "trash-outline"],
  archive: ["Compactado", "archive-outline"],
  unarchive: ["Extraído", "folder-open-outline"],
  shareCreate: ["Link criado", "link-outline"],
  shareUpdate: ["Link atualizado", "link-outline"],
  shareDelete: ["Link removido", "link-outline"],
  userCreate: ["Usuário criado", "person-add-outline"],
  userUpdate: ["Usuário atualizado", "person-outline"],
  userDelete: ["Usuário removido", "person-remove-outline"],
  accessCreate: ["Regra de acesso criada", "shield-checkmark-outline"],
  accessUpdate: ["Regra de acesso atualizada", "shield-outline"],
  accessDelete: ["Regra de acesso removida", "shield-outline"],
  login: ["Login", "log-in-outline"],
  logout: ["Logout", "log-out-outline"],
  signup: ["Conta criada", "person-add-outline"],
  passkeyRegister: ["Chave de acesso adicionada", "key-outline"],
  passkeyDelete: ["Chave de acesso removida", "key-outline"],
  tokenCreate: ["Token criado", "key-outline"],
  tokenDelete: ["Token removido", "key-outline"],
  quotaCreate: ["Cota criada", "pie-chart-outline"],
  quotaUpdate: ["Cota atualizada", "pie-chart-outline"],
  quotaDelete: ["Cota removida", "pie-chart-outline"],
  duplicateFinder: ["Busca de duplicados", "duplicate-outline"],
};

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!value || value < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const size = value / 1024 ** index;
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function formatTimestamp(seconds) {
  const value = Number(seconds);
  if (!value) return "";
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function readable(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function ActivityCard({ item }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [label, icon] = EVENT_LABELS[item.eventType] || [
    readable(item.eventType),
    "time-outline",
  ];
  const details = item.details || {};
  const path = item.path || details.path;
  const targetPath = item.targetPath || details.targetPath;
  const timestamp = formatTimestamp(item.createdAt);
  const extraPaths = Array.isArray(details.paths)
    ? details.paths.filter((value) => value && value !== path)
    : [];
  const size = formatBytes(details.bytes);
  const changes = Array.isArray(details.changes) ? details.changes : [];
  const updatedFields = Array.isArray(details.updatedFields)
    ? details.updatedFields
    : [];

  return (
    <View style={styles.activityCard}>
      <View style={styles.eventIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeading}>
          <Text style={styles.eventTitle}>{label}</Text>
          {!!timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
        <Text style={styles.actor}>
          {item.username || "Anônimo"}
          {!!(item.source || details.source) &&
            ` · ${item.source || details.source}`}
        </Text>
        {!!path && (
          <Text style={styles.path} numberOfLines={2}>
            {path}
          </Text>
        )}
        {!!targetPath && targetPath !== path && (
          <Text style={styles.path} numberOfLines={2}>
            → {targetPath}
          </Text>
        )}
        {extraPaths.slice(0, 3).map((value) => (
          <Text key={value} style={styles.path} numberOfLines={1}>
            {value}
          </Text>
        ))}
        {extraPaths.length > 3 && (
          <Text style={styles.detail}>+ {extraPaths.length - 3} caminhos</Text>
        )}
        {!!details.targetUsername && (
          <Text style={styles.detail}>Usuário: {details.targetUsername}</Text>
        )}
        {!!details.affectedTokenName && (
          <Text style={styles.detail}>Token: {details.affectedTokenName}</Text>
        )}
        {!!item.tokenName && !details.affectedTokenName && (
          <Text style={styles.detail}>Token: {item.tokenName}</Text>
        )}
        {!!details.passkeyName && (
          <Text style={styles.detail}>Chave: {details.passkeyName}</Text>
        )}
        {!!details.loginMethod && (
          <Text style={styles.detail}>Método: {details.loginMethod}</Text>
        )}
        {!!details.fileCount && (
          <Text style={styles.detail}>
            {details.fileCount} {details.fileCount === 1 ? "item" : "itens"}
            {size ? ` · ${size}` : ""}
          </Text>
        )}
        {!details.fileCount && !!size && (
          <Text style={styles.detail}>{size}</Text>
        )}
        {!!updatedFields.length && (
          <Text style={styles.detail} numberOfLines={2}>
            Campos: {updatedFields.join(", ")}
          </Text>
        )}
        {changes.slice(0, 3).map((change, index) => (
          <Text
            key={`${change?.field || index}`}
            style={styles.detail}
            numberOfLines={2}
          >
            {change?.field}: {change?.from || "—"} → {change?.to || "—"}
          </Text>
        ))}
        {!!details.error && <Text style={styles.error}>{details.error}</Text>}
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else if (nextPage === 1) setLoading(true);
    setError("");
    try {
      const result = await getActivity({ page: nextPage, limit: 50 });
      setItems((current) =>
        append ? [...current, ...result.items] : result.items,
      );
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      setError(loadError?.message || "Não foi possível carregar os registros.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage]),
  );

  const refresh = () => {
    setRefreshing(true);
    loadPage(1);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/inicio"))}
          hitSlop={12}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={23} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Registros</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable
          onPress={refresh}
          disabled={refreshing || loading}
          style={styles.refreshButton}
          accessibilityRole="button"
          accessibilityLabel="Atualizar registros"
        >
          {refreshing || loading ? (
            <LoadingSpinner size="small" />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceContainerHigh}
          />
        }
      >
        <Text style={styles.caption}>Atividades dos últimos 7 dias</Text>
        {!!error && (
          <View style={styles.stateCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={colors.error}
            />
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => loadPage(1)} style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}
        {loading && items.length === 0 && !error ? (
          <View style={styles.loading}>
            <LoadingSpinner size="large" />
            <Text style={styles.caption}>Carregando registros…</Text>
          </View>
        ) : items.length ? (
          <>
            {items.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
            {page < totalPages && (
              <Pressable
                onPress={() => loadPage(page + 1, true)}
                disabled={loadingMore}
                style={styles.moreButton}
              >
                {loadingMore ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Text style={styles.retryText}>Carregar mais</Text>
                )}
              </Pressable>
            )}
          </>
        ) : !error && !loading ? (
          <View style={styles.stateCard}>
            <Ionicons
              name="reader-outline"
              size={30}
              color={colors.onSurfaceVariant}
            />
            <Text style={styles.stateText}>
              Nenhuma atividade registrada nos últimos 7 dias.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 60,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, color: colors.onSurface, fontSize: 22, fontWeight: "500" },
  count: { color: colors.onSurfaceVariant, fontSize: 14 },
  refreshButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.surfaceContainer,
  },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  caption: { color: colors.onSurfaceVariant, fontSize: 13, marginBottom: 4 },
  activityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  activityContent: { flex: 1, minWidth: 0, gap: 4 },
  activityHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  eventTitle: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  timestamp: { color: colors.onSurfaceVariant, fontSize: 11 },
  actor: { color: colors.onSurfaceVariant, fontSize: 12 },
  path: { color: colors.onSurface, fontSize: 13 },
  detail: { color: colors.onSurfaceVariant, fontSize: 12 },
  error: { color: colors.error, fontSize: 12 },
  stateCard: {
    marginTop: 16,
    padding: 22,
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
  },
  stateText: {
    color: colors.onSurfaceVariant,
    textAlign: "center",
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
  },
  retryText: {
    color: colors.onPrimaryContainer,
    fontSize: 14,
    fontWeight: "600",
  },
  moreButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
  },
  loading: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
