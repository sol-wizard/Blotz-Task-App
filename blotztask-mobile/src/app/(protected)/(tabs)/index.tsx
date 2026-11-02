import { View } from "react-native";
import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import { FloatingAddButton } from "@/feature/calendar/components/floating-add-button";

export default function CalendarTab() {
  return (
    <View className="flex-1">
      <CalendarScreen />
      {/* Only on Home: on Notes a + that makes a task (not a note) would confuse, and covers its add bar. */}
      <FloatingAddButton />
    </View>
  );
}
