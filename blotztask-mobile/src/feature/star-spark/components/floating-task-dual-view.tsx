import { ASSETS } from "@/shared/constants/assets";
import { FlatList, View, Text, Image } from "react-native";
import { FloatingTaskDTO } from "../models/floatingTaskDto";

export const FloatingTaskDualView = ({ tasks }: { tasks: FloatingTaskDTO[] }) => {
  return (
    <View className="flex-1">
      <FlatList
        data={tasks}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        columnWrapperStyle={{
          columnGap: 12,
          rowGap: 12,
        }}
        className="mx-4"
        renderItem={({ item }) => (
          <View className="bg-white rounded-3xl p-4 w-52">
            <Text className="text-xl font-semibold text-black font-baloo">{item.title}</Text>

            <Text className="mt-2 text-[13px] text-[#9CA3AF] leading-snug font-balooThin">
              {item.description}
            </Text>

            <View className="mt-4 flex-row items-center justify-between font-balooThin">
              <Text className="text-xs text-[#6B7280]">01 Nov 17:49</Text>

              <View className="w-6 h-6 items-center justify-center">
                <Image source={ASSETS.yellowStar} className="w-8 h-8"></Image>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};
