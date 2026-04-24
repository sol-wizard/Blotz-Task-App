import { View, Text, TouchableOpacity } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "@/shared/util/convert-duration";
import { useRef, useState } from "react";
import DurationPickerModal from "./time-wheel-picker";

type SubtaskInlineEditorProps = {
  titleValue: string;
  localDuration?: string;
  selectedHours: number;
  selectedMinutes: number;
  onTitleChange: (text: string) => void;
  onHoursChange: (hour: number) => void;
  onMinutesChange: (minute: number) => void;
  onDurationClose: (duration: string) => void;
};

const PICKER_WIDTH = 120;
const PICKER_HEIGHT = 84;

export default function SubtaskInlineEditor({
  titleValue,
  localDuration,
  selectedHours,
  selectedMinutes,
  onTitleChange,
  onHoursChange,
  onMinutesChange,
  onDurationClose,
}: SubtaskInlineEditorProps) {
  const durationTriggerRef = useRef<View>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [isDurationPickerVisible, setIsDurationPickerVisible] = useState(false);

  const openDurationPicker = () => {
    durationTriggerRef.current?.measureInWindow((x, y, width, height) => {
      const left = x + width / 2 - PICKER_WIDTH / 2;
      const top = y + height / 2 - PICKER_HEIGHT / 2;
      setPickerPosition({ x: Math.max(12, left), y: Math.max(12, top) });
      setIsDurationPickerVisible(true);
    });
  };

  const closePicker = () => {
    const h = selectedHours.toString().padStart(2, "0");
    const m = selectedMinutes.toString().padStart(2, "0");
    onDurationClose(`${h}:${m}:00`);
    setIsDurationPickerVisible(false);
  };

  return (
    <>
      <View className="flex-row items-center gap-4">
        {localDuration && (
          <View ref={durationTriggerRef} collapsable={false}>
            <TouchableOpacity onPress={openDurationPicker} activeOpacity={0.8}>
              <Text
                className="text-[12px] font-bold"
                style={{ color: theme.colors.highlight }}
              >
                {convertDurationToText(localDuration)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          value={titleValue}
          onChangeText={onTitleChange}
          placeholder="Subtask Title"
          returnKeyType="done"
          multiline
          className="text-3 font-bold py-2 pr-1 shrink text-top"
          style={{
            color: theme.colors.onSurface,
            textAlignVertical: "top",
          }}
        />
      </View>

      <DurationPickerModal
        isVisible={isDurationPickerVisible}
        position={pickerPosition}
        selectedHours={selectedHours}
        selectedMinutes={selectedMinutes}
        onHoursChange={onHoursChange}
        onMinutesChange={onMinutesChange}
        onClose={closePicker}
      />
    </>
  );
}