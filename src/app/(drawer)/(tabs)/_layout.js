// src/app/(tabs)/_layout.js
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import BottomNavBar from "../../../components/BottomNavBar";
import Header from "../../../components/Header";
import { useColors } from "../../../lib/theme";

const tab = (name, title, icon) => (
  <Tabs.Screen
    name={name}
    options={{
      title,
      tabBarIcon: ({ color, focused }) => (
        <Ionicons
          name={focused ? icon : `${icon}-outline`}
          size={24}
          color={color}
        />
      ),
    }}
  />
);
export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={
        Platform.OS === "android"
          ? (props) => <BottomNavBar {...props} />
          : undefined
      }
      screenOptions={{
        headerShown: true,
        sceneStyle: { backgroundColor: colors.background },
        header: () => <Header/>,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      {tab("inicio", "Início", "home")}
      {tab("star", "Com estrela", "star")}
      {tab("compartilhado", "Compartilhado", "share")}
      {tab("arquivos", "Arquivos", "folder")}
    </Tabs>
  );
}
