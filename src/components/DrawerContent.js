// src/components/DrawerContent.js
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import logo from "../../assets/logo.png";
import { getDiskUsage } from "../lib/api";
import { formatSize } from "../lib/format";
import { useSession } from "../lib/session";
import { useColors, useStyles } from "../lib/theme";

const ITEMS = [
  { label: "Recentes", icon: "time-outline", href: "/inicio" },
  { label: "Estatísticas", icon: "analytics-outline", href: "/estatisticas" },
  { label: "Lixeira", icon: "trash-outline", href: "/lixeira" },
  { label: "Off-line", icon: "cloud-offline-outline", href: "/arquivos" },
{ label: "Configurações", icon: "settings-outline", href: "/configuracoes" },
];

function Item({ icon, label, active, onPress }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && !active && styles.itemPressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function DrawerContent({ navigation, state }) {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { username, signOut } = useSession();
  const [usage, setUsage] = useState(null);
  const open = Boolean(state?.history?.some((entry) => entry.type === "drawer"));

  // atualiza o uso de armazenamento sempre que o menu abre
  useEffect(() => {
    if (!open) return;
    let active = true;
    getDiskUsage()
      .then((value) => active && setUsage(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  const go = (href) => {
    navigation.closeDrawer();
    router.navigate(href);
  };

  const logout = () => {
    navigation.closeDrawer();
    signOut(); // o guard do (drawer) devolve para o login
  };

  const percent = usage?.total ? Math.min(100, Math.round((usage.used / usage.total) * 100)) : 0;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* cabeçalho */}
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.title}>Self-Drive</Text>
          {!!username && <Text style={styles.username}>{username}</Text>}
        </View>
      </View>

      <View style={styles.divider} />

      {/* itens */}
      <ScrollView showsVerticalScrollIndicator={false} style={{paddingHorizontal:10}}>
        {ITEMS.map((item) => (
          <Item
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            onPress={() => go(item.href)}
          />
        ))}
      </ScrollView>

      {/* rodapé: armazenamento vindo da API */}
      <View style={styles.storage}>
        <Text style={styles.storageTitle}>Armazenamento</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.storageText}>
          {usage
            ? usage.total
              ? `${formatSize(usage.used)} de ${formatSize(usage.total)} usados`
              : `${formatSize(usage.used)} usados`
            : "Calculando…"}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface},
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
  },
  logo: { width: 36, height: 36 },
  title: { color: colors.onSurface, fontSize: 22 },
  username: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 100,
  },
  itemPressed: { backgroundColor: colors.pressed },
  label: { color: colors.onSurfaceVariant, fontSize: 14, fontWeight: "500" },
  labelActive: { color: colors.onPrimaryContainer },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 12,
  },
  storage: { paddingHorizontal: 16, paddingTop: 12 },
  storageTitle: { color: colors.onSurface, fontSize: 14, marginBottom: 8 },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
    overflow: "hidden",
  },
  barFill: { height: 6, backgroundColor: colors.primary },
  storageText: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 8 },
});
