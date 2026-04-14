import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import TasksCheckbox from "../../../shared/components/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";
import { useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "react-native-gesture-handler";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";
import Modal from "react-native-modal";
import { updateSubtask } from "../services/subtask-service";

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

  const durationTriggerRef = useRef<View>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [isDurationPickerVisible, setIsDurationPickerVisible] = useState(false);


  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  function mergeToDate(hour: number, minute: number) {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
    return `${h}:${m}:00`;
  }

  const combineWheelValue = (_: Partial<{ hour: number; minute: number }>) => {
    const base = mergeToDate(selectedHours, selectedMinutes);
    onDurationChange?.(subtask.id, base);
  };

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

  const hourItems: PickerItem<number>[] = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        value: index,
        label: index.toString().padStart(2, "0"),
      })),
    [],
  );

  const minuteItems: PickerItem<number>[] = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        value: index,
        label: index.toString().padStart(2, "0"),
      })),
    [],
  );

  const PICKER_WIDTH = 120;
  const PICKER_HEIGHT = 84;

  const openDurationPicker = () => {
    durationTriggerRef.current?.measureInWindow((x, y, width, height) => {
      const left = x + width / 2 - PICKER_WIDTH / 2;
      const top = y + height / 2 - PICKER_HEIGHT / 2;

      setPickerPosition({
        x: Math.max(12, left),
        y: Math.max(12, top),
      });

      setIsDurationPickerVisible(true);
    });
  };

  const closePicker = () => {
    const next_duration = mergeToDate(selectedHours, selectedMinutes);
    setLocalDuration(next_duration);
    onDurationChange?.(subtask.id, next_duration);
    setIsDurationPickerVisible(false);
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
                <>
                  <View className="flex-row items-center gap-4">
                    {localDuration && (
                      <View ref={durationTriggerRef} collapsable={false}>
                        <TouchableOpacity onPress={openDurationPicker} activeOpacity={0.8}>
                          <Text
                            className="text-[12px] font-bold"
                            style={{ color: theme.colors.highlight, fontWeight: "700" }}
                          >
                            {convertDurationToText(localDuration)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput
                      value={titleValue}
                      onChangeText={setTitleValue}
                      placeholder="Subtask Title"
                      multiline
                      className="text-3 font-bold"
                      style={{
                        color: theme.colors.onSurface,
                        paddingVertical: 8,
                        paddingRight: 4,
                        textAlignVertical: "top",
                        flexShrink: 1,
                      }}
                    />
                  </View>
                </>
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

            <View className="w-8 items-center justify-center">
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

      <Modal
        isVisible={isDurationPickerVisible}
        onBackdropPress={closePicker}
        onBackButtonPress={closePicker}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.08}
        useNativeDriver
        style={{ margin: 0 }}
      >
        <View
          className="bg-white rounded-3xl px-2.5 py-1.5"
          style={{
            position: "absolute",
            left: pickerPosition.x,
            top: pickerPosition.y,
            width: PICKER_WIDTH,
            height: PICKER_HEIGHT,
            elevation: 5,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View className="flex-row items-center justify-center h-full">
            <WheelPicker
              data={hourItems}
              value={selectedHours}
              width={34}
              itemHeight={26}
              visibleItemCount={3}
              enableScrollByTapOnItem
              onValueChanged={({ item }) => {
                setSelectedHours(item.value as number);
                combineWheelValue({ hour: item.value });
              }}
              itemTextStyle={{
                color: theme.colors.highlight,
                fontSize: 16,
                fontWeight: "700",
              }}
            />

            <Text className="text-[#B7BBC7] text-xs font-bold mx-0.5">
              h
            </Text>

            <WheelPicker
              data={minuteItems}
              value={selectedMinutes}
              width={38}
              itemHeight={28}
              visibleItemCount={3}
              enableScrollByTapOnItem
              onValueChanged={({ item }) => {
                setSelectedMinutes(item.value as number);
                combineWheelValue({ minute: item.value });
              }}
              itemTextStyle={{
                color: theme.colors.highlight,
                fontSize: 16,
                fontWeight: "700",
              }}
            />

            <Text className="text-[#B7BBC7] text-xs font-bold mx-0.5">
              min
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
