import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { forwardRef, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import LoadingSpinner from "../components/LoadingSpinner";
import { Redirect } from "expo-router";
import { useColors, useStyles } from "../lib/theme";

import SettingsLoginDialog from "../components/SettingsLoginDialog";
import { useSession } from "../lib/session";


const Field = forwardRef(function Field(
  {
    label,
    icon,
    value,
    onChangeText,
    secureTextEntry,
    returnKeyType,
    onSubmitEditing,
  },
  ref,
) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const floating = focused || Boolean(value);

  return (
    <View style={styles.fieldWrapper}>
      <View
        style={[
          styles.field,
          focused && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={focused ? colors.primary : colors.onSurfaceVariant}
          style={{ marginRight: 12 }}
        />
        <TextInput
          ref={ref}
          style={[
            styles.input,
            Platform.OS === "web" && { outlineStyle: "none" },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={floating ? "" : label}
          placeholderTextColor={colors.onSurfaceVariant}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType === "done"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {floating && (
        <Text style={[styles.label, focused && { color: colors.primary }]}>
          {label}
        </Text>
      )}
    </View>
  );
});

export default function LoginPage() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { signedIn, host, signIn, changeHost } = useSession();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // sessão salva (ou login recém-feito) → entra direto no app
  if (signedIn) return <Redirect href="/inicio" />;

  const handleLogin = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signIn(user, password);
      setPassword("");
    } catch (loginError) {
      setError(loginError?.message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.settings}
          hitSlop={12}
          onPress={() => setSettingsOpen(true)}
        >
          <Feather name="settings" size={23} color={colors.onSurfaceVariant} />
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.title}>Self-Drive</Text>
          <Text style={styles.subtitle}>
            Faça login para acessar seus arquivos
          </Text>

          <Field
            label="Usuário"
            icon="person-outline"
            value={user}
            onChangeText={setUser}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            ref={passwordRef}
            label="Senha"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.hostInfo} numberOfLines={1}>
            Servidor: {host}
          </Text>

          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                (pressed || busy) && { opacity: 0.85 },
              ]}
              onPress={handleLogin}
            >
              {busy ? (
                <LoadingSpinner size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <SettingsLoginDialog
        visible={settingsOpen}
        initialHost={host}
        onClose={() => setSettingsOpen(false)}
        onSave={changeHost}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  settings: {
    position: "absolute",
    right: 20,
    top: 40,
  },
  card: {
    width: "90%",
    maxWidth: 450,
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  title: {
    color: colors.onSurface,
    fontSize: 24,
    marginTop: 12,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 32,
  },
  fieldWrapper: {
    width: "100%",
    marginBottom: 20,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 56,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 16,
    height: "100%",
  },
  label: {
    position: "absolute",
    top: -9,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    width: "100%",
    color: colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  hostInfo: {
    width: "100%",
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginBottom: 16,
  },
});
