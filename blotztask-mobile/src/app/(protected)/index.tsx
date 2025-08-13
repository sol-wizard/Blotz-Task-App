import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarPage from "@/feature/task/calendars/calendar-screen";
import SettingsScreen from "@/feature/settings/page/settings-screen";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar",
    unfocusedIcon: "calendar-outline",
  },
  {
    key: "settings",
    title: "Setting",
    focusedIcon: "bell",
    unfocusedIcon: "bell-outline",
  },
];

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);

  const CalendarRoute = () => <CalendarPage />;

  const SettingsRoute = () => <SettingsScreen />;

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    settings: SettingsRoute,
  });

  return (
    <BottomSheetModalProvider>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
      />
    </BottomSheetModalProvider>
  );
}
