import { TouchableOpacity, View, Text } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast, { ToastConfigParams } from "react-native-toast-message";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { ASSETS } from "@/shared/constants/assets";
import { useRef } from "react";
import { router, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { captureCurrentPage } from "@/feature/settings/util/capture-current-page";
import { FeedbackImage } from "@/feature/settings/modals/feedback-image";
import { ErrorToastProps } from "@/shared/util/show-error-toast";
import { queryClient } from "@/shared/util/queryClient";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";

// Where 「反馈」 is hidden: the feedback routes (an error there must not open it again), and
// the update-required screen, which the app doesn't let the user leave.
const NO_FEEDBACK_PATHS = [
  "/error-feedback",
  "/feedback",
  "/settings/feedback",
  "/update-required",
];

// A missing screenshot must never block the feedback screen, so a failed capture opens it without one.
async function tryCaptureCurrentPage(): Promise<FeedbackImage | null> {
  try {
    return await captureCurrentPage();
  } catch (error) {
    if (__DEV__) console.warn("[Feedback] Screen capture failed.", error);
    return null;
  }
}

function ErrorToast({ text1, props }: ToastConfigParams<ErrorToastProps | undefined>) {
  const { t } = useTranslation("common");
  // A ref, not state, so a fast double tap can't take two screenshots and open the screen twice.
  // Never reset: once tapped, this toast is on its way out, and the next error gets a fresh one.
  const isOpeningRef = useRef(false);
  const pathname = usePathname();
  const message = text1 ?? "";
  // Every error offers 「反馈」 unless the caller turned it off, or the user is already giving feedback.
  // The feedback screen needs a login, so signed-out screens (e.g. sign-in) don't offer it either.
  const isSignedIn = queryClient.getQueryData(AUTH_QUERY_KEY) === true;
  const showFeedback =
    props?.showFeedback !== false && isSignedIn && !NO_FEEDBACK_PATHS.includes(pathname);

  const handleFeedback = async () => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    // Captured before hiding, so the screenshot shows the error the user is reporting.
    const screenshot = await tryCaptureCurrentPage();
    Toast.hide();
    router.push({
      pathname: "/error-feedback",
      params: {
        errorMessage: message,
        ...(props?.sentryEventId ? { errorEventId: props.sentryEventId } : {}),
        ...(screenshot
          ? {
              imageUri: screenshot.uri,
              imageWidth: String(screenshot.width),
              imageHeight: String(screenshot.height),
            }
          : {}),
      },
    });
  };

  return (
    <View
      style={{ elevation: 0 }}
      className="flex-row items-center bg-gray-900 rounded-xl px-3 py-2.5 w-96 shadow-none"
    >
      <ASSETS.toastFail width={27} height={22} />
      <View className="flex-1 justify-center pl-2 pr-2">
        <Text className="text-white font-baloo leading-5 flex-wrap pt-0.5">{message}</Text>
      </View>
      {showFeedback && (
        <TouchableOpacity
          onPress={() => void handleFeedback()}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          className="bg-white/15 rounded-full px-3 py-1"
        >
          <Text className="text-white font-balooBold text-sm">{t("errorToast.feedback")}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="close" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

export const toastConfig = {
  error: (params: ToastConfigParams<ErrorToastProps | undefined>) => <ErrorToast {...params} />,
  success: (props: ToastConfigParams<unknown>) => (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{ elevation: 0, backgroundColor: "#ECF6E3", alignSelf: "center" }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <ASSETS.toastSuccess width={28} height={24} />
      <Text style={{ color: "#9CD710" }} className="font-baloo text-sm pl-2">
        {props.text1}
      </Text>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-2"
      >
        <MaterialCommunityIcons name="close" size={16} color="#9CD710" />
      </TouchableOpacity>
    </Animated.View>
  ),
  warning: (props: ToastConfigParams<unknown>) => (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{ elevation: 0, backgroundColor: "#FFF2E1", alignSelf: "center" }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <ASSETS.toastWarning width={28} height={24} />
      <Text style={{ color: "#FFAA4A" }} className="font-baloo text-sm pl-2">
        {props.text1}
      </Text>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-2"
      >
        <MaterialCommunityIcons name="close" size={16} color="#FFAA4A" />
      </TouchableOpacity>
    </Animated.View>
  ),
};
