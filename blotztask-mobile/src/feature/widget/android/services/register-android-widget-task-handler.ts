import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "@/feature/widget/android/handlers/widget-task-handler";

export function registerAndroidWidgetTaskHandler(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
}
