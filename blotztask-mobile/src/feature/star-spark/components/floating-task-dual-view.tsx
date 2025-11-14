import { ASSETS } from "@/shared/constants/assets";
import { FlatList, View, Text, Image, Pressable } from "react-native";
import { FloatingTaskDTO } from "../models/floatingTaskDto";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const FloatingTaskDualView = ({ tasks }: { tasks: FloatingTaskDTO[] }) => {
  const [toggledMap, setToggledMap] = useState<Record<number, boolean>>({});

  const handleToggle = (id: number) => {
    setToggledMap((prev) => {
      const isCurrentlyOn = !!prev[id];
      if (isCurrentlyOn) {
        return {};
      }
      return { [id]: true };
    });
  };

  return (
    <View className="flex-1">
      <FlatList
        data={tasks}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        columnWrapperStyle={{
          columnGap: 12,
          rowGap: 12,
        }}
        className="mx-4"
        renderItem={({ item }) => {
          const isToggled = !!toggledMap[item.id];

          return (
            <View className="flex-1">
              <Pressable onPress={() => handleToggle(item.id)}>
                <View
                  className={`bg-white rounded-3xl p-4 w-52 ${
                    isToggled ? "border-2 border-[#3D8DE0]" : ""
                  }`}
                >
                  <Text className="text-xl font-semibold text-black font-baloo">{item.title}</Text>

                  <Text className="mt-2 text-[13px] text-[#9CA3AF] leading-snug font-balooThin">
                    {item.description}
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between font-balooThin">
                    <Text className="text-xs text-[#6B7280]">01 Nov 17:49</Text>

                    <View className="w-6 h-6 items-center justify-center">
                      <Image source={ASSETS.yellowStar} className="w-8 h-8" />
                    </View>
                  </View>
                </View>
              </Pressable>

              {isToggled && (
                <View className="flex-row justify-end mt-3">
                  <Pressable>
                    <View className="w-8 h-8 bg-warning rounded-xl items-center justify-center">
                      <MaterialCommunityIcons name="trash-can-outline" color="#fff" size={18} />
                    </View>
                  </Pressable>

                  <Pressable>
                    <View className="w-8 h-8 bg-[#E3EFFE] rounded-xl items-center justify-center ml-2">
                      <MaterialCommunityIcons name="plus" color="#3D8DE0" size={18} />
                    </View>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};
