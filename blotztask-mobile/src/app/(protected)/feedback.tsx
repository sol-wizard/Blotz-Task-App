import SettingsFeedbackScreen from "@/feature/settings/screens/settings-feedback-screen";

// Same screen as /settings/feedback, but on top of the current page, so back returns to it.
export default function FeedbackRoute() {
  return <SettingsFeedbackScreen />;
}
