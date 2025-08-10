import { useState } from "react";
import { Button, Modal, Portal } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import { Controller } from "react-hook-form";

export const DateSelector = ({ control }: { control: any }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [dateSelected, setDateSelected] = useState<string>("");

  return (
    <Controller
      control={control}
      name="endTime"
      render={({ field: { value, onChange } }) => {
        return (
          <>
            <Button
              mode="outlined"
              icon="calendar"
              onPress={() => setModalVisible(true)}
              style={{ borderRadius: 12, borderColor: "#E5E7EB", flex: 1 }}
              contentStyle={{ height: 44 }}
              labelStyle={{ fontSize: 14, color: "#444964" }}
            >
              Add Time
            </Button>

            <Portal>
              <Modal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                contentContainerStyle={{
                  backgroundColor: "white",
                  padding: 20,
                  margin: 20,
                  borderRadius: 8,
                }}
              >
                <Calendar
                  onDayPress={(day) => {
                    setDateSelected(day.dateString);
                    const current = value ? new Date(value) : new Date();
                    const newDate = new Date(day.dateString);
                    newDate.setHours(
                      current.getHours(),
                      current.getMinutes(),
                      0,
                      0
                    );
                    onChange(newDate.toISOString());
                  }}
                  markedDates={{
                    [dateSelected]: {
                      selected: true,
                      disableTouchEvent: true,
                      selectedColor: "#7c7c80",
                    },
                  }}
                />
              </Modal>
            </Portal>
          </>
        );
      }}
    />
  );
};
