import { TextInput, View, Text } from "react-native";
import { Checkbox } from "react-native-paper";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/shared/constants/colors";
import { SubTask } from "../models/subtask";

export const BreakdownTaskCard = ({
  parentTaskId,
  subTask,
}: {
  parentTaskId: string;
  subTask: SubTask;
}) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleAddTask = (task: SubTask) => {
    setIsChecked((prev) => !prev);
    console.log("sub task added!", task, "parentTaskId:", parentTaskId);
  };

  const handleEditTask = () => {
    console.log("sub task edited");
  };

  return (
    <View className="flex-row w-full items-center justify-between">
      <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1 border border-gray-300">
        <Checkbox
          status={isChecked ? "checked" : "unchecked"}
          onPress={() => handleAddTask(subTask)}
        />
        <View className="w-[5px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
        <View className="flex-col">
          <TextInput
            value={subTask?.title}
            onChangeText={handleEditTask}
            style={{ fontSize: 16, fontWeight: "600" }}
            multiline={true}
            scrollEnabled={false}
          />
          <View className="flex-row my-1">
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
            {subTask.duration && (
              <Text className="text-base text-primary ml-2">
                {subTask.duration}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
