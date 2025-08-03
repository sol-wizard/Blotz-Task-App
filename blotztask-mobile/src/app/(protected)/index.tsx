import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarPage from "@/feature/calendars/calendar-screen";
import AIScreen from "@/feature/ai/page/ai-screen";
import SettingsScreen from "@/feature/settings/page/settings-screen";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar",
    unfocusedIcon: "calendar-outline",
  },
  {
    key: "ai",
    title: "AI Tasks",
    focusedIcon: "robot",
    unfocusedIcon: "robot-outline",
  },
  {
    key: "settings",
    title: "Settings",
    focusedIcon: "bell",
    unfocusedIcon: "bell-outline",
  },
];

const renderScene = BottomNavigation.SceneMap({
  calendar: CalendarPage,
  ai: AIScreen,
  settings: SettingsScreen,
});

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}