import { View, Text, Pressable } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { router } from "expo-router";
import { ReminderTask } from "../hooks/useReminders";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useQueryClient } from "@tanstack/react-query";

interface ReminderCardProps {
  reminder: ReminderTask;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const { toggleTask, isToggling } = useTaskMutations();
  const queryClient = useQueryClient();

  const timeUntilReminder = formatDistanceToNow(reminder.reminderTime, {
    addSuffix: true,
  });

  const navigateToTaskDetails = () => {
    queryClient.setQueryData(["taskId", reminder.id], reminder);
    router.push({ pathname: "/(protected)/task-details", params: { taskId: reminder.id } });
  };

  const handleToggle = async () => {
    if (isToggling) return;
    await toggleTask(reminder.id);
  };

  return (
    <Pressable
      onPress={navigateToTaskDetails}
      className="bg-white rounded-2xl p-4 w-80 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-start">
        <View className="mr-3 mt-1">
          <TaskCheckbox
            checked={reminder.isDone}
            onPress={handleToggle}
            disabled={isToggling}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-2">
            <Text
              className={`text-lg font-balooBold flex-1 ${
                reminder.isDone ? "text-gray-400 line-through" : "text-gray-900"
              }`}
              numberOfLines={2}
            >
              {reminder.title}
            </Text>
            {reminder.label && (
              <View
                className="px-2 py-1 rounded-full ml-2"
                style={{ backgroundColor: reminder.label.color + "20" }}
              >
                <Text
                  className="text-xs font-baloo"
                  style={{ color: reminder.label.color }}
                >
                  {reminder.label.name}
                </Text>
              </View>
            )}
          </View>

          {reminder.description && (
            <Text
              className={`text-sm mb-2 font-baloo ${
                reminder.isDone ? "text-gray-400" : "text-gray-600"
              }`}
              numberOfLines={2}
            >
              {reminder.description}
            </Text>
          )}

          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-gray-500 font-baloo">
              ⏰ {timeUntilReminder}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
