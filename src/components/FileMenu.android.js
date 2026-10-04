import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Column,
  Host,
  ModalBottomSheet,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { height, paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import { useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useColors, useStyles, useTheme, seedColor } from "../lib/theme";

// actions: [{ icon, label, onPress, danger? }]
export default function FileMenu({
  visible,
  title,
  icon = "document-text",
  iconColor,
  actions = [],
  onClose,
}) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { scheme } = useTheme();
  const sheetRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(windowHeight * 0.82, 680);

  if (!visible) return null;

  const runAction = async (action) => {
    await sheetRef.current?.hide();
    onClose();
    action.onPress?.();
  };

  return (
    <View style={styles.hostAnchor} pointerEvents="box-none">
      <Host
        matchContents
        seedColor={seedColor}
        colorScheme={scheme}
        style={styles.host}
      >
        <ModalBottomSheet
          ref={sheetRef}
          onDismissRequest={onClose}
          containerColor={colors.surface}
          contentColor={colors.onSurface}
          showDragHandle
          sheetGesturesEnabled
          properties={{
            shouldDismissOnBackPress: true,
            shouldDismissOnClickOutside: true,
          }}
        >
          <Column modifiers={[paddingAll(16), height(sheetHeight)]}>
            <RNHostView>
              <View style={styles.sheet}>
                <View style={styles.header}>
                  <Ionicons name={icon} size={24} color={iconColor ?? colors.primary} />
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <View style={styles.divider} />
                <ScrollView bounces={false} nestedScrollEnabled>
                  {actions.map((action) => (
                    <Pressable
                      key={action.label}
                      style={({ pressed }) => [
                        styles.option,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => runAction(action)}
                    >
                      <Ionicons
                        name={action.icon}
                        size={22}
                        color={
                          action.danger ? colors.error : colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[styles.label, action.danger && styles.danger]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </RNHostView>
          </Column>
        </ModalBottomSheet>
      </Host>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  hostAnchor: { position: "absolute", right: 16, bottom: 16 },
  host: { width: 56, height: 56, backgroundColor: "transparent" },
  sheet: { flex: 1, paddingBottom: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { flex: 1, color: colors.onSurface, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  pressed: { backgroundColor: colors.pressed },
  label: { color: colors.onSurface, fontSize: 16 },
  danger: { color: colors.error },
});
