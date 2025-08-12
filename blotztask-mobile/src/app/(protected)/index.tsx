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

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);
  const [isTaskCreationBottomSheetVisible, setTaskCreationBottomSheetVisible] =
    useState(false);

  const calendarIndex = routes.findIndex((r) => r.key === "calendar");

  const handleIndexChange = (newIndex: number) => {
    const selected = routes[newIndex];
    if (selected.key === "create") {
      setIndex(calendarIndex);
      setTaskCreationBottomSheetVisible(true);
      console.log("Create task button pressed");
      return;
    }
    setIndex(newIndex);
  };

  const renderScene = ({ route }: { route: (typeof routes)[number] }) => {
    switch (route.key) {
      case "calendar":
        return (
          <CalendarPage
            isTaskCreationBottomSheetVisible={isTaskCreationBottomSheetVisible}
            onRequestCloseTaskCreationBottomSheet={() =>
              setTaskCreationBottomSheetVisible(false)
            }
          />
        );
      case "create":
        return (
          <CalendarPage
            isTaskCreationBottomSheetVisible={isTaskCreationBottomSheetVisible}
            onRequestCloseTaskCreationBottomSheet={() =>
              setTaskCreationBottomSheetVisible(true)
            }
          />
        );
      case "settings":
        return <SettingsScreen />;
      default:
        return (
          <CalendarPage
            isTaskCreationBottomSheetVisible={isTaskCreationBottomSheetVisible}
            onRequestCloseTaskCreationBottomSheet={() =>
              setTaskCreationBottomSheetVisible(false)
            }
          />
        );
    }
  };

  return (
    <BottomSheetModalProvider>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={handleIndexChange}
        renderScene={renderScene}
      />
    </BottomSheetModalProvider>
  );
}
