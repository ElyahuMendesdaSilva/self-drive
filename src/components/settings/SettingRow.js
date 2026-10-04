// src/components/settings/SettingRow.js — desenha um item de configuração conforme o `kind` do modelo.
// A linha não sabe de onde o valor vem: quem a usa passa `value`/`onChange` (usuário, padrões, compartilhamento…).
import { Host, Slider } from "@expo/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";

import { useColors, useStyles, useTheme, seedColor } from "../../lib/theme";
import { Chips, ListEditor, NumberField, createStyles as createControlStyles, SwitchControl, Texts } from "./controls";

/* ---------- um componente por tipo de item ---------- */
function ToggleRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.row}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <SwitchControl value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

function SliderRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  const { scheme } = useTheme();
  return (
    <View style={[styles.rowColumn, disabled && styles.disabled]} pointerEvents={disabled ? "none" : "auto"}>
      <View style={styles.rowHeader}>
        <Texts label={item.label} description={item.description} hint={item.hint} />
        <Text style={styles.counter}>{value}</Text>
      </View>
      <Host matchContents={{ vertical: true }} style={styles.fullWidth} seedColor={seedColor} colorScheme={scheme}>
        <Slider value={value} onValueChange={(v) => onChange(Math.round(v))} min={item.min} max={item.max} step={1} />
      </Host>
    </View>
  );
}

function NumberRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.row}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <NumberField value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

function TextRow({ item, value, onChange, disabled }) {
  const colors = useColors();
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.rowColumn}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <TextInput
        style={[styles.input, disabled && styles.disabled]}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Digite aqui"
        placeholderTextColor={colors.onSurfaceVariant}
      />
    </View>
  );
}

function NumberUnitRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.rowColumn}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <View style={styles.addRow}>
        <NumberField value={value.amount} onChange={(amount) => onChange({ ...value, amount })} disabled={disabled} />
        <Chips options={item.units} value={value.unit} onChange={(unit) => onChange({ ...value, unit })} disabled={disabled} />
      </View>
    </View>
  );
}

function SelectRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.rowColumn}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <Chips options={item.options} value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

function ListRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.rowColumn}>
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <ListEditor items={value} onChange={onChange} placeholder="Adicionar item" disabled={disabled} />
    </View>
  );
}

function ToggleListRow({ item, value, onChange, disabled }) {
  const styles = useStyles(createControlStyles);
  return (
    <View>
      <ToggleRow item={item} value={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} disabled={disabled} />
      {value.enabled && (
        <View style={styles.nested}>
          <ListEditor
            items={value.items}
            onChange={(items) => onChange({ ...value, items })}
            placeholder="Nome de usuário"
            disabled={disabled}
          />
        </View>
      )}
    </View>
  );
}

function ActionRow({ item, onAction, busy }) {
  const colors = useColors();
  const styles = useStyles(createControlStyles);
  return (
    <Pressable
      onPress={() => onAction?.(item)}
      disabled={busy}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Texts label={item.label} description={item.description} hint={item.hint} />
      <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

const BODY = {
  toggle: ToggleRow,
  slider: SliderRow,
  number: NumberRow,
  text: TextRow,
  numberUnit: NumberUnitRow,
  select: SelectRow,
  list: ListRow,
  toggleList: ToggleListRow,
};

// "Aplicar a todos": o administrador impõe o valor aos usuários que não são administradores
function PolicyRow({ enforced, onChange }) {
  const styles = useStyles(createControlStyles);
  return (
    <View style={styles.policy}>
      <Text style={styles.policyText}>Aplicar a todos os usuários</Text>
      <SwitchControl value={enforced} onChange={onChange} />
    </View>
  );
}

/**
 * item: entrada do modelo. value/onChange: valor atual (já no formato da tela) e como alterá-lo.
 * locked: o administrador impôs este valor, então o usuário não pode mudar.
 * enforced/onEnforcedChange: só nos padrões de usuário (administrador), liga o "Aplicar a todos".
 */
export default function SettingRow({ item, value, onChange, locked, enforced, onEnforcedChange, onAction }) {
  const styles = useStyles(createControlStyles);
  if (item.kind === "action") return <ActionRow item={item} onAction={onAction} />;

  const Body = BODY[item.kind];
  if (!Body) return null;

  return (
    <View>
      <Body item={item} value={value} onChange={onChange} disabled={locked} />
      {locked && <Text style={styles.lockedText}>Definido pelo administrador: não pode ser alterado.</Text>}
      {item.policy && onEnforcedChange && <PolicyRow enforced={Boolean(enforced)} onChange={onEnforcedChange} />}
    </View>
  );
}
