import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import { View } from "react-native";
import CalendarPage from "../../feature/task/calendars/calendar-screen";
import SettingsScreen from "../../feature/settings/page/settings-screen";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar",
    unfocusedIcon: "calendar-outline",
  },
  {
    key: "create",
    title: "Create",
    focusedIcon: "pencil",
    unfocusedIcon: "pencil-outline",
  },
  {
    key: "settings",
    title: "Setting",
    focusedIcon: "bell",
    unfocusedIcon: "bell-outline",
  },
];

const EmptyScreen = () => <View style={{ flex: 1 }} />;

const renderScene = BottomNavigation.SceneMap({
  calendar: CalendarPage,
  create: EmptyScreen,
  settings: SettingsScreen,
});

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);

  const handleIndexChange = (newIndex: number) => {
    const selectedRoute = routes[newIndex];
    
    // If create button is clicked, do nothing
    if (selectedRoute.key === "create") {
      return; // Don't change the tab index
    }
    
    // Otherwise, change tabs normally
    setIndex(newIndex);
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={handleIndexChange}
      renderScene={renderScene}
    />
  );
}