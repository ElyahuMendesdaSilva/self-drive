// Sistema e administração: notificação de atualização, análises e configuração do servidor.
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getAnalytics, getAnalyticsPreview, getServerConfig, setAnalyticsEnabled } from "../../../lib/api";
import { topicItems } from "../../../lib/settingsModel";
import BoundRow from "../BoundRow";
import { ActionButton, Card, SectionTitle, SwitchControl } from "../controls";
import TextModal from "../TextModal";
import { useStyles } from "../../../lib/theme";
import { useTask } from "../../../hooks/useTask";

export default function SystemScreen({ say }) {
  const styles = useStyles(createStyles);
  const [enabled, setEnabled] = useState(null); // null = carregando ou sem suporte
  const [viewer, setViewer] = useState(null); // { title, text }
  const { run, busy } = useTask();
  const updateItem = topicItems("sistema").find((item) => item.id === "disableUpdateNotifications");

  useEffect(() => {
    let active = true;
    getAnalytics()
      .then((body) => active && setEnabled(Boolean(body?.enabled)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleAnalytics = async (next) => {
    setEnabled(next);
    const ok = await run(() => setAnalyticsEnabled(next));
    if (!ok) {
      setEnabled(!next);
      say("Não foi possível alterar as análises.");
    }
  };

  const open = async (title, load) => {
    say("Carregando…", 0);
    try {
      setViewer({ title, text: await load() });
      say("");
    } catch (cause) {
      say(cause?.message || "Não foi possível carregar.", 4000);
    }
  };

  return (
    <View style={styles.wrap}>
      <View>
        <SectionTitle>Atualizações</SectionTitle>
        <Card>{updateItem && <BoundRow item={updateItem} />}</Card>
      </View>

      <View>
        <SectionTitle>Análises</SectionTitle>
        <Card>
          <View style={styles.row}>
            <View style={styles.texts}>
              <Text style={styles.label}>Enviar análises de implantação (anônimas)</Text>
              <Text style={styles.description}>
                {enabled === null ? "Este servidor não informou suporte a análises." : "Ajuda a equipe do projeto a entender como o servidor é usado."}
              </Text>
            </View>
            <SwitchControl value={Boolean(enabled)} onChange={toggleAnalytics} disabled={enabled === null || busy} />
          </View>
        </Card>
      </View>

      <View>
        <SectionTitle>Consultar</SectionTitle>
        <Card>
          <View style={styles.buttons}>
            <ActionButton label="Ver análises" icon="analytics-outline" onPress={() => open("Análises", getAnalyticsPreview)} />
            <ActionButton label="Ver configuração do servidor" icon="document-text-outline" onPress={() => open("Configuração do servidor", getServerConfig)} />
          </View>
        </Card>
      </View>

      <TextModal visible={Boolean(viewer)} title={viewer?.title} text={viewer?.text} onClose={() => setViewer(null)} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  texts: { flex: 1, gap: 2 },
  label: { color: colors.onSurface, fontSize: 16 },
  description: { color: colors.onSurfaceVariant, fontSize: 13 },
  buttons: { padding: 12, gap: 4 },
});
