import {
  Column,
  FloatingActionButton,
  Host,
  Icon,
  ModalBottomSheet,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import Ionicons from "@expo/vector-icons/Ionicons";
import Add from "@expo/material-symbols/add.xml";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text as RNText, View } from "react-native";
import { useColors, useStyles, useTheme, seedColor } from "../lib/theme";

function Option({ icon, label, onPress }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={colors.onSurfaceVariant} />
      <RNText style={styles.label}>{label}</RNText>
    </Pressable>
  );
}

export default function NewMenuButton({ onNewFolder, onUpload, onUploadFolder }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { scheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef(null);

  // o Compose só existe no Android
  if (Platform.OS !== "android") return null;

  // Fecha a sheet com animação e só depois executa a ação escolhida.
  const closeAndRun = async (action) => {
    await sheetRef.current?.hide();
    setVisible(false);
    action?.();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Host matchContents seedColor={seedColor} colorScheme={scheme}>
        <FloatingActionButton
          containerColor={colors.primaryContainer}
          onClick={() => setVisible(true)}
        >
          <FloatingActionButton.Icon>
            <Icon source={Add} contentDescription="Novo" />
          </FloatingActionButton.Icon>
        </FloatingActionButton>

        {visible && (
          <ModalBottomSheet
            ref={sheetRef}
            onDismissRequest={() => setVisible(false)}
            containerColor={colors.surface}
            contentColor={colors.onSurface}
          >
            <Column modifiers={[paddingAll(16)]}>
              <RNHostView>
                <View>
                  <Option
                    icon="folder-outline"
                    label="Pasta"
                    onPress={() => closeAndRun(onNewFolder)}
                  />
                  <Option
                    icon="cloud-upload-outline"
                    label="Fazer upload"
                    onPress={() => closeAndRun(onUpload)}
                  />
                  <Option
                    icon="folder-open-outline"
                    label="Enviar pasta"
                    onPress={() => closeAndRun(onUploadFolder)}
                  />
                </View>
              </RNHostView>
            </Column>
          </ModalBottomSheet>
        )}
      </Host>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    bottom: 16, // distância acima da bottom bar
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  label: {
    color: colors.onSurface,
    fontSize: 16,
  },
});
