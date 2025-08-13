import React, { useCallback, useRef } from "react";
import { View, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Card, Button, Text, Chip, Portal } from "react-native-paper";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

interface CalendarBottomSheetProps {
  task?: TaskDetailDTO;
  isVisible: boolean;
  onClose: () => void;
}

const CalendarBottomSheet: React.FC<CalendarBottomSheetProps> = ({
  task,
  isVisible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
        console.log("Bottom sheet closed");
      }
    },
    [onClose]
  );

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        {isVisible && (
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => bottomSheetRef.current?.close()}
          />
        )}
        <BottomSheet
          ref={bottomSheetRef}
          index={isVisible ? 0 : -1}
          snapPoints={["50%", "80%"]}
          onChange={handleSheetChange}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: "#FFFFFF" }}
          handleIndicatorStyle={{ backgroundColor: "#C7C7CC" }}
        >
          <BottomSheetView className="flex-1 p-4 bg-white">
            {task ? (
              <>
                <Text
                  variant="titleLarge"
                  className="text-center mb-4 font-bold"
                >
                  {task.title}
                </Text>

                <Card className="my-3">
                  <Card.Title title="Task Details" />
                  <Card.Content>
                    <View className="flex-row justify-between items-center my-2">
                      <Text variant="bodyMedium">Status:</Text>
                      <Chip
                        mode="outlined"
                        textStyle={{
                          color: task.isDone ? "#4CAF50" : "#FF9800",
                        }}
                      >
                        {task.isDone ? "Completed" : "Pending"}
                      </Chip>
                    </View>

                    <View className="flex-row justify-between items-center my-2">
                      <Text variant="bodyMedium">Date:</Text>
                      <Text variant="bodyMedium">
                        {task.endTime.toLocaleDateString()}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center my-2">
                      <Text variant="bodyMedium">ID:</Text>
                      <Text variant="bodySmall" className="text-gray-500">
                        {task.id}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                <View className="flex-row justify-around mt-4">
                  <Button
                    mode="contained"
                    onPress={() => bottomSheetRef.current?.close()}
                    className="flex-1 mx-2"
                  >
                    Close
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() => {
                      console.log("Edit task:", task.id);
                    }}
                    className="flex-1 mx-2"
                  >
                    Edit Task
                  </Button>
                </View>
              </>
            ) : (
              <Text variant="bodyMedium">No task selected</Text>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};

export default CalendarBottomSheet;
