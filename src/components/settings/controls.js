// src/components/settings/controls.js — peças reutilizáveis das telas de configuração.
import { Host, Switch } from "@expo/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import LoadingSpinner from "../LoadingSpinner";
import { useColors, useStyles, useTheme, seedColor } from "../../lib/theme";

export function SwitchControl({ value, onChange, disabled }) {
  const styles = useStyles(createStyles);
  const { scheme } = useTheme();
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={disabled && styles.disabled}>
      <Host matchContents seedColor={seedColor} colorScheme={scheme}>
        <Switch value={Boolean(value)} onValueChange={onChange} />
      </Host>
    </View>
  );
}

export function Texts({ label, description, hint }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.texts}>
      <Text style={styles.label}>{label}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// opções de escolha única em formato de "chips"
export function Chips({ options, value, onChange, disabled }) {
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.chips, disabled && styles.disabled]} pointerEvents={disabled ? "none" : "auto"}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NumberField({ value, onChange, width = 96, placeholder = "0", disabled }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <TextInput
      style={[styles.input, { width }, disabled && styles.disabled]}
      value={String(value ?? "")}
      onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant}
      textAlign="right"
      editable={!disabled}
    />
  );
}

// campo de texto + botão "+" e os itens já adicionados como chips removíveis
export function ListEditor({ items, onChange, placeholder, disabled }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setDraft("");
  };
  return (
    <View style={[styles.block, disabled && styles.disabled]} pointerEvents={disabled ? "none" : "auto"}>
      {items.length > 0 && (
        <View style={styles.chips}>
          {items.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => onChange(items.filter((e) => e !== entry))}
              accessibilityLabel={`Remover ${entry}`}
              style={[styles.chip, styles.chipSelected, styles.chipRemovable]}
            >
              <Text style={styles.chipTextSelected}>{entry}</Text>
              <Ionicons name="close" size={16} color={colors.onSurface} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.inputGrow]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Pressable onPress={add} hitSlop={8} accessibilityLabel="Adicionar" style={styles.addButton}>
          <Ionicons name="add" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

// Botão de texto/preenchido usado nas telas próprias (criar, salvar, excluir…).
export function ActionButton({ label, onPress, icon, busy, danger, filled, disabled }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const tint = danger ? colors.error : filled ? colors.onPrimary : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        filled && { backgroundColor: danger ? colors.error : colors.primary },
        (pressed || busy) && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {busy ? <LoadingSpinner size="small" color={tint} /> : icon ? <Ionicons name={icon} size={18} color={tint} /> : null}
      <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }) {
  const styles = useStyles(createStyles);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Card({ children }) {
  const styles = useStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

export function Empty({ children }) {
  const styles = useStyles(createStyles);
  return <Text style={styles.empty}>{children}</Text>;
}

export const createStyles = (colors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowColumn: { gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { backgroundColor: colors.pressed },
  disabled: { opacity: 0.45 },
  texts: { flex: 1, gap: 2 },
  label: { color: colors.onSurface, fontSize: 16 },
  description: { color: colors.onSurfaceVariant, fontSize: 13 },
  hint: { color: colors.warning, fontSize: 12, marginTop: 2 },
  counter: { color: colors.primary, fontSize: 14, fontWeight: "500" },
  fullWidth: { width: "100%" },
  children: { paddingHorizontal: 16, paddingBottom: 8 },
  childRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingLeft: 12 },
  childLabel: { color: colors.onSurfaceVariant, fontSize: 14, flex: 1 },
  nested: { paddingHorizontal: 16, paddingBottom: 14 },
  block: { gap: 10 },
  policy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  policyText: { color: colors.onSurfaceVariant, fontSize: 13 },
  lockedText: { color: colors.warning, fontSize: 12, paddingHorizontal: 16, paddingBottom: 12, marginTop: -6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 100, borderWidth: 1, borderColor: colors.outlineVariant, paddingVertical: 6, paddingHorizontal: 14 },
  chipSelected: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipRemovable: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: { color: colors.onSurfaceVariant, fontSize: 14 },
  chipTextSelected: { color: colors.onSurface, fontSize: 14 },
  input: {
    color: colors.onSurface,
    fontSize: 16,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputGrow: { flex: 1 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  buttonLabel: { fontSize: 14, fontWeight: "500" },
  sectionTitle: { color: colors.primary, fontSize: 14, fontWeight: "500", marginBottom: 8, marginLeft: 12 },
  card: { backgroundColor: colors.surfaceContainer, borderRadius: 28, overflow: "hidden" },
  empty: { color: colors.onSurfaceVariant, fontSize: 14, textAlign: "center", paddingVertical: 24, paddingHorizontal: 24 },
});
