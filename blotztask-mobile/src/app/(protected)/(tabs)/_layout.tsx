import { Tabs, router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ASSETS } from "@/shared/constants/assets";
import { BottomNavImage } from "@/shared/components/ui/bottom-nav-image";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { theme } from "@/shared/constants/theme";

function getTabIcon(routeKey: string, focused: boolean) {
  const DashedStar = ASSETS.dashedStar;
  const DashedHouse = ASSETS.dashedHouse;
  const DashedPlus = ASSETS.dashedPlus;
  const DashedSettings = ASSETS.dashedSettings;

  switch (routeKey) {
    case "calendar":
      return focused ? (
        <BottomNavImage source={ASSETS.greenHouse} containerClassName="ml-14 mt-6" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center ml-14 mt-6">
          <DashedHouse width={20} height={20} />
        </View>
      );
    case "starSpark":
      return focused ? (
        <BottomNavImage source={ASSETS.starSpark} containerClassName="mr-10 mt-6" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center mr-10 mt-6">
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
          containerClassName="mr-14 mt-6"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center mr-14 mt-6">
          <DashedSettings width={27} height={27} />
        </View>
      );
    default:
      return null;
  }
}

export default function ProtectedTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            height: 60,
            marginBottom: 40,
            borderTopWidth: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => getTabIcon("calendar", focused),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            tabBarIcon: ({ focused }) => getTabIcon("starSpark", focused),
          }}
        />
        <Tabs.Screen
          name="create-task"
          options={{
            tabBarButton: (props) => (
              <Pressable
                onPress={() => router.push("/task-create")}
                className="ml-3"
                style={{ marginTop: 8 }}
              >
                {getTabIcon("createTask", false)}
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => getTabIcon("settings", focused),
          }}
        />
      </Tabs>

      <View
        className="absolute left-4 right-4 items-center"
        style={{ bottom: insets.bottom + 6, zIndex: 20 }}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => router.push("/ai-task-sheet")}>
          <GradientCircle size={58}>
            <Image
              source={ASSETS.whiteBun}
              contentFit="contain"
              style={{ width: 28, height: 28, position: "absolute" }}
            />
          </GradientCircle>
        </Pressable>
      </View>
    </View>
  );
}
