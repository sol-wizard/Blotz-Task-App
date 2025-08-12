import { Portal } from "react-native-paper";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { DatePicker } from "./date-picker";
import TimePicker from "./time-picker";

export const DateTimeBottomSheet = ({
  control,
  isVisible,
  onClose,
  handleCreateTaskBottomSheetOpen,
}: {
  control: any;
  isVisible: boolean;
  onClose: () => void;
  handleCreateTaskBottomSheetOpen: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [dateSelected, setDateSelected] = useState<string>("");
  const [timeSelected, setTimeSelected] = useState<string>("");

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
      handleCreateTaskBottomSheetOpen();
    }
  }, [isVisible]);
  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => {
        return (
          <Portal>
            <BottomSheet
              ref={bottomSheetRef}
              snapPoints={["80%"]}
              enablePanDownToClose
              onClose={onClose}
            >
              <BottomSheetView style={{ padding: 16 }}>
                <DatePicker
                  dateSelected={dateSelected}
                  setDateSelected={setDateSelected}
                ></DatePicker>
                <TimePicker
                  timeSelected={timeSelected}
                  setTimeSelected={setTimeSelected}
                ></TimePicker>
              </BottomSheetView>
            </BottomSheet>
          </Portal>
        );
      }}
    />
  );
};
