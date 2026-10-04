import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionButton, Card, SectionTitle } from "../controls";
import { useColors, useStyles } from "../../../lib/theme";

export default function UpdatesScreen() {
  const styles = useStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [readyToReload, setReadyToReload] = useState(false);
  const [status, setStatus] = useState("");
  const updatesAvailable = Updates.isEnabled && !__DEV__;

  const checkForUpdates = async () => {
    if (busy || !updatesAvailable) return;
    setBusy(true);
    setStatus("Verificando atualizações…");
    setReadyToReload(false);
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setStatus("O aplicativo já está atualizado.");
        return;
      }

      setStatus("Baixando atualização…");
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew || result.isRollBackToEmbedded) {
        setReadyToReload(true);
        setStatus("Atualização baixada. Reinicie o app para aplicá-la.");
      } else {
        setStatus("Não há uma atualização nova para instalar.");
      }
    } catch (error) {
      setStatus(error?.message || "Não foi possível verificar atualizações.");
    } finally {
      setBusy(false);
    }
  };

  const reloadWithUpdate = async () => {
    if (!readyToReload || busy) return;
    setBusy(true);
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setStatus(error?.message || "Não foi possível reiniciar o aplicativo.");
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View>
        <SectionTitle>Versão instalada</SectionTitle>
        <Card>
          <InfoRow label="Versão do app" value={Constants.expoConfig?.version || "—"} />
          <InfoRow label="Canal" value={Updates.channel || "—"} />
          <InfoRow label="Runtime" value={Updates.runtimeVersion || "—"} />
          <InfoRow
            label="Origem"
            value={Updates.isEmbeddedLaunch ? "Instalada no app" : Updates.updateId ? "Atualização OTA" : "—"}
            last
          />
        </Card>
      </View>

      {!updatesAvailable && (
        <Text style={styles.notice}>
          A busca de atualizações funciona em builds instaladas com expo-updates. Não está disponível no Expo Go nem durante o desenvolvimento. Instale uma nova build EAS para ativar esse recurso.
        </Text>
      )}

      <View>
        <SectionTitle>Atualizações do aplicativo</SectionTitle>
        <Card>
          <View style={styles.actions}>
            <ActionButton
              label="Verificar atualizações"
              icon="refresh-outline"
              onPress={checkForUpdates}
              busy={busy && !readyToReload}
              disabled={!updatesAvailable || readyToReload}
              filled
            />
            {readyToReload && (
              <ActionButton
                label="Reiniciar para atualizar"
                icon="reload-outline"
                onPress={reloadWithUpdate}
                busy={busy}
                disabled={busy}
              />
            )}
          </View>
          {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
        </Card>
      </View>
    </View>
  );
}

function InfoRow({ label, value, last }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: colors.onSurface }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  infoRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  infoRowLast: { borderBottomWidth: 0 },
  label: { color: colors.onSurfaceVariant, fontSize: 14 },
  value: { flexShrink: 1, fontSize: 14, textAlign: "right" },
  actions: { padding: 12, gap: 4 },
  status: { color: colors.onSurfaceVariant, fontSize: 13, paddingHorizontal: 16, paddingBottom: 14 },
  notice: {
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    fontSize: 13,
    lineHeight: 19,
  },
});
