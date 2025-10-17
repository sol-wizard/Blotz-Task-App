import { View, Text, Image, Pressable } from "react-native";
import React from "react";
import { ASSETS } from "@/shared/constants/assets";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SubtaskTab = () => {
  return (
    <View>
      <View className="mt-4 p-4 bg-[#F5F9FA] rounded-3xl">
        <Text className="font-balooBold text-xl text-blue-500">
          Big tasks can feel heavy. Try breaking them into bite-sized actions.
        </Text>
        <Image source={ASSETS.greenBun} className="w-15 h-15 self-end" />
      </View>

      <Pressable
        onPress={() => {}}
        className="flex-row items-center justify-center self-center mt-8 bg-[#EBF0FE] active:bg-gray-100 rounded-3xl h-[55px] w-[180px]"
      >
        <MaterialCommunityIcons name="format-list-checkbox" size={24} color="#3b82f6" />
        <Text className="ml-2 text-blue-500 text-xl font-balooBold">Breakdown</Text>
      </Pressable>
    </View>
  );
};

export default SubtaskTab;
