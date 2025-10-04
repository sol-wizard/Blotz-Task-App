import { View, Text } from "react-native";
import UserProfile from "./user-profile";

const formDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const dayOfWeek = dateObj.toLocaleString("default", { weekday: "short" });
  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  return {
    dayOfWeek,
    monthDay: `${month} ${day}`,
    year: year.toString(),
  };
};

export default function CalendarHeader({ date }: { date: string }) {
  const { dayOfWeek} = formDate(date);

  return (
    <View className="flex-row justify-between items-center px-5">
      <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-10">
        {dayOfWeek}
      </Text>
     
     <UserProfile />
    </View>
  );
}
