import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
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

  useEffect(() => {
    setIsVisible(visible);
    if (visible) {
      // reset form when opening for the current note
      reset(defaults);
      setMode("reminder");
    }
  }, [visible, note, reset]);

  const onApply = handleSubmit((data) => {
    if (!note) {
      onClose();
      return;
    }

    // build payload using shared util (keeps consistency with TaskForm)
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

    // fallback safety
    const start = payloadStart ?? new Date();
    const end = payloadEnd ?? new Date(start.getTime() + 60 * 60 * 1000);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    addNoteToTask({
      note,
      startTime: start,
      durationMinutes,
      timeType: timeType ?? 1,
      onSuccess: () => {
        onClose();
        try {
          deleteNote(note.id);
        } catch (e) {
          // keep behavior safe if deletion fails
        }
        router.push("/(protected)/(tabs)");
      },
    });
  });

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
              <Pressable onPress={onClose}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </Pressable>
            </View>

            {/* Note preview */}
            <View className="bg-gray-100 rounded-xl p-4 mb-4">
              <Text className="text-sm text-gray-500 font-baloo">Note</Text>
              <Text className="text-base font-baloo text-black mt-2">{note?.text}</Text>
            </View>

            {/* Mode toggle (Reminder / Event) */}
            <View className="mb-4">
              <SegmentToggle
                value={mode === "reminder" ? "reminder" : "event"}
                setValue={(v) => {
                  const next = v === "reminder" ? "reminder" : "event";
                  setMode(next);
                  if (next === "event") {
                    // ensure end defaults to +1h relative to start
                    const s = methods.getValues("startTime") ?? new Date();
                    const sDate = methods.getValues("startDate") ?? new Date();
                    const nextEnd = new Date(s.getTime() + 60 * 60 * 1000);
                    reset({ ...methods.getValues(), endDate: sDate, endTime: nextEnd });
                  }
                }}
              />
            </View>

            {/* Tabs: reuse ReminderTab / EventTab from TaskForm */}
            {mode === "reminder" ? (
              <View className="mb-6">
                <ReminderTab control={methods.control} />
              </View>
            ) : (
              <View className="mb-6">
                <EventTab control={methods.control} />
              </View>
            )}

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
