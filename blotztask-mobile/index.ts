import "expo-router/entry";
import { Platform } from "react-native";

if (Platform.OS === "android") {
  type AndroidWidgetRegistration =
    typeof import("./src/feature/widget/android/services/register-android-widget-task-handler");
  const { registerAndroidWidgetTaskHandler } =
    require("./src/feature/widget/android/services/register-android-widget-task-handler.ts") as AndroidWidgetRegistration;

  registerAndroidWidgetTaskHandler();
}
