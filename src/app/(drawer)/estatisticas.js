import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
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
import { useStats } from "../../hooks/useStats";
import { formatSize } from "../../lib/format";
import { useColors, useStyles } from "../../lib/theme";

function MetricCard({ icon, label, value, detail, tint, progress }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.metricCard}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name={icon} size={20} color={colors.onPrimaryContainer} />
      </View>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {!!detail && <Text style={styles.muted}>{detail}</Text>}
      {progress != null && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tint ?? colors.primary }]} />
        </View>
      )}
    </View>
  );
}

function CategoryRow({ item, total }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const share = total > 0 ? Math.max(item.size > 0 ? 2 : 0, item.size / total * 100) : 0;
  return (
    <View style={styles.categoryRow}>
      <View style={[styles.categoryDot, { backgroundColor: colors[item.color] }]} />
      <View style={styles.categoryMain}>
        <View style={styles.categoryHeading}>
          <Text style={styles.categoryLabel} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.categorySize}>{formatSize(item.size)}</Text>
        </View>
        <Text style={styles.categoryCount}>{item.count} {item.count === 1 ? "arquivo" : "arquivos"}</Text>
        <View style={styles.categoryTrack}>
          <View style={[styles.categoryFill, { width: `${share}%`, backgroundColor: colors[item.color] }]} />
        </View>
      </View>
    </View>
  );
}

