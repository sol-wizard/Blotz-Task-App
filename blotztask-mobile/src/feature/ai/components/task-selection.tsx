import { View, Text } from "react-native";
import { SingleTask } from "./single-task";
import { TaskDetailDTO } from "../models/tasks";

export default function TaskSelection({
  tasks,
  aiMessage,
}: {
  tasks: TaskDetailDTO[];
  aiMessage: string;
}) {
  return (
    <View className="w-full bg-gray-50 p-4 pt-5 rounded-xl mt-6">
      <Text className="text-xl font-semibold mb-3 text-gray-900 text-center">
        ✅ Tasks Generated
      </Text>

      {aiMessage ? (
        <Text className="text-sm text-gray-600 mb-4 text-left">
          {aiMessage}
        </Text>
      ) : null}

      {tasks && tasks.length > 0 ? (
        tasks.map((task) => <SingleTask key={task.id} task={task} />)
      ) : (
        <Text className="text-sm text-gray-500 text-center mt-2">
          No tasks generated yet.
        </Text>
      )}
    </View>
  );
}
