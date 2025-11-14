import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import SettingsScreen from "@/feature/settings/settings-screen";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/toggle-ai-task-generate";
import { ASSETS } from "@/shared/constants/assets";
import { BottomNavImage } from "@/shared/components/ui/bottom-nav-image";
import StarSparkScreen from "./star-spark";
import { router } from "expo-router";

const routes = [
  {
    key: "calendar",
    title: "Calendar",
  },
  {
    key: "starSpark",
    title: "StarSpark",
  },
  {
    key: "createTask",
    title: "CreateTask",
  },
  {
    key: "settings",
    title: "Setting",
  },
];

const CalendarRoute = () => <CalendarScreen />;
const SettingsRoute = () => <SettingsScreen />;
const StarSparkRoute = () => <StarSparkScreen />;

function getTabIcon(routeKey: string, focused: boolean) {
  switch (routeKey) {
    case "calendar":
      return focused ? (
        <BottomNavImage source={ASSETS.greenHouse} containerClassName="ml-12" />
      ) : (
        <BottomNavImage
          source={ASSETS.dashedHouse}
          imageClassName="w-5 h-5"
          containerClassName="ml-12"
        />
      );
    case "starSpark":
      return focused ? (
        <BottomNavImage source={ASSETS.starIcon} containerClassName="mr-10" />
      ) : (
        <BottomNavImage
          source={ASSETS.dashedStar}
          imageClassName="w-5 h-5"
          containerClassName="mr-10"
        />
      );
    case "createTask":
      return (
        <BottomNavImage
          source={ASSETS.dashedPlus}
          imageClassName="w-5 h-5"
          containerClassName="ml-10"
        />
      );

    case "settings":
      return focused ? (
        <BottomNavImage
          source={ASSETS.settingIcon}
          imageClassName="w-6 h-6"
          containerClassName="mr-12"
        />
      ) : (
        <BottomNavImage
          source={ASSETS.dashedSettings}
          imageClassName="w-5 h-5"
          containerClassName="mr-12"
        />
      );

    default:
      return null;
  }
}

export default function ProtectedIndex() {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const renderScene = BottomNavigation.SceneMap({
    calendar: CalendarRoute,
    settings: SettingsRoute,
    starSpark: StarSparkRoute,
    createTask: () => null,
  });

  const handleIndexChange = (newIndex: number) => {
    const selectedRoute = routes[newIndex];

    if (selectedRoute.key === "createTask") {
      router.push("/task-create");
      return;
    }

    setIndex(newIndex);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F9FA" }} edges={["bottom"]}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={handleIndexChange}
        renderScene={renderScene}
        barStyle={{
          backgroundColor: "#F5F9FA",
          height: 70,
          elevation: 0,
          marginBottom: 10,
        }}
        activeIndicatorStyle={{ backgroundColor: "transparent" }}
        labeled={false}
        renderIcon={({ route, focused }) => getTabIcon(route.key, focused)}
      />

      <View className="absolute left-4 right-4 items-center" style={{ bottom: insets.bottom }}>
        <ToggleAiTaskGenerate />
      </View>
    </SafeAreaView>
  );
}
