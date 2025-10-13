import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import SettingsScreen from "@/feature/settings/settings-screen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import TaskCreateScreen from "./task-create";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar-text",
    unfocusedIcon: "calendar-blank",
  },
  {
    key: "taskcreate",
    title: "Task Create",
    focusedIcon: "plus",
    unfocusedIcon: "plus",
  },
  {
    key: "settings",
    title: "Setting",
    focusedIcon: "bell",
    unfocusedIcon: "bell-outline",
  },
];

const CalendarRoute: any = () => <CalendarScreen />;
const SettingsRoute = () => <SettingsScreen />;
const TaskCreateRoute = () => <TaskCreateScreen />;

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    taskcreate: TaskCreateRoute,
    settings: SettingsRoute,
  });

  return (
    <>
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
    </>
  );
}
