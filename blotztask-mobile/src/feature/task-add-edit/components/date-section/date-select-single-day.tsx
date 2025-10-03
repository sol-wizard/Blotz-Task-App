import { useState } from "react";
import { View, Text } from "react-native";
import CalendarDatePicker from "./calendar-date-picker";
import { RadioButton } from "react-native-paper";
import { isSameDay } from "date-fns";

interface DateSelectSingleDayProps {
  onChange: (value: { selectedDate: Date }) => void;
  defaultValue: Date | null;
}

const DateSelectSingleDay: React.FC<DateSelectSingleDayProps> = ({ onChange, defaultValue }) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSelect = (value: string) => {
    setSelected(value);
    if (value === "Today") {
      const today = new Date();
      onChange({ selectedDate: new Date(today) });
    } else if (value === "Tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      onChange({ selectedDate: new Date(tomorrow) });
    } else if (value === "Select Date") {
      setShowCalendar(true);
    }
  };

  const getInitialSelected = () => {
    if (!defaultValue) return "";

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (isSameDay(defaultValue, today)) {
      return "Today";
    } else if (isSameDay(defaultValue, tomorrow)) {
      return "Tomorrow";
    } else {
      return "Select Date";
    }
  };

  const [selected, setSelected] = useState(getInitialSelected());

  return (
    <View className="w-full">
      <RadioButton.Group onValueChange={handleSelect} value={selected}>
        <View className="flex-row justify-start gap-12">
          {["Today", "Tomorrow"].map((option) => (
            <View key={option} className="flex-row items-center gap-2">
              <View
                className={`rounded-full p-1 flex justify-center items-center ${
                  selected === option ? "bg-blue-100" : "bg-white"
                }`}
                style={{ transform: [{ scale: 0.5 }] }}
              >
                <RadioButton value={option} color="#B0D0FA" />
              </View>
              <Text className="text-lg">{option}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row justify-start items-center gap-2 mt-3">
          <View
            className={`rounded-full p-1 flex justify-center items-center ${
              selected === "Select Date" ? "bg-blue-100" : "bg-white"
            }`}
            style={{ transform: [{ scale: 0.5 }] }}
          >
            <RadioButton value="Select Date" color="#B0D0FA" />
          </View>
          <Text className="text-lg">Select Date</Text>
        </View>
      </RadioButton.Group>

      {/* Calendar Modal */}
      <CalendarDatePicker
        allowRangeSelection={false}
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSave={(selectedDate) => {
          setShowCalendar(false);
          if (selectedDate) {
            onChange({ selectedDate: new Date(selectedDate) });
          }
        }}
      />
    </View>
  );
};

export default DateSelectSingleDay;
