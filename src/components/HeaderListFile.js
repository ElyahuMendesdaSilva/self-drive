// src/components/HeaderListFile.js
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors, useStyles } from "../lib/theme";

function Segment({ icon, label, active, onPress }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant}
      />
    </Pressable>
  );
}

export default function HeaderListFile({ title, mode = "list", onChangeMode, onBack }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.toggle}>
        <Segment
          icon="list-outline"
          label="Exibir como lista"
          active={mode === "list"}
          onPress={() => onChangeMode?.("list")}
        />
        <Segment
          icon="grid-outline"
          label="Exibir como grade"
          active={mode === "grid"}
          onPress={() => onChangeMode?.("grid")}
        />
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    width: "95%",
    alignSelf: "center",
    height: 53,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
  },
  title: {
    flexShrink: 1,
    color: colors.onSurfaceVariant,
    fontSize: 15,
  },
  toggle: {
    width: 88,
    height: 36,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 20,
    overflow: "hidden", // o destaque respeita as bordas arredondadas
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.primaryContainer,
  },
});