import Ionicons from "@expo/vector-icons/Ionicons";
import { Host, Slider } from "@expo/ui";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { streamSource } from "../lib/api";
import { useColors, useStyles, useTheme, seedColor } from "../lib/theme";

export default function AudioViewer({ file, onClose, onDownload }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const source = useMemo(() => streamSource(file.path), [file.path]);
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = Number.isFinite(status.duration) ? status.duration : 0;
  const position = Math.min(status.currentTime || 0, duration || 0);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar áudio">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
          <Pressable onPress={onDownload} hitSlop={12} accessibilityLabel="Baixar arquivo original">
            <Ionicons name="download-outline" size={27} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.player}>
          <Ionicons name="musical-notes" size={72} color={colors.tertiary} />
          <Pressable
            style={styles.playButton}
            onPress={() => (status.playing ? player.pause() : player.play())}
            accessibilityLabel={status.playing ? "Pausar áudio" : "Reproduzir áudio"}
          >
            <Ionicons name={status.playing ? "pause" : "play"} size={32} color={colors.onPrimary} />
          </Pressable>
          <View style={styles.progress}>
            <Host matchContents={{ vertical: true }} style={styles.sliderHost} seedColor={seedColor} colorScheme={scheme}>
              <Slider
                value={position}
                min={0}
                max={duration || 1}
                disabled={!duration}
                onValueChange={(value) => player.seekTo(value)}
              />
            </Host>
            <View style={styles.times}>
              <Text style={styles.time}>{formatTime(position)}</Text>
              <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bar: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.surface },
  title: { flex: 1, color: colors.onSurface, fontSize: 16 },
  player: { flex: 1, alignItems: "center", justifyContent: "center", gap: 30, paddingHorizontal: 24 },
  playButton: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  progress: { width: "100%", gap: 4 },
  sliderHost: { width: "100%" },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: colors.onSurfaceVariant, fontSize: 13, fontVariant: ["tabular-nums"] },
});
