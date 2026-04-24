import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import TasksCheckbox from "../../../shared/components/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";
import { useState } from "react";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import SubtaskInlineEditor from "./subtask-inline-editor";
import { useTranslation } from "react-i18next";
import { SubtaskDTO } from "../models/subtask-dto";

type SubtaskItemProps = {
  item: SubtaskDTO;
  onToggle: (id: number) => void;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onDurationChange?: (id: number, duration: string) => void;
  parentTaskId: number;
  drag?: () => void;
};

export default function SubtaskItem({
  item: subtask,
  onToggle,
  isEditMode = false,
  onDelete,
  onDurationChange,
  parentTaskId,
  drag,
}: SubtaskItemProps) {
  // Mutations
  const { updateSubtask } = useSubtaskMutations();

  // State
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(subtask.title);
  const [localDuration, setLocalDuration] = useState(subtask.duration ?? "00:00:00");
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  // Derived values
  const isChecked = subtask?.isDone;
  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;
  const { t } = useTranslation(["tasks"]);

  // Functions
  const handleToggle = () => {
    onToggle(subtask.subTaskId);
  };

  const handleDelete = () => {
    onDelete?.(subtask.subTaskId);
  };

  const handleInlineEditToggle = () => {
    if (isInlineEditing) {
      updateSubtask?.({
        subTaskId: subtask.subTaskId,
        parentTaskId: parentTaskId,
        title: titleValue,
        duration: localDuration,
        order: subtask.order,
        isDone: subtask.isDone,
      });
    } else {
      const duration = subtask.duration ?? "00:00:00";
      setTitleValue(subtask.title);
      setLocalDuration(duration);
      const [h = "0", m = "0"] = duration.split(":");
      setSelectedHours(Number(h) || 0);
      setSelectedMinutes(Number(m) || 0);
    }
    setIsInlineEditing((prev) => !prev);
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
          onPress={() => !isEditMode && handleToggle()}
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
              {isInlineEditing ? (
                <SubtaskInlineEditor
                  titleValue={titleValue}
                  localDuration={localDuration}
                  selectedHours={selectedHours}
                  selectedMinutes={selectedMinutes}
                  onTitleChange={setTitleValue}
                  onHoursChange={setSelectedHours}
                  onMinutesChange={setSelectedMinutes}
                  onDurationClose={(duration) => {
                    setLocalDuration(duration);
                    onDurationChange?.(subtask.subTaskId, duration);
                  }}
                />
              ) : (
                <>
                  {localDuration && (
                    <Text
                      className="text-3 font-bold"
                      style={{
                        color: isChecked ? "#BDE6A3" : theme.colors.highlight,
                        marginBottom: -2,
                        fontWeight: "700",
                      }}
                    >
                      {convertDurationToText(localDuration)}
                    </Text>
                  )}
                  <Text
                    numberOfLines={2}
                    className={`text-base font-bold ${isChecked ? "line-through" : ""}`}
                    style={{ color: textColor }}
                  >
                    {titleValue}
                  </Text>
                </>
              )}
            </View>

            <View className="w-10 items-center justify-center">
              {isEditMode ? (
                <TouchableOpacity onPressIn={drag} activeOpacity={1}>
                  <MaterialIcons name="unfold-more" size={26} color={theme.colors.disabled} />
                </TouchableOpacity>
              ) : isInlineEditing ? (
                <TouchableOpacity onPress={handleInlineEditToggle}>
                  <Text className="text-sm font-bold" style={{ color: theme.colors.highlight }}>
                    {t("subtasks.done")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleInlineEditToggle}>
                  <MaterialCommunityIcons
                    name="pencil-minus-outline"
                    size={22}
                    color={theme.colors.disabled}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </>
  );
}
