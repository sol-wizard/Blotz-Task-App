import { View, Text } from "react-native";
import { ReminderDTO } from "../modals/reminder-dto";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const TodayReminder = ({ reminder }: { reminder: ReminderDTO | null }) => {
  return (
    <View className="rounded-lg bg-[#CDF79A] mx-6 mb-4 px-4 py-4 flex-row items-center">
      <View className="rounded-full bg-[#DBF9B9] p-2 m-2">
        <MaterialCommunityIcons name="bell-outline" size={30} />
      </View>

      <Text className="text-lg font-baloo w-5/6">{reminder?.reminderText}</Text>
    </View>
  );
};
