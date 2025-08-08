import { LabelMenu } from "@/feature/task/components/label-menu";
import { RepeatMenu } from "@/feature/task/components/repeat-menu";
import { RHFTextInput } from "@/feature/task/components/rhf-text-input";
import taskCreationSchema from "@/feature/task/services/task-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { View, Text } from "react-native";
import { Button } from "react-native-paper";
import z from "zod";

type TaskFormField = z.infer<typeof taskCreationSchema>;

export default function TaskCreationScreen() {
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskCreationSchema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      endTime: null,
      repeat: "none",
      labelId: null,
    },
  });

  const handleFormSubmit = (data: any) => {
    console.log(data);
    form.reset({
      title: "",
      description: "",
      endTime: null,
      repeat: "none",
      labelId: null,
    });
  };

  return (
    <FormProvider {...form}>
      <View className="flex-1 bg-white px-5 pt-10">
        <Text className="text-3xl font-extrabold text-center mb-6">
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
            onPress={() => console.log("AI Generate")}
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
          <Button
            mode="outlined"
            icon="calendar"
            onPress={() => console.log("Add Time")}
            style={{ borderRadius: 12, borderColor: "#E5E7EB", flex: 1 }}
            contentStyle={{ height: 44 }}
            labelStyle={{ fontSize: 14, color: "#444964" }}
          >
            Add Time
          </Button>

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
