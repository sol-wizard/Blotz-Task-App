import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import TasksCheckbox from "../../../shared/components/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";
import { useEffect, useState } from "react";
import { updateSubtask } from "../services/subtask-service";
import SubtaskInlineEditor from "./subtask-inline-editor";

type SubtaskItemData = {
  id: number;
  title: string;
  duration?: string;
  isDone: boolean;
  order: number;
};

type SubtaskItemProps = {
  item: SubtaskItemData;
  onToggle: (id: number) => void;
  color?: string;
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
  const isChecked = subtask?.isDone;
  const handleToggle = () => {
    onToggle(subtask.id);
  };

  const handleDelete = () => {
    onDelete?.(subtask.id);
  };

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(subtask.title);
  const [localDuration, setLocalDuration] = useState(subtask.duration);

  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);


  useEffect(() => {
    setTitleValue(subtask.title);
    setLocalDuration(subtask.duration ?? "00:00:00");
    const [h = "0", m = "0"] = (subtask.duration ?? "00:00:00").split(":");
    setSelectedHours(Number(h) || 0);
    setSelectedMinutes(Number(m) || 0);
  }, [subtask.title, subtask.duration]);

  const handleInlineEditToggle = () => {
    if (isInlineEditing) {
      updateSubtask?.({
        subTaskId: subtask.id,
        parentTaskId: parentTaskId,
        title: titleValue,
        duration: localDuration ?? undefined,
        order: subtask.order,
        isDone: subtask.isDone,
      });
    }
    setIsInlineEditing((prev) => !prev);
  };

  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;

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
          <View className="flex-row items-center px-4 py-1">
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
                    onDurationChange?.(subtask.id, duration);
                  }}
                />
              ) : (
                <>
                  {localDuration && (
                    <Text
                      className="text-[12px] font-bold"
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
                    Done
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
