import UserProfile from "./user-profile";
import { View, Text, Pressable } from "react-native";
import { formatCalendarDate } from "@/feature/calendar/util/date-formatter";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AnimatedChevron } from "@/shared/components/ui/chevron";

interface CalendarHeaderProps {
  date: string;
  progress: any;
  onToggleCalendar: () => void;
}

export default function CalendarHeader({ date, progress, onToggleCalendar }: CalendarHeaderProps) {
  const { dayOfWeek } = formatCalendarDate(date);
  const { userProfile } = useUserProfile();

  return (
    <View className="flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-3">
        <Text className="text-5xl text-gray-800 font-balooExtraBold items-end pt-10">
          {dayOfWeek}
        </Text>

        <Pressable
          onPress={onToggleCalendar}
          className="ml-2 p-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedChevron color="#1F2937" progress={progress} />
        </Pressable>
      </View>

      <UserProfile profile={userProfile} />
    </View>
  );
}
