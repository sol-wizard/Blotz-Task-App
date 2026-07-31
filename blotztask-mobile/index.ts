import "expo-router/entry";
import { Platform } from "react-native";

if (Platform.OS === "android") {
  void import("./src/feature/widget/android/services/register-android-widget-task-handler").then(
    ({ registerAndroidWidgetTaskHandler }) => {
      registerAndroidWidgetTaskHandler();
    },
  );
}
