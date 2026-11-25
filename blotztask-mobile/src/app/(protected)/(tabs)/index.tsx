import { View } from "react-native";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import { AboutYouSheet } from "@/feature/onboarding/components/about-you-sheet";

export default function CalendarTab() {
  return (
    <View className="flex-1">
      <CalendarScreen />
      <AboutYouSheet />
    </View>
  );
}
