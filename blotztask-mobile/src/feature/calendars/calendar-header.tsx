import { View, Text, StyleSheet } from "react-native";

interface CalendarHeaderProps {
  date: string;
}

const formDate = (dateString: string) => {
    const dateObj = new Date(`${dateString}T00:00:00`);
    const dayOfWeek = dateObj.toLocaleString('default', { weekday: 'short' });
    const month = dateObj.toLocaleString('default', { month: 'short' });
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();

    return {
        dayOfWeek,
        monthDay: `${month} ${day}`,
        year: year.toString()
    };
};

export default function CalendarHeader({ date }: CalendarHeaderProps) {
  const { dayOfWeek, monthDay, year } = formDate(date);

  return (
    <View className="flex-row justify-between items-center px-5 py-4 bg-white">
      <Text className="text-2xl font-bold text-gray-800">{dayOfWeek}</Text>
      <View>
        <Text className="text-lg font-bold text-gray-600 text-right">{monthDay}</Text>
        <Text className="text-xl font-bold text-gray-600">{year}</Text>
      </View>
    </View>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     backgroundColor: '#ffffff',
//   },
//   dayOfWeekText: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#2d2d2d',
//   },
//   monthDayText: {
//     fontSize: 16,
//     color: '#888888',
//     textAlign: 'right',
//     fontWeight: 'bold',
//   },
//   yearText: {
//     fontSize: 24,
//     color: '#888888',
//     fontWeight: 'bold',
//   }
// }); 