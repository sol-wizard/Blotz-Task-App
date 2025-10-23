import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "../../shared/components/ui/form-divider";

import { ReminderTab } from "./components/reminder-tab";
import { EventTab } from "./components/event-tab";
import { SegmentButton } from "./components/segment-button";
import { isEqual } from "date-fns";
import { combineDateTime } from "./util/combine-date-time";
import { SegmentButtonValue } from "./models/segment-button-value";
import { MaterialIcons } from "@expo/vector-icons";
import { LabelDTO } from "@/shared/models/label-dto";
import { fetchAllLabel } from "@/shared/services/label-service";
import Toast from "react-native-toast-message";

type TaskFormProps =
  | {
      mode: "create";
      dto?: undefined;
      onSubmit: (data: TaskFormField) => void;
    }
  | {
      mode: "edit";
      dto: EditTaskItemDTO;
      onSubmit: (data: TaskFormField) => void;
    };

const TaskForm = ({ mode, dto, onSubmit }: TaskFormProps) => {
  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: dto?.startTime ?? null,
    startTime: dto?.startTime ?? null,
    endDate: dto?.endTime ?? null,
    endTime: dto?.endTime ?? null,
  };
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isValid, isSubmitting } = formState;

  const startCombined = combineDateTime(defaultValues.startDate, defaultValues.startTime);
  const endCombined = combineDateTime(defaultValues.endDate, defaultValues.endTime);
  const initialTab: SegmentButtonValue =
    !startCombined || !endCombined || isEqual(startCombined, endCombined) ? "reminder" : "event";

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);
  const labelId = useWatch({ control, name: "labelId" });
  const [categoryEnabled, setCategoryEnabled] = useState<boolean>(labelId != null);
  const [labels, setLabels] = useState<LabelDTO[]>([]);

  // enable category if labelId exists
  useEffect(() => {
    if (labelId != null) {
      setCategoryEnabled(true);
    }
  }, [labelId]);

  // function to refresh labels from server
  const refreshLabels = useCallback(async () => {
    try {
      const data = await fetchAllLabel();
      setLabels(data);
    } catch (error) {
      console.error("Failed to refresh labels:", error);
      Toast.show({
        type: "error", // 'success', 'error', 'info'
        text1: "Failed to load labels",
        text2: "Please check your network connection",
      });
    }
  }, []);

  // refresh labels on mount
  useEffect(() => {
    refreshLabels();
  }, [refreshLabels]);

  // handle new label creation
  const handleLabelCreated = useCallback(
    (newLabel: LabelDTO) => {
      setValue("labelId", newLabel.labelId, { shouldDirty: true, shouldValidate: true });
      setLabels((prevLabels) => [...prevLabels, newLabel]);
      // refresh labels to ensure consistency
      refreshLabels();
    },
    [setValue, refreshLabels],
  );

  const handleFormSubmit = (data: TaskFormField) => {
    onSubmit(data);
  };

  const handleTabChange = (next: SegmentButtonValue) => {
    setIsActiveTab(next);

    setValue("startDate", null);
    setValue("startTime", null);
    setValue("endDate", null);
    setValue("endTime", null);
  };

  // toggle category selection
  const toggleCategory = () => {
    if (categoryEnabled) {
      setCategoryEnabled(false);
      setValue("labelId", null, { shouldDirty: true, shouldValidate: true });
    } else {
      setCategoryEnabled(true);
    }
  };

  return (
    <>
      <View className="flex-1 bg-white">
        <FormProvider {...form}>
          <ScrollView className="flex-col py-6 px-8" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Title */}
            <View className="mb-4 bg-white">
              <FormTextInput
                name="title"
                placeholder="New Task"
                control={control}
                className="font-balooBold text-5xl leading-normal"
                inputProps={{
                  multiline: false,
                }}
              />
            </View>

            <View className="mb-8 py-3 bg-background rounded-2xl px-4">
              <FormTextInput
                name="description"
                placeholder="Add a note"
                control={control}
                className="font-baloo text-lg text-tertiary"
              />
            </View>

            <FormDivider />
            <SegmentButton value={isActiveTab} setValue={handleTabChange} />

            {isActiveTab === "reminder" && <ReminderTab control={control} />}
            {isActiveTab === "event" && <EventTab control={control} />}
            <FormDivider />

            {/* Category */}

            <View className="mb-8">
              <View className="flex-row items-center gap-3 mb-2">
                <Pressable
                  onPress={toggleCategory}
                  hitSlop={8}
                  className={`w-8 h-8 rounded-[10px] border-[3px] mr-3 items-center justify-center ${
                    categoryEnabled
                      ? "bg-neutral-300 border-neutral-300"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {categoryEnabled && <MaterialIcons name="check" color="white" size={14} />}
                </Pressable>

                <Text className="font-balooBold text-3xl leading-normal">Category</Text>
              </View>
              <LabelSelect
                control={control}
                enabled={categoryEnabled}
                labels={labels}
                onLabelCreated={handleLabelCreated}
                selectedValue={labelId}
              />
            </View>

            <FormDivider />
          </ScrollView>

          {/* Submit */}
          <View className="px-8 py-6">
            <Pressable
              onPress={handleSubmit(handleFormSubmit)}
              disabled={!isValid || isSubmitting}
              className={`w-full py-4 rounded-lg items-center justify-center ${
                !isValid || isSubmitting ? "bg-gray-300" : "bg-lime-300"
              }`}
            >
              <Text className="font-balooBold text-xl text-black">
                {mode === "create" ? "Create Task" : "Update Task"}
              </Text>
            </Pressable>
          </View>
        </FormProvider>
      </View>
      <Toast />
    </>
  );
};

export default TaskForm;
