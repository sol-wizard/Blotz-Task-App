import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, View, Text, useWindowDimensions } from "react-native";

function GeneratedTaskTitles({ tasks }: { tasks?: AiTaskDTO[] }) {
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

export default function NewAiChatHubScreen() {
  const { height } = useWindowDimensions();

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <View className="flex-1 justify-end">
        <LinearGradient
          colors={["#8ACB22", "#49A35E", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: height * 0.84,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          pointerEvents="auto"
        >
          <View className="items-end">
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center"
              hitSlop={10}
            >
              <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
