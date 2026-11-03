import { useRef, useState } from "react";
import { Tabs, router, useGlobalSearchParams, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ASSETS } from "@/shared/constants/assets";
import { BottomNavImage } from "@/shared/components/bottom-nav-image";
import { AiTabButtonIcon } from "@/shared/components/ai-tab-button-icon";
import { theme } from "@/shared/constants/theme";
import {
  VoiceCoachOverlay,
  type ButtonFrame,
} from "@/feature/onboarding/components/voice-coach-overlay";

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
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // Only the Calendar tab sets `date`, so "+" from any other tab opens the form on today.
  const { date: calendarDate } = useGlobalSearchParams<{ date?: string }>();
  const aiButtonRef = useRef<View>(null);
  const [aiButtonFrame, setAiButtonFrame] = useState<ButtonFrame | null>(null);

  // The voice coach puts its spotlight exactly where this button is drawn.
  const reportAiButtonFrame = () => {
    aiButtonRef.current?.measureInWindow((x, y, width, height) => {
      setAiButtonFrame({ x, y, width, height });
    });
  };

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
            tabBarAccessibilityLabel: t("bottomNav.calendar"),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            tabBarIcon: ({ focused }) => getTabIcon("notes", focused),
            tabBarAccessibilityLabel: t("bottomNav.notes"),
          }}
        />
        <Tabs.Screen
          name="ai-task"
          options={{
            tabBarButton: () => (
              <Pressable
                ref={aiButtonRef}
                onLayout={reportAiButtonFrame}
                className="flex-1 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={t("bottomNav.aiAssistant")}
                onPress={() => router.push("/ai-task-sheet")}
              >
                <AiTabButtonIcon />
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
                accessibilityRole="button"
                accessibilityLabel={t("bottomNav.newTask")}
                onPress={() =>
                  router.push(
                    pathname === "/" && calendarDate
                      ? { pathname: "/task-create", params: { date: calendarDate } }
                      : "/task-create",
                  )
                }
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
            tabBarAccessibilityLabel: t("bottomNav.settings"),
          }}
        />
      </Tabs>
      <VoiceCoachOverlay buttonFrame={aiButtonFrame} />
    </View>
  );
}
