import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ShareDialogContent from "./ShareDialogContent";
import { useStyles } from "../lib/theme";

export default function ShareDialog({
  visible,
  item,
  onClose,
  onCreate,
  onCreated,
}) {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const close = () => {
    onClose();
    return new Promise((resolve) => setTimeout(resolve, 280));
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Fechar compartilhamento"
        />
          <View style={[styles.sheet, { height }]}>
          <View style={styles.grab} />
          <ShareDialogContent
            item={item}
            bottomInset={insets.bottom + 12}
            busy={busy}
            onClose={close}
            onCreated={onCreated}
            onCreate={async (options) => {
              setBusy(true);
              try {
                return await onCreate(options);
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.scrim,
  },
  sheet: {
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  grab: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: colors.outlineVariant,
  },
});
