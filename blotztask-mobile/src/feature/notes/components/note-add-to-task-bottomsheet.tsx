import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { NoteDTO } from "../models/note-dto";
import { router } from "expo-router";

import { SegmentToggle } from "@/feature/task-add-edit/components/segment-toggle";
import { ReminderTab } from "@/feature/task-add-edit/components/reminder-tab";
import { EventTab } from "@/feature/task-add-edit/components/event-tab";
import { buildTaskTimePayload } from "@/feature/task-add-edit/util/time-convertion";

import { useAddNoteToTask } from "@/feature/gashapon-machine/utils/add-note-to-task";
import { useNotesMutation } from "../hooks/useNotesMutation";
import { useEstimateTaskTime } from "@/feature/notes/hooks/useEstimateTaskTime";
import { convertDurationToMinutes } from "@/shared/util/convert-duration";
import { addMinutes } from "date-fns/addMinutes";
import { TaskTimeType } from "@/shared/models/task-detail-dto";

type FormValues = {
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
};

export const NoteAddToTaskBottomSheet = ({
  visible,
  note,
  onClose,
}: {
  visible: boolean;
  note: NoteDTO | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation("notes");
  const addNoteToTask = useAddNoteToTask();
  const { deleteNote } = useNotesMutation();

  const now = new Date();
  const defaults: FormValues = {
    startDate: now,
    startTime: now,
    endDate: new Date(now.getTime() + 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 60 * 60 * 1000),
  };

  const methods = useForm<FormValues>({ defaultValues: defaults });
  const { handleSubmit, reset, watch } = methods;

  const [isVisible, setIsVisible] = useState<boolean>(visible);
  const [mode, setMode] = useState<"reminder" | "event">("reminder");
  const { estimateTime, isEstimating, timeResult } = useEstimateTaskTime();

  useEffect(() => {
    setIsVisible(visible);
    if (visible) {
      // reset form when opening for the current note
      reset(defaults);
      setMode("reminder");
    }
  }, [visible, note, reset]);

  const handleTabChange = (next: "reminder" | "event") => {
    setMode(next);
    if (next === "reminder") {
      // restore defaults for reminder (same behavior as TaskForm)
      reset(defaults);
      return;
    }
    // event: set end = start + 1h
    const start = methods.getValues("startTime") ?? new Date();
    const startDateVal = methods.getValues("startDate") ?? new Date();
    const nextEnd = new Date(start.getTime() + 60 * 60 * 1000);
    methods.setValue("startDate", startDateVal);
    methods.setValue("startTime", start);
    methods.setValue("endDate", startDateVal);
    methods.setValue("endTime", nextEnd);
  };

  const onApply = handleSubmit((data) => {
    if (!note) {
      onClose();
      return;
    }

    const {
      startTime: payloadStart,
      endTime: payloadEnd,
      timeType,
    } = buildTaskTimePayload(
      data.startDate,
      data.startTime,
      mode === "reminder" ? data.startDate : data.endDate,
      mode === "reminder" ? data.startTime : data.endTime,
    );

    const start = payloadStart ?? new Date();
    const end = payloadEnd ?? new Date(start.getTime() + 60 * 60 * 1000);

    // If Single time type, backend requires start===end → pass duration 0.
    const durationMinutes =
      timeType === TaskTimeType.Single
        ? 0
        : Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    addNoteToTask({
      note,
      startTime: start,
      durationMinutes,
      timeType: timeType ?? TaskTimeType.Range,
      onSuccess: () => {
        onClose();
        try {
          deleteNote(note.id);
        } catch (e) {}
        router.push("/(protected)/(tabs)");
      },
    });
  });

  const handleAIEstimate = async () => {
    if (!note) return;
    try {
      const maybeResult = await estimateTime(note);
      const durationStr = (maybeResult && (maybeResult as any).duration) ?? timeResult ?? "";
      const minutes = convertDurationToMinutes(durationStr);
      if (minutes === undefined) return;

      const start = methods.getValues("startTime") ?? new Date();
      const startDateVal = methods.getValues("startDate") ?? new Date();
      const newEnd = addMinutes(start, minutes);

      methods.setValue("endTime", newEnd);
      methods.setValue("endDate", startDateVal);

      setMode("event");
    } catch (err) {
      console.warn("AI estimate failed", err);
    }
  };

  // optional: reflect form values in UI if needed
  const watched = watch();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      style={{ margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl p-6" style={{ marginTop: "auto", maxHeight: "85%" }}>
        <FormProvider {...methods}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-balooBold">Add to Task</Text>

              <View className="flex-row items-center">
                {/* AI task estimate button - style follows 'pick a note' look */}
                <Pressable
                  onPress={handleAIEstimate}
                  disabled={isEstimating}
                  className="bg-white px-3 py-2 rounded-full flex-row items-center justify-center mr-3"
                >
                  {isEstimating ? (
                    <ActivityIndicator size="small" color="#3D8DE0" />
                  ) : (
                    <Text className="text-sm font-baloo text-[#3D8DE0]">AI 任务估算</Text>
                  )}
                </Pressable>

                <Pressable onPress={onClose}>
                  <Text className="text-gray-500 text-lg">✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Mode toggle (Reminder / Event) */}
            <View className="mb-4">
              <SegmentToggle value={mode} setValue={handleTabChange} />
              {mode === "reminder" ? (
                <View className="mb-6">
                  <ReminderTab control={methods.control} />
                </View>
              ) : (
                <View className="mb-6">
                  <EventTab control={methods.control} />
                </View>
              )}
            </View>

            {/* Apply */}
            <Pressable
              onPress={onApply}
              className="bg-lime-300 rounded-xl py-4 items-center justify-center"
            >
              <Text className="font-balooBold text-lg text-black">
                {t("addToTask.apply") || "Apply"}
              </Text>
            </Pressable>
          </ScrollView>
        </FormProvider>
      </View>
    </Modal>
  );
};
