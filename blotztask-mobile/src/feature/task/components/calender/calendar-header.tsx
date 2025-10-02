import { View, Text } from "react-native";

const formDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set the time part to zero (hours, minutes, seconds, and milliseconds are all set to 0) for date comparison.

  const isToday = dateObj.getTime() === today.getTime();

  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  return {
    dayOfWeek: isToday ? "Today" : `${day} ${month}`,
    monthDay: `${month} ${day}`,
    year: year.toString(),
  };
};

export default function CalendarHeader({ date }: { date: string }) {
  const { dayOfWeek, monthDay, year } = formDate(date);

  return (
    <View className="flex-row justify-between items-center px-5">
      <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-10">
        {dayOfWeek}
      </Text>
      <View>
        <Text className="text-lg font-bold text-gray-600 text-right">{monthDay}</Text>
        <Text className="text-xl font-bold text-gray-600">{year}</Text>
      </View>
    </View>
  );
}
