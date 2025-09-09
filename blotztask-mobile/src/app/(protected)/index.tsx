import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarPage from "@/feature/task/ui/components/calendar-screen";
import SettingsScreen from "@/feature/settings/page/settings-screen";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CreateTaskBottomSheet } from "@/feature/task/ui/components/create-task-bottom-sheet";

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
  const insets = useSafeAreaInsets();
  const [isTaskCreationSheetVisible, setIsTaskCreationSheetVisible] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const CalendarRoute: any = () => <CalendarPage refreshFlag={refreshFlag} />;

  const SettingsRoute = () => <SettingsScreen />;

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    settings: SettingsRoute,
  });

  return (
    <>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
      />

      <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom + 20 }}>
        <Pressable
          onPress={() => setIsTaskCreationSheetVisible(true)}
          className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center"
          android_ripple={{ color: "#e5e7eb", borderless: true }}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#6B7280" />
        </Pressable>
      </View>
      {isTaskCreationSheetVisible && (
        <CreateTaskBottomSheet
          isVisible={isTaskCreationSheetVisible}
          onClose={setIsTaskCreationSheetVisible}
          refreshCalendarPage={() => setRefreshFlag((flag) => !flag)}
        ></CreateTaskBottomSheet>
      )}
    </>
  );
}
