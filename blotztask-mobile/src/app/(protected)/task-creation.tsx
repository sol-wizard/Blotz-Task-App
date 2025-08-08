import { LabelMenu } from "@/feature/task/components/label-menu";
import { RepeatMenu } from "@/feature/task/components/repeat-menu";
import { RHFTextInput } from "@/feature/task/components/rhf-text-input";
import taskCreationSchema from "@/feature/task/services/task-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { View } from "react-native";
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
      repeat: "none",
      labelId: null,
    });
  };

  return (
    <FormProvider {...form}>
      <View className="flex-1 p-4 bg-white">
        <RHFTextInput
          name="title"
          label="Title"
          control={form.control}
          className="pt-20"
        />

        <RHFTextInput
          name="description"
          label="Description"
          control={form.control}
        />
        <RepeatMenu control={form.control} />
        <LabelMenu control={form.control} />

        <Button onPress={form.handleSubmit(handleFormSubmit)}>Submit</Button>
      </View>
    </FormProvider>
  );
}
