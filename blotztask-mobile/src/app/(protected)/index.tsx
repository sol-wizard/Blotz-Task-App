import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import SettingsScreen from "@/feature/settings/settings-screen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/toggle-ai-task-generate";
import { View } from "react-native";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar-text",
    unfocusedIcon: "calendar-blank",
  },

  {
    key: "settings",
    title: "Setting",
    focusedIcon: "bell",
    unfocusedIcon: "bell-outline",
  },
];

const CalendarRoute = () => <CalendarScreen />;
const SettingsRoute = () => <SettingsScreen />;

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    settings: SettingsRoute,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{ backgroundColor: "#F2F2F2", height: 68 }}
        activeIndicatorStyle={{ backgroundColor: "transparent" }}
        renderIcon={({ route, focused, color }) => (
          <MaterialCommunityIcons
            name={(focused ? route.focusedIcon : route.unfocusedIcon) as any}
            size={24}
            color={color}
          />
        )}
      />
      <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom }}>
        <ToggleAiTaskGenerate />
      </View>
    </SafeAreaView>
  );
}
