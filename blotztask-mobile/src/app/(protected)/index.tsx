import { useState } from "react";
import { BottomNavigation } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, View, Image, Text, StyleSheet, useWindowDimensions } from "react-native";
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
  const showAiOnboarding = true;

  const aiButtonSize = 58;
  const aiButtonRadius = aiButtonSize / 2;
  const aiButtonCenterX = width / 2;
  const aiButtonCenterY = height - (insets.bottom + 6) - aiButtonRadius;

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

      {showAiOnboarding ? (
        <View style={[StyleSheet.absoluteFill, styles.onboardingLayer]} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {}}
            android_disableSound
            accessible={false}
          />
          <Svg width={width} height={height} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="ai-spotlight-mask" maskUnits="userSpaceOnUse">
                <Rect width={width} height={height} fill="white" />
                <Circle cx={aiButtonCenterX} cy={aiButtonCenterY} r={aiButtonRadius} fill="black" />
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
      ) : null}

      {showAiOnboarding ? (
        <View
          pointerEvents="none"
          style={[styles.tipCard, { bottom: insets.bottom + 90 }]}
        >
          <View style={styles.tipIconWrap}>
            <Image source={ASSETS.greenBun} style={styles.tipIcon} />
          </View>
          <View style={styles.tipTextWrap}>
            <Text style={styles.tipTitle}>Tap to begin</Text>
            <Text style={styles.tipSubtitle}>Let AI set up your task</Text>
          </View>
        </View>
      ) : null}

      <View
        className="absolute left-4 right-4 items-center"
        style={{ bottom: insets.bottom + 6, zIndex: 20 }}
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

const styles = StyleSheet.create({
  onboardingLayer: {
    zIndex: 10,
  },
  tipCard: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E9F7E4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipIcon: {
    width: 20,
    height: 20,
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E6AE6",
  },
  tipSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
});
