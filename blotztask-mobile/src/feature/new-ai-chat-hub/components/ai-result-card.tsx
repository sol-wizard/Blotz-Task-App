import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import { View, Text } from "react-native";

export function GeneratedTaskTitles({ tasks }: { tasks?: AiTaskDTO[] }) {
  if (!tasks?.length) {
    return null;
  }

  return (
    <View className="mt-2 mb-2 gap-2">
      {tasks.map((task, index) => (
        <View key={task.id} className="rounded-xl bg-white/20 border border-white/30 px-3 py-2">
          <Text selectable className="text-white font-baloo text-base">
            {index + 1}. {task.title}
          </Text>
        </View>
      ))}
    </View>
  );
}
