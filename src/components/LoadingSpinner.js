import { Host, LoadingIndicator } from "@expo/ui/jetpack-compose";
import { ActivityIndicator, Platform, StyleSheet } from "react-native";

import { useColors } from "../lib/theme";

export default function LoadingSpinner({ size = "small", color, style }) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  if (Platform.OS !== "android") {
    return <ActivityIndicator size={size} color={tint} style={style} />;
  }

  const dimension = size === "large" ? 48 : 32;
  return (
    <Host matchContents style={[styles.host, { width: dimension, height: dimension }, style]}>
      <LoadingIndicator color={tint} />
    </Host>
  );
}

const styles = StyleSheet.create({ host: { alignItems: "center", justifyContent: "center" } });
