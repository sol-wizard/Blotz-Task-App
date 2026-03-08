import { Tabs, router } from "expo-router";
import { Pressable, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ASSETS } from "@/shared/constants/assets";
import { BottomNavImage } from "@/shared/components/ui/bottom-nav-image";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { theme } from "@/shared/constants/theme";

function UnfocusedTabIcon({ children }: { children: React.ReactNode }) {
  return (
    <View className="w-12 h-12 rounded-full bg-[#E3EEFF] items-center justify-center">
      {children}
    </View>
  );
}

function getTabIcon(routeKey: string, focused: boolean) {
  const DashedStar = ASSETS.dashedStar;
  const DashedHouse = ASSETS.dashedHouse;
  const DashedPlus = ASSETS.dashedPlus;
  const DashedSettings = ASSETS.dashedSettings;

  switch (routeKey) {
    case "calendar":
      return focused ? (
        <BottomNavImage source={ASSETS.greenHouse} />
      ) : (
        <UnfocusedTabIcon>
          <DashedHouse width={24} height={24} />
        </UnfocusedTabIcon>
      );
    case "notes":
      return focused ? (
        <BottomNavImage source={ASSETS.notes} />
      ) : (
        <UnfocusedTabIcon>
          <DashedStar width={24} height={24} />
        </UnfocusedTabIcon>
      );
    case "createTask":
      return (
        <UnfocusedTabIcon>
          <DashedPlus width={24} height={24} />
        </UnfocusedTabIcon>
      );
    case "settings":
      return focused ? (
        <BottomNavImage source={ASSETS.settingIcon} />
      ) : (
        <UnfocusedTabIcon>
          <DashedSettings width={24} height={24} />
        </UnfocusedTabIcon>
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
            height: Platform.OS === "ios" ? 60 : 60 + insets.bottom,
            marginBottom: Platform.OS === "ios" ? 40 : 0,
            paddingBottom: Platform.OS === "ios" ? 5 : insets.bottom,
            borderTopWidth: 0,
          },
          tabBarIconStyle: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
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
            tabBarIcon: ({ focused }) => getTabIcon("notes", focused),
          }}
        />
        <Tabs.Screen
          name="ai-task"
          options={{
            tabBarButton: () => (
              <Pressable
                className="flex-1 items-center justify-center"
                onPress={() => router.push("/ai-task-sheet")}
              >
                <GradientCircle size={58}>
                  <Image
                    source={ASSETS.whiteBun}
                    contentFit="contain"
                    style={{ width: 28, height: 28, position: "absolute" }}
                  />
                </GradientCircle>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="create-task"
          options={{
            tabBarButton: () => (
              <Pressable
                className="flex-1 items-center justify-center"
                onPress={() => router.push("/task-create")}
              >
                {getTabIcon("createTask", true)}
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
    </View>
  );
}
