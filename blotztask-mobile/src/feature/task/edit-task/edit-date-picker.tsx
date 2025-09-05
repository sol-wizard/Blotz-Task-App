import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "react-native-paper";
export const EditDatePicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    []
  );
  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["40%"]}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={{ padding: 16, minHeight: 250 }}>
          <DateTimePicker
            value={tempDate ?? (value ? new Date(value) : new Date())}
            mode="date"
            display="spinner"
            onChange={(_, selectedDate) => {
              if (selectedDate) {
                setTempDate(selectedDate);
              }
            }}
            style={{ height: 200 }}
            textColor="black"
          />

          <Button
            mode="contained"
            style={{ marginTop: 16, borderRadius: 12 }}
            onPress={() => {
              if (tempDate) {
                onChange(tempDate.toISOString());
              }
              setTempDate(null);
              sheetRef.current?.dismiss();
            }}
          >
            Confirm
          </Button>
          <Button
            mode="text"
            style={{ marginTop: 8 }}
            onPress={() => sheetRef.current?.dismiss()}
          >
            Cancel
          </Button>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
