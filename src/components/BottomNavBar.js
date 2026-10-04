// src/components/BottomNavBar.js
import {
  Host,
  Icon,
  NavigationBar,
  NavigationBarItem,
  Text,
} from "@expo/ui/jetpack-compose";
import Home from "@expo/material-symbols/home.xml";
import Folder from "@expo/material-symbols/folder.xml";
import Star from "@expo/material-symbols/star.xml";
import Share from "@expo/material-symbols/public.xml";
import { useColors, useTheme, seedColor } from "../lib/theme";

// a chave é o nome do arquivo da rota em src/app/(tabs)/
const ICONS = {
  inicio: Home,
  arquivos: Folder,
  star: Star,
  compartilhado: Share,
};

export default function BottomNavBar({ state, descriptors, navigation }) {
  const colors = useColors();
  const { scheme } = useTheme();
  const itemColors = {
    selectedIndicatorColor: colors.primaryContainer,
    selectedIconColor: colors.onPrimaryContainer,
    selectedTextColor: colors.onSurface,
    unselectedIconColor: colors.onSurfaceVariant,
    unselectedTextColor: colors.onSurfaceVariant,
  };

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }} seedColor={seedColor} colorScheme={scheme}>
      <NavigationBar containerColor={colors.surface}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const title = descriptors[route.key].options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <NavigationBarItem
              key={route.key}
              selected={focused}
              onClick={onPress}
              colors={itemColors}
            >
              <NavigationBarItem.Icon>
                <Icon source={ICONS[route.name]} />
              </NavigationBarItem.Icon>
              <NavigationBarItem.Label>
                <Text style={{ fontSize: 13}}>{title}</Text>
              </NavigationBarItem.Label>
            </NavigationBarItem>
          );
        })}
      </NavigationBar>
    </Host>
  );
}
