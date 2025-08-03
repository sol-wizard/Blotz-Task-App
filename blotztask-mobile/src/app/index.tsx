import AIScreen from "@/feature/ai/page/ai-screen";
import CalendarPage from "@/feature/calendars/calendar-screen";
import SettingsScreen from "@/feature/settings/page/settings-screen";

import { useState } from "react";
import { BottomNavigation } from "react-native-paper";

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

export default function Index() {
  // const { isLoading, isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);

  // // Authentication check - redirects to login if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.replace("/login");
  //   }
  // }, [isLoading, isAuthenticated]);

  // // Show loading spinner while checking authentication
  // if (isLoading) {
  //   return (
  //     <View className="flex-1 justify-center items-center">
  //       <ActivityIndicator size="large" />
  //       <Text variant="bodyMedium" style={{ marginTop: 16 }}>
  //         Loading...
  //       </Text>
  //     </View>
  //   );
  // }

  // // Don't render anything if not authenticated (while redirecting)
  // if (!isAuthenticated) {
  //   return null;
  // }

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}
