import { Column, Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, height } from "@expo/ui/jetpack-compose/modifiers";
import { useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ShareDialogContent from "./ShareDialogContent";
import { useColors, useTheme, seedColor } from "../lib/theme";

export default function ShareDialog({ visible, item, onClose, onCreate, onCreated }) {
  const colors = useColors();
  const { scheme } = useTheme();
  const sheetRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const close = async () => {
    await sheetRef.current?.hide();
    onClose();
  };

  return (
    <View style={styles.hostAnchor} pointerEvents="box-none">
      <Host matchContents seedColor={seedColor} colorScheme={scheme} style={styles.host}>
        <ModalBottomSheet
          ref={sheetRef}
          onDismissRequest={onClose}
          containerColor={colors.surface}
          contentColor={colors.onSurface}
          showDragHandle
          skipPartiallyExpanded
          sheetGesturesEnabled
          properties={{ shouldDismissOnBackPress: true, shouldDismissOnClickOutside: true }}
        >
          <Column
            modifiers={[
              fillMaxWidth(),
              height(windowHeight),
            ]}
          >
            <RNHostView style={styles.rnHost}>
              <ShareDialogContent
                item={item}
                bottomInset={insets.bottom + 12}
                onClose={close}
                onCreate={onCreate}
                onCreated={onCreated}
              />
            </RNHostView>
          </Column>
        </ModalBottomSheet>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  hostAnchor: { position: "absolute", right: 16, bottom: 16 },
  host: { width: 56, height: 56, backgroundColor: "transparent" },
  // The sheet is presented in a separate Compose window. Keep the RN shadow
  // node aligned to that window so Pressable's measure-based hit testing uses
  // the same coordinates as the content drawn by Compose.
  rnHost: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
});
