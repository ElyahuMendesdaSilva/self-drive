// src/app/(drawer)/configuracoes/index.js — lista de tópicos de configuração (usuário e, se for admin, administrador).
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SettingsCard from "../../../components/settings/SettingsCard";
import SettingsHeader from "../../../components/settings/SettingsHeader";
import { useStyles } from "../../../lib/theme";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { useIsAdmin } from "../../../hooks/useIsAdmin";
import { getTopicGroups } from "../../../lib/settingsModel";

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/inicio"));
const openTopic = (topic) => router.push(`/configuracoes/${topic.id}`);

function TopicList({ topics }) {
  return topics.map((topic) => (
    <SettingsCard
      key={topic.id}
      icon={topic.icon}
      title={topic.title}
      description={topic.description}
      onPress={() => openTopic(topic)}
    />
  ));
}

export default function Configuracoes() {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { loading, isAdmin } = useIsAdmin();
  const { user, admin } = getTopicGroups(isAdmin);

  return (
    <View style={styles.screen}>
      <SettingsHeader title="Configurações" onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TopicList topics={user} />

        {loading && <LoadingSpinner style={styles.loading} />}

        {admin.length > 0 && (
          <>
            <Text style={styles.section}>Administração</Text>
            <TopicList topics={admin} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 13 },
  section: { color: colors.onSurfaceVariant, fontSize: 14, fontWeight: "500", marginTop: 16, marginBottom: 4, marginLeft: 12 },
  loading: { marginVertical: 16 },
});
