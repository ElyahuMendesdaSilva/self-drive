import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";

import DrawerContent from "../../components/DrawerContent";
import { useSession } from "../../lib/session";
import { useColors } from "../../lib/theme";

export default function DrawerLayout() {
  const colors = useColors();
  const { signedIn } = useSession();
  // sem sessão (logout ou token expirado) → volta para o login
  if (!signedIn) return <Redirect href="/" />;

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        drawerStyle: { backgroundColor: colors.surface, width: 320 },
        overlayColor: colors.scrim,
      }}
    >
      <Drawer.Screen name="(tabs)" />
      <Drawer.Screen name="estatisticas" options={{ title: "Estatísticas", headerShown: false }} />
      <Drawer.Screen name="registros" options={{ title: "Registros", headerShown: false }} />
    </Drawer>
  );
}
