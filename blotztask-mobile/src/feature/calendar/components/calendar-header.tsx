import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import UserProfileModal from "./user-profile-modal";

const formDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set the time part to zero (hours, minutes, seconds, and milliseconds are all set to 0) for date comparison.

  const isToday = dateObj.getTime() === today.getTime();


  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();

  return {
    dayOfWeek: isToday ? "Today" : `${day} ${month}`,
  };
};


interface CalendarHeaderProps {
  date: string;
  isCalendarVisible: boolean;
  onToggleCalendar: () => void;
}

// Mock user data - to be replaced with actual API call later
const MOCK_USER_AVATAR =
  "https://tse1.mm.bing.net/th/id/OIP.E-J7MHCO8ZxMS-3oGZv0EQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3";

export default function CalendarHeader({
  date,
  isCalendarVisible,
  onToggleCalendar,
}: CalendarHeaderProps) {
  const { dayOfWeek } = formDate(date);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  return (
    <>
      <View className="flex-row justify-between items-center px-5">
        <View className="flex-row items-center gap-3">
          <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-10">
            {dayOfWeek}
          </Text>
          <TouchableOpacity onPress={onToggleCalendar} className="pt-5" activeOpacity={0.7}>
            <Ionicons
              name={isCalendarVisible ? "chevron-up" : "chevron-down"}
              size={34}
              className="text-gray-800"
            />
          </TouchableOpacity>
        </View>

        {/* Profile Icon */}
        <TouchableOpacity
          onPress={() => setIsProfileModalVisible(true)}
          className="pt-5"
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: MOCK_USER_AVATAR }}
            className="w-12 h-12 rounded-full border-2 border-gray-300"
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* User Profile Modal */}
      <UserProfileModal
        visible={isProfileModalVisible}
        onClose={() => setIsProfileModalVisible(false)}
      />
    </>
  );
}
