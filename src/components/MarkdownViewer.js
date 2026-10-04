import Ionicons from "@expo/vector-icons/Ionicons";
import Markdown from "@ronradtke/react-native-markdown-display";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { readTextResource } from "../lib/api";
import { useColors, useStyles } from "../lib/theme";

export default function MarkdownViewer({ file, onClose, onDownload }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const isPlainText = file?.kind === "text";
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ path: null, attempt: -1, content: "", error: null });

  useEffect(() => {
    let active = true;
    readTextResource(file.path)
      .then((content) => {
        if (active) setResult({ path: file.path, attempt, content, error: null });
      })
      .catch((error) => {
        if (active) setResult({ path: file.path, attempt, content: "", error });
      });
    return () => { active = false; };
  }, [file.path, attempt]);

  const loading = result.path !== file.path || result.attempt !== attempt;
  const error = loading ? null : result.error;
  const content = loading || error ? "" : result.content;

  const markdownStyles = useStyles(createMarkdownStyles);

  const openLink = (_event, url) => {
    if (!/^(https?:|mailto:)/i.test(url)) return false;
    Linking.openURL(url).catch(() => {});
    return false;
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar documento">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
          <Pressable onPress={onDownload} hitSlop={12} accessibilityLabel="Baixar arquivo original">
            <Ionicons name="download-outline" size={27} color={colors.onSurface} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Carregando documento…</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
            <Text style={styles.stateText}>{error.message || "Não foi possível abrir este documento."}</Text>
            <Pressable style={styles.retry} onPress={() => setAttempt((current) => current + 1)}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.document, { paddingBottom: insets.bottom + 28 }]}>
            {isPlainText ? (
              <Text selectable style={markdownStyles.body}>{content}</Text>
            ) : (
              <Markdown style={markdownStyles} onLinkPress={openLink}>
                {content}
              </Markdown>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bar: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.surface },
  title: { flex: 1, color: colors.onSurface, fontSize: 16 },
  document: { paddingHorizontal: 20, paddingTop: 18 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 28 },
  stateText: { color: colors.onSurfaceVariant, fontSize: 14, textAlign: "center" },
  retry: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, backgroundColor: colors.primaryContainer },
  retryText: { color: colors.onPrimaryContainer, fontSize: 14, fontWeight: "600" },
});

const createMarkdownStyles = (colors) => ({
  body: { color: colors.onSurface, fontSize: 16, lineHeight: 25 },
  heading1: { color: colors.primary, fontSize: 28, lineHeight: 34, fontWeight: "700", marginTop: 12, marginBottom: 12 },
  heading2: { color: colors.primary, fontSize: 23, lineHeight: 30, fontWeight: "700", marginTop: 14, marginBottom: 10 },
  heading3: { color: colors.onSurface, fontSize: 19, lineHeight: 26, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  heading4: { color: colors.onSurface, fontSize: 17, fontWeight: "700", marginTop: 10, marginBottom: 6 },
  heading5: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 6 },
  heading6: { color: colors.onSurfaceVariant, fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 6 },
  paragraph: { marginTop: 0, marginBottom: 14 },
  link: { color: colors.primary, textDecorationLine: "underline" },
  blockquote: { backgroundColor: colors.surfaceContainer, borderLeftColor: colors.primary, borderLeftWidth: 3, paddingHorizontal: 12, marginVertical: 8 },
  code_inline: { color: colors.tertiary, backgroundColor: colors.surfaceContainerHigh, fontFamily: "monospace" },
  code_block: { color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh, fontFamily: "monospace", padding: 14, borderRadius: 10, marginVertical: 8 },
  fence: { color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh, fontFamily: "monospace", padding: 14, borderRadius: 10, marginVertical: 8 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  hr: { backgroundColor: colors.outlineVariant, height: 1, marginVertical: 12 },
  table: { borderColor: colors.outlineVariant, borderWidth: 1, marginVertical: 10 },
  th: { color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh, padding: 8, fontWeight: "700" },
  td: { color: colors.onSurfaceVariant, borderColor: colors.outlineVariant, padding: 8 },
  image: { resizeMode: "contain" },
});
