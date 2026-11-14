import Toast from "react-native-toast-message";
import SettingsFeedbackScreen from "@/feature/settings/screens/settings-feedback-screen";
import { toastConfig } from "@/shared/components/toast-config";

// Opened from 「反馈」 on an error toast, as a modal over whatever page the error came from,
// so that page (e.g. the AI sheet with its drafts) is still there after going back.
export default function ErrorFeedbackRoute() {
  return (
    <>
      <SettingsFeedbackScreen hasTabBar={false} />
      {/* The root toast sits under native modals, so this screen shows its own (like the AI sheet). */}
      <Toast config={toastConfig} position="bottom" bottomOffset={120} />
    </>
  );
}
