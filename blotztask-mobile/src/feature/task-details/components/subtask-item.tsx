import { View, Text, TouchableOpacity } from "react-native";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import TasksCheckbox from "../../../shared/components/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";
import { useState } from "react";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { SubtaskDTO } from "../models/subtask-dto";
import { ASSETS } from "@/shared/constants/assets";
import EditSubtaskSheet from "./edit-subtask-sheet";

type SubtaskItemProps = {
  item: SubtaskDTO;
  onToggle: (id: number) => void;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  parentTaskId: number;
  drag?: () => void;
};

export default function SubtaskItem({
  item: subtask,
  onToggle,
  isEditMode = false,
  onDelete,
  parentTaskId,
  drag,
}: SubtaskItemProps) {
  // Mutations
  const { updateSubtask, isUpdatingSubtask } = useSubtaskMutations();

  // State
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Derived values
  const isChecked = subtask?.isDone;
  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;
  const duration = subtask.duration ?? "00:00:00";

  // Functions
  const handleToggle = () => {
    onToggle(subtask.subTaskId);
  };

  const handleDelete = () => {
    onDelete?.(subtask.subTaskId);
  };

  const handleOpenEditSheet = () => {
    if (isEditMode) return;

    setIsEditSheetOpen(true);
  };

  const handleSaveSubtask = (title: string, duration: string) => {
    setIsEditSheetOpen(false);
    updateSubtask?.({
      subTaskId: subtask.subTaskId,
      parentTaskId: parentTaskId,
      title,
      duration,
      order: subtask.order,
      isDone: subtask.isDone,
    });
  };

  const renderRightActions = () => {
    return (
      <View className="w-[70px] items-center justify-center">
        <ActionButton
          type={ActionButtonType.Delete}
          onPress={handleDelete}
          labelColor="#F56767"
          containerSize={30}
          iconSize={16}
        />
      </View>
    );
  };

  return (
    <>
      <Swipeable
        renderRightActions={renderRightActions}
        friction={2}
        enabled={!isEditMode}
        containerStyle={{ marginBottom: 8 }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={isEditMode ? drag : undefined}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View className="flex-row items-center px-4 py-1" style={{ minHeight: 60 }}>
            <View className="w-8 justify-center">
              <TasksCheckbox type="subtask" checked={isChecked} onChange={handleToggle} />
            </View>

            <View className="flex-1 ml-1">
              {duration && (
                <Text
                  className={`mb-[-2px] text-[12px] font-bold text-highlight`}
                >
                  {convertDurationToText(duration)}
                </Text>
              )}
              <Text
                numberOfLines={2}
                className={`text-base font-bold ${isChecked ? "line-through" : ""}`}
                style={{ color: textColor }}
              >
                {subtask.title}
              </Text>
            </View>

            <View className="w-10 items-center justify-center">
              {isEditMode ? (
                <TouchableOpacity onPressIn={drag} activeOpacity={1}>
                  <MaterialIcons name="unfold-more" size={26} color={theme.colors.disabled} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleOpenEditSheet}>
                  <ASSETS.editIcon width={28} height={22} fill={theme.colors.disabled} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
      <EditSubtaskSheet
        visible={isEditSheetOpen}
        subtask={subtask}
        isSaving={isUpdatingSubtask}
        onClose={() => setIsEditSheetOpen(false)}
        onSave={handleSaveSubtask}
      />
    </>
  );
}
