// app/index.tsx
import AIScreen from "@/src/feature/ai/ai-screen";
import HomeScreen from "@/src/feature/home/home-screen";
import NotificationsScreen from "@/src/feature/notification/notification-screen";
import ProfileScreen from "@/src/feature/profile/profile-screen";
import { useState } from "react";
import { BottomNavigation } from "react-native-paper";

const routes = [
  { key: "home", title: "Home", focusedIcon: "home", unfocusedIcon: "home-outline" },
  { key: "ai", title: "AI Tasks", focusedIcon: "robot", unfocusedIcon: "robot-outline" },
  { key: "notifications", title: "Settings", focusedIcon: "bell", unfocusedIcon: "bell-outline" },
  { key: "profile", title: "Profile", focusedIcon: "account", unfocusedIcon: "account-outline" },
];

const renderScene = BottomNavigation.SceneMap({
  home: HomeScreen,
  ai: AIScreen,
  notifications: NotificationsScreen,
  profile: ProfileScreen,
});

export default function Index() {
  const [index, setIndex] = useState(0);

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}
