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
  const DashedStar = ASSETS.dashedStar;
  const DashedHouse = ASSETS.dashedHouse;
  const DashedPlus = ASSETS.dashedPlus;
  const DashedSettings = ASSETS.dashedSettings;

  switch (routeKey) {
    case "calendar":
      return focused ? (
        <BottomNavImage source={ASSETS.greenHouse} containerClassName="ml-14" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center ml-14">
          <DashedHouse width={20} height={20} />
        </View>
      );
    case "starSpark":
      return focused ? (
        <BottomNavImage source={ASSETS.starSpark} containerClassName="mr-10" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center mr-10">
          <DashedStar width={24} height={24} />
        </View>
      );
    case "createTask":
      return (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center ml-10">
          <DashedPlus width={24} height={24} />
        </View>
      );

    case "settings":
      return focused ? (
        <BottomNavImage
          source={ASSETS.settingIcon}
          imageClassName="w-8 h-8"
          containerClassName="mr-14"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center mr-14">
          <DashedSettings width={27} height={27} />
        </View>
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
          height: 40,
          elevation: 0,
          marginBottom: 40,
        }}
        activeIndicatorStyle={{ backgroundColor: "transparent" }}
        labeled={false}
        renderIcon={({ route, focused }) => getTabIcon(route.key, focused)}
      />

      <View className="absolute left-4 right-4 items-center" style={{ bottom: insets.bottom + 6 }}>
        <ToggleAiTaskGenerate />
      </View>
    </SafeAreaView>
  );
}
