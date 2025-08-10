import { DateSelector } from "@/feature/task/components/day-time-selector";
import { LabelMenu } from "@/feature/task/components/label-menu";
import { RepeatMenu } from "@/feature/task/components/repeat-menu";
import { RHFTextInput } from "@/feature/task/components/rhf-text-input";
import AddTaskFormField, {
  taskCreationSchema,
} from "@/feature/task/services/task-form-schema";
import { addTaskItem } from "@/feature/task/services/task-service";
import { toAddTaskItemDTO } from "@/feature/task/services/util/util";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { FormProvider, useForm } from "react-hook-form";
import { View, Text } from "react-native";
import { Button } from "react-native-paper";

export default function TaskCreationScreen() {
  const handleAiChat = () => {
    router.push("/(protected)/ai-planner");
  };
  const form = useForm<AddTaskFormField>({
    resolver: zodResolver(taskCreationSchema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      endTime: undefined,
      repeat: "none",
      labelId: undefined,
    },
  });

  const handleFormSubmit = async (data: any) => {
    try {
      const dto = toAddTaskItemDTO(data);

      await addTaskItem(dto);
      form.reset({
        title: "",
        description: "",
        endTime: undefined,
        repeat: "none",
        labelId: undefined,
      });
    } catch (error) {
      console.error("Error adding action:", error);
    }
  };

  return (
    <FormProvider {...form}>
      <View className="flex-1 bg-white px-5 pt-10">
        <Text className="text-3xl font-extrabold text-center mb-6 pt-10">
          Create New Task
        </Text>

        <View className="flex-row items-center mb-6">
          <View className="w-8 h-8 rounded-full bg-gray-300 mr-3" />
          <View className="bg-gray-100 rounded-full px-4 py-2">
            <Text className="text-gray-600 text-sm">
              Keep going. Tiny steps still win. 🚀
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1">
            <RHFTextInput
              name="title"
              label="Title"
              control={form.control}
              className="bg-gray-50 rounded-2xl"
            />
          </View>

          <Button
            mode="outlined"
            icon="flash"
            onPress={handleAiChat}
            style={{ borderRadius: 14, borderColor: "#E5E7EB" }}
            contentStyle={{ height: 48, paddingHorizontal: 14 }}
            labelStyle={{ fontSize: 14, color: "#444964" }}
          >
            AI Generate Task
          </Button>
        </View>

        <View className="mb-4">
          <RHFTextInput
            name="description"
            label="Description"
            control={form.control}
            className="bg-gray-50 rounded-2xl"
          />
        </View>

        <View className="flex-row gap-3 mb-8">
          <DateSelector control={form.control} />

          <View className="flex-1">
            <RepeatMenu control={form.control} />
          </View>

          <View className="flex-1">
            <LabelMenu control={form.control} />
          </View>
        </View>

        <Button
          mode="contained"
          onPress={form.handleSubmit(handleFormSubmit)}
          style={{
            backgroundColor: "#E5E5E5",
            borderRadius: 16,
            paddingVertical: 8,
          }}
          labelStyle={{ color: "#111827", fontWeight: "700", fontSize: 18 }}
        >
          Create
        </Button>
      </View>
    </FormProvider>
  );
}
