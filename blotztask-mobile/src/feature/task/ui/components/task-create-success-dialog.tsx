import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View, Text } from "react-native";

export const TaskCreateSuccessDialog = ({
  handleBackToInput,
}: {
  handleBackToInput: () => void;
}) => {
  return (
    <View className="justify-center items-center">
      <View className="w-14 h-14 rounded-full bg-green-700 items-center justify-center mb-4">
        <Ionicons name="checkmark" size={28} color="#fff" />
      </View>

      <Text className="text-[18px] font-semibold text-green-700">Task create successful!</Text>
      <Text className="mt-2 text-[13px] text-slate-500 text-center">
        New task has been added to the task list
      </Text>

      <Pressable
        onPress={handleBackToInput}
        hitSlop={10}
        className="mt-6 rounded-full w-40 mr-8"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <LinearGradient
          colors={["#A78BFA", "#FB7185"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 176,
            height: 48,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-white font-semibold text-[16px]">Create New</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
};
