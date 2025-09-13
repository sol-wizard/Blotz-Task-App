import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Pressable, View, Text } from "react-native";

export const AddSubtaskBottomSheet = ({ handleAddSubtasks }: { handleAddSubtasks: () => void }) => {
  return (
    <BottomSheetView>
      <View className="bg-white rounded-2xl p-4 pb-14 pt-8" style={{ elevation: 4 }}>
        <View className="flex-row items-center">
          <Pressable
            android_ripple={{ color: "transparent" }}
            onPress={handleAddSubtasks}
            className="flex-1 h-11 items-center justify-center rounded-xl bg-gray-300"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Text className="text-[15px] font-semibold text-neutral-900">Add Selected</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetView>
  );
};
