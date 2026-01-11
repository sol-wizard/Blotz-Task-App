import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, View, Image, useWindowDimensions } from "react-native";
import Svg, { Defs, Mask, Rect, Circle } from "react-native-svg";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import { ASSETS } from "@/shared/constants/assets";
import { BottomNavImage } from "@/shared/components/ui/bottom-nav-image";
import StarSparkScreen from "./star-spark";
import { router } from "expo-router";
import { theme } from "@/shared/constants/theme";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import SettingsScreen from "./settings";
import { useTrackActiveUser5s } from "@/feature/auth/analytics/useTrackActiveUser5s";
import { usePostHog } from "posthog-react-native";
import { OnboardingCard } from "@/shared/components/ui/onboarding-card";
import { useAiOnboardingStatus } from "@/feature/ai-task-generate/hooks/useAiOnboardingStatus";

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
  const posthog = usePostHog();
  const { width, height } = useWindowDimensions();

  const { isUserOnboardedAi } = useAiOnboardingStatus();
  const [aiLayout, setAiLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const aiButtonRadius = 29;

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

  useTrackActiveUser5s(posthog);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={handleIndexChange}
        renderScene={renderScene}
        barStyle={{
          backgroundColor: theme.colors.background,
          height: 40,
          elevation: 0,
          marginBottom: 40,
        }}
        activeIndicatorStyle={{ backgroundColor: "transparent" }}
        labeled={false}
        renderIcon={({ route, focused }) => getTabIcon(route.key, focused)}
      />

      {!isUserOnboardedAi && (
        <View
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 }}
          pointerEvents="box-none"
        >
          <Pressable
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            onPress={() => {}}
            android_disableSound
            accessible={false}
          />
          <Svg
            width={width}
            height={height}
            pointerEvents="none"
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <Defs>
              <Mask id="ai-spotlight-mask" maskUnits="userSpaceOnUse">
                <Rect width={width} height={height} fill="white" />
                <Circle
                  cx={aiLayout ? aiLayout.x + aiLayout.width / 2 : width / 2}
                  cy={aiLayout ? aiLayout.y + aiLayout.height / 2 : height}
                  r={aiButtonRadius}
                  fill="black"
                />
              </Mask>
            </Defs>
            <Rect
              width={width}
              height={height}
              fill="rgba(0,0,0,0.35)"
              mask="url(#ai-spotlight-mask)"
            />
          </Svg>
        </View>
      )}

      {!isUserOnboardedAi && (
        <OnboardingCard
          title="Tap to begin✨"
          subtitle="Let AI set up your task"
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: insets.bottom + 90,
            zIndex: 10,
          }}
        />
      )}

      <View
        className="absolute left-4 right-4 items-center"
        style={{ bottom: insets.bottom + 6, zIndex: 20 }}
        pointerEvents="box-none"
        onLayout={(e) => setAiLayout(e.nativeEvent.layout)}
      >
        <Pressable onPress={() => router.push("/ai-task-sheet")}>
          <GradientCircle size={58}>
            <Image
              source={ASSETS.whiteBun}
              resizeMode="contain"
              style={[{ width: 28, height: 28, position: "absolute" }]}
            />
          </GradientCircle>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
