import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { NoteDTO } from "../models/note-dto";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
  const { handleSubmit, reset } = methods;

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
  }, [visible, reset]);

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
        } catch (e) {
          console.warn("Failed to delete note", e);
        }
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
      <View className="bg-white rounded-t-3xl p-6 mt-auto ">
        <FormProvider {...methods}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Header: mode toggle (reminder/event), AI estimate button, close (all inline) */}
            <View className="flex-row items-center justify-between mb-6 gap-3 h-20">
              {/* Left: toggle fills available horizontal space but stays vertically centered */}
              <View className="flex-1 self-center pt-3 ml-1">
                <SegmentToggle
                  value={mode === "reminder" ? "reminder" : "event"}
                  setValue={handleTabChange}
                />
              </View>
              <View className="flex-row items-center ml-3 gap-x-2 -mt-3">
                {/* AI button */}
                <Pressable onPress={handleAIEstimate} disabled={isEstimating}>
                  <LinearGradient
                    colors={["#9AD513", "#60B000", "#9AD513"]}
                    start={{ x: 0.8, y: 0 }}
                    end={{ x: 0, y: 0.5 }}
                    style={{
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isEstimating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white font-baloo text-m">
                        {t("timeEstimate.estimateButton")}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Close button: vertically centered by parent */}
                <Pressable onPress={onClose}>
                  <Text className="text-gray-500 text-lg">✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Mode toggle (Reminder / Event) */}
            <View className="mb-4">
              {/* <SegmentToggle value={mode} setValue={handleTabChange} /> */}
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
              <Text className="font-balooBold text-lg text-black">{"Apply"}</Text>
            </Pressable>
          </ScrollView>
        </FormProvider>
      </View>
    </Modal>
  );
};
