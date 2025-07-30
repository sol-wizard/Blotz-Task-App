import React from "react";
import { Text, View } from "react-native";
import { Avatar } from "react-native-paper";
import ReturnedTasksList from "./returned-tasks-list";

type Task = {
  id: number;
  title: string;
};

export default function BotMessage({
  text,
  tasks = [],
}: {
  text: string;
  tasks?: Task[];
}) {
  return (
    <View className="flex-col mb-3">
      <View className="flex-row items-end justify-start">
        <Avatar.Text
          size={24}
          label="B"
          style={{ marginRight: 8, marginTop: 4 }}
        />
        <View className="bg-gray-300 px-3 py-2 rounded-2xl max-w-[80%]">
          <Text className="text-black text-base">{text}</Text>
        </View>
      </View>

      {tasks.length > 0 && <ReturnedTasksList tasks={tasks} />}
    </View>
  );
}
