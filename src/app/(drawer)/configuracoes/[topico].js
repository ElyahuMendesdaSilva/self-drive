// src/app/(drawer)/configuracoes/[topico].js — itens de um tópico: lista genérica ou tela própria.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoadingSpinner from "../../../components/LoadingSpinner";
import BoundRow from "../../../components/settings/BoundRow";
import AccessScreen from "../../../components/settings/screens/AccessScreen";
import GroupsScreen from "../../../components/settings/screens/GroupsScreen";
import SecurityScreen from "../../../components/settings/screens/SecurityScreen";
import SharesScreen from "../../../components/settings/screens/SharesScreen";
import SystemScreen from "../../../components/settings/screens/SystemScreen";
import TokensScreen from "../../../components/settings/screens/TokensScreen";
import UsersScreen from "../../../components/settings/screens/UsersScreen";
import SettingsHeader from "../../../components/settings/SettingsHeader";
import { useColors, useStyles } from "../../../lib/theme";
import Toast from "../../../components/Toast";
import { useTask } from "../../../hooks/useTask";
import { findTopic } from "../../../lib/settingsModel";
import { useSettings } from "../../../lib/settingsStore";

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/configuracoes"));

const SCREENS = {
  security: SecurityScreen,
  system: SystemScreen,
  shares: SharesScreen,
  tokens: TokensScreen,
  users: UsersScreen,
  access: AccessScreen,
  groups: GroupsScreen,
};

function Notice({ text }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.notice}>
      <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

export default function Topico() {
  const styles = useStyles(createStyles);
  const { topico } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { loading, isAdmin, error, clearError } = useSettings();
  const { message, say } = useTask();

  // erros de gravação das configurações viram um aviso no rodapé
  useEffect(() => {
    if (error) {
      say(error, 4000);
      clearError();
    }
  }, [error, clearError, say]);

  const topic = findTopic(String(topico), isAdmin);
  const Custom = topic?.screen ? SCREENS[topic.screen] : null;

  return (
    <View style={styles.screen}>
      <SettingsHeader title={topic?.title ?? "Configurações"} onBack={goBack} />

      {!topic ? (
        loading ? (
          <LoadingSpinner style={styles.center} />
        ) : (
          <Text style={[styles.center, styles.empty]}>Configuração não encontrada ou sem permissão de acesso.</Text>
        )
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {topic.notices.map((text) => (
            <Notice key={text} text={text} />
          ))}

          {Custom ? (
            <Custom topic={topic} say={say} />
          ) : (
            topic.sections.map((section) => (
              <View key={section.id}>
                {!!section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
                <View style={styles.card}>
                  {section.items.map((item, index) => (
                    <View key={item.key} style={index > 0 && styles.divider}>
                      <BoundRow item={item} />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Toast message={message} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  center: { marginTop: 48, alignSelf: "center" },
  empty: { color: colors.onSurfaceVariant, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  notice: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surfaceContainer, borderRadius: 20, padding: 16 },
  noticeText: { flex: 1, color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: colors.primary, fontSize: 14, fontWeight: "500", marginBottom: 8, marginLeft: 12 },
  card: { backgroundColor: colors.surfaceContainer, borderRadius: 28, overflow: "hidden" },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
});
