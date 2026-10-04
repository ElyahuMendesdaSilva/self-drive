// src/components/ImageViewer.js — visualizador de imagem em tela cheia (toque num arquivo de imagem).
// Mostra o preview "large" gerado pelo servidor; o botão de baixar abre o arquivo original.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEvent } from "expo";
import AudioViewer from "./AudioViewer";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { previewSource, streamSource } from "../lib/api";
import AuthImage from "./AuthImage";
import MarkdownViewer from "./MarkdownViewer";
import { darkColors as colors } from "../lib/theme"; // visualizador de mídia: sempre escuro nos dois temas

export default function ImageViewer({ file, onClose, onDownload }) {
  if (file?.kind === "audio") {
    return <AudioViewer file={file} onClose={onClose} onDownload={onDownload} />;
  }
  if (file?.kind === "video") {
    return <VideoViewer file={file} onClose={onClose} onDownload={onDownload} />;
  }
  if (["markdown", "text"].includes(file?.kind)) {
    return <MarkdownViewer file={file} onClose={onClose} onDownload={onDownload} />;
  }
  return <ImagePreview file={file} onClose={onClose} onDownload={onDownload} />;
}

function ImagePreview({ file, onClose, onDownload }) {
  const insets = useSafeAreaInsets();
  if (!file) return null;

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
            <Ionicons name="close" size={30} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable
            onPress={onDownload}
            hitSlop={12}
            accessibilityLabel="Baixar original"
          >
            <Ionicons
              name="download-outline"
              size={30}
              color={colors.onSurface}
            />
          </Pressable>
        </View>

        <View style={[styles.stage, { paddingBottom: insets.bottom }]}>
          <AuthImage
            source={previewSource(file.path, "large")}
            version={file.modified}
            style={styles.image}
            resizeMode="contain"
            fallback={
              <View style={styles.error}>
                <Ionicons
                  name="image-outline"
                  size={48}
                  color={colors.onSurfaceVariant}
                />
                <Text style={styles.errorText}>
                  Não foi possível carregar a pré-visualização.
                </Text>
                <Pressable style={styles.button} onPress={onDownload}>
                  <Text style={styles.buttonText}>Baixar arquivo</Text>
                </Pressable>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function VideoViewer({ file, onClose, onDownload }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const source = useMemo(() => streamSource(file.path), [file.path]);
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.timeUpdateEventInterval = 0.5;
    videoPlayer.play();
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { currentTime } = useEvent(player, "timeUpdate", { currentTime: player.currentTime });
  const { duration } = useEvent(player, "sourceLoad", { duration: player.duration });
  const { status, error } = useEvent(player, "statusChange", { status: player.status, error: player.error });
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => () => {
    ScreenOrientation.unlockAsync().catch(() => {});
  }, []);

  const close = async () => {
    try {
      await ScreenOrientation.unlockAsync();
    } catch {
      // A plataforma pode não permitir alterar a orientação atual.
    }
    onClose?.();
  };

  const rotate = async () => {
    try {
      await ScreenOrientation.lockAsync(
        isLandscape
          ? ScreenOrientation.OrientationLock.PORTRAIT
          : ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    } catch {
      // Orientação bloqueada pelo sistema ou pelo modo de janela do dispositivo.
    }
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={videoStyles.container}>
        <View style={[videoStyles.bar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Fechar vídeo">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={videoStyles.title} numberOfLines={1}>{file.name}</Text>
          <Pressable onPress={rotate} hitSlop={12} accessibilityLabel="Girar tela">
            <Ionicons name={isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"} size={24} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={onDownload} hitSlop={12} accessibilityLabel="Baixar vídeo">
            <Ionicons name="download-outline" size={26} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={videoStyles.stage}>
          <VideoView player={player} style={videoStyles.video} contentFit="contain" nativeControls={false} />
          {status === "loading" && <ActivityIndicator style={videoStyles.loading} size="large" color={colors.primary} />}
          {status === "error" && (
            <View style={videoStyles.error}>
              <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
              <Text style={videoStyles.errorText}>{error?.message || "Não foi possível reproduzir este vídeo."}</Text>
            </View>
          )}
        </View>

        <View style={[videoStyles.controls, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={videoStyles.progressTrack}>
            <View style={[videoStyles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={videoStyles.controlRow}>
            <Text style={videoStyles.time}>{formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}</Text>
            <View style={videoStyles.buttons}>
              <Pressable onPress={() => player.seekBy(-10)} hitSlop={12} accessibilityLabel="Voltar 10 segundos">
                <Ionicons name="play-back" size={27} color={colors.onSurface} />
              </Pressable>
              <Pressable
                style={videoStyles.playButton}
                onPress={() => (isPlaying ? player.pause() : player.play())}
                accessibilityLabel={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={26} color={colors.onPrimary} />
              </Pressable>
              <Pressable onPress={() => player.seekBy(10)} hitSlop={12} accessibilityLabel="Avançar 10 segundos">
                <Ionicons name="play-forward" size={27} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatPlaybackTime(value = 0) {
  const seconds = Math.max(0, Math.floor(value));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = String(seconds % 60).padStart(2, "0");
  const hoursPart = Math.floor(minutesPart / 60);
  const remainingMinutes = String(minutesPart % 60).padStart(2, "0");
  return hoursPart > 0
    ? `${hoursPart}:${remainingMinutes}:${secondsPart}`
    : `${minutesPart}:${secondsPart}`;
}

const videoStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.media },
  bar: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.surfaceContainerLowest },
  title: { flex: 1, color: colors.onSurface, fontSize: 16 },
  stage: { flex: 1, justifyContent: "center", alignItems: "center" },
  video: { width: "100%", height: "100%" },
  loading: { position: "absolute" },
  error: { position: "absolute", alignItems: "center", gap: 12, padding: 24 },
  errorText: { color: colors.onSurface, fontSize: 14, textAlign: "center" },
  controls: { paddingTop: 12, paddingHorizontal: 20, backgroundColor: colors.surfaceContainerLowest },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.outlineVariant, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  controlRow: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { color: colors.onSurfaceVariant, fontSize: 12 },
  buttons: { flexDirection: "row", alignItems: "center", gap: 28 },
  playButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23, backgroundColor: colors.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.media },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.scrim,
  },
  title: { flex: 1, color: colors.onSurface, fontSize: 18 },
  stage: { flex: 1, alignItems: "stretch", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  error: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.onPrimary, fontSize: 14, fontWeight: "500" },
});
