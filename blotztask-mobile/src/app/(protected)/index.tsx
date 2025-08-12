import { useState, useMemo } from "react";
import { BottomNavigation } from "react-native-paper";
import { View } from "react-native";
import CalendarPage from "@/feature/task/calendars/calendar-screen";
import SettingsScreen from "@/feature/settings/page/settings-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

const EmptyScreen = () => <View style={{ flex: 1 }} />;

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
        return <EmptyScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <EmptyScreen />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <BottomNavigation
          navigationState={{ index, routes }}
          onIndexChange={handleIndexChange}
          renderScene={renderScene}
        />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
