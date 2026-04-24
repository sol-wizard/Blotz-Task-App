import { View, Text } from "react-native";
import Modal from "react-native-modal";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";
import { theme } from "@/shared/constants/theme";

type DurationPickerModalProps = {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedHours: number;
  selectedMinutes: number;
  onHoursChange: (hour: number) => void;
  onMinutesChange: (minute: number) => void;
  onClose: () => void;
};

const PICKER_WIDTH = 120;
const PICKER_HEIGHT = 84;

const hourItems: PickerItem<number>[] = Array.from({ length: 24 }, (_, index) => ({
  value: index,
  label: index.toString().padStart(2, "0"),
}));

const minuteItems: PickerItem<number>[] = Array.from({ length: 60 }, (_, index) => ({
  value: index,
  label: index.toString().padStart(2, "0"),
}));

export default function DurationPickerModal({
  isVisible,
  position,
  selectedHours,
  selectedMinutes,
  onHoursChange,
  onMinutesChange,
  onClose,
}: DurationPickerModalProps) {

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0.08}
      useNativeDriver
      hideModalContentWhileAnimating
      style={{ margin: 0 }}
    >
      <View
        className="bg-white rounded-3xl px-2.5 py-1.5"
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
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
            onValueChanged={({ item }) => onHoursChange(item.value as number)}
            itemTextStyle={{
              color: theme.colors.highlight,
              fontSize: 16,
              fontWeight: "700",
            }}
          />

          <Text className="text-[#B7BBC7] text-xs font-bold mx-0.5">h</Text>

          <WheelPicker
            data={minuteItems}
            value={selectedMinutes}
            width={38}
            itemHeight={28}
            visibleItemCount={3}
            enableScrollByTapOnItem
            onValueChanged={({ item }) => onMinutesChange(item.value as number)}
            itemTextStyle={{
              color: theme.colors.highlight,
              fontSize: 16,
              fontWeight: "700",
            }}
          />

          <Text className="text-[#B7BBC7] text-xs font-bold ml-0.5">min</Text>
        </View>
      </View>
    </Modal>
  );
}