function StatPill({ icon, label, value }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

export default function StatisticsScreen() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { stats, loading, error, refreshing, refresh, reload } = useStats();
  const categories = useMemo(() => stats?.byCategory || [], [stats]);
  const storage = stats?.storage;
  const totals = stats?.totals;
  const usedPercent = storage?.hasLimit ? storage.percent : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={23} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Estatísticas</Text>
        <Pressable onPress={refresh} disabled={refreshing} style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Atualizar estatísticas">
          {refreshing ? <LoadingSpinner size="small" /> : <Ionicons name="refresh" size={20} color={colors.primary} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surfaceContainerHigh} />}
      >
        {error && !stats ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.error} />
            <Text style={styles.stateTitle}>Não foi possível carregar</Text>
            <Text style={styles.muted}>{error}</Text>
            <Pressable style={styles.actionButton} onPress={() => reload()}><Text style={styles.actionText}>Tentar novamente</Text></Pressable>
          </View>
        ) : loading && !stats ? (
          <View style={styles.loading}><LoadingSpinner size="large" /><Text style={styles.muted}>Analisando seus arquivos…</Text></View>
        ) : stats ? (
          <>
            {error && <Text style={styles.inlineError}>Não foi possível atualizar. Exibindo os últimos dados carregados.</Text>}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Armazenamento</Text>
              <Text style={styles.sectionCaption}>Uso da origem conectada</Text>
            </View>
            <View style={styles.storageCard}>
              <View style={styles.storageTop}>
                <View style={styles.storageIcon}><Ionicons name="cloud" size={22} color={colors.onPrimaryContainer} /></View>
                <View style={styles.storageNumbers}>
                  <Text style={styles.eyebrow}>Espaço utilizado</Text>
                  <Text style={styles.storageValue}>{formatSize(storage.used)}</Text>
                </View>
                {!!storage.hasLimit && <Text style={styles.percent}>{usedPercent}%</Text>}
              </View>
              {storage.hasLimit ? (
                <>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${usedPercent}%` }]} /></View>
                  <View style={styles.storageFoot}>
                    <Text style={styles.muted}>{formatSize(storage.free)} disponíveis</Text>
                    <Text style={styles.muted}>de {formatSize(storage.total)}</Text>
                  </View>
                </>
              ) : <Text style={styles.muted}>Limite de armazenamento não informado pelo servidor.</Text>}
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard icon="document-text-outline" label="Arquivos analisados" value={String(totals.files)} detail={`em ${totals.folders} ${totals.folders === 1 ? "pasta" : "pastas"}`} />
              <MetricCard icon="folder-open-outline" label="Tamanho dos arquivos" value={formatSize(totals.filesSize)} detail={`${totals.modifiedLast7Days} alterados nos últimos 7 dias`} />
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Uso por tipo de arquivo</Text>
              <Text style={styles.sectionCaption}>Espaço ocupado pelos arquivos encontrados</Text>
            </View>
            <View style={styles.card}>
              {categories.length ? categories.map((item) => <CategoryRow key={item.key} item={item} total={totals.filesSize} />) : (
                <View style={styles.empty}><Ionicons name="pie-chart-outline" size={28} color={colors.onSurfaceVariant} /><Text style={styles.muted}>Nenhum arquivo encontrado nesta origem.</Text></View>
              )}
              {stats.truncated && <Text style={styles.note}>A análise foi parcial: o limite de pastas foi atingido.</Text>}
              <Text style={styles.cardFoot}>Baseado em {formatSize(totals.filesSize)} de arquivos analisados.</Text>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Visão geral</Text>
            </View>
            <View style={styles.card}>
              <StatPill icon="time-outline" label="Alterados nesta semana" value={totals.modifiedLast7Days} />
              {stats.trash && <StatPill icon="trash-outline" label="Itens na lixeira" value={stats.trash.count} />}
              {stats.shares != null && <StatPill icon="share-outline" label="Links compartilhados" value={stats.shares} />}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { minHeight: 58, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.background },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: colors.onSurface, fontSize: 22, fontWeight: "400" },
  refreshButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainer, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  intro: { color: colors.onSurfaceVariant, fontSize: 14, marginBottom: 2 },
  sectionHeading: { marginTop: 10, gap: 3 },
  sectionTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "500" },
  sectionCaption: { color: colors.onSurfaceVariant, fontSize: 13 },
  storageCard: { backgroundColor: colors.surface, borderColor: colors.surfaceContainerHighest, borderWidth: 1, borderRadius: 24, padding: 18, gap: 14 },
  storageTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  storageIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  storageNumbers: { flex: 1, gap: 2 },
  eyebrow: { color: colors.onSurfaceVariant, fontSize: 12 },
  storageValue: { color: colors.onSurface, fontSize: 27, fontWeight: "400" },
  percent: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: colors.surfaceContainerHighest, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: colors.primary },
  storageFoot: { flexDirection: "row", justifyContent: "space-between" },
  muted: { color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 18 },
  metricsGrid: { flexDirection: "row", gap: 12 },
  metricCard: { flex: 1, minHeight: 142, backgroundColor: colors.surface, borderColor: colors.surfaceContainerHighest, borderWidth: 1, borderRadius: 22, padding: 15, gap: 7 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  metricValue: { color: colors.onSurface, fontSize: 21, fontWeight: "400" },
  card: { backgroundColor: colors.surface, borderColor: colors.surfaceContainerHighest, borderWidth: 1, borderRadius: 24, padding: 16 },
  categoryRow: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHighest },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  categoryMain: { flex: 1, gap: 4 },
  categoryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  categoryLabel: { color: colors.onSurface, fontSize: 14, flex: 1 },
  categorySize: { color: colors.onSurface, fontSize: 13 },
  categoryCount: { color: colors.onSurfaceVariant, fontSize: 11 },
  categoryTrack: { height: 4, borderRadius: 4, backgroundColor: colors.surfaceContainerHighest, overflow: "hidden", marginTop: 4 },
  categoryFill: { height: "100%", borderRadius: 4 },
  cardFoot: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 14 },
  note: { color: colors.warning, fontSize: 12, marginTop: 12, lineHeight: 18 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 22 },
  pill: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHighest },
  pillLabel: { flex: 1, color: colors.onSurfaceVariant, fontSize: 13 },
  pillValue: { color: colors.onSurface, fontSize: 15, fontWeight: "500" },
  stateCard: { backgroundColor: colors.surface, borderColor: colors.surfaceContainerHighest, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", gap: 10 },
  stateTitle: { color: colors.onSurface, fontSize: 18 },
  actionButton: { borderRadius: 20, backgroundColor: colors.primaryContainer, paddingVertical: 10, paddingHorizontal: 18, marginTop: 5 },
  actionText: { color: colors.onPrimaryContainer, fontSize: 14, fontWeight: "600" },
  loading: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  inlineError: { color: colors.error, fontSize: 12 },
});
