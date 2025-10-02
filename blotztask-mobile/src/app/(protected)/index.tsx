import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import SettingsScreen from "@/feature/settings/settings-screen";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
    focusedIcon: "calendar-text",
    unfocusedIcon: "calendar-blank",
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

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

      <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom }}>
        <Pressable
          onPress={() => router.push("/(protected)/task-create")}
          className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center"
          android_ripple={{ color: "#e5e7eb", borderless: true }}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#6B7280" />
        </Pressable>
      </View>
    </>
  );
}
