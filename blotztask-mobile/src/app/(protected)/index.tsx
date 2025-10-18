import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import SettingsScreen from "@/feature/settings/settings-screen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import IdeasScreen from "./ideas";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar-text",
    unfocusedIcon: "calendar-blank",
  },
  {
    key: "ideas",
    title: "Ideas",
    focusedIcon: "lightning-bolt",
    unfocusedIcon: "lightning-bolt-outline",
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
const IdeasRoute = () => <IdeasScreen />;

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    ideas: IdeasRoute,
    settings: SettingsRoute,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{ backgroundColor: "#F2F2F2", height: 90 }}
        activeIndicatorStyle={{ backgroundColor: "transparent" }}
        renderIcon={({ route, focused, color }) => (
          <MaterialCommunityIcons
            name={(focused ? route.focusedIcon : route.unfocusedIcon) as any}
            size={24}
            color={color}
          />
        )}
      />
    </SafeAreaView>
  );
}
