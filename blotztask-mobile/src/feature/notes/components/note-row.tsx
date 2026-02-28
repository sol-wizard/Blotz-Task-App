import React, { useMemo, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { NoteDTO } from "../models/note-dto";
import { NoteCard } from "./note-card";
import { NoteTimeEstimateModal } from "./note-time-estimate-modal";

import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";
import { convertDurationToMinutes, convertDurationToText } from "@/shared/util/convert-duration";
import { useAddNoteToTask } from "@/feature/gashapon-machine/utils/add-note-to-task";
import { useNotesMutation } from "../hooks/useNotesMutation";

export const NoteRow = ({
  note,
  onPressNote,
  onDelete,
  registerSwipeable,
  closeOtherRows,
}: {
  note: NoteDTO;
  onPressNote: (note: NoteDTO) => void;
  onDelete: (note: NoteDTO) => void;
  registerSwipeable: (id: string, ref: Swipeable | null) => void;
  closeOtherRows: (openId: string) => void;
}) => {
  const noteId = useMemo(() => String(note.id), [note.id]);
  const { t } = useTranslation("notes");

  const [isSwiping, setIsSwiping] = useState(false);
  const [isEstimateModalVisible, setIsEstimateModalVisible] = useState(false);
  const addNoteToTask = useAddNoteToTask();
  const { estimateTime, isEstimating, timeResult, estimateError } = useEstimateTaskTime();
  const { deleteNote, isNoteDeleting } = useNotesMutation();

  const handleAddToTask = () => {
    setIsEstimateModalVisible(true);
    estimateTime(note);
  };

  const handleStartNow = () => {
    const durationMinutes = convertDurationToMinutes(timeResult ?? "");
    if (durationMinutes === undefined) return;

    addNoteToTask({
      note,
      durationMinutes,
      onSuccess: () => {
        setIsEstimateModalVisible(false);
        deleteNote(note.id);
        router.push("/(protected)/(tabs)");
      },
    });
  };

  const ActionButton = ({
    icon,
    label,
    bgColor,
    onPress,
    }: {
    icon: string;
    label: string;
    bgColor: string;
    onPress: () => void;
    }) => {
    return (
        <Pressable onPress={onPress} style={{ alignItems: "center" }}>
        {/* 圓形 icon 背景 */}
        <View
            style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: bgColor,
            alignItems: "center",
            justifyContent: "center",
            }}
        >
            <MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
        </View>

        <Text
            style={{
            marginTop: 6,
            fontSize: 12,
            color: "#8A8A8A",
            fontWeight: "600",
            }}
        >
            {label}
        </Text>
        </Pressable>
    );
    };

  const renderRightActions = () => {
  return (
    <View
      style={{
        width: 170,
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: 16,
        gap: 18,
      }}
    >
        <ActionButton
            icon="calendar-plus"
            label="Add to task"
            bgColor="#8BC34A"
            onPress={handleAddToTask}
        />

        <ActionButton
            icon="trash-can-outline"
            label="Delete"
            bgColor="#F0625F"
            onPress={() => onDelete(note)}
        />
        </View>
    );
    };

  return (
    <>
      <Swipeable
        ref={(ref) => registerSwipeable(noteId, ref)}
        renderRightActions={renderRightActions}
        rightThreshold={32}
        overshootRight={false}
        friction={2}
        onSwipeableWillOpen={() => {
            closeOtherRows(noteId);
            setIsSwiping(true); 
        }}
        onSwipeableWillClose={() => {
            setIsSwiping(false); 
        }}
        >
        <View style={{ flex: 1,
            backgroundColor: isSwiping ? "#F3F4F6" : "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius:  24,
            borderBottomLeftRadius:  24,
            borderBottomRightRadius:  24,
            overflow: "hidden" }}>
            <NoteCard
                note={note}
                onPressCard={() => onPressNote(note)}
                isToggled={false}
                onToggle={() => {}}
                isDeleting={false}
                onDelete={() => {}}
                />
        </View>
      </Swipeable>

      <NoteTimeEstimateModal
        visible={isEstimateModalVisible}
        setIsModalVisible={setIsEstimateModalVisible}
        handleStartNow={handleStartNow}
        durationText={convertDurationToText(timeResult ?? "")}
        isEstimating={isEstimating}
        error={estimateError ? t("timeEstimate.errorMessage") : null}
      />
    </>
  );
};
