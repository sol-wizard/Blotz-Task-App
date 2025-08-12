import { useState } from "react";
import { Button } from "react-native-paper";
import { DateTimeBottomSheet } from "./date-time-bottom-sheet";

export const DateBottomSheetTrigger = ({
  control,
  handleTaskCreationSheetClose,
  handleTaskCreationSheetOpen,
}: {
  control: any;
  handleTaskCreationSheetClose: () => void;
  handleTaskCreationSheetOpen: () => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleDateBottomSheetOpen = () => {
    setModalVisible(true);
    handleTaskCreationSheetClose();
  };

  return (
    <>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={handleDateBottomSheetOpen}
        style={{ borderRadius: 12, borderColor: "#E5E7EB", flex: 1 }}
        contentStyle={{ height: 44 }}
        labelStyle={{ fontSize: 12, color: "#444964" }}
      >
        Add Time
      </Button>

      <DateTimeBottomSheet
        control={control}
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        handleCreateTaskBottomSheetOpen={handleTaskCreationSheetOpen}
      />
    </>
  );
};
