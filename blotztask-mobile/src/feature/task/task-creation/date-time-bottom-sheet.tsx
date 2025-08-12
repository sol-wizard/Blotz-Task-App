import { Portal } from "react-native-paper";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Text } from "react-native";
import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";

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
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  Select Date and Time
                </Text>
              </BottomSheetView>
            </BottomSheet>
          </Portal>
        );
      }}
    />
  );
};
