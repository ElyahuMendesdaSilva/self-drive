// src/components/DriveHeader.js
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthImage from "./AuthImage";
import { useColors, useStyles } from "../lib/theme";
import useCurrentUserAvatar from "../hooks/useCurrentUserAvatar";
import AccountModal from "./AccountModal";
import { useState } from "react";

export default function Header() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // é a mesma ação que DrawerActions.toggleDrawer() gera;
  // ela sobe pelos navegadores até chegar no Drawer
  const toggleDrawer = () => navigation.dispatch({ type: "TOGGLE_DRAWER" });

  const avatar = useCurrentUserAvatar();
  const [accountVisible, setAccountVisible] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={toggleDrawer} hitSlop={10}>
        <Ionicons name="menu" size={24} color={colors.onSurfaceVariant} />
      </Pressable>
      <Pressable style={styles.pill} onPress={() => router.push("/busca")}>
        <Text style={styles.placeholder} numberOfLines={1}>
          Pesquisar no Self-Drive
        </Text>
      </Pressable>

      <Pressable style={styles.avatar} hitSlop={8} onPress={() => setAccountVisible(true)} accessibilityRole="button" accessibilityLabel="Abrir perfil">
        {avatar ? (
          <AuthImage
            source={avatar}
            version={avatar.uri} // a URL já traz &v=<hash>: trocou a foto, baixa de novo
            style={styles.avatarImage}
            fallback={
              <Ionicons
                name="person-circle-outline"
                size={36}
                color={colors.onSurfaceVariant}
              />
            }
          />
        ) : (
          <Ionicons
            name="person-circle-outline"
            size={36}
            color={colors.onSurfaceVariant}
          />
        )}
      </Pressable>
      <AccountModal visible={accountVisible} onClose={() => setAccountVisible(false)} avatar={avatar} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 100,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 16,
    gap: 12,
  },
  placeholder: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 16,
  },
  avatar: {
    flexShrink: 0,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
