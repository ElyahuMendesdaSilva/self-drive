import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthImage from "./AuthImage";
import ThemeSelector from "./ThemeSelector";
import { getDiskUsage, uploadCurrentUserAvatar } from "../lib/api";
import { formatSize } from "../lib/format";
import { useSession } from "../lib/session";
import { useColors, useStyles } from "../lib/theme";
import {
  getCachedCurrentUser,
  refreshCurrentUserAvatar,
} from "../hooks/useCurrentUserAvatar";

function Action({ icon, label, onPress, danger = false }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={danger ? colors.error : colors.onSurfaceVariant}
      />
      <Text style={[styles.actionLabel, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

function AvatarFallback() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.avatarFallback}>
      <Ionicons
        name="person-circle-outline"
        size={42}
        color={colors.onSurfaceVariant}
      />
    </View>
  );
}

const REPOSITORY_URL = "https://github.com/ElyahuMendesdaSilva/self-drive";
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

export default function AccountModal({ visible, onClose, avatar }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { username, host, token, signOut } = useSession();
  const { height } = useWindowDimensions();
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);
  const [serverStatus, setServerStatus] = useState("Verificando…");
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    setServerStatus("Verificando…");
    const userKey = `${host}|${username}|${token}`;
    Promise.allSettled([getCachedCurrentUser(userKey), getDiskUsage()]).then(
      ([userResult, usageResult]) => {
        if (!active) return;
        if (userResult.status === "fulfilled") setUser(userResult.value);
        if (usageResult.status === "fulfilled") {
          setUsage(usageResult.value);
          setServerStatus("Online");
        } else {
          setServerStatus("Indisponível");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [visible, host, username, token]);

  const percent = usage?.total
    ? Math.min(100, (usage.used / usage.total) * 100)
    : 0;
  const email = user?.email || user?.mail || user?.emailAddress;
  const displayName = user?.name || user?.displayName || username || "Usuário";
  const appVersion = Constants.expoConfig?.version || "—";
  const go = (path) => {
    onClose();
    router.navigate(path);
  };
  const logout = async () => {
    onClose();
    await signOut();
  };
  const openExternal = (url) => {
    onClose();
    Linking.openURL(url).catch(() =>
      Alert.alert("Não foi possível abrir o link", "Tente novamente mais tarde."),
    );
  };
  const changeAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso às fotos para escolher uma imagem de perfil.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const image = result.assets[0];
      await uploadCurrentUserAvatar(image.uri, image.fileName, image.mimeType);
      refreshCurrentUserAvatar();
      Alert.alert("Foto atualizada", "Sua foto de perfil foi alterada.");
    } catch (error) {
      Alert.alert(
        "Não foi possível atualizar a foto",
        error.message || "Tente novamente.",
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Fechar perfil"
        />
        <View
          style={[
            styles.card,
            { maxHeight: height - insets.top - insets.bottom - 32 },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.profile}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarWrap}>
                  {avatar ? (
                    <AuthImage
                      source={avatar}
                      version={avatar.uri}
                      style={styles.avatar}
                      fallback={<AvatarFallback />}
                    />
                  ) : (
                    <AvatarFallback />
                  )}
                </View>
                <Pressable
                  onPress={changeAvatar}
                  disabled={avatarBusy}
                  style={({ pressed }) => [
                    styles.avatarEdit,
                    pressed && !avatarBusy && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar foto de perfil"
                >
                  {avatarBusy ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.onPrimaryContainer}
                    />
                  ) : (
                    <Ionicons
                      name="pencil"
                      size={14}
                      color={colors.onPrimaryContainer}
                    />
                  )}
                </Pressable>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
                {!!email && (
                  <Text style={styles.email} numberOfLines={1}>
                    {email}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Armazenamento do servidor</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.storageText}>
                {!usage
                  ? "Carregando armazenamento…"
                  : `${formatSize(usage.used)} de ${formatSize(usage.total)} usados`}
              </Text>
            </View>

            <View style={styles.info}>
              <InfoRow label="Versão do aplicativo" value={appVersion} />
              <InfoRow label="Status do servidor" value={serverStatus} />
              <InfoRow label="Endereço" value={host || "—"} last />
            </View>

            <ThemeSelector />

            <View style={styles.actions}>
              <Action
                icon="reader-outline"
                label="Registros"
                onPress={() => go("/registros")}
              />
              <Action
                icon="settings-outline"
                label="Configurações"
                onPress={() => go("/configuracoes")}
              />
              <Action
                icon="log-out-outline"
                label="Sair"
                onPress={logout}
                danger
              />
            </View>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="link"
                onPress={() => openExternal(REPOSITORY_URL)}
                hitSlop={8}
              >
                <Text style={styles.footerText}>GitHub</Text>
              </Pressable>
              <Text style={styles.footerDot}>•</Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => openExternal(LICENSE_URL)}
                hitSlop={8}
              >
                <Text style={styles.footerText}>Licenças</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, last }) {
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    card: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 24,
      overflow: "hidden",
      elevation: 16,
    },
    content: { paddingBottom: 12 },
    topSpacer: { width: 24 },
    profile: {
      minHeight: 88,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 14,
      borderBottomColor: colors.outlineVariant,
      borderBottomWidth: 1,
    },
    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarContainer: {
      width: 60,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarEdit: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 25,
      height: 25,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryContainer,
      borderWidth: 2,
      borderColor: colors.surfaceContainer,
      elevation: 3,
    },
    avatarFallback: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    profileText: { flex: 1, minWidth: 0 },
    name: { color: colors.primary, fontSize: 18, fontWeight: "500" },
    email: { color: colors.onSurfaceVariant, fontSize: 13, marginTop: 3 },
    section: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomColor: colors.outlineVariant,
      borderBottomWidth: 1,
      marginBottom: 15,
    },
    sectionTitle: {
      color: colors.onSurface,
      fontSize: 15,
      fontWeight: "500",
      marginBottom: 12,
    },
    barTrack: {
      height: 10,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.surfaceContainerHighest,
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    storageText: {
      color: colors.onSurfaceVariant,
      fontSize: 13,
      marginTop: 10,
    },
    info: {
      marginHorizontal: 16,
      marginTop: 3,
      paddingHorizontal: 4,
      backgroundColor: colors.surface,
      borderRadius: 14,
    },
    infoRow: {
      minHeight: 39,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 10,
    },
    infoRowLast: { borderBottomWidth: 0 },
    infoLabel: { color: colors.onSurface, fontSize: 13, flexShrink: 0 },
    infoValue: {
      color: colors.onSurfaceVariant,
      fontSize: 12,
      flex: 1,
      textAlign: "right",
    },
    actions: {
      paddingHorizontal: 16,
      paddingTop: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "flex-start",
    },
    action: {
      width: "100%",
      height: 52,
      borderRadius: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    actionLabel: { color: colors.onSurface, fontSize: 15 },
    pressed: { backgroundColor: colors.pressed },
    danger: { color: colors.error },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 9,
      marginBottom: 5,
    },
    footerText: { color: colors.onSurfaceVariant, fontSize: 12 },
    footerDot: { color: colors.onSurfaceVariant, fontSize: 12 },
  });
